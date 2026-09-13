# Change: Auto-Start on Drag Release & Reverse Arc Countdown with Ticking Sound

## Why
1. Releasing the dial knob after setting the time must automatically start the countdown immediately.
2. The glowing progress arc and knob must visibly and smoothly retreat in reverse (counter-clockwise towards 0) as time elapses.
3. Every second of the countdown must play a distinct physical clock tick sound (enabled by default during timer running).

## What Changes
- In `Timer.tsx`:
  - When user releases knob (`onProgressCommit`), auto-set `isRunning = true` and start countdown immediately.
  - Fix progress arc calculation: `progress = remainingSeconds / totalSeconds` so the arc starts full and visibly shrinks towards 0 as seconds decrease.
  - Play `soundService.playUiClick()` on every second tick while timer is running.
- In `RadialDial.tsx`:
  - Add explicit `onProgressCommit` callback fired on pointer release.

## Verification
- `bun run build`.
- Rotate knob to 43 min, release pointer: timer starts immediately, white/neon arc shrinks backwards, ticking sound plays every second.
