# Change: Separate Floating Companion Window for AI Co-Pilot

## Why
User specifically requested: "должна появляться новое окно, привязанное к основному окно".
The AI Co-Pilot must not be a panel inside the main window. It must be an actual separate OS webview window (`ai-copilot`) created via Tauri API that spawns side-by-side next to the main window.

## Verification
- Main window stays 340px compact.
- Clicking the AI button opens an actual separate OS window titled "AI Co-Pilot" docked right next to the main window.
- The two windows communicate via Tauri events or local storage so AI commands directly control the timer.
