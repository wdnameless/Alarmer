## ADDED Requirements

### Requirement: Draggable Resizable Split Divider
The application MUST allow the user to drag the dividing boundary between the left dashboard module and the right AI Co-Pilot module.

#### Scenario: User drags divider
- **WHEN** user clicks and drags the central vertical splitter
- **THEN** the left panel width expands or contracts smoothly within min/max bounds.

### Requirement: Phased Tabbed Settings Navigation
Settings MUST be categorized into logical phases: Sound, AI, Interface, and Backup.

#### Scenario: User switches settings phase
- **WHEN** user clicks the "Звук" phase tab
- **THEN** only sound and custom audio upload controls are displayed.

### Requirement: Custom Audio Upload for Notifications and Alarms
Users MUST be able to select and upload custom audio files for alarms, completion chimes, and ticks.

#### Scenario: User uploads custom MP3 for alarm
- **WHEN** user uploads an audio file in Settings
- **THEN** the custom audio is saved and used for alarm playback.
