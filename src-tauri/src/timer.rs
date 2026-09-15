//! Countdown timer that lives in the backend.
//!
//! The timer used to be React state inside the Timer component. Switching a
//! sub-tab unmounted the component and threw the countdown away, the mini
//! overlay froze because nothing was emitting, and the global hotkeys had
//! nothing to drive. Like the alarm scheduler, the clock now belongs to the
//! process so it keeps running whatever is on screen and whether or not the
//! window is visible.

use serde::{Deserialize, Serialize};
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
}

#[derive(Debug, Clone)]
struct TimerState {
    total_secs: u64,
    /// Authoritative while paused; while running the deadline is.
    remaining_secs: u64,
    /// When the countdown reaches zero. `None` means paused.
    deadline: Option<SystemTime>,
    mode: TimerMode,
    overtime_secs: u64,
}

impl Default for TimerState {
    fn default() -> Self {
        TimerState {
            total_secs: DEFAULT_SECS,
            remaining_secs: DEFAULT_SECS,
            deadline: None,
            mode: TimerMode::Countdown,
            overtime_secs: 0,
        }
    }
}

impl TimerState {
    /// Reconciles the stored remaining time with the wall clock.
    ///
    /// Returns true when this call crossed zero, so the caller rings exactly
    /// once no matter how the loop was scheduled.
    fn advance(&mut self, now: SystemTime) -> bool {
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
                true
            }
            TimerMode::Flow => {
                let past = now.duration_since(deadline).unwrap_or_default().as_secs();
                if past > self.overtime_secs {
                    self.overtime_secs = past;
                }
                // Ring on the crossing tick only, then keep counting up quietly.
                past == 0
            }
        }
    }

    fn snapshot(&self) -> TimerSnapshot {
        TimerSnapshot {
            total_secs: self.total_secs,
            remaining_secs: self.remaining_secs,
            running: self.deadline.is_some(),
            mode: self.mode,
            overtime_secs: self.overtime_secs,
            overtime: self.mode == TimerMode::Flow && self.remaining_secs == 0,
        }
    }
}

static STATE: Mutex<Option<TimerState>> = Mutex::new(None);

fn with_state<T>(f: impl FnOnce(&mut TimerState) -> T) -> T {
    let mut guard = STATE.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    f(guard.get_or_insert_with(TimerState::default))
}

/// Arms the timer with `secs`, replacing whatever was there. Paused.
pub fn set_duration(secs: u64) {
    with_state(|state| {
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
        // Resuming an already-finished countdown would ring instantly; start
        // it over instead.
        if state.remaining_secs == 0 {
            state.remaining_secs = state.total_secs;
        }
        state.overtime_secs = 0;
        state.deadline = Some(SystemTime::now() + Duration::from_secs(state.remaining_secs));
    });
}

/// Freezes the countdown at its current remaining time.
pub fn pause() {
    with_state(|state| {
        if let Some(deadline) = state.deadline.take() {
            let now = SystemTime::now();
            state.remaining_secs = deadline.duration_since(now).unwrap_or_default().as_secs();
        }
    });
}

/// Rewinds to the armed duration and stops.
pub fn reset() {
    with_state(|state| {
        state.remaining_secs = state.total_secs;
        state.deadline = None;
        state.overtime_secs = 0;
    });
}

/// Nudges the armed duration by `delta` minutes, clamped, and stops.
pub fn shift_minutes(delta: i64) {
    with_state(|state| {
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
        state.mode = mode;
        state.overtime_secs = 0;
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

        loop {
            ticker.tick().await;

            let (fired, state) = with_state(|state| {
                let crossed = state.advance(SystemTime::now());
                (crossed, state.snapshot())
            });

            // Emit on any real change rather than on every 250 ms poll, so a
            // paused timer is silent and a running one ticks once a second.
            if state.remaining_secs != last_remaining
                || state.overtime_secs != last_overtime
                || state.running != last_running
            {
                last_remaining = state.remaining_secs;
                last_overtime = state.overtime_secs;
                last_running = state.running;
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
}
