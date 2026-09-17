# Portable, Notes, and the Alarm-Clock Audit

## Why

Three asks: ship the app as a portable build for Linux/macOS/Windows, add
somewhere to write things down, and answer honestly whether this works as a
plain alarm clock.

## Portable

A portable build keeps its data beside the executable instead of in the
per-user application data directory. The app detects either the
`ALARMER_PORTABLE` environment variable or a `portable` marker file next to the
binary, and then writes `alarmer.json` into a `data` folder there.

- Implemented as `store_dir`, a Rust command, because only the backend knows
  where the binary actually lives.
- Verified by running the built binary with the marker present: `alarmer.json`
  appeared beside the executable and AppData stayed untouched.

## Release

`.github/workflows/release.yml` builds on all three platforms on a `v*` tag and
publishes a draft GitHub Release containing:

- the platform installers (NSIS/DMG/AppImage and friends, from `tauri-action`);
- a portable zip per platform: the bare binary plus the `portable` marker.

## Notes

A note is written in a deliberately small Markdown subset — headings, emphasis,
lists, quotes, code, links — and rendered from text, never as HTML, so a note
cannot break the CSP or inject a script. Unsupported syntax renders as plain
text rather than being stripped.

Notes attach at three scopes:

- **free-standing** in the Notes screen;
- **on an alarm**, shown on the ringing takeover so "what was this for" is
  answered at the moment it matters;
- **on a schedule step**, shown in the interval player.

Stored in schema v4; `notes` starts empty on migration.

## Alarm-clock audit

Written up in `audit-alarm-clock.md`. The short version: reliability is sound,
and the three things that actually blocked using it as a daily alarm — no
weekday picker, no way to edit an alarm, no description — are fixed here. The
remaining gaps are window size (260×420 with 10–11px text) and niche features
(date-bound alarms, sleep timer, custom alarm sound via UI).
