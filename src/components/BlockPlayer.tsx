import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipForward, X } from 'lucide-react';
import type { ScheduleStep, ThemeColors } from '../types';
import { soundService } from '../services/sound';

type BlockStep = Extract<ScheduleStep, { kind: 'block' }>;

interface BlockPlayerProps {
  theme: ThemeColors;
  block: BlockStep;
  onClose: () => void;
}

/** "45" or "1:30" — compact clock for a single exercise. */
function formatClock(seconds: number): string {
  if (seconds < 60) return String(seconds);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Spoken prompt for an exercise, falling back to its name. */
function voiceFor(exercise: { name: string; voicePrompt?: string }): string {
  return exercise.voicePrompt || exercise.name;
}

/**
 * Runs an interval block: each exercise in turn, with a countdown and a spoken
 * prompt at the start of every one.
 *
 * This is what makes a schedule answer "what do I do now" rather than just
 * "something is scheduled at 07:15".
 */
export const BlockPlayer: React.FC<BlockPlayerProps> = ({ theme, block, onClose }) => {
  const exercises = block.exercises;
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(exercises[0]?.durationSec ?? 0);
  const [running, setRunning] = useState(true);
  const announcedRef = useRef<number>(-1);

  const totalSeconds = useMemo(
    () => exercises.reduce((sum, e) => sum + e.durationSec, 0),
    [exercises],
  );
  const elapsedBefore = useMemo(
    () => exercises.slice(0, index).reduce((sum, e) => sum + e.durationSec, 0),
    [exercises, index],
  );
  const overallProgress = totalSeconds > 0 ? (elapsedBefore + (exercises[index]?.durationSec ?? 0) - remaining) / totalSeconds : 0;

  const current = exercises[index];

  // Announce each exercise once, when it becomes current.
  useEffect(() => {
    if (announcedRef.current === index) return;
    announcedRef.current = index;
    if (current) soundService.speak(voiceFor(current));
  }, [index, current]);

  // Countdown. Ends the block when the last exercise finishes.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) {
          if (prev <= 4) soundService.playCountdownTick();
          return prev - 1;
        }
        // Move to the next exercise, or finish.
        if (index < exercises.length - 1) {
          const nextDuration = exercises[index + 1].durationSec;
          setIndex(index + 1);
          return nextDuration;
        }
        setRunning(false);
        soundService.playFinishAlarm();
        soundService.speak('Блок завершён. Отличная работа!');
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, index, exercises]);

  const skip = () => {
    soundService.playUiClick();
    if (index < exercises.length - 1) {
      setIndex(index + 1);
      setRemaining(exercises[index + 1].durationSec);
    } else {
      setRunning(false);
    }
  };

  const toggle = () => {
    soundService.playUiClick();
    setRunning((r) => !r);
  };

  if (!current) return null;

  return (
    <div className="flex flex-col items-center w-full max-w-[340px]">
      {/* Soft-layer card: elevation comes from a translucent surface and blur,
          not from colour or heavy borders. */}
      <div
        className="w-full rounded-3xl border backdrop-blur-2xl px-5 py-6 flex flex-col items-center"
        style={{
          backgroundColor: 'rgba(255,255,255,0.045)',
          borderColor: 'rgba(255,255,255,0.09)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
        }}
      >
        <div className="flex items-center justify-between w-full mb-5">
          <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: theme.subtext }}>
            {block.label}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: theme.subtext }}
            title="Закрыть блок"
          >
            <X size={14} />
          </button>
        </div>

        <span className="text-lg font-semibold text-center mb-1" style={{ color: theme.text }}>
          {current.name}
        </span>
        <span className="text-[11px] mb-6" style={{ color: theme.subtext }}>
          {index + 1} из {exercises.length}
        </span>

        <span
          className="font-mono tabular-nums font-bold leading-none mb-6"
          style={{ color: theme.text, fontSize: '72px' }}
        >
          {formatClock(remaining)}
        </span>

        {/* Overall progress: the warm colour marks the present moment only. */}
        <div
          className="w-full h-[3px] rounded-full overflow-hidden mb-6"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.min(100, overallProgress * 100)}%`, backgroundColor: theme.accent }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ backgroundColor: '#fafafa', color: '#0a0a0a' }}
            title={running ? 'Пауза' : 'Продолжить'}
          >
            {running ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            onClick={skip}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: theme.subtext, border: '1px solid rgba(255,255,255,0.12)' }}
            title="Следующее упражнение"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Upcoming exercises, so the user can see what is coming. */}
        <div className="w-full mt-6 flex flex-col space-y-1.5">
          {exercises.slice(index + 1).map((ex) => (
            <div key={ex.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.subtext }} />
              <span className="truncate" style={{ color: theme.subtext }}>
                {ex.name}
              </span>
              <span className="ml-auto font-mono tabular-nums shrink-0" style={{ color: theme.subtext }}>
                {formatClock(ex.durationSec)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
