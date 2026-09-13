# Change: Settings, Cloud TTS, Maximize & New Icon

## Why
Users need full control over app settings, high-quality neural voice synthesis (free Edge TTS), window maximize capability, permanent access to navigation/settings, and a refreshed minimalist pulse icon.

## What Changes
1. **Permanent Settings & Navigation**:
   - Settings button always visible in header.
   - Dedicated Settings view with Voice selection, API settings, and defaults.
2. **Cloud Neural TTS**:
   - Free Microsoft Edge Neural voices (Svetlana, Dmitry, Guy, Jenny, etc.) with audio caching.
   - Default voice set to None/Silent per user request.
3. **True Window Maximize**:
   - Maximize / Unmaximize window toggle in TitleBar.
4. **App & Tray Icon**:
   - New Pulse Minimalist SVG/PNG icon generated for desktop and tray.
5. **Direct LLM Enforcement**:
   - AI Chat strictly requests user-configured LLM with no silent mock fallback when key is provided.

## Verification
- `bun run build` and `cargo check`.
- Verify maximize/restore, settings screen, Edge TTS speech, and new icon.
