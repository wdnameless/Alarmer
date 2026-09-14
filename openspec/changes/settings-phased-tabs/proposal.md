# Change: Phased Tabbed Navigation in Settings View

## Why
On user screenshot, all settings sections (TTS, Sound effects, AI BYOK, Data management) are stacked in one continuous long vertical scroll, creating visual noise and clutter. We must divide Settings into clean, distinct logical tabs / phases at the top:
1. "🔊 Звук и Аудио" (TTS, Тиканье, Свой рингтон, Громкости)
2. "🧠 Нейросеть (AI)" (BYOK API Key, Base URL, Модель)
3. "💾 Резервная копия" (Экспорт / Импорт JSON, Сброс)

## Verification
- User sees 3 clean phase pills at the top of Settings.
- Clicking each tab renders ONLY that phase, eliminating the endless scroll.
- `bun run build`.
