# Change: Authentic Base64 Audio Ticking and Smooth Shrinking Arc to 12 o'clock

## Why
1. Use user's exact provided high-fidelity `ticking` FLAC audio data URI for second ticks.
2. Ensure release of the dial starts the active countdown interval reliably, and smoothly shrinks the white line clockwise/counter-clockwise towards 12 o'clock.

## What Changes
- Add `src/assets/tickingSound.ts` with provided base64 data.
- Decode audio into an AudioBuffer on initialization and trigger on each second countdown tick.
- Directly trigger `setIsRunning(true)` on `handlePointerUp` in `RadialDial.tsx` and ensure countdown loop decrements every second.

## Verification
- `bun run build`.
- Rotate dial to 26m, release: countdown starts immediately (25:59, 25:58...), provided authentic ticking audio plays every second, line shrinks.
