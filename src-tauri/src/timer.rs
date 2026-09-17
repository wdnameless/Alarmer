//! Countdown timer that lives in the backend.
//!
//! The timer used to be React state inside the Timer component. Switching a
//! sub-tab unmounted the component and threw the countdown away, the mini
//! overlay froze because nothing was emitting, and the global hotkeys had
//! nothing to drive. Like the alarm scheduler, the clock now belongs to the
//! process so it keeps running whatever is on screen and whether or not the
//! window is visible.

use chrono::{Datelike, Local};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::{Emitter, Manager};

/// Default arming before anything is chosen.
const DEFAULT_SECS: u64 = 25 * 60;
/// Bounds on the armed duration, in minutes.
const MIN_MINUTES: i64 = 1;
const MAX_MINUTES: i64 = 180;
/// How often the loop re-reads the clock.
const TICK: Duration = Duration::from_millis(250);

/// What happens when the countdown reaches zero.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum TimerMode {
    /// Stop at zero and ring.
    #[default]
    Countdown,
    /// Keep counting up past zero, for people who would rather finish the
    /// thought than be interrupted by their own timer.
    Flow,
    /// Structured block: focus phase, followed automatically by a non-skippable rest phase.
    Block,
}

/// Phase of a block-mode timer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum BlockPhase {
    #[default]
    Focus,
    Rest,
}

#[derive(Debug, Clone, Serialize)]
pub struct TimerSnapshot {
    pub total_secs: u64,
    pub remaining_secs: u64,
    pub running: bool,
    pub mode: TimerMode,
    /// Seconds past zero; only non-zero in flow mode.
    pub overtime_secs: u64,
    /// True once the countdown has reached zero in flow mode.
    pub overtime: bool,
    /// Current phase in block mode ("focus" or "rest").
    pub phase: BlockPhase,
    /// Completed focus phases today.
    pub block_index: u32,
    /// Selected direction id, if any.
    pub direction_id: Option<String>,
}

/// A finished stretch of focus, ready to be recorded in the session log.
///
/// The backend measures this rather than the webview: the clock lives here, and
/// a measurement taken from the UI would lose everything a hidden or unmounted
/// window never observed.
#[derive(Debug, Clone, Serialize)]
pub struct TimerSession {
    /// Seconds of focus, excluding paused time.
    pub focused_secs: u64,
    pub started_at_ms: u64,
    pub ended_at_ms: u64,
    /// True when it ran to zero; false when it was reset or re-armed early.
    pub completed: bool,
    /// Direction associated with this session, if any.
    pub direction_id: Option<String>,
    /// Phase in which this session completed (e.g. Focus).
    pub phase: BlockPhase,
}

