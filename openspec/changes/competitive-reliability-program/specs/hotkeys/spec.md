## ADDED Requirements

### Requirement: Global Hotkeys Without Window Focus
The application MUST respond to global shortcuts so the user can control the timer
without switching to the app window.

#### Scenario: Pause from another application
- **WHEN** the user presses the pause shortcut while working in another app
- **THEN** the timer pauses without the Alarmer window being focused.

### Requirement: Always-On-Top Mini Overlay
The application MUST offer a compact always-on-top overlay showing remaining time.

#### Scenario: Overlay stays visible over other windows
- **WHEN** the mini overlay is enabled
- **THEN** it remains visible above other applications.
