# Change: Dynamic UI Visibility Control via AI Prompts

## Why
User requests the AI to dynamically hide/show specific interface buttons and elements upon conversational requests (e.g., "убери кнопки ко сну и ИИ", "верни кнопки", "скрой верхние вкладки"). The AI compiler will map these natural language intents to dynamic visibility flags in `DynamicUIConfig`, instantly mutating the DOM and persisting the layout state.

## Verification
- Add visibility flags to `DynamicUIConfig`: `showSleepButton`, `showAiScheduleButton`, `showSubTabs`.
- Handle phrases like "убери кнопку ко сну", "убери кнопки ко сну и ии", "верни кнопку" in `src/services/aiAssistant.ts`.
- Condition rendering in `src/components/Alarms.tsx` on these flags.
- `bun run build`.