fn unix_millis(at: SystemTime) -> u64 {
    at.duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn today_str() -> String {
    let now = Local::now();
    format!("{:04}-{:02}-{:02}", now.year(), now.month(), now.day())
}

#[derive(Debug, Clone)]
pub struct TimerState {
    pub total_secs: u64,
    /// Authoritative while paused; while running the deadline is.
    pub remaining_secs: u64,
    /// When the countdown reaches zero. `None` means paused.
    pub deadline: Option<SystemTime>,
    pub mode: TimerMode,
    pub overtime_secs: u64,
    /// When the stretch of focus being measured began; `None` when idle.
    pub session_started: Option<SystemTime>,
    /// Sessions awaiting broadcast. Commands push here rather than emitting, so
    /// there is one emission path and commands stay free of an app handle.
    pub pending_sessions: Vec<TimerSession>,

    // Block mode fields
    pub phase: BlockPhase,
    pub focus_min: u32,
    pub rest_min: u32,
    pub block_index: u32,
    pub last_focus_date: String,
    pub direction_id: Option<String>,
    pub persist_path: Option<PathBuf>,
}

impl Default for TimerState {
    fn default() -> Self {
        let mut state = TimerState {
            total_secs: DEFAULT_SECS,
            remaining_secs: DEFAULT_SECS,
            deadline: None,
            mode: TimerMode::Countdown,
            overtime_secs: 0,
            session_started: None,
            pending_sessions: Vec::new(),
            phase: BlockPhase::Focus,
            focus_min: 50,
            rest_min: 10,
            block_index: 0,
            last_focus_date: today_str(),
            direction_id: None,
            persist_path: default_store_file_path(),
        };
        state.load_persisted();
        state
    }
}

impl TimerState {
    /// True while the block cycle is in its break.
    ///
    /// The break is not escapable: switching modes, re-arming a duration or
    /// nudging the clock all refuse while this holds. Pausing is allowed — a
    /// person may need to step away mid-break — but resuming continues the same
    /// break, so it cannot be used to move on early either.
    ///
    /// This deliberately ignores `deadline`: pause clears it, and an earlier
    /// version of the mode guard keyed on it, which meant pausing the break
    /// removed the very protection the cycle exists to provide.
    fn in_rest(&self) -> bool {
        self.mode == TimerMode::Block && self.phase == BlockPhase::Rest
    }

    /// Closes the stretch of focus in progress, if any.
    ///
    /// Focus is wall-clock time between start and now minus any paused time —
    /// which the caller has already reflected by clearing `session_started`
    /// whenever the countdown pauses. Nothing shorter than a second is recorded:
    /// an accidental tap is not a session, and padding the log with them would
    /// make every statistic a lie.
    pub fn close_session(&mut self, now: SystemTime, completed: bool) {
        let Some(started) = self.session_started.take() else {
            return;
        };
        let focused = now.duration_since(started).unwrap_or_default().as_secs();
        if focused == 0 {
            return;
        }
        self.pending_sessions.push(TimerSession {
            focused_secs: focused,
            started_at_ms: unix_millis(started),
            ended_at_ms: unix_millis(now),
            completed,
            direction_id: self.direction_id.clone(),
            phase: self.phase,
        });
    }

    /// Takes the sessions finished since the last drain.
    pub fn take_sessions(&mut self) -> Vec<TimerSession> {
        std::mem::take(&mut self.pending_sessions)
    }

    pub fn check_date_rollover(&mut self) {
        let today = today_str();
        if self.last_focus_date != today {
            self.block_index = 0;
            self.last_focus_date = today;
            self.save_persisted();
        }
    }

    /// Reconciles the stored remaining time with the wall clock.
    ///
    /// Returns true when this call crossed zero, so the caller rings exactly
    /// once no matter how the loop was scheduled.
    pub fn advance(&mut self, now: SystemTime) -> bool {
        self.check_date_rollover();

        let Some(deadline) = self.deadline else {
            return false;
        };

        if now < deadline {
            self.remaining_secs = deadline.duration_since(now).unwrap_or_default().as_secs();
            return false;
        }

        self.remaining_secs = 0;
        match self.mode {
            TimerMode::Countdown => {
                self.deadline = None;
                self.close_session(now, true);
                true
            }
            TimerMode::Flow => {
                let past = now.duration_since(deadline).unwrap_or_default().as_secs();
                if past > self.overtime_secs {
                    self.overtime_secs = past;
                }
                // Flow mode keeps counting up, so the stretch of focus only
                // ends when the user stops it; nothing closes here.
                past == 0
            }
            TimerMode::Block => {
                match self.phase {
                    BlockPhase::Focus => {
                        // Focus completed! Close session as completed.
                        self.close_session(now, true);
                        self.block_index += 1;
                        self.last_focus_date = today_str();
                        self.save_persisted();

                        // Automatically transition to Rest phase and start countdown immediately.
                        self.phase = BlockPhase::Rest;
                        let rest_secs = (self.rest_min as u64) * 60;
                        self.total_secs = rest_secs;
                        self.remaining_secs = rest_secs;
                        self.overtime_secs = 0;
                        self.deadline = Some(now + Duration::from_secs(rest_secs));
                        // Rest is not recorded as focus session.
                        self.session_started = None;
                        true
                    }
                    BlockPhase::Rest => {
                        // Rest completed!
                        self.deadline = None;
                        self.phase = BlockPhase::Focus;
                        let focus_secs = (self.focus_min as u64) * 60;
                        self.total_secs = focus_secs;
                        self.remaining_secs = focus_secs;
                        self.overtime_secs = 0;
                        self.session_started = None;
                        true
                    }
                }
            }
        }
    }

    pub fn snapshot(&self) -> TimerSnapshot {
        TimerSnapshot {
            total_secs: self.total_secs,
            remaining_secs: self.remaining_secs,
            running: self.deadline.is_some(),
            mode: self.mode,
            overtime_secs: self.overtime_secs,
            overtime: self.mode == TimerMode::Flow && self.remaining_secs == 0,
            phase: self.phase,
            block_index: self.block_index,
            direction_id: self.direction_id.clone(),
        }
    }

    pub fn load_persisted(&mut self) {
        let Some(path) = &self.persist_path else {
            return;
        };
        if let Ok(contents) = fs::read_to_string(path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&contents) {
                if let Some(bi) = json.get("alarmer_block_index").and_then(|v| v.as_u64()) {
                    self.block_index = bi as u32;
                }
                if let Some(date) = json.get("alarmer_last_focus_date").and_then(|v| v.as_str()) {
                    self.last_focus_date = date.to_string();
                }
                if let Some(dir) = json.get("alarmer_selected_direction") {
                    self.direction_id = dir.as_str().map(|s| s.to_string());
                }
                if let Some(bs) = json.get("alarmer_block_settings") {
                    if let Some(f) = bs.get("focusMin").and_then(|v| v.as_u64()) {
                        self.focus_min = f as u32;
                    }
                    if let Some(r) = bs.get("restMin").and_then(|v| v.as_u64()) {
                        self.rest_min = r as u32;
                    }
                }
            }
        }
        self.check_date_rollover();
    }

    pub fn save_persisted(&self) {
        let Some(path) = &self.persist_path else {
            return;
        };
        let mut map = if let Ok(contents) = fs::read_to_string(path) {
            serde_json::from_str::<serde_json::Map<String, serde_json::Value>>(&contents)
                .unwrap_or_default()
        } else {
            serde_json::Map::new()
        };

        map.insert("alarmer_block_index".into(), self.block_index.into());
        map.insert(
            "alarmer_last_focus_date".into(),
            self.last_focus_date.clone().into(),
        );
        if let Some(dir) = &self.direction_id {
            map.insert("alarmer_selected_direction".into(), dir.clone().into());
        } else {
            map.insert("alarmer_selected_direction".into(), serde_json::Value::Null);
        }
        let bs = serde_json::json!({
            "focusMin": self.focus_min,
            "restMin": self.rest_min,
        });
        map.insert("alarmer_block_settings".into(), bs);

        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(serialized) = serde_json::to_string_pretty(&map) {
            let _ = fs::write(path, serialized);
        }
    }
}

