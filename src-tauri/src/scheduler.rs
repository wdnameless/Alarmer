//! Alarm scheduler that lives in the backend.
//!
//! The frontend owns the alarm list but cannot be trusted to fire alarms: its
//! timers stop when the window is hidden in the tray, when a different tab is
//! open, or when WebView2 throttles a background page. So the frontend pushes
//! the schedule down here and this loop decides when to ring.

use chrono::{Datelike, Local, NaiveDate, NaiveDateTime, Timelike};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::{Emitter, Manager};

/// How many minutes late an alarm may still ring.
///
/// Ticks can be delayed by a busy machine, a frozen process or a restart a
/// moment after the alarm's time, and all of those should still ring. Anything
/// later is reported as missed instead: a reminder that arrives hours late is
/// worse than one that never claims to have fired on time.
const CATCH_UP_MINUTES: i64 = 5;

/// How often the loop wakes. Just under a second, so a minute is never skipped.
const TICK_INTERVAL: Duration = Duration::from_millis(500);

/// How often a given alarm is allowed to ring.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum Repeat {
    /// Rings at its next matching moment, then switches itself off.
    Once,
    /// Rings every day. Weekdays are ignored.
    #[default]
    Daily,
    /// Rings only on the weekdays in `days`.
    Days,
}

/// One alarm as the scheduler sees it. Mirrors the frontend `AlarmItem`.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScheduledAlarm {
    pub id: String,
    pub label: String,
    /// "HH:MM" in 24-hour local time.
    pub time: String,
    /// Weekdays, 0 = Sunday. Only consulted when `repeat` is `Days`.
    #[serde(default)]
    pub days: Vec<u32>,
    #[serde(default)]
    pub repeat: Repeat,
    pub enabled: bool,
    /// Signal shape to play, matching the frontend alarm profiles.
    #[serde(default = "default_sound")]
    pub sound: String,
    /// Voice line spoken when the alarm rings.
    #[serde(default)]
    pub voice_prompt: Option<String>,
}

fn default_sound() -> String {
    "gentle".to_string()
}

#[derive(Debug, Clone, Serialize)]
pub struct AlarmFiredEvent {
    pub id: String,
    pub label: String,
    pub time: String,
    pub voice_prompt: Option<String>,
    /// Minutes the alarm was deferred by snooze, 0 for a scheduled ring.
    pub snoozed_for: u32,
    /// Minutes past its own time when it eventually rang; 0 when on time.
    pub late_by_minutes: u32,
    /// Set when ringing this alarm switched it off for good.
    pub consumed: bool,
}

/// An alarm whose moment passed while nothing was listening.
#[derive(Debug, Clone, Serialize)]
pub struct MissedAlarm {
    pub id: String,
    pub label: String,
    pub time: String,
    /// Minutes past its own time when it was noticed.
    pub late_by_minutes: u32,
}

#[derive(Debug, Clone)]
struct Snooze {
    id: String,
    due_at: SystemTime,
    minutes: u32,
}

#[derive(Default, Debug)]
struct SchedulerState {
    alarms: Vec<ScheduledAlarm>,
    snoozed: Vec<Snooze>,
    /// `(alarm_id, local date)` already handled today, so nothing rings twice —
    /// including after the user acknowledges it mid-minute.
    handled: Vec<(String, NaiveDate)>,
    /// Today's skipped alarms, for the "missed" surface.
    missed: Vec<(NaiveDate, MissedAlarm)>,
    /// False until the first sync, which carries restored state rather than a
    /// newly created alarm and therefore keeps its catch-up chance.
    synced_once: bool,
}

static STATE: Mutex<Option<SchedulerState>> = Mutex::new(None);

/// Runs `f` against the scheduler state.
///
/// Poisoning is recovered rather than propagated: with `panic = "abort"` in the
/// release profile, an abort here would take the whole process — and every
/// pending alarm — down with it.
fn with_state<T>(f: impl FnOnce(&mut SchedulerState) -> T) -> T {
    let mut guard = STATE.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    f(guard.get_or_insert_with(SchedulerState::default))
}

