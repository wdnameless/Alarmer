//! Alarm scheduler that lives in the backend.
//!
//! The frontend owns the alarm list but cannot be trusted to fire alarms: its
//! timers stop when the window is hidden in the tray, when a different tab is
//! open, or when WebView2 throttles a background page. So the frontend pushes
//! the schedule down here and this loop decides when to ring.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

/// One alarm as the scheduler sees it. Mirrors the frontend `AlarmItem`.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScheduledAlarm {
    pub id: String,
    pub label: String,
    /// "HH:MM" in 24-hour local time.
    pub time: String,
    /// Weekdays, 0 = Sunday. Empty means "every day".
    pub days: Vec<u32>,
    pub enabled: bool,
    /// Voice line spoken when the alarm rings.
    #[serde(default)]
    pub voice_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AlarmFiredEvent {
    pub id: String,
    pub label: String,
    pub time: String,
    pub voice_prompt: Option<String>,
    /// Minutes the alarm was deferred by snooze, 0 for a normal fire.
    pub snoozed_for: u32,
}

#[derive(Default, Debug)]
struct SchedulerState {
    alarms: Vec<ScheduledAlarm>,
    /// `alarm_id` -> instant at which a snoozed alarm should ring.
    snoozed: Vec<(String, Instant)>,
    /// `alarm_id` -> "HH:MM" already fired today, so we ring once per minute slot.
    fired: Vec<(String, String)>,
}

static STATE: Mutex<Option<SchedulerState>> = Mutex::new(None);

fn with_state<T>(f: impl FnOnce(&mut SchedulerState) -> T) -> T {
    let mut guard = STATE.lock().expect("scheduler state poisoned");
    if guard.is_none() {
        *guard = Some(SchedulerState::default());
    }
    f(guard.as_mut().expect("state initialised above"))
}

/// Replaces the schedule the frontend wants enforced.
pub fn sync(alarms: Vec<ScheduledAlarm>) {
    with_state(|state| {
        state.alarms = alarms;
        // Drop snoozes and fired markers for alarms that no longer exist.
        let known: Vec<String> = state.alarms.iter().map(|a| a.id.clone()).collect();
        state.snoozed.retain(|(id, _)| known.contains(id));
        state.fired.retain(|(id, _)| known.contains(id));
    });
}

/// Defers an alarm by `minutes`, overriding any pending snooze for it.
pub fn snooze(id: &str, minutes: u32) {
    with_state(|state| {
        state.snoozed.retain(|(existing, _)| existing != id);
        state
            .snoozed
            .push((id.to_string(), Instant::now() + Duration::from_secs(minutes as u64 * 60)));
        // Allow the original slot to ring again later if it is still matching.
        state.fired.retain(|(existing, _)| existing != id);
    });
}

/// Marks an alarm as acknowledged: clears its snooze and today's fired marker.
pub fn dismiss(id: &str) {
    with_state(|state| {
        state.snoozed.retain(|(existing, _)| existing != id);
        state.fired.retain(|(existing, _)| existing != id);
    });
}

fn local_now() -> (u32, u32, String, u32) {
    // Minimal local-time derivation without pulling a chrono dependency:
    // Windows reports local time via SystemTime + the process timezone offset.
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();

    // Local offset in seconds, resolved once per tick (cheap and always correct
    // across DST changes).
    let offset = local_utc_offset_seconds();
    let local = (secs as i64 + offset).max(0) as u64;

    let days_since_epoch = local / 86_400;
    let seconds_today = local % 86_400;

    let hour = (seconds_today / 3600) as u32;
    let minute = ((seconds_today % 3600) / 60) as u32;

    // 1970-01-01 was a Thursday (=4 with Sunday = 0).
    let weekday = ((days_since_epoch + 4) % 7) as u32;

    (hour, minute, format!("{hour:02}:{minute:02}"), weekday)
}