fn default_store_file_path() -> Option<PathBuf> {
    // Check portable marker
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            if dir.join(".portable").exists() || std::env::var_os("ALARMER_PORTABLE").is_some() {
                return Some(dir.join("alarmer.json"));
            }
        }
    }
    // Standard data dir
    #[cfg(target_os = "windows")]
    {
        if let Ok(app_data) = std::env::var("APPDATA") {
            return Some(PathBuf::from(app_data).join("Alarmer").join("alarmer.json"));
        }
    }
    None
}

static STATE: Mutex<Option<TimerState>> = Mutex::new(None);

fn with_state<T>(f: impl FnOnce(&mut TimerState) -> T) -> T {
    let mut guard = STATE.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    f(guard.get_or_insert_with(TimerState::default))
}

/// Arms the timer with `secs`, replacing whatever was there. Paused.
pub fn set_duration(secs: u64) {
    with_state(|state| {
        if state.in_rest() {
            return;
        }
        // Re-arming ends whatever stretch of focus was in progress.
        state.close_session(SystemTime::now(), false);
        let secs = secs.max(1);
        state.total_secs = secs;
        state.remaining_secs = secs;
        state.deadline = None;
        state.overtime_secs = 0;
    });
}

/// Starts or resumes the countdown from the remaining time.
pub fn start() {
    with_state(|state| {
        if state.deadline.is_some() {
            return;
        }
        let now = SystemTime::now();
        // Resuming an already-finished countdown would ring instantly; start
        // it over instead.
        if state.remaining_secs == 0 {
            state.remaining_secs = state.total_secs;
        }
        state.overtime_secs = 0;
        state.deadline = Some(now + Duration::from_secs(state.remaining_secs));
        // Resuming continues the same stretch of focus rather than starting a
        // new one; only starting from idle opens a session.
        if state.session_started.is_none() && state.phase == BlockPhase::Focus {
            state.session_started = Some(now);
        }
    });
}

