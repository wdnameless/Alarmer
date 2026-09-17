# Requirements manifest — Focus Limit parity program

Source brief: `https://focuslimit.io/ru` (+ `/manifest`, `/pro`, `/pricing`, `/pomodoro`, `/music`).
Verbatim user instruction: «проанализируй этот веб апп, у нас должен быть весь этот функционал».

Decisions below are the user's answers to the Wave 0–5 interview (21 questions, all answered).
Each R## is observable: it names what a user can do or see, not what code exists.

## Scope boundary

**IN**: directions with weekly block budgets · 50/10 auto-cycle · focus quality 1–10 ·
Журнал (week + month vs limit) · traffic light · music on/off with the rest phase ·
AI answers from aggregated journal history and can create directions/budgets.

**OUT** (explicitly, with the user's agreement): accounts · cloud sync · payments ·
MCP connector · Obsidian sync · bundled music (licensing) · backend of any kind.
The app stays local-first and offline-capable.

## Requirements

| ID | Requirement | Verbatim anchor / decision |
|----|-------------|----------------------------|
| R1 | The user can create directions (areas of focus), each with a name, colour and a weekly budget in blocks; edit and archive them | «Направления, между которыми ты делишь фокус» · Q2: new Direction entity |
| R2 | Each direction shows week-to-date progress against its own weekly budget in blocks | «Каждому направлению — свой бюджет блоков на неделю» · Q3: partial counts as fraction |
| R3 | A block is a focus phase followed automatically by a rest phase (default 50/10, configurable, with a 25/5 preset) | «Один блок — это один правильный час работы: 50 минут фокуса и 10 минут отдыха» · Q3 |
| R4 | Block mode runs a per-day block counter and pushes the user into the rest phase rather than letting them skip it | «система заставляет тебя реально пользоваться перерывами» · Q3: auto-cycle |
| R5 | The user picks the direction on Сегодня; the cycle, dial and counter run in Таймер | Q5: start on Сегодня, cycle in Таймер |
| R6 | After each focus phase the user rates quality 1–10; the prompt is skippable and appears in block mode only | «ты оцениваешь его по шкале от 1 до 10» · Q7: block mode only |
| R7 | Quality is stored on the session and survives reload | R6 corollary; SCHEMA v6 |
| R8 | The Журнал shows a week level: each past week against its own limit, over-budget visibly distinguished | «каждая прошлая неделя показана против своего лимита» · Q4 |
| R9 | The Журнал shows a month level: a row is a week, a square is a block | «Месяц одним взглядом: строка — неделя, квадрат — блок» · Q4 |
| R10 | Weeks start Monday | Q4 decision |
| R11 | A traffic light per direction and overall: green on pace (±20%), yellow behind, red over | «🟢 🟡 🔴» · Q11 |
| R12 | Sessions from schedule blocks carry a direction and count toward its budget | Q6: schedules carry a direction |
| R13 | Sessions with no direction appear as «Без направления», counting to total focus but no budget | Q8 |
| R14 | One global music link plays during focus phases and stops for rest | «Фокус — музыка играет. Перерыв — тишина» · Q9: one global link |
| R15 | Music plays inside the app via a YouTube nocookie embed; CSP relaxed for that origin only | Q10 decision |
| R16 | The AI answers questions from aggregated journal data (per day/direction: blocks, minutes, average quality, budget) without sending raw session labels | «Отвечает по твоей реальной истории» · Q12 |
| R17 | The AI can create and edit directions and budgets by chat, like it already creates alarms | Q13: read history + create directions |
| R18 | The existing Итоги content (bars, streak, peak hour, recent sessions) remains reachable inside Журнал | Q5: Итоги becomes Журнал |
| R19 | Existing sessions and exported backups load without loss; no direction/quality means the fields are absent, not zeroed | Q8: legacy bucket |
| R20 | Export/import round-trips directions, budgets and quality | Existing backup contract must extend |

## Constraints

- Local-first, offline-capable; no server is built.
- `TimerMode` gains `block`; `countdown` and `flow` keep working unchanged.
- Schema v5 → v6 with a migration; unknown/missing fields sanitised, never crash.
- Coverage ratchet stays satisfied (statements ≥53, branches ≥50, functions ≥50, lines ≥54).
- 212 vitest + 54 cargo green; clippy `-D warnings`.
- No new runtime dependency without checking it first; no bundled audio.

## Success criteria (observable)

1. Creating a direction with a 30-block budget and completing a 25-minute block shows
   `0.5 / 30` on that direction's bar for the current week.
2. A completed focus phase automatically starts the rest phase; the break countdown runs
   without user action, and music stops for its duration.
3. Rating a block 8 stores 8 with that session and it survives an app restart.
4. The month view renders 4–6 week rows, each with one square per block worked.
5. A direction worked past its pace shows red; one behind shows yellow; one on pace green.
6. Asking the AI «когда я работаю лучше всего?» answers using real logged hours.
7. An export made before this change imports cleanly and its sessions appear as
   «Без направления».
8. `bun run check:all` passes; clippy clean.

## ACCEPT — blind oracle verdict

Audited by an independent oracle that read only this brief and the delta specs
first, then went looking for contrary evidence. Its first pass returned **REJECT**
with two defects; both are fixed above and the re-audit returned **ACCEPT**.

| R## | Verdict | Evidence |
|-----|---------|----------|
| R1 | PASS | `Direction` with `weeklyBlockBudget` in `src/types/focus.ts`; created live via the journal editor and persisted across a restart |
| R2 | PASS | `sessionBlocks` returns `focusedSec/(focusMin*60)`; a 25-minute session counts 0.5 |
| R3 | PASS | `focusBudget.ts` + Settings exposes 50/10 and 25/5 presets and free-form values; backend re-arms only while idle |
| R4 | PASS | `TimerState::in_rest()` guards `set_mode`, `set_duration`, `reset`, `shift_minutes` — including while paused |
| R5 | PASS | Play button on Сегодня arms mode+direction+start before switching tabs |
| R6 | PASS | Quality prompt only when `mode === 'block'` |
| R7 | PASS | Rating stores quality on the session and survives restart; skip stores nothing |
| R8 | PASS | Six week rows each against their own limit, over-budget distinguished |
| R9 | PASS | Month grid: a row is a week, a square is a block |
| R10 | PASS | `weekStart` uses Monday (`(getDay()+6)%7`); Sunday joins the preceding week |
| R11 | PASS | `paceLight` returns `on` early in a week and for correct pace, `behind` when lagging, `over` only past budget |
| R12 | PASS | Schedule blocks carry a direction |
| R13 | PASS | Sessions without a direction count toward total focus, no budget |
| R14 | PASS | Music stops on `rest`, resumes on `focus` |
| R15 | PASS | CSP adds only `frame-src https://www.youtube-nocookie.com` |
| R16 | PASS | `buildHistoryDigest` sends no session label; probe with a leaked label fails the test |
| R17 | PASS | Assistant creates and edits directions from chat; verified live |
| R18 | PASS | Prior Итоги content (bars, streak, peak hour, tasks) reachable inside Журнал |
| R19 | PASS | v5 files migrate; legacy sessions keep no direction and are not zeroed |
| R20 | PASS | Export/import round-trips directions, budgets and quality |
