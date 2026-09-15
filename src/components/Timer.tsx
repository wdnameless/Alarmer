import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { ThemeColors, DynamicUIConfig } from '../types';
import { RadialDial } from './RadialDial';
import { soundService } from '../services/sound';
import { TimerService, type TimerSnapshot, MAX_MINUTES, MIN_MINUTES } from '../services/timer';
import confetti from 'canvas-confetti';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '../services/platform';

interface TimerProps {
  theme: ThemeColors;
  dynamicUi?: DynamicUIConfig;
  initialMinutes?: number;
  onFinish?: () => void;
}

/**
 * Renders the backend countdown.
 *
 * The component holds no clock of its own: mount and unmount are now free of
 * consequences, so switching sub-tabs — or hiding the window entirely — no
 * longer resets the timer or freezes the overlay.
 */
export const Timer: React.FC<TimerProps> = ({
  theme,
  dynamicUi,
  initialMinutes,
  onFinish,
}) => {
  const [state, setState] = useState<TimerSnapshot | null>(null);
  /** Progress the user is dragging on the dial; null when not dragging. */
  const [dragging, setDragging] = useState<number | null>(null);

  // Adopt the backend state on mount, then follow its broadcast.
  useEffect(() => {
    let active = true;
    void TimerService.getState().then((initial) => {
      if (active) setState(initial);
    });
    const unsubscribe = TimerService.subscribe((next) => setState(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // An initial duration handed in from outside (e.g. "timer for 10 minutes" in
  // the chat) arms the backend and stops there.
  useEffect(() => {
    if (initialMinutes === undefined) return;
    void TimerService.setDuration(initialMinutes).then(() => TimerService.getState().then(setState));
  }, [initialMinutes]);

  // Ring locally when the backend reports zero, plus confetti for a finished
  // countdown. The backend raises the OS notification when the window is hidden.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listen<TimerSnapshot>('timer://finished', (event) => {
      soundService.playFinishAlarm();
      soundService.speak('Время вышло!');
      confetti({ particleCount: 60, spread: 60 });
      onFinish?.();
      setState(event.payload);
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [onFinish]);

  if (!state) return null;

  const { total_secs, remaining_secs, running, overtime, overtime_secs, mode } = state;

  const toggleRun = () => {
    soundService.playCountdownTick();
    void TimerService.toggle().then(() => TimerService.getState().then(setState));
  };

  const reset = () => {
    soundService.playCountdownTick();
    void TimerService.reset().then(() => TimerService.getState().then(setState));
  };

  const armMinutes = (minutes: number) => {
    soundService.playCountdownTick();
    void TimerService.setDuration(minutes).then(() => TimerService.getState().then(setState));
  };

  const toggleMode = () => {
    soundService.playCountdownTick();
    const next = mode === 'flow' ? 'countdown' : 'flow';
    void TimerService.setMode(next).then(() => TimerService.getState().then(setState));
  };

  // Dial progress 0..1 over one hour, so 25 minutes is a little under half.
  const progress = Math.max(0, Math.min(1, remaining_secs / 3600));

  const formatSubDigital = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatPrimaryTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /** Live preview while dragging; the backend is only told on release. */
  const handleProgressChange = (newProgress: number) => {
    if (!running) setDragging(newProgress);
  };

  // Dial release arms the duration and starts it — the gesture is the intent.
  const handleProgressCommit = (finalProgress: number) => {
    const mins = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(finalProgress * 60)));
    setDragging(null);
    soundService.playCountdownTick();
    void TimerService.setDuration(mins)
      .then(() => TimerService.start())
      .then(() => TimerService.getState().then(setState));
  };

  const btnRounding =
    dynamicUi?.layout?.buttonStyle === 'pill'
      ? 'rounded-full'
      : dynamicUi?.layout?.buttonStyle === 'square'
      ? 'rounded-md'
      : 'rounded-2xl';

  const displayedRemaining = dragging !== null ? Math.round(dragging * 60) : remaining_secs;
  const displayedProgress = dragging !== null ? dragging : progress;
  const totalMinutes = Math.max(MIN_MINUTES, Math.round(total_secs / 60));

  return (
    <div className={`flex flex-col items-center w-full ${dynamicUi?.layout?.contentAlignment === 'compact' ? 'justify-center my-auto' : ''}`}>
      {/* Overtime banner: only reachable in flow mode, where the timer keeps
          counting up instead of interrupting. */}
      {overtime && (
        <div
          className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono mb-2 animate-pulse"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: theme.text, border: `1px solid ${theme.border}` }}
        >
          <span>⚡ ПОТОК +{Math.floor(overtime_secs / 60)}:{(overtime_secs % 60).toString().padStart(2, '0')}</span>
          <button
            onClick={() => {
              void TimerService.pause().then(() => TimerService.getState().then(setState));
            }}
            className="underline text-[10px] ml-1"
          >
            стоп
          </button>
        </div>
      )}

      <RadialDial
        theme={theme}
        progress={overtime ? 1 : displayedProgress}
        primaryText={overtime
          ? `+${Math.floor(overtime_secs / 60)}:${(overtime_secs % 60).toString().padStart(2, '0')}`
          : formatPrimaryTime(displayedRemaining)}
        secondaryText={overtime ? 'OVERTIME' : dynamicUi?.layout?.showSubtimer !== false ? formatSubDigital(displayedRemaining) : undefined}
        isInteractive={!running && !overtime}
        onProgressChange={handleProgressChange}
        onProgressCommit={handleProgressCommit}
        showTicks={dynamicUi?.dial?.showTicks ?? true}
        tickLength={dynamicUi?.dial?.tickLength ?? 'normal'}
        fontFamily={dynamicUi?.typography?.fontFamily ?? 'system-ui'}
        timeScale={dynamicUi?.typography?.timeScale ?? 1.0}
        size={dynamicUi?.dial?.size ?? 180}
        stylePreset={dynamicUi?.dial?.stylePreset ?? 'minimal'}
      />

      <div className={`grid ${dynamicUi?.layout?.showPresetButtons === false ? 'grid-cols-2 max-w-[150px]' : 'grid-cols-2 max-w-[210px]'} gap-3 mt-4 w-full`}>
        <button
          onClick={toggleRun}
          className={`h-14 ${btnRounding} flex items-center justify-center transition-transform active:scale-95 shadow-md`}
          style={{
            backgroundColor: theme.cardBg,
            border: `1.5px solid ${running ? 'rgba(255,255,255,0.38)' : theme.border}`,
            color: theme.text,
          }}
          title={running ? 'Пауза' : 'Старт'}
        >
          {running ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>

        <button
          onClick={reset}
          className={`h-14 ${btnRounding} flex items-center justify-center transition-transform active:scale-95 shadow-md`}
          style={{
            backgroundColor: theme.cardBg,
            border: `1.5px solid ${theme.border}`,
            color: theme.subtext,
          }}
          title="Сбросить время"
        >
          <RotateCcw size={22} />
        </button>

        {dynamicUi?.layout?.showPresetButtons !== false && (
          <>
            {/* Was labelled SET but cycled the armed minutes; it now says what
                it does, and the neighbouring control is what it always looked
                like: the current duration, tappable to change. */}
            <button
              onClick={toggleMode}
              className={`h-14 ${btnRounding} flex items-center justify-center transition-transform active:scale-95 font-black text-sm tracking-wider shadow-md`}
              style={{
                backgroundColor: theme.cardBg,
                border: `1.5px solid ${theme.border}`,
                color: theme.text,
              }}
              title={mode === 'flow'
                ? 'Режим потока: после нуля продолжает считать вверх'
                : 'Режим отсчёта: останавливается на нуле и звонит'}
            >
              {mode === 'flow' ? 'ПОТОК' : 'ОТСЧЁТ'}
            </button>

            <button
              onClick={() => {
                const presets = [5, 10, 15, 20, 25, 30, 45, 60];
                const idx = presets.indexOf(totalMinutes);
                armMinutes(presets[(idx + 1) % presets.length]);
              }}
              className={`h-14 ${btnRounding} flex items-center justify-center transition-transform active:scale-95 font-mono font-extrabold text-2xl shadow-md`}
              style={{
                backgroundColor: theme.cardBg,
                border: `1.5px solid ${theme.border}`,
                color: theme.text,
              }}
              title="Нажмите чтобы переключить минуты"
            >
              {totalMinutes}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
