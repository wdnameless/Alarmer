## ADDED Requirements

### Requirement: Zero-Margin Frameless Geometry
The main application container SHALL fill 100% of the Tauri native window without extraneous margins, outer paddings, or mock borders.

#### Scenario: 100% window fill
- **WHEN** the window is rendered or resized
- **THEN** the application card occupies the full bounds of the Tauri window with seamless edge controls.

### Requirement: Reliable Window State Controls
The window controls SHALL reliably invoke Tauri window manipulation commands for minimize, hide-to-tray, and size expansion.

#### Scenario: Minimize window
- **WHEN** the user clicks the minimize button
- **THEN** the Tauri window SHALL minimize to the Windows taskbar immediately.

#### Scenario: Close to tray
- **WHEN** the user clicks the close button
- **THEN** the Tauri window SHALL hide into the Windows system tray while timers and background alerts remain active.

### Requirement: Generative Deep Dynamic UI
The system SHALL provide an AI interpreter that modifies component layout (widget visibility, dial scales, button forms) and color palettes dynamically from natural language prompts.

#### Scenario: Natural language layout transformation
- **WHEN** the user submits an AI layout prompt such as "сделай таймер гигантским и убери кнопки пресетов"
- **THEN** the application layout SHALL reconfigure its component tree dynamically to match the user request.
