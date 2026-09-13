# Capability: AI Alarm Orchestration

## ADDED Requirements

### Requirement: AI Alarm Generation from Natural Language
The application SHALL allow users to generate one or multiple alarms through natural language prompts using an OpenAI-compatible BYOK model.

#### Scenario: User requests workout reminders
- **WHEN** user inputs "Каждое утро в 7:00 подъем на пробежку, а в 19:00 вечерняя растяжка"
- **THEN** AI generates two alarms: 07:00 with label "Подъем на пробежку" and 19:00 with label "Вечерняя растяжка"
- **AND** sets repeat days according to the prompt
- **AND** sets a personalized TTS voice notification prompt.

### Requirement: One-Click Schedule Application
The application SHALL allow the user to review, edit, or directly apply generated alarms into the active alarms store.

#### Scenario: User applies generated alarms
- **WHEN** user confirms the AI generated alarm list
- **THEN** the alarms are added to the application state and persisted in localStorage
- **AND** the app speaks a confirmation message via SpeechSynthesis.
