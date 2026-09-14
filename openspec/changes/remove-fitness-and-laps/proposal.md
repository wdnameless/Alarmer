# Change: Remove Fitness & Laps Tabs from Dashboard

## Why
User explicitly requested removing the "Фитнес" and "Круги" (stopwatch laps) sub-tabs from the Dashboard. The sub-module navigation will only contain the two essential core functions: **"⏱ Таймер"** and **"🔔 Алармы"**. This eliminates visual clutter and achieves the requested minimalist purity.

## Verification
- Remove Fitness and Stopwatch pill buttons from `src/components/DashboardView.tsx`.
- Keep only "Таймер" and "Алармы".
- `bun run build`.
