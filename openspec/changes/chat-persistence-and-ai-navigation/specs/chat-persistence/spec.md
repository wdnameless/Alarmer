## ADDED Requirements

### Requirement: Cross-Tab Chat History Persistence
The AI Co-Pilot chat conversation MUST NOT be wiped when the user switches between tabs or restarts the app.

#### Scenario: Switching tabs during conversation
- **WHEN** user writes a prompt to the AI and switches to Dashboard or Settings
- **AND** returns to the AI Co-Pilot tab
- **THEN** all previous messages remain intact in the chat view.

### Requirement: Contextual Navigation on AI Actions
When the AI assistant fulfills a command to set a timer or create an alarm, the application MUST automatically navigate the user to the target view to visually demonstrate the result.

#### Scenario: User requests alarm creation
- **WHEN** user asks AI to set an alarm
- **THEN** app creates the alarm, switches to the Dashboard Alarms sub-tab, and displays the created alarm.
