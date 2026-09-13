# Tasks: AI Alarm Orchestration

## 1. Specification & Delta
- [x] Document capability delta in `specs/ai-alarm-orchestrator/spec.md` <!-- id: 0 -->

## 2. Service Implementation
- [x] Implement `AIService.generateAlarmsFromPrompt(prompt, settings)` in `src/services/ai.ts` <!-- id: 1 -->
- [x] Implement smart parsing of time, days of week, and personalized TTS voice announcements <!-- id: 2 -->

## 3. UI & Integration
- [x] Add AI Smart Setup banner and modal in `Alarms.tsx` <!-- id: 3 -->
- [x] Add combined "План тренировки + Расписание будильников" action in `AITrainer.tsx` <!-- id: 4 -->
- [x] Wire automatic alarm activation with sound and voice confirmation <!-- id: 5 -->

## 4. Verification & Build
- [x] Verify Vite TypeScript compile <!-- id: 6 -->
- [x] Verify Tauri cargo build and launch in dev mode <!-- id: 7 -->
