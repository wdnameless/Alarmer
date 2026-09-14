# Change: Magnetic Tethered Companion Window

## Why
User requests the AI Companion window and the Main window to be magnetically linked / tethered:
1. When main window moves or drags, the companion window tracks its position and moves alongside it.
2. Minimize/Restore/Close/AlwaysOnTop synchronization across both windows.
3. Snapping alignment: the companion window stays attached seamlessly to the right flank of the main window.

## Verification
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `bun run build`
- Moving the main window moves the companion window in real-time.
