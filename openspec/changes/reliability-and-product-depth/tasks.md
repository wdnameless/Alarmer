# Tasks: Reliability and Product Depth

- [x] Phase 1: vitest jsdom + testing-library; CI (frontend + cargo test + clippy); `check:all` <!-- id: 0 -->
- [x] Phase 2: dismiss no longer re-arms its own slot; sync + firing raised to `AlarmCenter` <!-- id: 1 -->
- [x] Phase 2: explicit `repeat: once | daily | days` across TS, Rust and the AI prompt, with migration <!-- id: 2 -->
- [x] Phase 2: catch-up window plus `alarm://missed` instead of silent loss <!-- id: 3 -->
- [x] Phase 3: `timer.rs` owns the countdown; view, overlay and hotkeys read one state <!-- id: 4 -->
- [x] Phase 3: finish notification when the window is hidden; flow/deadline both reachable <!-- id: 5 -->
- [x] Phase 4: `alarm_sound.rs` synthesises and plays the signal through the OS device <!-- id: 6 -->
- [x] Phase 5: AI requests via Rust; key in the OS credential store; failures reported <!-- id: 7 -->
- [x] Phase 5: one gateway replaces three pipelines; tightened the local-UI short-circuit <!-- id: 8 -->
- [x] Phase 6: store v3 with tasks and session log; statistics derived from that one log <!-- id: 9 -->
- [x] Phase 6: Tasks and Stats screens wired into the dashboard <!-- id: 10 -->
- [x] Phase 7: theme picker; reduced-motion and focus-visible <!-- id: 11 -->
- [x] Phase 8: dead files, dependency, types and dynamic-UI knobs removed; metadata fixed <!-- id: 12 -->
- [x] Verify: `bun run check:all` — 107 vitest, 32 cargo, clippy `-D warnings` clean <!-- id: 13 -->
- [x] Verify: live run — timer survives a tab switch, alarm survives a tab switch, <!-- id: 14 -->
      Stop does not re-ring, hidden-window alarm rings and reveals the window

## Found only by running the app

The unit tests could not have caught these; both were surfaced by the live pass.

- `reqwest` with `rustls-tls` linked **both** `aws-lc-rs` and `ring`, so rustls
  refused to choose and panicked on the first HTTPS request — every AI call would
  have died at runtime behind a green test suite. Now one provider is named
  explicitly at start-up.
- `RingChip`-style label uppercasing (`text-transform`) meant `innerText` and
  `textContent` disagreed; the first live assertion on the takeover was wrong
  because of it, not because the UI was.
