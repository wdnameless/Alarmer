# Change: True Reverse Countdown Arc and Direct Web Audio Escapement

## Why
1. On screenshot the timer is set to 27:00 but shows a static Play icon without counting down because auto-start on knob release did not trigger interval immediately, and the SVG stroke-dashoffset direction was not receding counter-clockwise to 12 o'clock.
2. Web Audio was awaiting explicit user interaction before playing ticks; AudioContext needs immediate resume.

## What Changes
- Set `isRunning: true` directly upon `onProgressCommit`.
- In `RadialDial.tsx`, SVG arc strokeDashoffset is calculated to explicitly retract counter-clockwise back to the 12 o'clock top origin.
- Force `soundService.resumeAudio()` on pointer down.

## Verification
- `bun run build`.
- Rotate to 27m, release: numbers immediately tick down (26:59, 26:58...), white arc shrinks towards 12 o'clock, ticking audio plays.