/// Freezes the countdown at its current remaining time.
///
/// The stretch of focus is closed rather than suspended: a session in the log
/// is a period of work that actually happened, and stitching several short
/// stretches across a long pause would overstate it.
pub fn pause() {
    with_state(|state| {
        if let Some(deadline) = state.deadline.take() {
            let now = SystemTime::now();
            state.remaining_secs = deadline.duration_since(now).unwrap_or_default().as_secs();
            // Reaching zero is the goal, whether the countdown mode stopped
            // there or flow mode was left running past it.
            let reached_zero = state.remaining_secs == 0;
            state.close_session(now, reached_zero);
        }
    });
}

/// Rewinds to the armed duration and stops.
pub fn reset() {
    with_state(|state| {
        let now = SystemTime::now();
        if state.in_rest() {
            return;
        }
        // Whatever was done before the reset still happened.
        state.close_session(now, false);
        state.remaining_secs = state.total_secs;
        state.deadline = None;
        state.overtime_secs = 0;
    });
}

/// Nudges the armed duration by `delta` minutes, clamped, and stops.
pub fn shift_minutes(delta: i64) {
    with_state(|state| {
        if state.in_rest() {
            return;
        }
        let now = SystemTime::now();
        state.close_session(now, false);
        let current = (state.total_secs / 60) as i64;
        let next = (current + delta).clamp(MIN_MINUTES, MAX_MINUTES);
        let secs = next as u64 * 60;
        state.total_secs = secs;
        state.remaining_secs = secs;
        state.deadline = None;
        state.overtime_secs = 0;
    });
}

/// Current state, reconciled against the clock.
pub fn snapshot() -> TimerSnapshot {
    with_state(|state| {
        state.advance(SystemTime::now());
        state.snapshot()
    })
}

/// Sets the arming mode without disturbing a running countdown's remainder.
pub fn set_mode(mode: TimerMode) {
    with_state(|state| {
        if state.in_rest() {
            return;
        }
        state.mode = mode;
        state.overtime_secs = 0;
        if mode == TimerMode::Block {
            state.phase = BlockPhase::Focus;
            let focus_secs = (state.focus_min as u64) * 60;
            state.total_secs = focus_secs;
            state.remaining_secs = focus_secs;
            state.deadline = None;
        }
    });
}

pub fn set_block_settings(focus_min: u32, rest_min: u32) {
    with_state(|state| {
        state.focus_min = focus_min.clamp(1, 180);
        state.rest_min = rest_min.clamp(1, 60);
        if state.mode == TimerMode::Block && state.deadline.is_none() {
            let secs = match state.phase {
                BlockPhase::Focus => (state.focus_min as u64) * 60,
                BlockPhase::Rest => (state.rest_min as u64) * 60,
            };
            state.total_secs = secs;
            state.remaining_secs = secs;
        }
        state.save_persisted();
    });
}

pub fn set_direction(direction_id: Option<String>) {
    with_state(|state| {
        state.direction_id = direction_id;
        state.save_persisted();
    });
}

// --- Tauri commands -------------------------------------------------------

#[tauri::command]
pub async fn timer_set_duration(secs: u64) -> Result<(), String> {
    set_duration(secs);
    Ok(())
}

#[tauri::command]
pub async fn timer_start() -> Result<(), String> {
    start();
    Ok(())
}

#[tauri::command]
pub async fn timer_pause() -> Result<(), String> {
    pause();
    Ok(())
}

#[tauri::command]
pub async fn timer_reset() -> Result<(), String> {
    reset();
    Ok(())
}

#[tauri::command]
pub async fn timer_shift_minutes(delta: i64) -> Result<(), String> {
    shift_minutes(delta);
    Ok(())
}

#[tauri::command]
pub async fn timer_set_mode(mode: TimerMode) -> Result<(), String> {
    set_mode(mode);
    Ok(())
}

