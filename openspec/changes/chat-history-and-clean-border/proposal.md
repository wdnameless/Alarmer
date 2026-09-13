# Change: Full Multi-turn Chat, Borderless Frameless & Remove Theme Button

## Why
1. User requests removing the extra palette (Theme) button since themes are managed via AI Co-Pilot.
2. The green glowing border around the window (`borderColor: theme.accent55`, `filter: drop-shadow`) looks like an unintended frame and must be removed for a clean borderless look.
3. The AI Co-Pilot tab currently only swaps a single message card; it must be a real conversational multi-turn chat stream with message history, clear input on send, and scrolling thread.

## What Changes
- Remove palette button and Theme Picker popover from `src/App.tsx`.
- Remove border and drop-shadow styling on root container in `src/App.tsx`.
- Refactor `AITrainer.tsx` into a real chat stream with `messages: Message[]` history.

## Verification
- `bun run build`.
- Live test chatting back and forth with message bubbles accumulating.
