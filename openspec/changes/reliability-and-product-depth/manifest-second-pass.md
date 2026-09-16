# Requirements Manifest: Second Pass — Loop, Promises, Honesty

Second audit, after the P0 fixes landed. The failures this time are not crashes
but **claims the code does not keep**: a screen promising statistics the timer
never feeds, a backend computing missed alarms nobody displays, type fields with
no writer, an EN toggle that relabels two words.

| ID | Requirement | Evidence of the gap | Status |
|---|---|---|---|
| R14 | Таймер питает статистику, как обещает экран «Итоги» | `StatsView` текст «блок **или таймер**»; `Timer.tsx` — ни одного `onSession` | done |
| R15 | Пропущенные будильники видны пользователю | `alarm://missed` эмитится, `missed_alarms_today` зарегистрирована, во фронтенде **0 подписчиков** | done |
| R16 | `stop_alarm_sound` вызывается | зарегистрирована в Rust, не вызывается **нигде** → backend и webview звонят одновременно | done |
| R17 | Задача связана с шагом расписания | `TaskItem.stepId`/`scheduleId` не заполнялись и не читались | done |
| R18 | История сессий доступна | `recentSessions()` определена, не вызывалась | done |
| R19 | API-ключ не остаётся в файле | `sanitizeAiSettings` продолжал сохранять `raw.apiKey` после переезда в keyring | done |
| R20 | Автозапуск сворачивает в трей, как обещано в настройках | `autostart::init(_, None)`, аргументы не разбирались | done |
| R21 | Покрытие не падает | 41% без порога в CI; оба P0 жили в файлах с 0% | done |
| R22 | Язык интерфейса действительно переключает интерфейс | 48 ключей, 15 из 19 компонентов не использовали `t()` | done |
| R23 | Речь не перебивает саму себя | один `audioEl`, несколько одновременных вызывающих | done |

## Найдено только живым запуском

Юнит-тесты этого поймать не могли; оба случая — расхождение между тем, что
компонент считает, и тем, что backend уже знает.

- **Двойной синк съедал «догон» пропущенного.** `AlarmCenter` синкал
  расписание на монтировании, когда `firings` ещё пуст (до гидратации).
  Первый пустой синк ставил `synced_once`, поэтому реальный список приходил
  как «новый», и восстановленный будильник помечался обработанным — то есть
  пропущенное молча исчезало. Лечится гейтом на `hydrated`.
- **`speak()` разрешался по опустошении очереди, а не по концу своей фразы.**
  Вызывающий ждал все последующие реплики. Теперь каждая строка отпускает
  своего вызывающего.
