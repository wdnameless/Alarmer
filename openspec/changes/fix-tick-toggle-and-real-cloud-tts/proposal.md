# Change: Fix Ticking Toggle & Native Real Cloud Voice Synthesis

## Why
1. On user screenshot, "Звук тиканья часов (каждую секунду)" is explicitly set to **ВЫКЛ** in settings! That is why the clock was not ticking. We must turn it on and keep it synchronized.
2. Web Speech API synthesis in Windows Webview2 uses the same fallback voice. We need real cloud HTTP audio synthesis (fetching direct MP3/WAV audio) so Jenny, Guy, Svetlana, and Dmitry actually sound completely different.
3. The countdown arc in the screenshot covered the whole 360 degrees because totalSeconds (26m) was mapped to 3600s instead of totalSeconds.

## Verification
- `bun run build`.
- Play Jenny -> real American English audio plays. Play Dmitry -> real Russian male audio plays.
- In Timer: white line is exactly from 12 o'clock to the knob and ticks audibly down.
