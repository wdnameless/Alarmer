## ADDED Requirements

### Requirement: True Window Maximize
The TitleBar MUST include a dedicated maximize / restore toggle that expands the window to full screen dimensions.

#### Scenario: User toggles maximize
- **WHEN** user clicks maximize button
- **THEN** window expands to fill screen, and clicking again restores original dimensions.

### Requirement: Cloud Neural TTS
The application MUST support high-quality neural voice playback without registration, defaulting to disabled voice audio.

#### Scenario: Neural voice playback
- **WHEN** user selects an Edge Neural voice in settings
- **THEN** announcements play through the neural audio stream.
