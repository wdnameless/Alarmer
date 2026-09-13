## ADDED Requirements

### Requirement: Conversational Chat Thread
The AI Co-Pilot interface MUST maintain an interactive, multi-turn message thread showing user messages and assistant replies in chronological order, with an active input that clears upon sending.

#### Scenario: User sends a message
- **WHEN** user types and submits a prompt
- **THEN** the input clears, the user's message is added to the scrollable chat history, and the AI response is appended below it.
