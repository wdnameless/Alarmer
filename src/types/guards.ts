/**
 * Canonical runtime type guards shared across the app.
 *
 * These live in one place so boundary checks (persisted files, imported
 * backups, IPC payloads) never re-declare their own narrowing helpers.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

/** Picks `value` when it is one of `allowed`, otherwise `fallback`. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
