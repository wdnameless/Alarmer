## ADDED Requirements

### Requirement: The Journal Compares Weeks Against Their Own Limits
The journal MUST offer a week level in which past weeks are shown against the budget that
applied to them, with over-budget weeks visibly distinguished.

«В „Журнале" есть уровни „Неделя" и „Месяц": каждая прошлая неделя показана против
своего лимита. Сразу видно, где ты недобрал бюджет, а где перебрал.»

#### Scenario: Current week is in progress
- **WHEN** the journal opens during a week
- **THEN** the current week shows its week-to-date use against its budget.

#### Scenario: A past week shows its own limit
- **WHEN** a previous week is displayed
- **THEN** it is compared against the budget in force during that week, not today's.

#### Scenario: Over-budget stands out
- **WHEN** a displayed week exceeded its limit
- **THEN** the excess is rendered distinctly (their model colours the tail red).

### Requirement: The Journal Offers A Month Level
The journal MUST offer a month level in which a row is a week and a square is a block.

«Месяц одним взглядом: строка — неделя, квадрат — блок; красный хвост — перебор.»

#### Scenario: Month renders blocks
- **WHEN** the user opens the month level
- **THEN** each week of that month is a row, and each block worked that week is a square.

#### Scenario: Month marks excess
- **WHEN** a week in that month exceeded its budget
- **THEN** the blocks beyond the budget are distinguished from those within it.

### Requirement: Weeks Start On Monday
Week boundaries MUST be Monday-based everywhere the journal, budgets and counters are
computed.

#### Scenario: Sunday belongs to the week that began Monday
- **WHEN** a block is worked on Sunday
- **THEN** it counts toward the week that started the preceding Monday.

#### Scenario: Budgets reset on Monday
- **WHEN** Monday begins
- **THEN** every direction's week-to-date progress starts from zero for the new week.

### Requirement: A Traffic Light Reports Pace
Each direction and the week overall MUST be reported with a pace signal: on pace, behind,
or over.

«🟢 🟡 🔴 — каждый день видно, идёшь по плану, перебрал или недобрал.»

Pace, not raw totals: red on Tuesday for a correctly-paced week would be a lie.

#### Scenario: On pace
- **WHEN** the week has elapsed and the logged blocks are within a fifth of that pace
- **THEN** the signal is the on-pace colour.

#### Scenario: Behind
- **WHEN** the logged blocks are below the elapsed pace
- **THEN** the signal is the behind colour.

#### Scenario: Over
- **WHEN** the logged blocks exceed the budget for the week
- **THEN** the signal is the over colour.

### Requirement: Existing Statistics Remain Reachable
The content previously shown on Итоги (daily bars, streak, peak hour, task progress,
recent sessions) MUST remain reachable after that tab becomes the journal.

#### Scenario: Nothing is lost
- **WHEN** the user opens the journal
- **THEN** the daily bars, streak, peak hour and recent sessions are still available.
