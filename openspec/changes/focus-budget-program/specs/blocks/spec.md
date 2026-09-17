## ADDED Requirements

### Requirement: A Block Is Focus Plus Rest
The application MUST run a focus phase and then a rest phase as one block, with the rest
phase starting automatically when focus completes.

«Один блок — это один правильный час работы: 50 минут фокуса и 10 минут отдыха» and
«система заставляет тебя реально пользоваться перерывами между рабочими подходами, а
не сидеть до выгорания».

#### Scenario: Rest starts without user action
- **WHEN** a focus phase reaches zero in block mode
- **THEN** the rest phase starts automatically and its countdown is running.

#### Scenario: Durations are configurable with a preset
- **WHEN** the user selects the 25/5 preset
- **THEN** subsequent blocks use 25 minutes of focus and 5 minutes of rest.

#### Scenario: Existing modes are untouched
- **WHEN** the user runs the plain countdown or flow mode
- **THEN** it behaves exactly as before, with no rest phase and no block counter.

### Requirement: The Day Counts Blocks
Block mode MUST show how many blocks have been completed today, and that count MUST
survive a restart.

«Один день, одно направление: качество фокуса растёт от блока к блоку — 5 → 7 → 8 → 9».

#### Scenario: Counter advances
- **WHEN** a block's focus phase completes
- **THEN** the day's block count increases by one.

#### Scenario: Counter persists
- **WHEN** the application is restarted on the same day
- **THEN** the day's block count is unchanged.

### Requirement: A Block Is Started From Today
The user MUST choose the direction on the Сегодня tab, and the block's cycle, dial and
counter MUST run in the Таймер tab.

#### Scenario: Starting a block
- **WHEN** the user starts a block for "Учёба" from Сегодня
- **THEN** the Таймер tab is showing and running that direction's block.

#### Scenario: The run belongs to the direction
- **WHEN** that block completes
- **THEN** the recorded session carries that direction, so it counts toward its budget.

### Requirement: Focus Quality Is Rated After Each Focus Phase
Block mode MUST ask the user to rate the just-finished focus phase from 1 to 10, and the
prompt MUST be skippable without ending the block.

«После каждого блока ты оцениваешь его по шкале от 1 до 10» — «качество фокуса — это и
есть твоё желание и вовлечённость».

#### Scenario: Rating is captured
- **WHEN** the user rates a completed focus phase 8
- **THEN** that session stores quality 8 and it survives a restart.

#### Scenario: Skipping is allowed
- **WHEN** the user dismisses the prompt without rating
- **THEN** the session keeps no quality value and the cycle continues uninterrupted.

#### Scenario: Only blocks ask
- **WHEN** a plain countdown finishes
- **THEN** no quality prompt appears.

### Requirement: Music Follows The Phase
The application MUST play the user's configured music during focus phases and stop it
during rest phases.

«Фокус — музыка играет. Перерыв — тишина.»

#### Scenario: Music stops for rest
- **WHEN** a focus phase ends and the rest phase begins
- **THEN** playback stops for the duration of the rest phase.

#### Scenario: Music resumes with focus
- **WHEN** the rest phase ends and the next focus phase begins
- **THEN** playback resumes without the user doing anything.

#### Scenario: No link configured
- **WHEN** the user has not configured a music link
- **THEN** blocks run normally and nothing is played.
