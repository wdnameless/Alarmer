# Interfaces — Focus Budget Program

Every parallel agent codes against these signatures. Owners are named per section;
nobody else edits those files. Disagreement with a signature → message the owner via
`hub`, do not change it unilaterally.

## 1. Domain types — owner: Foundation

`src/types/index.ts` (additions) and `src/types/focus.ts` (new, re-exported from index):

```ts
/** An area of focus with a weekly allowance. */
export interface Direction {
  id: string;
  name: string;
  /** Hex colour used for the journal square and the traffic light row. */
  color: string;
  /** Blocks per week. Integer >= 1. */
  weeklyBlockBudget: number;
  /** Archived directions keep history but accept no new blocks. */
  archived: boolean;
}

/** Focus/rest cycle configuration. */
export interface BlockSettings {
  focusMin: number;   // default 50
  restMin: number;    // default 10
}

/** Presets the UI offers. */
export const BLOCK_PRESETS: ReadonlyArray<{ label: string; focusMin: number; restMin: number }>;
// [{ label: '50/10', focusMin: 50, restMin: 10 }, { label: '25/5', focusMin: 25, restMin: 5 }]
```

`SessionRecord` gains three optional fields (absent — not zeroed — when unknown):

```ts
export interface SessionRecord {
  // …existing unchanged…
  /** Absent means «Без направления». */
  directionId?: string;
  /** 1..10, only set for rated blocks. */
  quality?: number;
  /** Blocks earned; fractional. Absent → derive from focusedSec. */
  blocks?: number;
}
```

Store keys (preferences, strings/number as noted):
`alarmer_block_focus_min` (number), `alarmer_block_rest_min` (number),
`alarmer_music_url` (string, default `''`),
`alarmer_blocks_day` (string `YYYY-MM-DD`), `alarmer_blocks_count` (number).

## 2. Store — owner: Foundation

`src/services/store.ts`:

- `SCHEMA_VERSION = 6`
- `PersistedState` gains `directions: Direction[]`
- `sanitizeDirection(raw, index): Direction | null` — drops nameless entries,
  clamps `weeklyBlockBudget` to `1..200`, defaults `color` to a palette entry
- `migrate(raw)`: v5 → v6 adds `directions: []`; existing sessions keep loading with
  `directionId`/`quality`/`blocks` absent. **No session is dropped.**
- Export/import round-trips `directions` (it is part of `PersistedState`, so
  `exportJson`/`importJson` cover it once the field exists)

## 3. Budget and journal maths — owner: Foundation

`src/services/focusBudget.ts` (new). Pure functions, no React, no store access:

```ts
/** Monday-based week key, e.g. "2026-W38". */
export function weekKey(date: Date): string;

/** Monday 00:00 local of the week containing `date`. */
export function weekStart(date: Date): Date;

/** Blocks a session earned: `blocks` when set, else focusedSec/(focusMin*60). */
export function sessionBlocks(session: SessionRecord, focusMin: number): number;

/** Sessions belonging to a direction; `undefined` bucket = «Без направления». */
export function blocksByDirection(
  sessions: SessionRecord[],
  focusMin: number,
): Map<string | undefined, number>;

export interface DirectionProgress {
  direction: Direction;
  /** Week-to-date blocks, fractional. */
  used: number;
  budget: number;
  /** used / budget, may exceed 1. */
  ratio: number;
  over: boolean;
  /** 'on' | 'behind' | 'over', per the pace rule. */
  light: TrafficLight;
}

export type TrafficLight = 'on' | 'behind' | 'over';

/** Pace rule: on = within ±20% of elapsed-week pace; behind = under; over = budget passed. */
export function paceLight(used: number, budget: number, now: Date): TrafficLight;

/** One week's summary for the journal. */
export interface WeekSummary {
  key: string;
  start: Date;
  blocks: number;
  budgetTotal: number;
  /** Per-direction detail; key `undefined` = «Без направления». */
  byDirection: Map<string | undefined, number>;
  over: boolean;
}

export function weekSummaries(
  sessions: SessionRecord[],
  directions: Direction[],
  weeks: number,
  now: Date,
): WeekSummary[];

/** Month grid: one row per week, one entry per block, over-budget flagged. */
export interface MonthBlock { directionId?: string; color: string; over: boolean; }
export interface MonthRow { weekKey: string; start: Date; blocks: MonthBlock[]; budgetTotal: number; }
export function monthGrid(
  sessions: SessionRecord[],
  directions: Direction[],
  month: Date,
  focusMin: number,
): MonthRow[];
```