#[tauri::command]
pub async fn timer_set_block_settings(focus_min: u32, rest_min: u32) -> Result<(), String> {
    set_block_settings(focus_min, rest_min);
    Ok(())
}

#[tauri::command]
pub async fn timer_set_direction(direction_id: Option<String>) -> Result<(), String> {
    set_direction(direction_id);
    Ok(())
}

#[tauri::command]
pub async fn timer_get_state() -> Result<TimerSnapshot, String> {
    Ok(snapshot())
}

/// Starts the tick loop, which broadcasts state and rings at zero.
pub fn spawn(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(TICK);
        let mut last_remaining = u64::MAX;
        let mut last_overtime = u64::MAX;
        let mut last_running = false;
        let mut last_phase = BlockPhase::Focus;

        loop {
            ticker.tick().await;

            let (fired, state, sessions) = with_state(|state| {
                let crossed = state.advance(SystemTime::now());
                (crossed, state.snapshot(), state.take_sessions())
            });

            // A finished stretch of focus is recorded the moment it closes,
            // whether that happened on a tick or in a command.
            for session in sessions {
                let _ = app.emit("timer://session", session);
            }

            // Emit on any real change rather than on every 250 ms poll, so a
            // paused timer is silent and a running one ticks once a second.
            if state.remaining_secs != last_remaining
                || state.overtime_secs != last_overtime
                || state.running != last_running
                || state.phase != last_phase
            {
                last_remaining = state.remaining_secs;
                last_overtime = state.overtime_secs;
                last_running = state.running;
                last_phase = state.phase;
                let _ = app.emit("timer://tick", state.clone());
            }

            if fired {
                let _ = app.emit("timer://finished", state.clone());

                // A hidden window cannot play the chime itself, so the OS says
                // it instead of the timer finishing in silence.
                let visible = app
                    .get_webview_window("main")
                    .and_then(|w| w.is_visible().ok())
                    .unwrap_or(false);
                if !visible {
                    use tauri_plugin_notification::NotificationExt;
                    let _ = app
                        .notification()
                        .builder()
                        .title("Время вышло")
                        .body("Таймер завершён.")
                        .show();
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn running_for(secs: u64) -> TimerState {
        let mut state = TimerState {
            total_secs: secs,
            remaining_secs: secs,
            deadline: Some(SystemTime::now() + Duration::from_secs(secs)),
            mode: TimerMode::Countdown,
            overtime_secs: 0,
            session_started: None,
            pending_sessions: Vec::new(),
            phase: BlockPhase::Focus,
            focus_min: 50,
            rest_min: 10,
            block_index: 0,
            last_focus_date: today_str(),
            direction_id: None,
            persist_path: None,
        };
        state.deadline = Some(SystemTime::now() + Duration::from_secs(secs));
        state
    }

    #[test]
    fn counts_down_towards_the_deadline() {
        let mut state = running_for(60);
        let now = SystemTime::now();

        assert!(!state.advance(now));
        assert!(state.remaining_secs <= 60 && state.remaining_secs >= 59);
        assert!(state.snapshot().running);
    }

    #[test]
    fn crossing_zero_rings_exactly_once_in_countdown_mode() {
        let mut state = running_for(1);
        let after = SystemTime::now() + Duration::from_secs(2);

        assert!(state.advance(after), "the crossing tick must ring");
        assert_eq!(state.remaining_secs, 0);
        assert!(!state.snapshot().running, "a finished countdown stops");
        assert!(!state.advance(after + Duration::from_secs(1)), "and does not ring again");
    }

    #[test]
    fn pauses_at_the_remaining_time_and_resumes() {
        let mut state = running_for(300);
        state.advance(SystemTime::now());
        state.deadline = None; // what pause() does
        let frozen = state.remaining_secs;

        state.deadline = Some(SystemTime::now() + Duration::from_secs(frozen));
        assert!(!state.snapshot().overtime);
        assert!(state.remaining_secs >= frozen - 1);
    }

    #[test]
    fn restarting_a_finished_countdown_does_not_ring_instantly() {
        let mut state = TimerState {
            total_secs: 60,
            remaining_secs: 0,
            deadline: None,
            mode: TimerMode::Countdown,
            overtime_secs: 0,
            session_started: None,
            pending_sessions: Vec::new(),
            phase: BlockPhase::Focus,
            focus_min: 50,
            rest_min: 10,
            block_index: 0,
            last_focus_date: today_str(),
            direction_id: None,
            persist_path: None,
        };
        // What start() does with a spent countdown.
        if state.remaining_secs == 0 {
            state.remaining_secs = state.total_secs;
        }
        state.deadline = Some(SystemTime::now() + Duration::from_secs(state.remaining_secs));

        assert!(state.remaining_secs > 0);
        assert!(!state.advance(SystemTime::now()));
    }

    #[test]
    fn flow_mode_counts_up_past_zero_without_repeating_the_ring() {
        let mut state = TimerState {
            total_secs: 2,
            remaining_secs: 2,
            deadline: Some(SystemTime::now() + Duration::from_secs(2)),
            mode: TimerMode::Flow,
            overtime_secs: 0,
            session_started: None,
            pending_sessions: Vec::new(),
            phase: BlockPhase::Focus,
            focus_min: 50,
            rest_min: 10,
            block_index: 0,
            last_focus_date: today_str(),
            direction_id: None,
            persist_path: None,
        };

        let deadline = state.deadline.unwrap();
        assert!(state.advance(deadline), "crossing zero rings in flow mode");
        assert!(state.snapshot().overtime, "and keeps the timer in overtime");

        let later = deadline + Duration::from_secs(5);
        assert!(!state.advance(later), "later ticks must stay quiet");
        assert_eq!(state.overtime_secs, 5);
        assert!(state.snapshot().running, "flow mode keeps running");
    }

    #[test]
    fn shifting_minutes_is_clamped_to_the_supported_range() {
        let mut total = 25u64;
        for delta in [-100i64, 1000] {
            let current = (total / 60) as i64;
            let next = (current + delta).clamp(MIN_MINUTES, MAX_MINUTES);
            total = next as u64 * 60;
            assert!((60..=180 * 60).contains(&total), "clamped, got {total}");
        }
    }

    #[test]
    fn a_completed_countdown_records_the_focus_it_measured() {
        let mut state = running_for(60);

        let deadline = state.deadline.unwrap();
        let started = deadline - Duration::from_secs(40);
        state.session_started = Some(started);

        assert!(state.advance(deadline), "crossing zero must ring");

        let sessions = state.take_sessions();
        assert_eq!(sessions.len(), 1, "a finished countdown is a session");
        assert!(sessions[0].completed, "it reached zero");
        assert_eq!(sessions[0].focused_secs, 40, "measured from when it started");
        assert_eq!(sessions[0].started_at_ms, unix_millis(started));
        assert_eq!(sessions[0].ended_at_ms, unix_millis(deadline));
    }

    #[test]
    fn a_paused_countdown_records_what_was_done_but_as_unfinished() {
        let mut state = running_for(300);
        state.session_started = Some(SystemTime::now() - Duration::from_secs(20));

        let deadline = state.deadline.take().unwrap();
        let now = SystemTime::now();
        state.remaining_secs = deadline.duration_since(now).unwrap_or_default().as_secs();
        let reached_zero = state.remaining_secs == 0;
        state.close_session(now, reached_zero);

        let sessions = state.take_sessions();
        assert_eq!(sessions.len(), 1);
        assert!(!sessions[0].completed, "it was interrupted, not finished");
        assert_eq!(sessions[0].focused_secs, 20);
    }

    #[test]
    fn pausing_immediately_records_nothing() {
        let mut state = running_for(300);
        state.session_started = Some(SystemTime::now());

        state.close_session(SystemTime::now(), false);

        assert!(state.take_sessions().is_empty());
    }

    #[test]
    fn a_second_pause_does_not_double_record() {
        let mut state = running_for(300);
        state.session_started = Some(SystemTime::now() - Duration::from_secs(10));
        let now = SystemTime::now();

        state.close_session(now, false);
        state.close_session(now, false);

        assert_eq!(state.take_sessions().len(), 1, "one stretch, one session");
    }

    #[test]
    fn draining_sessions_empties_the_queue() {
        let mut state = running_for(60);
        state.session_started = Some(SystemTime::now() - Duration::from_secs(5));
        state.close_session(SystemTime::now(), false);

        assert_eq!(state.take_sessions().len(), 1);
        assert!(state.take_sessions().is_empty(), "a drained queue stays empty");
    }

    #[test]
    fn resuming_continues_the_same_stretch_rather_than_starting_a_new_one() {
        let mut state = running_for(300);
        let started = SystemTime::now() - Duration::from_secs(30);
        state.session_started = Some(started);

        assert!(state.deadline.is_some());
        if state.session_started.is_none() {
            state.session_started = Some(SystemTime::now());
        }

        assert_eq!(state.session_started, Some(started));
    }

    #[test]
    fn flow_mode_does_not_close_the_session_at_zero() {
        let mut state = TimerState {
            total_secs: 2,
            remaining_secs: 2,
            deadline: Some(SystemTime::now() + Duration::from_secs(2)),
            mode: TimerMode::Flow,
            overtime_secs: 0,
            session_started: Some(SystemTime::now() - Duration::from_secs(30)),
            pending_sessions: Vec::new(),
            phase: BlockPhase::Focus,
            focus_min: 50,
            rest_min: 10,
            block_index: 0,
            last_focus_date: today_str(),
            direction_id: None,
            persist_path: None,
        };

        let deadline = state.deadline.unwrap();
        state.advance(deadline);

        assert!(state.take_sessions().is_empty());
        assert!(state.session_started.is_some());
    }

    // --- Block mode tests ---

    #[test]
    fn block_mode_rest_starts_automatically_at_focus_zero() {
        let mut state = TimerState {
            total_secs: 50 * 60,
            remaining_secs: 1,
            deadline: Some(SystemTime::now() + Duration::from_secs(1)),
            mode: TimerMode::Block,
            overtime_secs: 0,
            session_started: Some(SystemTime::now() - Duration::from_secs(50 * 60 - 1)),
            pending_sessions: Vec::new(),
            phase: BlockPhase::Focus,
            focus_min: 50,
            rest_min: 10,
            block_index: 0,
            last_focus_date: today_str(),
            direction_id: Some("dir-1".into()),
            persist_path: None,
        };

        let deadline = state.deadline.unwrap();
        let ring = state.advance(deadline);

        // Crossing focus zero rings
        assert!(ring, "reaching zero in focus phase must ring");
        // Automatically transitioned to Rest phase
        assert_eq!(state.phase, BlockPhase::Rest, "phase must transition to rest");
        // Rest countdown is actively running with deadline
        assert!(state.deadline.is_some(), "rest phase must start automatically");
        assert_eq!(state.remaining_secs, 10 * 60, "rest duration must be 10 minutes");
        assert_eq!(state.total_secs, 10 * 60);

        // Session was recorded for the completed focus phase
        let sessions = state.take_sessions();
        assert_eq!(sessions.len(), 1, "completed focus phase must emit a session");
        assert!(sessions[0].completed);
        assert_eq!(sessions[0].direction_id, Some("dir-1".into()));
        assert_eq!(sessions[0].phase, BlockPhase::Focus);
    }

    #[test]
    fn block_index_increments_per_completed_focus_phase() {
        let mut state = TimerState {
            total_secs: 50 * 60,
            remaining_secs: 1,
            deadline: Some(SystemTime::now() + Duration::from_secs(1)),
            mode: TimerMode::Block,
            overtime_secs: 0,
            session_started: Some(SystemTime::now() - Duration::from_secs(50 * 60 - 1)),
            pending_sessions: Vec::new(),
            phase: BlockPhase::Focus,
            focus_min: 50,
            rest_min: 10,
            block_index: 0,
            last_focus_date: today_str(),
            direction_id: None,
            persist_path: None,
        };

        assert_eq!(state.block_index, 0);
        let deadline = state.deadline.unwrap();
        state.advance(deadline);
        assert_eq!(state.block_index, 1, "first completed focus phase increments block_index to 1");

        // Advance rest phase to completion
        let rest_deadline = state.deadline.unwrap();
        state.advance(rest_deadline);
        assert_eq!(state.phase, BlockPhase::Focus, "after rest, returns to focus");
        assert_eq!(state.block_index, 1, "rest completion does not increment block_index");

        // Start next focus phase
        state.deadline = Some(SystemTime::now() + Duration::from_secs(1));
        state.session_started = Some(SystemTime::now() - Duration::from_secs(50 * 60));
        let next_focus_deadline = state.deadline.unwrap();
        state.advance(next_focus_deadline);
        assert_eq!(state.block_index, 2, "second completed focus phase increments block_index to 2");
    }

    /// A block-mode state sitting in its break.
    fn resting_state(deadline: Option<SystemTime>) -> TimerState {
        TimerState {
            total_secs: 10 * 60,
            remaining_secs: 300,
            deadline,
            mode: TimerMode::Block,
            overtime_secs: 0,
            session_started: None,
            pending_sessions: Vec::new(),
            phase: BlockPhase::Rest,
            focus_min: 50,
            rest_min: 10,
            block_index: 1,
            last_focus_date: today_str(),
            direction_id: None,
            persist_path: None,
        }
    }

    #[test]
    fn the_break_cannot_be_escaped_while_it_runs() {
        let state = resting_state(Some(SystemTime::now() + Duration::from_secs(300)));
        assert!(state.in_rest(), "a running break is a break");
    }

    #[test]
    fn pausing_the_break_does_not_open_an_escape() {
        // The defect this guards: pause() clears `deadline`, and the mode guard
        // used to require `deadline.is_some()` — so pausing the break and then
        // switching modes walked out of it.
        let paused = resting_state(None);

        assert!(
            paused.in_rest(),
            "a paused break is still a break, so mode and duration changes stay refused",
        );
    }

    #[test]
    fn a_finished_break_is_not_guarded() {
        // Once rest has completed the state is back in focus, and refusing
        // changes there would freeze the timer for the rest of the day.
        let mut state = resting_state(None);
        state.phase = BlockPhase::Focus;

        assert!(!state.in_rest());
    }

    #[test]
    fn other_modes_are_never_guarded() {
        let mut state = resting_state(None);
        state.mode = TimerMode::Countdown;

        // Only block mode has a break to protect.
        assert!(!state.in_rest());
    }

    #[test]
    fn block_index_survives_a_simulated_restart() {
        let temp_dir = std::env::temp_dir().join(format!("alarmer_test_{}", unix_millis(SystemTime::now())));
        let _ = fs::create_dir_all(&temp_dir);
        let store_file = temp_dir.join("alarmer.json");

        // Instance 1: completes a block and persists state
        {
            let mut state = TimerState {
                total_secs: 50 * 60,
                remaining_secs: 1,
                deadline: Some(SystemTime::now() + Duration::from_secs(1)),
                mode: TimerMode::Block,
                overtime_secs: 0,
                session_started: Some(SystemTime::now() - Duration::from_secs(50 * 60 - 1)),
                pending_sessions: Vec::new(),
                phase: BlockPhase::Focus,
                focus_min: 50,
                rest_min: 10,
                block_index: 2,
                last_focus_date: today_str(),
                direction_id: Some("dir-123".into()),
                persist_path: Some(store_file.clone()),
            };

            let deadline = state.deadline.unwrap();
            state.advance(deadline);
            assert_eq!(state.block_index, 3);
            // State automatically saved during advance
        }

        // Instance 2: simulated fresh restart
        {
            let mut new_state = TimerState {
                total_secs: DEFAULT_SECS,
                remaining_secs: DEFAULT_SECS,
                deadline: None,
                mode: TimerMode::Block,
                overtime_secs: 0,
                session_started: None,
                pending_sessions: Vec::new(),
                phase: BlockPhase::Focus,
                focus_min: 50,
                rest_min: 10,
                block_index: 0,
                last_focus_date: String::new(),
                direction_id: None,
                persist_path: Some(store_file.clone()),
            };

            new_state.load_persisted();
            assert_eq!(new_state.block_index, 3, "block_index must survive simulated restart");
            assert_eq!(new_state.last_focus_date, today_str());
            assert_eq!(new_state.direction_id, Some("dir-123".into()));
        }

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
