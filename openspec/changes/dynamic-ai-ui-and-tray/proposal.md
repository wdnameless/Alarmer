# Change: Dynamic AI-Driven UI, Frameless Window Resizing & Reliable System Tray

## Why
Users need:
1. **Dynamic Generative UI**: Users can prompt the AI (e.g. *"Сделай стиль матрицы с зеленым терминальным шрифтом, спрячь секундомер и увеличь цифры таймера"*), and the AI immediately alters the theme colors, font families, glow effects, element sizing, and module layouts dynamically with persistent user preset storage.
2. **Frameless Window Resizing & Control**: Window controls must work reliably: minimize to taskbar/tray, hide on close with notification, and allow resizing the window freely by dragging any edge or corner handle while preserving the frameless look.
3. **Reliable System Tray**: Ensure the tray icon always displays properly in Windows with its icon resource bundled and loaded, tooltip updated, and context menu ("Развернуть Alarmer", "Выход").

## What Changes
- **Rust Tauri Core (`src-tauri/src/lib.rs`, `tauri.conf.json`)**:
  - Bundle and explicitly load the tray icon from `icons/32x32.png` / `icons/icon.ico` using `tauri::image::Image::from_path`.
  - Fix window decorations and allow manual resizing via Tauri API and custom CSS/DOM resize handles.
  - Implement native tray event handler that properly toggles window visibility and focus.
  - Expose window resize and control commands if required.
- **Dynamic UI State & Engine (`src/types/index.ts`, `src/services/uiTheme.ts`, `src/services/ai.ts`)**:
  - Define `DynamicUIConfig`: custom color palette, glow strength, dial tick density, font style, visible module tabs, dial scale.
  - Extend `AIService` to handle UI customization prompts (parsing layout requests, generating CSS tokens, adjusting dial dimensions).
  - Add UI customizer overlay and AI Prompt bar for instant UI changes.
- **Frameless Window Resize Handles (`src/components/ResizeHandles.tsx`, `src/App.tsx`)**:
  - Add invisible edge and corner grab zones (N, S, E, W, NE, NW, SE, SW) that trigger window resizing via pointer events / Tauri `startDragging`.
- **System Tray Polish & Native Alerts**:
  - Native notification when minimizing to tray: *"Alarmer свернут в трей и продолжает следить за будильниками"*.

## Verification
- Unit & Type verification: `bun run build`.
- Rust compilation: `cargo check --manifest-path src-tauri/Cargo.toml`.
- End-to-end testing: resize handles check, AI UI prompt transformation check, tray minimize and restore.
