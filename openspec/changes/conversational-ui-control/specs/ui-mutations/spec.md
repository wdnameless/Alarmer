## ADDED Requirements

### Requirement: Granular Button Visibility Control via AI
The application MUST support hiding and showing specific UI elements (e.g. sleep alarm button, AI schedule wizard button) through natural conversational commands in the AI Co-Pilot chat.

#### Scenario: User requests hiding sleep and AI buttons
- **WHEN** user types "убери кнопки ко сну и ИИ"
- **THEN** AI sets `showSleepButton: false` and `showAiScheduleButton: false` and the buttons immediately vanish from the Alarms view.
