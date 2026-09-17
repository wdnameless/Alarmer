/**
 * Directions and the block cycle.
 *
 * The unit of accounting is the *block* inside a *direction*, not the session:
 * a session says how long something took, a direction says what it was for and
 * how much of the week it is allowed to take. Everything here follows from
 * that — budgets are per direction, quality is per block, and the journal
 * compares weeks against the limit that applied when they happened.
 */

/** An area of focus with a weekly allowance. */
export interface Direction {
  id: string;
  name: string;
  /** Hex colour used for the journal square and the traffic-light row. */
  color: string;
  /** Blocks per week. */
  weeklyBlockBudget: number;
  /**
   * Archived directions take no new blocks but keep their history: their past
   * sessions stay in the journal and keep counting toward the weeks they are in.
   */
  archived: boolean;
}

/** Focus/rest cycle configuration. */
export interface BlockSettings {
  /** Focus phase length in minutes. */
  focusMin: number;
  /** Rest phase length in minutes. */
  restMin: number;
}

/** The cycles the UI offers by name, plus free-form values underneath. */
export const BLOCK_PRESETS: ReadonlyArray<{ label: string; focusMin: number; restMin: number }> = [
  { label: '50/10', focusMin: 50, restMin: 10 },
  { label: '25/5', focusMin: 25, restMin: 5 },
];

export const DEFAULT_BLOCK_SETTINGS: BlockSettings = { focusMin: 50, restMin: 10 };

/**
 * Colours new directions cycle through.
 *
 * Chosen to stay distinguishable on every theme we ship, including the AMOLED
 * black one, rather than to match any single palette.
 */
export const DIRECTION_COLORS = [
  '#ff7a1a',
  '#22c55e',
  '#3b82f6',
  '#f43f5e',
  '#a855f7',
  '#eab308',
] as const;

/** Which phase of a block is running. */
export type BlockPhase = 'focus' | 'rest';
