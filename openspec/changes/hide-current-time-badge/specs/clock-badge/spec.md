## ADDED Requirements

### Requirement: Toggle Current Time Badge via AI
The application MUST support hiding and showing the digital current time badge in the Alarms view through natural conversational commands in the AI Co-Pilot chat.

#### Scenario: User requests hiding the current time badge
- **WHEN** user types "убери текущее время"
- **THEN** `showCurrentTimeBadge: false` is set and the digital clock badge disappears from the Alarms view.
