## ADDED Requirements

### Requirement: Zero Native Alert Dialogs
The application MUST NOT trigger browser modal dialogs (`alert()`, `confirm()`, `prompt()`) that block UI interaction.

#### Scenario: Quick capture submit
- **WHEN** user submits task in quick capture bar
- **THEN** timer configures smoothly with audio feedback without modal popups.

### Requirement: Remote Cloud Audio Synthesis
The voice engine MUST stream real distinct cloud-generated audio streams (different actors and languages) via HTTP audio playback.

#### Scenario: Auditioning different voices
- **WHEN** user selects Guy vs Svetlana
- **THEN** separate remote audio streams with genuine male English vs female Russian audio play.