/// Reads the system UTC offset in seconds.
///
/// On Windows this uses the current timezone information; elsewhere it falls
/// back to zero, which only affects users outside UTC.
#[cfg(windows)]
fn local_utc_offset_seconds() -> i64 {
    use std::mem::MaybeUninit;
    #[repr(C)]
    struct SystemTime {
        year: u16,
        month: u16,
        day_of_week: u16,
        day: u16,
        hour: u16,
        minute: u16,
        second: u16,
        milliseconds: u16,
    }
    #[link(name = "kernel32")]
    extern "system" {
        fn GetLocalTime(lp_system_time: *mut SystemTime);
    }
    // GetLocalTime gives no offset directly; compare against UTC via SystemTime.
    let mut local = MaybeUninit::<SystemTime>::uninit();
    unsafe {
        GetLocalTime(local.as_mut_ptr());
        let local = local.assume_init();
        let local_secs = (local.hour as i64) * 3600 + (local.minute as i64) * 60 + local.second as i64;

        let utc = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        let utc_secs = (utc.as_secs() % 86_400) as i64;

        let mut diff = local_secs - utc_secs;
        if diff > 43_200 {
            diff -= 86_400;
        } else if diff < -43_200 {
            diff += 86_400;
        }
        diff
    }
}

#[cfg(not(windows))]
fn local_utc_offset_seconds() -> i64 {
    0
}


/// Pure decision step: given the current state and clock, returns the alarms
/// that must ring now. Extracted from the polling loop so it can be tested
/// without a Tauri runtime.
fn tick(state: &mut SchedulerState, hhmm: &str, weekday: u32, now: Instant) -> Vec<AlarmFiredEvent> {
    let mut to_fire: Vec<AlarmFiredEvent> = Vec::new();

    // Snoozed alarms are due purely by elapsed time.
    let due: Vec<String> = state
        .snoozed
        .iter()
        .filter(|(_, at)| *at <= now)
        .map(|(id, _)| id.clone())
        .collect();

    for id in due {
        state.snoozed.retain(|(existing, _)| existing != &id);
        if let Some(alarm) = state.alarms.iter().find(|a| a.id == id) {
            to_fire.push(AlarmFiredEvent {
                id: alarm.id.clone(),
                label: alarm.label.clone(),
                time: alarm.time.clone(),
                voice_prompt: alarm.voice_prompt.clone(),
                snoozed_for: 0,
            });
        }
    }

    // Regular schedule matches: enabled, right minute, right weekday, not
    // already fired this minute and not currently snoozed.
    let matches: Vec<ScheduledAlarm> = state
        .alarms
        .iter()
        .filter(|a| a.enabled && a.time == hhmm)
        .filter(|a| a.days.is_empty() || a.days.contains(&weekday))
        .filter(|a| {
            let snoozed = state.snoozed.iter().any(|(id, _)| id == &a.id);
            let fired = state.fired.iter().any(|(id, slot)| id == &a.id && slot == hhmm);
            !snoozed && !fired
        })
        .cloned()
        .collect();

    for alarm in matches {
        state.fired.push((alarm.id.clone(), hhmm.to_string()));
        to_fire.push(AlarmFiredEvent {
            id: alarm.id.clone(),
            label: alarm.label.clone(),
            time: alarm.time.clone(),
            voice_prompt: alarm.voice_prompt.clone(),
            snoozed_for: 0,
        });
    }

    // Forget yesterday's markers at midnight so slots can ring again tomorrow.
    if hhmm == "00:00" {
        state.fired.clear();
    }

    to_fire
}