/// "HH:MM" to minutes since local midnight.
fn parse_hhmm(value: &str) -> Option<i64> {
    let (hours, minutes) = value.split_once(':')?;
    let hours: i64 = hours.trim().parse().ok()?;
    let minutes: i64 = minutes.trim().parse().ok()?;
    (hours <= 23 && minutes <= 59).then_some(hours * 60 + minutes)
}

fn rings_on(alarm: &ScheduledAlarm, weekday: u32) -> bool {
    match alarm.repeat {
        // A one-shot rings at its next moment regardless of weekday: it turns
        // itself off the instant it has rung, so it cannot repeat.
        Repeat::Once | Repeat::Daily => true,
        Repeat::Days => alarm.days.contains(&weekday),
    }
}

/// Replaces the schedule the frontend wants enforced.
pub fn sync(alarms: Vec<ScheduledAlarm>) {
    with_state(|state| {
        let known: Vec<String> = state.alarms.iter().map(|a| a.id.clone()).collect();

        // An alarm created now for a time that has already gone today waits for
        // its next occurrence instead of ringing — or being reported as missed —
        // the moment it is created. The first sync after startup is different:
        // that list is restored state, and its alarms keep their catch-up chance.
        if state.synced_once {
            let now = Local::now().naive_local();
            let minute_of_day = now.hour() as i64 * 60 + now.minute() as i64;
            for alarm in &alarms {
                let already_known = known.contains(&alarm.id);
                let passed_today = parse_hhmm(&alarm.time).is_some_and(|at| at < minute_of_day);
                if !already_known && passed_today {
                    state.handled.push((alarm.id.clone(), now.date()));
                }
            }
        }
        state.synced_once = true;

        state.alarms = alarms;
        let ids: Vec<String> = state.alarms.iter().map(|a| a.id.clone()).collect();
        state.snoozed.retain(|s| ids.contains(&s.id));
        state.handled.retain(|(id, _)| ids.contains(id));
        state.missed.retain(|(_, m)| ids.contains(&m.id));
    });
}

/// Defers an alarm by `minutes`, replacing any pending snooze for it.
///
/// The "handled today" marker is left alone: the alarm already had its moment,
/// and snoozing must not re-arm that slot as well as the deferred one.
pub fn snooze(id: &str, minutes: u32) {
    with_state(|state| {
        state.snoozed.retain(|s| s.id != id);
        state.snoozed.push(Snooze {
            id: id.to_string(),
            due_at: SystemTime::now() + Duration::from_secs(minutes as u64 * 60),
            minutes,
        });
    });
}

/// Marks an alarm as acknowledged by clearing its pending snooze.
///
/// The "handled today" marker stays. Clearing it would let the next tick —
/// half a second later, still inside the same minute — match the alarm again and
/// ring it straight back at the person who just silenced it.
pub fn dismiss(id: &str) {
    with_state(|state| state.snoozed.retain(|s| s.id != id));
}

/// Alarms skipped today, oldest first.
pub fn missed_today() -> Vec<MissedAlarm> {
    let today = Local::now().naive_local().date();
    with_state(|state| {
        state
            .missed
            .iter()
            .filter(|(day, _)| *day == today)
            .map(|(_, alarm)| alarm.clone())
            .collect()
    })
}

/// Records a ring and returns the event to broadcast.
///
/// A one-shot alarm is switched off here rather than in the frontend, so it
/// stays quiet even if the window never acknowledges the event.
fn ring(
    state: &mut SchedulerState,
    alarm: &ScheduledAlarm,
    snoozed_for: u32,
    late_by_minutes: u32,
) -> AlarmFiredEvent {
    let consumed = alarm.repeat == Repeat::Once;
    if consumed {
        if let Some(slot) = state.alarms.iter_mut().find(|a| a.id == alarm.id) {
            slot.enabled = false;
        }
    }

    AlarmFiredEvent {
        id: alarm.id.clone(),
        label: alarm.label.clone(),
        time: alarm.time.clone(),
        voice_prompt: alarm.voice_prompt.clone(),
        snoozed_for,
        late_by_minutes,
        consumed,
    }
}

