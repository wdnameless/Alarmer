# Tasks: Dynamic AI UI, Frameless Resize & Tray Fix

## 1. Window Controls & System Tray
- [x] Correct tray icon packaging and event handlers in `src-tauri/src/lib.rs` <!-- id: 0 -->
- [x] Add frameless edge and corner resize handles (`ResizeHandles.tsx`) allowing free dragging and resizing <!-- id: 1 -->
- [x] Fix window minimize, hide-to-tray, restore, and quit handlers in TitleBar and Tray menu <!-- id: 2 -->

## 2. Dynamic Generative AI UI Engine
- [x] Define `DynamicUIConfig` schema (colors, glow, fonts, visible tabs, dial scale) in `src/types/dynamicUi.ts` <!-- id: 3 -->
- [x] Implement `AIService.generateDynamicUI(prompt, currentConfig, settings)` in `src/services/aiDynamicUi.ts` with offline fallback <!-- id: 4 -->
- [x] Create `AIDynamicUIBar.tsx` overlay component with prompt input and quick styling presets <!-- id: 5 -->
- [x] Apply dynamic CSS overrides and dial parameters to `RadialDial.tsx` and `Timer.tsx` <!-- id: 6 -->

## 3. Testing & Verification
- [x] Validate OpenSpec change `dynamic-ai-ui-and-tray` <!-- id: 7 -->
- [x] Run `bun run build` and `cargo check` <!-- id: 8 -->
- [x] Verify window resizing, tray minimize, and prompt-driven UI mutations in live app <!-- id: 9 -->
- [x] Launch in dev mode, verify tray icon, window resize by mouse, and live AI UI modification <!-- id: 10 -->
