# Change: Remove Native Alert Popups & Implement Truly Distinct Cloud Audio TTS

## Why
1. User screenshot shows browser `localhost:1420 says "Сессия «ы» запущена!"` blocking alert popup. Browser alerts MUST NOT be used in a desktop app.
2. Webview2's speech synthesis on this Windows machine only has one installed voice, so changing voices in JS resulted in the exact same voice audio. We must use real remote HTTP audio streaming (Google/Cloud TTS endpoint) or pre-rendered acoustic streams so Jenny/Guy/Dmitry/Svetlana are 100% physically distinct voices.

## Verification
- `bun run build`.
- Press enter on quick capture -> NO browser alert popup appears, task starts silently or with sound.
- Test Jenny vs Dmitry -> completely different audio files/voices stream and play.