fn find_alarm(state: &SchedulerState, id: &str) -> Option<ScheduledAlarm> {
    state.alarms.iter().find(|a| a.id == id).cloned()
}

/// Pure decision step: given the state and the local clock, returns the alarms
/// that must ring plus any that had to be marked as missed.
///
/// Extracted from the polling loop so both outcomes can be tested without a
/// Tauri runtime.
fn tick(state: &mut SchedulerState, now: NaiveDateTime) -> (Vec<AlarmFiredEvent>, Vec<MissedAlarm>) {
    let today = now.date();
    let weekday = now.weekday().num_days_from_sunday();
    let minute_of_day = now.hour() as i64 * 60 + now.minute() as i64;

    // Yesterday's bookkeeping says nothing about today.
    state.handled.retain(|(_, day)| *day == today);
    state.missed.retain(|(day, _)| *day == today);

    let mut fired = Vec::new();
    let mut missed = Vec::new();

    // Snoozed alarms are due purely by elapsed wall-clock time.
    let due: Vec<Snooze> = state
        .snoozed
        .iter()
        .filter(|s| s.due_at <= SystemTime::now())
        .cloned()
        .collect();

    for entry in due {
        state.snoozed.retain(|s| s.id != entry.id);
        if let Some(alarm) = find_alarm(state, &entry.id) {
            if alarm.enabled {
                fired.push(ring(state, &alarm, entry.minutes, 0));
            }
        }
    }

    // Scheduled matches: enabled, runs today, not snoozed, not already handled.
    let pending: Vec<ScheduledAlarm> = state
        .alarms
        .iter()
        .filter(|a| a.enabled && rings_on(a, weekday))
        .filter(|a| !state.snoozed.iter().any(|s| s.id == a.id))
        .filter(|a| !state.handled.iter().any(|(id, _)| id == &a.id))
        .cloned()
        .collect();

    for alarm in pending {
        let Some(at) = parse_hhmm(&alarm.time) else {
            continue;
        };
        let late_by = minute_of_day - at;
        if late_by < 0 {
            continue; // still ahead of us today
        }

        state.handled.push((alarm.id.clone(), today));
        if late_by <= CATCH_UP_MINUTES {
            fired.push(ring(state, &alarm, 0, late_by as u32));
        } else {
            missed.push(MissedAlarm {
                id: alarm.id.clone(),
                label: alarm.label.clone(),
                time: alarm.time.clone(),
                late_by_minutes: late_by as u32,
            });
        }
    }

    for alarm in &missed {
        state.missed.push((today, alarm.clone()));
    }

    (fired, missed)
}

/// Signal profile configured for `id`, falling back to a global default.
fn find_sound(id: &str) -> String {
    with_state(|state| {
        state
            .alarms
            .iter()
            .find(|a| a.id == id)
            .map(|a| a.sound.clone())
            .unwrap_or_else(default_sound)
    })
}

/// Alarm volume (0..1) with a sensible default.
pub fn audio_settings() -> (f32, bool) {
    let guard = AUDIO_PREFS.lock().unwrap_or_else(|e| e.into_inner());
    guard.unwrap_or((0.8, true))
}

/// Pushes the user's audio preferences down from the frontend.
pub fn set_audio_prefs(volume: f32, enabled: bool) {
    let mut guard = AUDIO_PREFS.lock().unwrap_or_else(|e| e.into_inner());
    *guard = Some((volume.clamp(0.0, 1.0), enabled));
}

static AUDIO_PREFS: Mutex<Option<(f32, bool)>> = Mutex::new(None);

