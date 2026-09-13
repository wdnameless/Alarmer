## ADDED Requirements

### Requirement: Non-Intrusive Window Z-Order
The window MUST NOT be pinned on top by default, allowing it to yield focus and sink behind other active desktop windows when unfocused.

#### Scenario: User clicks another application
- **WHEN** user focuses another window
- **THEN** Alarmer drops behind that window unless user explicitly toggles the Pin button.

### Requirement: Real-Time UI Execution from Chat
When the user requests an interface style or layout alteration in the chat, the AI engine MUST emit and apply a `DynamicUIConfig` state mutation in real-time.

#### Scenario: User asks for noir style
- **WHEN** user types "монохромная черная белая тема"
- **THEN** the active theme colors update immediately to the noir palette.
