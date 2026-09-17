## ADDED Requirements

### Requirement: Directions Are The Unit Of Allocation
The application MUST let the user create, edit and archive directions, each carrying a
name, a colour and a weekly budget in blocks.

Направление — это то, между чем делится фокус («Направления, между которыми ты делишь
фокус»). Бюджет задаётся заранее и является рамкой, а не отчётом.

#### Scenario: A direction is created
- **WHEN** the user creates a direction named "Учёба" with a budget of 30 blocks
- **THEN** it appears with an empty week-to-date progress against that budget.

#### Scenario: A direction survives a restart
- **WHEN** the user creates a direction and restarts the application
- **THEN** the direction is still listed with the same budget.

#### Scenario: Archiving keeps history
- **WHEN** the user archives a direction
- **THEN** it stops being offered for new blocks, while its past sessions remain in the
  journal and keep counting toward the weeks they belong to.

### Requirement: Budget Progress Counts Partial Blocks As Fractions
A direction's week-to-date progress MUST be expressed in blocks, where a partial session
counts as its fraction of a block.

«Потратил бюджет — переключайся» works only if the number is honest: a serious 25-minute
session is half a block, not nothing.

#### Scenario: A full block fills one unit
- **WHEN** a 50-minute block is completed on a direction with a 30-block budget
- **THEN** the direction shows `1 / 30` for the current week.

#### Scenario: A partial block fills a fraction
- **WHEN** a session of 25 minutes is recorded against that direction
- **THEN** the direction shows `0.5 / 30`.

#### Scenario: Over-budget is visible
- **WHEN** a direction's week-to-date blocks exceed its weekly budget
- **THEN** the progress is rendered as over-budget, not merely full.

### Requirement: Sessions Without A Direction Are Explicit
The journal MUST present sessions that carry no direction as «Без направления», counting
toward total focus but toward no direction's budget.

#### Scenario: Legacy sessions remain visible
- **WHEN** sessions recorded before directions existed are shown
- **THEN** they appear under «Без направления» and contribute to total focus, while every
  direction's budget stays unaffected by them.

#### Scenario: An old backup imports cleanly
- **WHEN** a backup exported before this change is imported
- **THEN** its sessions load without error and appear as «Без направления».