/// Starts the polling loop. Runs for the lifetime of the process.
pub fn spawn(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(TICK_INTERVAL);
        loop {
            ticker.tick().await;

            let now = Local::now().naive_local();
            let (fired, missed) = with_state(|state| tick(state, now));

            for alarm in missed {
                let _ = app.emit("alarm://missed", alarm);
            }

            for event in fired {
                let id = event.id.clone();
                let label = event.label.clone();
                let prompt = event.voice_prompt.clone();
                let sound = find_sound(&id);

                let _ = app.emit("alarm://fired", event);

                // The webview is ringing it out loud whenever it is alive; a
                // hidden window has nothing to play from, so the OS takes over.
                let visible = app
                    .get_webview_window("main")
                    .and_then(|w| w.is_visible().ok())
                    .unwrap_or(false);

                if !visible {
                    // A hidden window cannot play anything, so the backend
                    // raises the signal itself rather than letting the alarm
                    // go off in silence.
                    if let Err(e) = crate::alarm_sound::start(&id, &sound, audio_settings().0) {
                        eprintln!("alarm audio unavailable: {e}");
                    }

                    use tauri_plugin_notification::NotificationExt;
                    let body = prompt.unwrap_or_else(|| label.clone());
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
            repeat: Repeat::Days,
            enabled: true,
            sound: default_sound(),
            voice_prompt: None,
        }
    }

    fn one_shot(id: &str, time: &str) -> ScheduledAlarm {
        ScheduledAlarm {
            repeat: Repeat::Once,
            days: Vec::new(),
            ..alarm(id, time, Vec::new())
        }
    }

    /// 2026-01-07 is a Wednesday (weekday index 3 with Sunday = 0).
    fn wednesday(hour: u32, minute: u32) -> NaiveDateTime {
        NaiveDate::from_ymd_opt(2026, 1, 7)
            .unwrap()
            .and_hms_opt(hour, minute, 0)
            .unwrap()
    }

    fn state_with(alarms: Vec<ScheduledAlarm>) -> SchedulerState {
        SchedulerState {
            alarms,
            ..SchedulerState::default()
        }
    }

    #[test]
    fn fires_when_time_and_weekday_match() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);
        let (fired, missed) = tick(&mut state, wednesday(7, 0));

        assert_eq!(fired.len(), 1, "matching alarm must fire");
        assert_eq!(fired[0].id, "a");
        assert!(missed.is_empty());
    }

    #[test]
    fn skips_a_weekday_the_alarm_does_not_run_on() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![6])]);
        assert!(tick(&mut state, wednesday(7, 0)).0.is_empty());
    }

    #[test]
    fn daily_alarm_rings_every_day() {
        let mut state = state_with(vec![ScheduledAlarm {
            repeat: Repeat::Daily,
            ..alarm("a", "09:30", Vec::new())
        }]);

        for day in 5..12 {
            state.handled.clear();
            let date = NaiveDate::from_ymd_opt(2026, 1, day).unwrap().and_hms_opt(9, 30, 0).unwrap();
            assert_eq!(tick(&mut state, date).0.len(), 1, "daily alarm must ring on {date}");
        }
    }

    #[test]
    fn disabled_alarm_never_fires() {
        let mut slot = alarm("a", "07:00", Vec::new());
        slot.repeat = Repeat::Daily;
        slot.enabled = false;
        let mut state = state_with(vec![slot]);

        assert!(tick(&mut state, wednesday(7, 0)).0.is_empty());
    }

    #[test]
    fn rings_once_per_day_not_once_per_tick() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);

        assert_eq!(tick(&mut state, wednesday(7, 0)).0.len(), 1);
        // The loop wakes twice a minute; the same slot must not ring twice.
        assert_eq!(tick(&mut state, wednesday(7, 0)).0.len(), 0, "must ring once per day");
    }

    #[test]
    fn dismissed_alarm_stays_silent_for_the_rest_of_the_minute() {
        // Regression: dismiss() used to clear the "handled" marker, so the very
        // next tick re-matched the same minute and rang straight back at whoever
        // had just pressed Stop.
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);

        assert_eq!(tick(&mut state, wednesday(7, 0)).0.len(), 1, "first ring");
        dismiss("a");
        assert!(
            tick(&mut state, wednesday(7, 0)).0.is_empty(),
            "an acknowledged alarm must not ring again in the same minute"
        );
    }

    #[test]
    fn snoozed_alarm_is_suppressed_then_rings_at_the_deferred_time() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);
        state.handled.push(("a".into(), wednesday(7, 0).date()));
        state.snoozed.push(Snooze {
            id: "a".into(),
            due_at: SystemTime::now() - Duration::from_secs(1),
            minutes: 5,
        });

        let (fired, _) = tick(&mut state, wednesday(7, 5));
        assert_eq!(fired.len(), 1, "a due snooze must ring");
        assert_eq!(fired[0].snoozed_for, 5);
    }

    #[test]
    fn a_pending_snooze_suppresses_the_scheduled_slot() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);
        state.snoozed.push(Snooze {
            id: "a".into(),
            due_at: SystemTime::now() + Duration::from_secs(600),
            minutes: 10,
        });

        assert!(tick(&mut state, wednesday(7, 0)).0.is_empty(), "snoozed slot must stay quiet");
    }

    #[test]
    fn one_shot_alarm_switches_itself_off_after_ringing() {
        let mut state = state_with(vec![one_shot("a", "07:00")]);

        let (fired, _) = tick(&mut state, wednesday(7, 0));
        assert_eq!(fired.len(), 1);
        assert!(fired[0].consumed, "the ring must report that it consumed the alarm");
        assert!(!state.alarms[0].enabled, "a one-shot must not stay armed");
        assert!(tick(&mut state, wednesday(7, 0)).0.is_empty());
    }

    #[test]
    fn re_arming_a_one_shot_lets_it_ring_again() {
        let mut state = state_with(vec![one_shot("a", "07:00")]);
        tick(&mut state, wednesday(7, 0));

        // The user turns it back on; the next occurrence rings normally.
        state.alarms[0].enabled = true;
        state.handled.clear();

        let (fired, _) = tick(&mut state, wednesday(7, 0));
        assert_eq!(fired.len(), 1, "a re-armed one-shot must ring");
    }

    #[test]
    fn an_alarm_a_minute_late_still_rings() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);

        let (fired, missed) = tick(&mut state, wednesday(7, 2));

        assert_eq!(fired.len(), 1, "a slightly delayed tick must still ring");
        assert_eq!(fired[0].late_by_minutes, 2);
        assert!(missed.is_empty());
    }

    #[test]
    fn an_alarm_hours_late_is_reported_as_missed_not_rung() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);

        let (fired, missed) = tick(&mut state, wednesday(11, 30));

        assert!(fired.is_empty(), "a stale reminder must not ring hours later");
        assert_eq!(missed.len(), 1);
        assert_eq!(missed[0].time, "07:00");
        assert_eq!(state.missed.len(), 1, "it stays visible for the rest of the day");
        // And it is not re-reported on every following tick.
        assert!(tick(&mut state, wednesday(11, 30)).1.is_empty());
    }

    #[test]
    fn a_future_alarm_is_neither_rung_nor_missed() {
        let mut state = state_with(vec![alarm("a", "22:00", vec![3])]);

        let (fired, missed) = tick(&mut state, wednesday(7, 0));
        assert!(fired.is_empty());
        assert!(missed.is_empty());
    }

    #[test]
    fn a_malformed_time_is_ignored_rather_than_crashing_the_loop() {
        let mut state = state_with(vec![alarm("a", "скоро", vec![3])]);
        assert!(tick(&mut state, wednesday(7, 0)).0.is_empty());
    }

    #[test]
    fn markers_from_yesterday_do_not_suppress_today() {
        let mut state = state_with(vec![alarm("a", "07:00", vec![3])]);
        state.handled.push(("a".into(), NaiveDate::from_ymd_opt(2026, 1, 6).unwrap()));

        assert_eq!(tick(&mut state, wednesday(7, 0)).0.len(), 1);
    }

    #[test]
    fn yesterday_is_forgotten_so_an_alarm_can_ring_again() {
        let mut state = state_with(vec![ScheduledAlarm {
            repeat: Repeat::Daily,
            ..alarm("a", "07:00", Vec::new())
        }]);
        tick(&mut state, wednesday(7, 0));

        // Thursday, same alarm: yesterday's marker must not silence it.
        let thursday = NaiveDate::from_ymd_opt(2026, 1, 8).unwrap().and_hms_opt(7, 0, 0).unwrap();
        assert_eq!(tick(&mut state, thursday).0.len(), 1);
    }
}
