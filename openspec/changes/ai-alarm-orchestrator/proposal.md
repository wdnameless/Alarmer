# Change: AI Alarm Orchestration

## Why
User request: "я хочу чтобы ИИ мог управлять всей настройкой алармов. То есть бы сказал что-то вроде вот моя тренировка, расставь будильник. И он бы сам все настроил".
The AI trainer currently only produces interval workout steps (`WorkoutRoutine`). It needs to be extended to an intelligent assistant that can create and configure single or recurring alarms and reminders based on training schedules, daily routines, and wake-up/prep times.

## What Changes
- Extend `AIService` with unified intent understanding: workout routines, single/recurring alarms, and combined plans.
- Add structured tool-use / JSON schema output for alarm generation (`AlarmItem[]` with titles, exact 24h time, days of week, and custom voice prompts).
- Add UI controls to trigger "AI Alarm Setup" directly from natural speech or text prompt (e.g. "Поставь будильник на разминку в 7:00, тренировку в 7:15 и растяжку в 8:00").
- Provide one-click "Применить все будильники в расписание" and voice confirmation via TTS.

## Impact
- `src/services/ai.ts`: New functions `generateAlarms`, `parseUserIntent`, and updated prompt templates.
- `src/components/AITrainer.tsx`: Mode switch between Workout Generator and Alarm Setup Assistant.
- `src/components/Alarms.tsx`: Quick AI action button to auto-schedule alarms from prompt.
- `src/App.tsx`: Coordination and toast notifications for auto-configured alarms.
