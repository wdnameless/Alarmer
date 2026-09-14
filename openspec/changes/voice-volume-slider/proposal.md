# Change: Dedicated Voice TTS Volume Control Slider

## Why
User requests an explicit "Громкость голоса" (Voice Volume) slider in Settings right under the Cloud Neural TTS section. Previously only Click Volume and Alarm Signal Volume were present, leaving Voice TTS fixed at 1.0.

## Verification
- Add `voiceVolume` slider in `src/components/SettingsView.tsx` and persist in `localStorage` (`alarmer_voice_volume`).
- Integrate `volume` handling in `src/services/edgeTts.ts` so all speech audio respects this setting.
- `bun run build`.
