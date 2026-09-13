## ADDED Requirements

### Requirement: Native System Notifications
The application must request notification permissions and deliver native desktop notifications with title and body when an alarm triggers.

#### Scenario: Native notification on alarm
- **WHEN** an alarm reaches its designated time
- **THEN** a native OS notification is displayed with sound and alarm title.

### Requirement: System Tray Minimize
Closing the main window should hide it to the system tray rather than killing background timer monitoring.

#### Scenario: Hide on close
- **WHEN** user clicks close button
- **THEN** window is hidden to tray and can be restored from tray menu or icon click.
