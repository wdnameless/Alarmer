# Change: Fix Dial Knob Commit on Release and Bilingual Localization (EN / RU)

## Why
1. When user releases the knob after dragging, `dragProgress` was set to `null` before `Timer.tsx` updated `remainingSeconds`, causing it to snap back to the old value.
2. Add full bilingual support (English / Russian) across all tabs, buttons, settings, and timers, with language switch in Settings and header.

## What Changes
- Fix `handleProgressChange` in `Timer.tsx` and `handlePointerUp` in `RadialDial.tsx` so the dragged time persists permanently.
- Add `src/services/i18n.ts` with complete dictionary for EN and RU.
- Add language switcher toggle `EN / RU` in Settings.

## Verification
- `bun run build`.
- Rotate knob to 36 minutes, release mouse — time stays 36:00.
- Switch language to English — UI becomes English.
