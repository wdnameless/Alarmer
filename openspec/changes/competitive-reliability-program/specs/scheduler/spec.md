## ADDED Requirements

### Requirement: Scheduler Runs Independent of UI State
The alarm scheduler MUST live in the Rust backend and fire regardless of which tab is
active, whether the window is hidden in the tray, or whether the webview is throttled.

#### Scenario: Alarm fires with the timer tab open
- **WHEN** an enabled alarm matches the current time while the user is on the Timer tab
- **THEN** the alarm fires and the ring UI is presented.

#### Scenario: Alarm fires while window is hidden in tray
- **WHEN** an enabled alarm matches the current time with the window hidden
- **THEN** a native OS notification is shown and the window is revealed to present the ring UI.

### Requirement: Autostart With the Operating System
The application MUST be able to launch automatically at login and start hidden in the tray.

#### Scenario: Machine restarts
- **WHEN** the user logs in after a restart with autostart enabled
- **THEN** the app starts hidden in the tray with the scheduler running.
