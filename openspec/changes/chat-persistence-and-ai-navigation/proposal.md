# Change: Persistent Chat History & Interactive AI Navigation

## Why
1. When user switches tabs, `AITrainer` component unmounts and all chat messages in local `useState` are erased. Chat history must be hoisted to `App.tsx` and persisted in `localStorage` so switching tabs never clears the conversation.
2. When the AI executes an action (e.g., setting an alarm, setting a timer, adjusting layout), the app must navigate the user to that tab (e.g. Alarms tab on Dashboard, or Timer) and provide clear visual feedback showing the created/updated item.

## Verification
- Write a message in AI Co-Pilot.
- Switch to Dashboard or Settings and back to AI Co-Pilot -> Chat history is 100% preserved.
- Ask AI: "Поставь будильник на 07:30 Подъем" -> App automatically switches to Dashboard -> Alarms tab, where the new alarm 07:30 is highlighted and created.
