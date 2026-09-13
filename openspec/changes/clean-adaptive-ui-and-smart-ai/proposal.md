# Change: Clean Minimalist Adaptive UI, True Multi-Voice Audio & Conversational AI Co-Pilot

## Why
1. The user explicitly complained:
   - "не все озвучки работают, голос просто повторяется" (Voices sound the exact same).
   - "нет адаптивности, слишком награможденный интерфейс, я хочу чистый и стильный" (No responsiveness, cluttered UI, want clean & stylish).
   - "чтобы юзер мог сам прописал что ему нужно в ИИ чат и тот бы ему это сделал или сказал что такое не предусмотренно" (User wants to type what they want in AI chat, and AI executes it or explains if impossible).

2. Architectural solution:
   - **TTS Audio Streaming**: Implement reliable remote audio streaming with genuine voice differentiation (Google Cloud TTS streams `translate_tts` and Edge endpoint + OpenAI BYOK `tts-1` audio + acoustic modulation pitch/rate). Guy sounds like male English, Svetlana sounds like female Russian, Dmitry sounds like male Russian, Jenny sounds like energetic female English.
   - **Clean & Adaptive UI**:
     - Declutter the main view. Remove the redundant `#задача` quick-capture bar and unnecessary rhythm badges (`25/5`, `Deep 50`, `90/20`, `Flow ON`) that clutter the screen.
     - Full responsiveness: allow the window to scale smoothly on any screen resolution and width/height.
     - Minimalist elegance: pure focused dial, clean sleek controls, plenty of negative space.
   - **Intelligent Conversational AI Co-Pilot**:
     - User can type ANY request in the AI chat (e.g. "поставь таймер на 15 минут", "сделай тему фиолетовый киберпанк", "убери засечки", "поставь будильник на 7 утра", "сделай тренировку табата", "запусти таймер").
     - AI executes the mutation immediately (updates timer, modifies UI, adds alarm, starts workout).
     - If the user asks for something outside the application's capabilities (e.g. "закажи мне пиццу", "сделай кофе"), the AI politely and clearly explains that this feature is not supported in Alarmer.

## Verification
- `bun run build` && `cargo check`.
- Launch app and verify:
  1. Clean, decluttered, stylish layout.
  2. Test voices: Jenny, Guy, Dmitry, Svetlana each sound distinct.
  3. AI chat: Ask "поставь таймер на 10 минут и сделай неоновый синий стиль" -> AI executes it.
  4. AI chat: Ask "свари мне кофе" -> AI responds that this is not supported.
