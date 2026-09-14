## ADDED Requirements

### Requirement: Complex Workout Schedule Decomposition
The AI assistant MUST parse multi-line, unstructured workout schedules pasted by the user and extract multiple structured alarms with contextual voice announcements.

#### Scenario: User pastes a weekly workout plan
- **WHEN** user pastes "Понедельник, среда: 07:00 подъем, 07:30 разминка 15м, 19:00 силовая"
- **THEN** AI decomposes this into distinct alarms with custom voice coaching reminders and offers a clean one-click apply button.
