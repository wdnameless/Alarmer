# Change: Streamline to Exactly Three Primary Tabs

## Why
Simplify navigation from fragmented individual views to exactly three coherent tabs:
1. **Дашборд (Dashboard)**: All-in-one unified dashboard with Timer, Stopwatch, Workout interval player, and Alarms in one integrated hub.
2. **AI Co-Pilot**: Full-screen conversation, generative UI designer, workout & schedule planner.
3. **Настройки (Settings)**: Cloud TTS, sound profiles, API keys, window behavior.

## What Changes
- Create `DashboardView.tsx` unifying timer controls, quick alarms widget, stopwatch, and workout starter.
- Reduce navigation in `App.tsx` to strictly 3 tabs (`dashboard`, `ai`, `settings`).
- Update `AppMode` type to `'dashboard' | 'ai' | 'settings'`.

## Verification
- `bun run build` and live launch.
