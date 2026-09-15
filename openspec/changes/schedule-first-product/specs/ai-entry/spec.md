## ADDED Requirements

### Requirement: Pasted Schedule Becomes A Saved Schedule
The assistant MUST turn pasted free-form schedule text into an editable schedule
draft that the user can save with one action.

#### Scenario: User pastes a weekly plan
- **WHEN** the user pastes a multi-day workout plan
- **THEN** the assistant returns a structured draft showing days and steps.

#### Scenario: Draft is saved
- **WHEN** the user confirms the draft
- **THEN** it is stored as a named schedule and starts working on its weekdays.
