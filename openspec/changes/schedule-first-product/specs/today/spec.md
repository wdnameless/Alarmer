## ADDED Requirements

### Requirement: Today Answers "What Now"
The default screen MUST show the step in progress with its remaining time and the
next upcoming step with its start time.

#### Scenario: A step is running
- **WHEN** an interval block is in progress
- **THEN** the screen shows the current exercise and the time left in it.

#### Scenario: Nothing is running
- **WHEN** no step is active
- **THEN** the screen shows the next step and how long until it starts.
