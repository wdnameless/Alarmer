# Change: Background Alarms & System Tray

## Why
Alarms and workout reminders must reliably ring and trigger system notifications even when the user closes or minimizes the window.

## What Changes
- Add `tauri-plugin-notification` to Tauri 2 and npm dependencies.
- Add system tray icon with menu (`Show Alarmer`, `Mute`, `Quit`).
- Hide window on close instead of exiting application.
- Deliver native OS notifications with sound when alarm triggers.

## Verification
- `cargo check` and `bun run build`.
- Trigger alarm in background and verify OS notification.
