# Change: Fix Always-On-Top and Connect Real Dynamic UI to Chat

## Why
1. The window stays permanently on top (`alwaysOnTop: true`), so clicking another window does not send Alarmer to the background.
2. The AI Chat answered with text ("Принято: активирована нуар-тема"), but did not actually apply the `DynamicUIConfig` mutations to the app.

## What Changes
- Set `alwaysOnTop: false` in `src-tauri/tauri.conf.json` and default `isPinned: false` in `src/App.tsx`.
- Connect `AICompilerService.compileCommand` into `AITrainer.tsx` so that when a user asks for a theme or layout change, `onApplyUI` is immediately called and the application theme/layout physically transforms.

## Verification
- `bun run build`.
- Test typing "монохромная черная белая нуар тема" and observe real-time background and accent color changes.
