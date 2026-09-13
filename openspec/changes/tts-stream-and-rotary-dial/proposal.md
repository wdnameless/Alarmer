# Change: Robust Cloud TTS Audio Stream & Interactive Rotary Dial

## Why
1. `EdgeTtsService` relied on a third-party endpoint that can fail CORS or return silence, and browser SpeechSynthesis fallback did not select different voice timbres correctly.
2. `RadialDial` knob and neon progress arc did not visually update smoothly as the user dragged the slider because progress updates were mapped only in coarse discrete minutes without immediate live preview angle.

## What Changes
- Implement bulletproof multi-voice SpeechSynthesis with voice matching by name, gender, and language so Dmitry (male) and Svetlana (female) produce distinctly different voices on desktop.
- Add live draggable rotary angle state to `RadialDial` so the neon arc and knob rotate smoothly with mouse position in real-time.
- Update `Timer.tsx` so the arc tracks the running countdown and manual rotation fluidly.

## Verification
- `bun run build`.
- Audition Dmitry vs Svetlana in Settings.
- Drag dial knob around the circle on Dashboard and verify smooth continuous rotation.
