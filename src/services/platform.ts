/**
 * Runtime environment checks.
 *
 * The app runs both under Tauri and in a plain browser during `vite dev`, and
 * every IPC call has to know which one it is on. This lived as a private copy in
 * each module; one shared check keeps them from drifting apart.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
