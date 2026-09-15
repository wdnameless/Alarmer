## ADDED Requirements

### Requirement: Schedule As The Primary Object
The application MUST model a schedule as a saveable, named, enable-able entity that
owns its steps, rather than storing only independent alarm moments.

#### Scenario: Schedule survives a restart
- **WHEN** the user saves a schedule and restarts the application
- **THEN** the schedule is still listed and remains enabled.

#### Scenario: Enabling a schedule schedules its steps
- **WHEN** a saved schedule is enabled
- **THEN** its time-based steps produce firings on the matching weekdays.

#### Scenario: Disabling a schedule removes its firings
- **WHEN** a schedule is disabled
- **THEN** none of its steps fire, while the saved definition is kept.

### Requirement: Two Kinds Of Step
A schedule step MUST be either a point in time (rings an alarm) or an interval block
(a sequence of timed exercises with voice guidance).

#### Scenario: Time step rings
- **WHEN** a time step's moment arrives
- **THEN** the alarm rings with that step's announcement.

#### Scenario: Interval block runs as a sequence
- **WHEN** an interval block starts
- **THEN** its exercises run in order with a countdown and spoken prompts.

### Requirement: Original Text Retained
The pasted source text MUST be stored alongside the parsed schedule so the user can
re-parse or review what the schedule was built from.

#### Scenario: Source text is available later
- **WHEN** the user opens a saved schedule that came from pasted text
- **THEN** the original text is retrievable for review.
