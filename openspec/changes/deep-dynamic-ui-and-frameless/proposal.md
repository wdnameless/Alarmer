# Proposal: Zero-Margin Frameless Window, Native Window Controls & Deep Generative Component UI

## Problem
1. On the user's screen, an artificial outer container with green border and unused transparent padding surrounds the actual card.
2. Window resize drag is blocked or unresponsive because of outer fixed padding and lack of core Tauri window permissions.
3. Minimize and close buttons must reliably talk to Tauri window APIs without browser/webview interference.
4. The user wants next-level dynamic AI capability: prompting or dictating changes that alter not just colors, but the full UI structure (widget visibility, layout arrangements, button styles, dial sizes, component priority).

## Proposed Changes
1. **Window Architecture**:
   - Make the React root and HTML body 100% of the Tauri window (`w-screen h-screen m-0 p-0 border-0 rounded-none`).
   - The app card fills the entire window (`w-full h-full rounded-2xl`).
   - Enable `core:window:allow-start-dragging`, `core:window:allow-minimize`, `core:window:allow-hide`, `core:window:allow-close` in Tauri capabilities.
   - Attach seamless native edges that invoke Tauri window APIs or direct responsive CSS layout.

2. **Window Controls**:
   - Fix Minimize button: call `appWindow.minimize()` with proper Tauri capability.
   - Fix Close button: call `appWindow.hide()` or `appWindow.close()`.
   - Fix Expand button: smoothly toggle between compact (260x420) and full expanded (480x680) mode with `appWindow.setSize()`.

3. **Deep Generative Component UI (Next Level DSL)**:
   - Expand `DynamicUIConfig` to support layout hierarchy:
     - Widget visibility (`showPresets`, `showSubTimer`, `showControls`, `showWorkoutQueue`)
     - Dial scale and placement (`compact`, `normal`, `hero`)
     - Button layout (`horizontal`, `vertical`, `pill`, `square`)
     - High-contrast color palette, glow effects, typography scales.
   - Upgrade AI prompt interpreter with deep prompt understanding (e.g. "убери кнопки пресетов, сделай таймер гигантским на весь экран в стиле киберпанк").
