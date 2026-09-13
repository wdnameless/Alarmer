# Requirements Manifest: Generative Time & UI Platform

## Source Quotes
- "Под любое расширение кнау нас должно быть адаптивность"
- "потом у нас должен быть не пресад тем, а мы должны интерфейс динамически настраивать через чат с нейронкой."
- "нейронка бы нам, которую мы подключим потом, меняла бы динамический интерфейс, так как просят юзер. И, возможно, добавляло бы какие-то сценарии отсчета времени, будильников, всякого такого"
- "достигу сдать максимально кастомизированную гибридную платформу по управлению временем, напоминалками и всякого такого"

## Requirements
- **R01 (Fluid Adaptive Layout)**: The app MUST scale smoothly to any arbitrary window dimension (from tiny 220px widget to full desktop). The radial dial, buttons, and stats must use fluid SVG scaling and container queries.
- **R02 (Declarative UI Compiler)**: The UI layout MUST be driven by a declarative DSL config with customizable widgets (`dial`, `quickPresets`, `subtimer`, `actionControls`, `alarmSummary`, `workoutQueue`).
- **R03 (AI Co-Pilot Drawer / Sidebar)**: A dedicated sliding Chat Drawer accessible by a permanent header button or hotkey to converse with the AI model.
- **R04 (Full System Control via AI)**: The AI can modify the UI (colors, glowing, dial ticks, widget ordering, fonts) AND mutate time-tracking scenarios (alarms, intervals, workouts, countdowns).
- **R05 (Zero-Friction Offline/BYOK Execution)**: Fully operational with local intelligent fallback parsing and universal OpenAI-compatible BYOK endpoints.
