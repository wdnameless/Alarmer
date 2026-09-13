# Change: Generative Adaptive Time Platform

## Why
Transform Alarmer from a static timer app into a fluid, generative time management platform where the user talks to an embedded AI Co-Pilot to adaptively rebuild the UI layout, styling, and time tracking scenarios on the fly.

## What Changes
1. **Container Queries & Fluid Scaling**: Implement dynamic scaling container for `RadialDial` that automatically sizes to available window height/width without scrollbars or overflow.
2. **AI Co-Pilot Chat Sidebar (`AIChatDrawer.tsx`)**: Slide-out conversation interface supporting streaming messages, history, and action executions (UI mutations + alarms + workouts).
3. **Declarative UI Engine (`DSL`)**: Extend dynamic layout tree supporting widget ordering (`['dial', 'subtimer', 'presets', 'controls', 'alarms']`), widget visibility, sizing, and theme styling.
4. **AI UI & Scenario Compiler (`aiCompiler.ts`)**: Structured JSON tool/function outputs translating natural language wishes ("Сделай дашборд для учебы", "Компактный ночной режим", "Расставь интервалы для бокса") into direct state updates.

## Verification
- Unit & type check: `bun run build`
- Rust backend check: `cargo check`
- Live UI verification: resize window across extreme aspect ratios, run AI chat queries and inspect dynamic UI reconfiguration.
