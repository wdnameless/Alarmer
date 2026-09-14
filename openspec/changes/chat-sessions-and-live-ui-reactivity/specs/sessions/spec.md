## ADDED Requirements

### Requirement: Multiple Chat Sessions Management
The AI Co-Pilot MUST support creating, switching, and deleting multiple chat sessions/threads with persistent histories.

#### Scenario: User creates a new chat session
- **WHEN** user clicks "+ Новый чат"
- **THEN** a fresh clean chat thread is created and stored in the sessions list.

### Requirement: Instant Reactive Live UI Mutation
When an AI command mutates UI layout or visibility flags, the corresponding buttons and layout elements MUST immediately update and reflect on the screen without requiring a reload.

#### Scenario: User requests hiding buttons
- **WHEN** user executes "Убери кнопки ко сну и ИИ"
- **THEN** the buttons on the left Alarms panel disappear instantly.
