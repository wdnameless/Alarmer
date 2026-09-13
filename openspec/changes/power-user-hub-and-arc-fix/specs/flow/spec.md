## ADDED Requirements

### Requirement: True Radial Arc Shrinking
The neon progress arc MUST start at the set duration and decrease continuously towards 0 without filling the full circle.

#### Scenario: Timer counts down
- **WHEN** timer progresses from 32m to 16m
- **THEN** arc covers exactly half the circle and smoothly retreats towards top 12 o'clock.

### Requirement: Flow-First Overtime Mode
When focus duration ends, the application MUST soft-ping and count overtime seamlessly.

#### Scenario: Focus block reaches zero
- **WHEN** focus time reaches 00:00 and user is still working
- **THEN** overtime counting begins with a soft sound notification instead of an abrupt alarm.