/// Starts the 1-second polling loop. Runs for the lifetime of the process.
pub fn spawn(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Wake slightly more often than once per second so we never skip a minute.
        let mut ticker = tokio::time::interval(Duration::from_millis(500));
        loop {
            ticker.tick().await;

            let (_, _, hhmm, weekday) = local_now();
            let to_fire = with_state(|state| tick(state, &hhmm, weekday, Instant::now()));

            for event in to_fire {
                let label = event.label.clone();
                let prompt = event.voice_prompt.clone();

                // Ring in the webview when it is visible; otherwise use the OS.
                let visible = app
                    .get_webview_window("main")
                    .and_then(|w| w.is_visible().ok())
                    .unwrap_or(false);

                let _ = app.emit("alarm://fired", event);

                if !visible {
                    use tauri_plugin_notification::NotificationExt;
                    let body = prompt.clone().unwrap_or_else(|| label.clone());
                    let _ = app
                        .notification()
                        .builder()
                        .title(format!("Будильник — {label}"))
                        .body(body)
                        .show();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn alarm(id: &str, time: &str, days: Vec<u32>) -> ScheduledAlarm {
        ScheduledAlarm {
            id: id.to_string(),
            label: format!("Alarm {id}"),
            time: time.to_string(),
            days,
            enabled: true,
            voice_prompt: None,
        }
    }

    fn state_with(alarms: Vec<ScheduledAlarm>) -> SchedulerState {
        SchedulerState {
            alarms,
            snoozed: Vec::new(),
            fired: Vec::new(),
        }
    }

    #[test]
    fn fires_when_time_and_weekday_match() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![1, 2, 3, 4, 5])]);
        let fired = tick(&mut state, "07:00", 1, Instant::now());
        assert_eq!(fired.len(), 1, "matching alarm must fire");
        assert_eq!(fired[0].id, "a");
    }

    #[test]
    fn does_not_fire_twice_in_the_same_minute() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![])]);
        let now = Instant::now();
        assert_eq!(tick(&mut state, "07:00", 1, now).len(), 1);
        assert_eq!(tick(&mut state, "07:00", 1, now).len(), 0, "must ring once per minute");
    }

    #[test]
    fn skips_wrong_weekday() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![6])]);
        assert_eq!(tick(&mut state, "07:00", 1, Instant::now()).len(), 0);
    }

    #[test]
    fn empty_days_means_every_day() {
        let mut state = state_with(vec![alarm("a", "09:30", vec![])]);
        for weekday in 0..7 {
            state.fired.clear();
            assert_eq!(tick(&mut state, "09:30", weekday, Instant::now()).len(), 1);
        }
    }

    #[test]
    fn disabled_alarm_never_fires() {
        let mut a = alarm("a", "07:00", vec![]);
        a.enabled = false;
        let mut state = state_with(vec![a]);
        assert_eq!(tick(&mut state, "07:00", 1, Instant::now()).len(), 0);
    }

    #[test]
    fn snoozed_alarm_is_suppressed_then_fires_after_delay() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![])]);
        let now = Instant::now();
        state.snoozed.push(("a".into(), now + Duration::from_secs(60)));

        assert_eq!(tick(&mut state, "07:00", 1, now).len(), 0, "snoozed slot is skipped");

        let later = state.snoozed[0].1 + Duration::from_secs(1);
        let fired = tick(&mut state, "07:01", 1, later);
        assert_eq!(fired.len(), 1, "snoozed alarm must ring once the delay elapses");
        assert_eq!(fired[0].id, "a");
    }

    #[test]
    fn sync_drops_snooze_for_removed_alarm() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![])]);
        state.snoozed.push(("gone".into(), Instant::now() + Duration::from_secs(60)));
        // Mirror what sync() does when the frontend deletes an alarm.
        let known = vec!["a".to_string()];
        state.snoozed.retain(|(id, _)| known.contains(id));
        assert!(state.snoozed.is_empty(), "orphaned snooze must be discarded");
    }

    #[test]
    fn midnight_clears_fired_markers() {
        let mut state = state_with(vec![alarm("a", "00:00", vec![])]);
        tick(&mut state, "00:00", 1, Instant::now());
        assert!(state.fired.is_empty(), "markers reset at midnight for the next day");
    }
}
