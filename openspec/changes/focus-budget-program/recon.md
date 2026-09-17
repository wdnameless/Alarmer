# Recon — Focus Limit parity program

## Source analysed

`https://focuslimit.io/ru` (+ `/manifest`, `/pro`, `/pricing`, `/pomodoro`, `/music`).
Next.js PWA, Russian-first, local-only free tier + paid cloud tier (Lava.top, 299 ₽/mo).
Gathered 2026-09-17 by crawling the rendered pages.

## Their product model (the part that matters)

1. **Directions** — the areas you split focus between ("направления"). Each gets a
   **weekly budget in blocks**.
2. **Block** — the atomic unit: 50 min focus + 10 min rest ("один правильный час",
   also called an academic hour). A 25-min option exists for hard starts.
   Rationale they state: "За 25 минут только раскачаешься. 50 — это полноценный заход".
3. **Weekly budget** — e.g. 30 blocks/week per direction, fills as you work.
   "Потратил бюджет — переключайся."
4. **Focus quality 1–10** — after every block the user rates *желание и вовлечённость*.
   This is their headline signal: "Качество фокуса — главный сигнал".
5. **Journal (Журнал)** — two levels, **Неделя** and **Месяц**. Past weeks shown
   *against their own limit*; over-budget renders red. Month = rows are weeks,
   squares are blocks.
6. **Traffic light** 🟢🟡🔴 — per day: on plan / over / under.
7. **Music as a switch** — music plays during focus, stops for rest ("Фокус — музыка
   играет. Перерыв — тишина"). Built-in tracks + custom YouTube link.
8. **AI chat over real history** — plain-language questions ("когда ты работаешь лучше
   всего", "какое направление съедает неделю"), answered from the actual journal.
9. **MCP connector** — plug own Claude/ChatGPT/DeepSeek into the focus data.
10. **Cloud sync** across devices; **Obsidian sync** marked "Скоро" (not shipped).

Free = current week only; "в понедельник ничего не стирается" is the Pro pitch.

## What we already have

| Area | State |
|---|---|
| Timer | countdown + `flow` mode, 1–180 min, backend-owned clock, overtime |
| Schedules | routine programs: `time` steps (ring) + `block` steps (exercise sequence) |
| Alarms | standalone, repeat once/daily/days |
| Tasks | checklist, done flag, optional link to step/schedule |
| Sessions | `SessionRecord { focusedSec, startedAt, endedAt, completed, label, scheduleId?, stepId? }` |
| Stats | trailing-day bars, week total, current/longest streak, peak hour, task progress, recent list |
| Notes | markdown, create/edit/delete |
| AI | BYOK OpenAI-compatible; UI mutation, alarm/schedule parsing; **no history grounding** |
| Settings | sound profiles, TTS, 6 themes, RU/EN, export/import, autostart, updater |
| Platform | Tauri desktop (win/mac/linux), local-only, no accounts, no payments |

## Gaps (their feature → our state)

| Their feature | Ours | Verdict |
|---|---|---|
| Directions with weekly block budget | absent — no such concept anywhere | **NEW** |
| Work/rest block cycle + counter | single countdown; no auto-break, no cycle | **NEW** |
| Focus quality 1–10 | absent entirely (no rating field) | **NEW** |
| Journal Week/Month vs limit | trailing days only; no month, no limit overlay | **PARTIAL** |
| Traffic light | absent | **NEW** |
| Music during focus | alarm/click sounds only; no background music | **NEW** |
| AI over real history | mutations + parsing only | **PARTIAL** |
| MCP connector | absent | **NEW (large)** |
| Cloud sync / accounts / payments | absent by design (local-only desktop app) | **OUT?** |
| Obsidian sync | absent (unshipped for them too) | **OUT** |

Verified absent by grep: `budget|направлен|weekly|quality|rating` — no production hits.
`TimerMode = 'countdown' | 'flow'`; no break phase.

## Files a change would touch

- `src/types/index.ts` (or new `src/types/focus.ts`) — Direction, block config, session fields
- `src/types/dynamicUi.ts` — untouched
- `src/services/store.ts` — `SCHEMA_VERSION` 5 → 6, sanitizers + migration
- `src/services/session.ts` — carry directionId + quality through `SessionBuilder`
- `src/services/stats.ts` — week/month buckets, budget progress, traffic light
- `src/services/timer.ts` + `src-tauri/src/timer.rs` — work/rest cycle, block counter
- `src/components/Timer.tsx`, `StatsView.tsx`, new budget/direction UI
- `src/components/SettingsView.tsx` — direction CRUD
- `src/services/aiCompiler.ts` — history-grounded answers

## Constraints

- Offline-first desktop app; no backend exists. Cloud sync would need one (out of scope
  unless the user says otherwise).
- Existing sessions have no direction/quality → new fields must be optional; no data loss.
- Coverage ratchet is live (statements ≥53, branches ≥50, functions ≥50, lines ≥54).
- 212 vitest + 54 cargo must stay green; clippy `-D warnings`.
- `CONTEXT.md` does not exist; this program introduces domain vocabulary (direction,
  block, budget, quality) that would justify creating one.

## Open decisions → Wave 0 interview

Scope of the core loop; whether Direction is a new entity; block cycle ownership
(JS vs Rust); when quality is captured; journal granularity/week start; music source
(licensing risk on bundled tracks); how far AI grounding goes; MCP and sync in/out.
