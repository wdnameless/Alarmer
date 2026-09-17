## ADDED Requirements

### Requirement: The Assistant Answers From The Journal
The assistant MUST answer questions about the user's focus using their actual logged data,
not a template.

«Спрашиваешь обычными словами: когда ты на самом деле работаешь лучше всего, какое
направление тихо съедает неделю… Отвечает по твоей реальной истории, а не по шаблону.»

#### Scenario: Best hours
- **WHEN** the user asks when they work best
- **THEN** the answer names hours derived from their own logged sessions.

#### Scenario: Where the week went
- **WHEN** the user asks where the week went
- **THEN** the answer is derived from that week's logged blocks by direction.

#### Scenario: Nothing logged yet
- **WHEN** the user asks a question with no sessions recorded
- **THEN** the assistant says there is nothing to answer from rather than inventing data.

### Requirement: Only Aggregates Leave The Machine
The assistant MUST send aggregated journal data — per day and per direction: blocks,
minutes, average quality, budgets — and MUST NOT send raw session labels.

Решение пользователя: агрегаты, без сырых названий сессий. Личные записи («Отход ко
сну», «Разминка») остаются на устройстве.

#### Scenario: Aggregates are sufficient
- **WHEN** a question needs per-hour or per-direction statistics
- **THEN** it is answered from aggregates, with no session label transmitted.

#### Scenario: Labels stay local
- **WHEN** the assistant answers any question
- **THEN** the data sent contains no session label text.

### Requirement: The Assistant Can Manage Directions
The assistant MUST be able to create and edit directions and their weekly budgets, in the
same way it already creates alarms and schedules.

#### Scenario: Creating by chat
- **WHEN** the user asks for a direction "Спорт" with 10 blocks a week
- **THEN** that direction is created with that budget and appears in the journal.

#### Scenario: Editing by chat
- **WHEN** the user asks to raise an existing direction's budget
- **THEN** the stored budget is updated and the journal reflects it.

#### Scenario: It does not claim what it did not do
- **WHEN** a request matches no action the assistant can perform
- **THEN** it says so instead of reporting a change that did not happen.
