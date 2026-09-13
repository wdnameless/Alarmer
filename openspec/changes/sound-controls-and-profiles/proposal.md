# Change: UI Sound Controls & Sound Profiles

## Why
Users must have granular control over sound effects, including muting interface clicks (tabs, buttons, presets) and selecting different sound profiles (Mechanical, Modern Soft, Cyberpunk Beep, Silent).

## What Changes
- Add `SoundConfig` type supporting `enableUiClicks`, `enableCountdown`, `soundProfile` (mechanical, soft, neon, retro).
- Update `SoundService` with mute checks and sound pitch/timbre variations per profile.
- Add "Звуковые эффекты и клики" section in `SettingsView.tsx` with toggles and test buttons.

## Verification
- `bun run build`.
- Live test muting clicks and switching sound profiles.
