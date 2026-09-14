# Proposal: v2 Hardening Program

## Why
Аудит выявил 5 классов дефектов, подтверждённых инструментами:
- **Мёртвый код 1098/5061 LOC (21.7%)**: AITrainer, WorkoutPlayer, aiDynamicUi, Stopwatch, AIDynamicUIBar, aiAssistant + мёртвые методы AIService.
- **Тройное дублирование ИИ-движка**: ai.ts ↔ aiCompiler.ts ↔ aiAssistant.ts.
- **16 ключей localStorage** без версии схемы; импорт битого JSON роняет приложение.
- **0 тестов, 0 линтера, 0 ErrorBoundary** — любое исключение = белый экран в безрамочном окне.
- **csp: null** + capabilities `"windows": ["main","ai-copilot","*"]`.
- **TTS**: новый WebSocket + 25КБ base64 через IPC на каждое слово, без кэша.

## Slices
- **S1** Dead code purge + single AI engine
- **S2** Native Tauri Store (versioned, validated)
- **S3** ErrorBoundary + ESLint + Prettier + vitest core tests
- **S4** CSP + capabilities hardening
- **S5** Rust TTS cache + persistent client
