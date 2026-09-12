# Tasks: AI Alarm Orchestration

## 1. Specification & Delta
- [ ] Document capability delta in `specs/ai-alarm-orchestrator/spec.md` <!-- id: 0 -->

## 2. Service Implementation
- [ ] Implement `AIService.generateAlarmsFromPrompt(prompt, settings)` in `src/services/ai.ts` <!-- id: 1 -->
- [ ] Implement smart parsing of time, days of week, and personalized TTS voice announcements <!-- id: 2 -->

## 3. UI & Integration
- [ ] Add AI Smart Setup banner and modal in `Alarms.tsx` <!-- id: 3 -->
- [ ] Add combined "План тренировки + Расписание будильников" action in `AITrainer.tsx` <!-- id: 4 -->
- [ ] Wire automatic alarm activation with sound and voice confirmation <!-- id: 5 -->

## 4. Verification & Build
- [ ] Verify Vite TypeScript compile <!-- id: 6 -->
- [ ] Verify Tauri cargo build and launch in dev mode <!-- id: 7 -->
