# Change: Allow Toggling Current Time Badge in Alarms View via AI

## Why
On user screenshot:
1. The previous command "убери кнопку ко сну и ИИ" successfully hid the "Ко сну" and "ИИ" buttons! They are no longer visible in the screenshot.
2. User then asked: "убери текущее время 21:05", but the digital clock badge `21:05` remained on the right.
We will add `showCurrentTimeBadge` to `DynamicUIConfig.layout`, respect it in `src/components/Alarms.tsx`, and add recognition in `src/services/aiCompiler.ts`.

## Verification
- When user asks "убери время" or "убери текущее время", `showCurrentTimeBadge` is set to false.
- The `21:05` badge disappears immediately from the Alarms header.
- `bun run build`.
