import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { THEMES } from '../constants/themes';

/**
 * Compact always-on-top overlay showing the remaining timer time.
 *
 * Rendered in its own transparent, frameless window (`?window=mini-overlay`).
 * The timer state is mirrored here through the `timer://tick` event so the
 * overlay never owns the clock itself.
 */
export function MiniOverlay() {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(1);
  const [running, setRunning] = useState(false);

  const theme = THEMES['dark-neon'];
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listen<{ remaining: number; total: number; running: boolean }>('timer://tick', (event) => {
      setRemaining(event.payload.remaining);
      setTotal(event.payload.total);
      setRunning(event.payload.running);
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = Math.floor(remaining % 60).toString().padStart(2, '0');

  return (
    <div
      data-tauri-drag-region
      className="w-screen h-screen flex items-center justify-center select-none cursor-move"
      style={{ background: 'transparent' }}
    >
      <div
        className="relative flex flex-col items-center justify-center rounded-2xl border px-3 py-2 shadow-2xl"
        style={{
          backgroundColor: `${theme.bg}E6`,
          borderColor: theme.border,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Hairline progress rail */}
        <div
          className="absolute left-2 right-2 bottom-1.5 h-[2px] rounded-full overflow-hidden"
          style={{ backgroundColor: theme.ringTrack }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${progress * 100}%`, backgroundColor: theme.accent }}
          />
        </div>

        <span
          className="text-2xl font-mono font-bold tabular-nums leading-none"
          style={{ color: theme.text }}
        >
          {mm}:{ss}
        </span>

        <span className="text-[9px] uppercase tracking-widest mt-1" style={{ color: theme.subtext }}>
          {running ? 'идёт' : 'пауза'}
        </span>
      </div>
    </div>
  );
}

/** Closes the overlay window when the user double-clicks it. */
export function useOverlayDismiss() {
  useEffect(() => {
    const handler = () => {
      void getCurrentWindow().close();
    };
    window.addEventListener('dblclick', handler);
    return () => window.removeEventListener('dblclick', handler);
  }, []);
}
