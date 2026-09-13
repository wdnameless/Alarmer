# Change: AI Co-Pilot Unified Identity & Capabilities

## Why
Rename all references to "AI Компаньон / Распорядитель / Тренер" to simply **"AI Co-Pilot"** and empower it with full self-awareness of its abilities: transforming interface, managing timers/alarms, composing workouts, and executing user commands.

## What Changes
- Rename title in `AITrainer.tsx` and tabs in `App.tsx` to **AI Co-Pilot**.
- Add detailed responses for "что ты умеешь" / "помощь" in `AIService` and `aiCompiler.ts`.

## Verification
- `bun run build`.
- Ask "что ты умеешь" in the UI and verify response.
