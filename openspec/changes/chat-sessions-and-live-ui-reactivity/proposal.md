# Change: Chat Sessions Management and Live Reactive Dynamic UI Mutation

## Why
1. On user screenshot, after sending "Убери кнопки ко сну и ИИ", the AI replied that the buttons were hidden, but on the left panel the buttons remained visible! Root cause: `onApplyUI` was receiving partial mutations without deep merging into `dynamicUi.layout`, or `DashboardView` was not re-rendering the updated config reactively.
2. User requested Chat Sessions (multiple dialogs/threads): creating new chats, switching between sessions, and naming them.

## Verification
- Deep merge `ui` mutation in `App.tsx` state update.
- Verify `dynamicUi.layout.showSleepButton !== false` and `showAiScheduleButton !== false` instantly removes the buttons in `Alarms.tsx`.
- Implement Sessions switcher in `AIChatDrawer.tsx`.
- `bun run build`.
