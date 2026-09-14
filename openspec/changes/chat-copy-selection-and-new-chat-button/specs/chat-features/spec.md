## ADDED Requirements

### Requirement: Full Text Selection and Clipboard Copying in Chat
The chat conversation messages MUST allow standard mouse text selection, cursor highlighting, and clipboard copying (via Ctrl+C and a 1-click copy button).

#### Scenario: User selects text in message
- **WHEN** user drags mouse across text in a chat bubble
- **THEN** text is highlighted and can be copied via Ctrl+C.

### Requirement: Prominent New Chat Button
The AI Co-Pilot drawer header MUST contain an unmistakable "+ Новый чат" button that resets the current conversation and initializes a fresh session.

#### Scenario: User clicks new chat
- **WHEN** user clicks "+ Новый чат"
- **THEN** the chat history resets with an introductory greeting ready for a new prompt.