`src/services/stats.ts` keeps its current exports unchanged (the journal still uses them).

## 4. Block cycle in the backend — owner: RustTimer

`src-tauri/src/timer.rs` — a third mode alongside `countdown` and `flow`:

- Mode `block` runs phases: `focus` then `rest`, rest starting automatically at focus zero.
- Snapshot gains: `phase: "focus" | "rest"`, `blockIndex: number` (completed focus phases
  today), `directionId: string | null`.
- Commands: `timer_set_block_settings(focus_min, rest_min)`,
  `timer_set_direction(direction_id: string | null)`.
- `countdown` and `flow` MUST behave exactly as today — their existing tests are the guard.
- Existing `timer::*` command names are not renamed.

`src/services/timer.ts` mirrors the new snapshot fields and adds:

```ts
static async setBlockSettings(focusMin: number, restMin: number): Promise<void>;
static async setDirection(id: string | null): Promise<void>;
```

## 5. Music — owner: Music

`src/services/music.ts` (new):

```ts
/** Extracts the video id from a YouTube URL (watch/youtu.be/embed/shorts), else null. */
export function youtubeId(url: string): string | null;

/** Builds the nocookie embed URL, or null when the link is unusable. */
export function embedUrl(url: string): string | null;

export class MusicService {
  /** Starts playback for a focus phase. No-op with no link configured. */
  static async play(): Promise<void>;
  /** Stops playback (rest phase, user pause, block end). */
  static async stop(): Promise<void>;
  static isPlaying(): boolean;
}
```

`tauri.conf.json` CSP: add `frame-src https://www.youtube-nocookie.com` only.
No other origin is added; `default-src` stays `'self'`.

## 6. AI over history — owner: Assistant

`src/services/aiHistory.ts` (new):

```ts
/** Compact, label-free digest of the journal for the model. */
export interface HistoryDigest {
  /** Per day: "YYYY-MM-DD" → { blocks, minutes, avgQuality }. */
  days: Record<string, { blocks: number; minutes: number; avgQuality: number | null }>;
  /** Per direction name: blocks and minutes this week. */
  directions: Array<{ name: string; blocks: number; budget: number }>;
  /** Hour-of-day histogram of focus minutes. */
  byHour: number[];
  totals: { sessions: number; blocks: number; minutes: number };
}

/**
 * Builds the digest. MUST NOT include session labels, ids or timestamps beyond the
 * day key — aggregates only.
 */
export function buildHistoryDigest(
  sessions: SessionRecord[],
  directions: Direction[],
  focusMin: number,
  now: Date,
): HistoryDigest;
```

`aiCompiler.ts` gains mutation kind `'directions'` carrying
`directions?: Array<{ name: string; weeklyBlockBudget: number; color?: string }>`,
and its system prompt receives the digest. Raw session labels are never placed in the
prompt payload.

## 7. UI owners (files are exclusive)

| Slice | Owns |
|---|---|
| Journal | `src/components/JournalView.tsx` (new), `DirectionEditor.tsx` (new), `src/App.tsx` (tab rename), `src/components/DashboardView.tsx` (sub-tab wiring) |
| TimerBlock | `src/components/Timer.tsx`, `src/components/QualityPrompt.tsx` (new) |
| TodayStart | `src/components/TodayView.tsx` |
| Music | `src/services/music.ts`, `src/components/SettingsView.tsx` (music row) |

**`src/App.tsx` is owned by Journal only.** Anyone else needing a change there sends the
edit to Journal via `hub`.

## 8. Acceptance hooks

- `bun run check:all` must pass: tsc, eslint, vitest with coverage ≥ 53/50/50/54.
- `cd src-tauri && cargo clippy --all-targets -- -D warnings`.
- Every new pure function in §3 and §6 gets a test that fails when the rule is inverted.
