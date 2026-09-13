## ADDED Requirements

### Requirement: Dial Release Auto-Start
Releasing the rotary knob after dragging MUST automatically transition the timer into the running countdown state.

#### Scenario: User releases dial knob
- **WHEN** user finishes dragging to a set time
- **THEN** timer starts counting down automatically without requiring an extra Play click.

### Requirement: Counter-Clockwise Arc Retreat with Ticking
During countdown, the progress arc MUST smoothly decrease in length counter-clockwise towards zero, accompanied by an audible second-by-second ticking sound.

#### Scenario: Countdown ticks
- **WHEN** timer counts down from 43:00 to 42:59
- **THEN** an audible tick plays and the arc shortens proportionally.
