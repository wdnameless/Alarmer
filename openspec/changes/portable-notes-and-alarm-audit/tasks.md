# Tasks: Portable, Notes, Alarm-Clock Audit

- [x] Notes entity in store schema v4, with migration <!-- id: 0 -->
- [x] Safe Markdown renderer: text in, elements out, never HTML <!-- id: 1 -->
- [x] Notes screen: list, editor, pin, delete, attach to alarm or step <!-- id: 2 -->
- [x] Per-alarm description, shown on the ringing takeover <!-- id: 3 -->
- [x] Per-step description, shown in the interval player <!-- id: 4 -->
- [x] Portable mode: data lives beside the executable <!-- id: 5 -->
- [x] Release workflow building Windows, macOS and Linux on a tag <!-- id: 6 -->
- [x] Portable zip per platform, attached to the release <!-- id: 7 -->
- [x] Weekday picker, and days editable on an existing alarm <!-- id: 8 -->
- [x] In-place time editing on an existing alarm <!-- id: 9 -->
- [x] Verify: 181 vitest, 39 cargo, clippy clean, thresholds met <!-- id: 10 -->

## Found by running the app

Both were invisible to the unit tests, and both would have damaged real data.

- **The alarm list persists schedule steps as if the user made them.** The list
  renders `firings` — schedules expanded into alarms — and writes back through
  `setAlarms`, so toggling or editing any derived row stored a copy of that
  schedule step in `alarms`. `buildFirings` filters derived entries on read, so
  the UI looked correct while the file accumulated stale copies forever. Fixed by
  filtering at the state setter, so no screen can leak them by omission, and the
  derived rows' controls are now inert with a title saying where to edit instead.
- **`speak()` resolved on queue drain, not on its own line**, so a caller waited
  for every later utterance. Each line now releases its own caller.

## Portable, verified end to end

Extracted the release binary into a clean folder with a `portable` marker, ran
it, and confirmed `data/alarmer.json` appeared beside the executable with the
per-user application data directory untouched.
