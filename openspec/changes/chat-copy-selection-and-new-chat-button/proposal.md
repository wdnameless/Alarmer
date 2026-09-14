# Change: Allow Text Selection/Copying in Chat & Add Prominent "+ Новый чат" Button

## Why
1. User cannot copy text from chat because `select-none` was set on parent containers (`App.tsx` and `AIChatDrawer.tsx`). We must set `select-text` on message bubbles and provide an explicit 1-click Copy button on every assistant message.
2. The "+ Новый чат" button was hidden or missing in the header of `AIChatDrawer.tsx`. A prominent, clearly visible "+ Новый чат" button with icon must be added right in the chat header.

## Verification
- User can select and copy any text from messages with cursor or Ctrl+C.
- User can click the copy icon on any message to copy to clipboard with instant checkmark feedback.
- Prominent "+ Новый чат" button is visible in the header and clears/resets the conversation.
- `bun run build`.
