//! Alarm audio that does not depend on a visible window.
//!
//! When the window is hidden or minimised, WebView2 suspends the page and its
//! WebAudio graph with it, so an alarm raised in the webview is silent exactly
//! when it matters most. The backend therefore synthesises the signal itself and
//! plays it through the OS audio device.
//!
//! The signal shapes mirror the frontend profiles so an alarm sounds the same
//! whether it rang with the window open or in the tray.

use rodio::{buffer::SamplesBuffer, OutputStream, OutputStreamHandle};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// How long the signal takes to reach full volume.
const RAMP: Duration = Duration::from_secs(30);
/// The floor volume, so the first ring is audible but not startling.
const MIN_VOLUME: f32 = 0.05;
/// Silence inserted after each pass of the signal.
const TAIL_SECS: f32 = 2.0;
const RATE: u32 = 44_100;

/// Which alarm is currently audible. Every `start` and `stop` moves it on, and
/// the playing thread exits as soon as it sees a generation it does not own.
///
/// A generation counter rather than a shared handle: the audio stream is not
/// `Sync`, so it stays owned by the thread that plays it.
static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Identity of the alarm the current generation belongs to.
static CURRENT_ID: Mutex<Option<String>> = Mutex::new(None);

/// One alarm signal shape: a short motif plus how often it repeats.
struct Profile {
    notes: &'static [f32],
    /// Seconds between the starts of consecutive motifs.
    cadence: f32,
}

/// Mirrors `ALARM_PROFILES` in `src/services/sound.ts`.
fn profile_for(name: &str) -> Profile {
    match name {
        "chime" => Profile { notes: &[880.0, 1100.0, 1320.0], cadence: 3.5 },
        "radar" => Profile { notes: &[520.0, 700.0, 520.0], cadence: 2.5 },
        "energetic" => Profile { notes: &[880.0, 1100.0, 1320.0, 1760.0], cadence: 2.2 },
        "beep" => Profile { notes: &[1000.0, 1000.0, 1000.0], cadence: 3.0 },
        // "gentle" and anything unrecognised.
        _ => Profile { notes: &[660.0, 880.0], cadence: 4.0 },
    }
}

/// Renders one motif as mono PCM.
///
/// A note decays linearly rather than with a sine envelope, so the signal reads
/// as a deliberate alarm rather than a test tone.
fn render_motif(profile: &Profile, volume: f32) -> SamplesBuffer<f32> {
    const NOTE_SECS: f32 = 0.25;
    const NOTE_GAP: f32 = 0.1;

    let note_samples = (RATE as f32 * NOTE_SECS) as usize;
    let gap_samples = (RATE as f32 * NOTE_GAP) as usize;
    let tail_samples = (RATE as f32 * TAIL_SECS) as usize;
    let total = (note_samples + gap_samples) * profile.notes.len() + tail_samples;

    let mut samples = Vec::with_capacity(total);
    for &freq in profile.notes {
        for i in 0..note_samples {
            let t = i as f32 / RATE as f32;
            let phase = 2.0 * std::f32::consts::PI * freq * t;
            let decay = 1.0 - (i as f32 / note_samples as f32);
            samples.push(phase.sin() * decay * 0.3 * volume);
        }
        samples.extend(std::iter::repeat_n(0.0, gap_samples));
    }
    samples.extend(std::iter::repeat_n(0.0, tail_samples));

    SamplesBuffer::new(1, RATE, samples)
}

/// Plays one motif at the given volume.
fn play_motif(handle: &OutputStreamHandle, profile: &Profile, volume: f32) {
    // A dropped source is not an error worth failing an alarm over; the next
    // motif in the cadence is only seconds away.
    let _ = handle.play_raw(render_motif(profile, volume));
}

/// Starts ringing `id` with the named signal profile at `target_volume`.
///
/// Any alarm already ringing is silenced first: two alarms overlapping is
/// noise, not information.
pub fn start(id: &str, profile: &str, target_volume: f32) -> Result<(), String> {
    let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    *CURRENT_ID.lock().unwrap_or_else(|e| e.into_inner()) = Some(id.to_string());

    let shape = profile_for(profile);

    // The stream stays owned by this thread for as long as it plays; nothing
    // crosses threads except the generation counter.
    std::thread::spawn(move || {
        let Ok((_stream, handle)) = OutputStream::try_default() else {
            eprintln!("alarm audio: no output device");
            return;
        };

        let cadence = Duration::from_secs_f32(shape.cadence);
        let started = Instant::now();

        loop {
            if GENERATION.load(Ordering::SeqCst) != generation {
                return; // acknowledged, or superseded by another alarm
            }

            let progress = (started.elapsed().as_secs_f32() / RAMP.as_secs_f32()).min(1.0);
            let volume = MIN_VOLUME.max(target_volume * progress);

            if GENERATION.load(Ordering::SeqCst) != generation {
                return;
            }
            play_motif(&handle, &shape, volume);

            // Sleep in slices so a Stop is honoured promptly rather than one
            // whole cadence later.
            let deadline = Instant::now() + cadence;
            while Instant::now() < deadline {
                if GENERATION.load(Ordering::SeqCst) != generation {
                    return;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    });

    Ok(())
}

/// Silences whatever is ringing.
pub fn stop() {
    GENERATION.fetch_add(1, Ordering::SeqCst);
    *CURRENT_ID.lock().unwrap_or_else(|e| e.into_inner()) = None;
}

/// Id of the alarm currently ringing, if any.
///
/// The frontend asks for this on start-up: an alarm that began ringing while
/// the window was hidden is still ringing, and the takeover must appear when
/// the user finally opens the window.
pub fn ringing_id() -> Option<String> {
    CURRENT_ID.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_frontend_profile_has_a_shape() {
        for name in ["gentle", "chime", "radar", "energetic", "beep"] {
            let shape = profile_for(name);
            assert!(!shape.notes.is_empty(), "{name} must have at least one note");
            assert!(shape.cadence > 0.0, "{name} must have a positive cadence");
        }
    }

    #[test]
    fn an_unknown_profile_falls_back_instead_of_silence() {
        assert!(!profile_for("not-a-profile").notes.is_empty());
    }

    #[test]
    fn a_rendered_motif_is_audible_and_bounded() {
        let samples: Vec<f32> = render_motif(&profile_for("gentle"), 0.5).collect();

        assert!(!samples.is_empty());
        let peak = samples.iter().fold(0.0f32, |acc, s| acc.max(s.abs()));
        assert!(peak > 0.0, "the motif must produce sound");
        // Never clip: the render must stay inside the device range.
        assert!(peak <= 1.0, "peak {peak} exceeds full scale");
    }

    #[test]
    fn volume_scales_the_rendered_signal() {
        let peak = |s: Vec<f32>| s.iter().fold(0.0f32, |acc, v| acc.max(v.abs()));
        let quiet = peak(render_motif(&profile_for("gentle"), 0.1).collect());
        let loud = peak(render_motif(&profile_for("gentle"), 1.0).collect());

        assert!(loud > quiet, "a louder request must render louder");
    }

    #[test]
    fn stopping_clears_the_ringing_flag_and_advances_the_generation() {
        // No audio device is opened: generation bookkeeping is independent of it.
        let before = GENERATION.load(Ordering::SeqCst);
        stop();

        assert!(ringing_id().is_none());
        assert_ne!(
            GENERATION.load(Ordering::SeqCst),
            before,
            "a stop must invalidate the playing generation"
        );
    }
}
