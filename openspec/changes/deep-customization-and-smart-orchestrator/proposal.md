# Change: Deep Workout Schedule Decomposition & Intelligent Natural Alarm Architecture

## Why
User wants:
1. To paste an entire workout program into the AI chat (e.g. "Пн/Ср/Пт: 07:00 подъем, 07:30 разминка, 18:30 силовая, 22:30 подготовка ко сну; Вт/Чт: 08:00 бег 45 мин...").
2. The AI must parse this complex schedule, extract structured alarms with voice reminders ("Пора на разминку!", "Время силовой тренировки!"), set up timers/intervals, and present a clean human-readable summary.
3. Clean, minimalist, non-cluttered presentation with one-click approval and preview.

## Verification
- Paste complex text into chat -> AI parses it into multi-alarm structure with days, voice cues, and sound profiles.
- One-click "Применить расписание" button adds alarms to state and navigates to view.
- `bun run build`.
