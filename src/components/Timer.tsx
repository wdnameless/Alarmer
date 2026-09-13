import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { ThemeColors, DynamicUIConfig } from '../types';
import { RadialDial } from './RadialDial';
import { soundService } from '../services/sound';
import confetti from 'canvas-confetti';

interface TimerProps {
  theme: ThemeColors;
  dynamicUi?: DynamicUIConfig;
  initialMinutes?: number;
  onFinish?: () => void;
}

export const Timer: React.FC<TimerProps> = ({
  theme,
  dynamicUi,
  initialMinutes = 25,
  onFinish,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeSec, setOvertimeSec] = useState(0);
  const [flowMode, setFlowMode] = useState(true);
  const [workRhythm, setWorkRhythm] = useState<'classic' | 'deep50' | 'ultradian' | 'sprint'>('classic');

  // Synchronize when initialMinutes preset changes
  useEffect(() => {
    if (!isRunning) {
      const s = initialMinutes * 60;
      setTotalSeconds(s);
      setRemainingSeconds(s);
    }
  }, [initialMinutes]);

  useEffect(() => {
    let timer: number | undefined;
    if (isRunning) {
      timer = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev > 1) {
            if (prev <= 4) {
              soundService.playCountdownTick();
            } else {
              soundService.playClockTick(prev % 2 === 0);
            }
            return prev - 1;
          }

          // Time reached 0
          if (flowMode) {
            // FLOW EXTENSION: soft chime, switch to overtime without jarring alert
            soundService.playBeep(520, 0.25, 0.25);
            setIsRunning(false);
            setIsOvertime(true);
            setOvertimeSec(1);
            return 0;
          }

          setIsRunning(false);
          soundService.playFinishAlarm();
          soundService.speak('Время вышло!');
          confetti({ particleCount: 60, spread: 60 });
          onFinish?.();
          return 0;
        });
      }, 1000);
    } else if (isOvertime) {
      timer = window.setInterval(() => {
        setOvertimeSec((prev) => {
          soundService.playClockTick(prev % 2 === 0);
          return prev + 1;
        });
      }, 1000);
    }
    return () => window.clearInterval(timer);
  }, [isRunning, isOvertime, flowMode, onFinish]);

  const toggleRun = () => {
    soundService.playCountdownTick();
    setIsRunning(!isRunning);
  };

  const reset = () => {
    soundService.playCountdownTick();
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
  };

  const setPresetMinutes = (min: number) => {
    soundService.playCountdownTick();
    setIsRunning(false);
    setTotalSeconds(min * 60);
    setRemainingSeconds(min * 60);
  };

  // Dial progress 0..1 based on 60 minutes full circle!
  // So 26m is exactly ~0.43 of circle, and shrinks towards 0!
  const progress = Math.max(0, Math.min(1, remainingSeconds / 3600));
  // Format digital stopwatch format matching reference: 00:00:00
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

  // Interactive dial progress adjustment
  // Interactive dial progress adjustment during dragging
  const handleProgressChange = (newProgress: number) => {
    if (!isRunning) {
      const mins = Math.max(1, Math.round(newProgress * 60));
      setTotalSeconds(mins * 60);
      setRemainingSeconds(mins * 60);
    }
  };

  // Auto-start on knob drag release
  const handleProgressCommit = (finalProgress: number) => {
    const mins = Math.max(1, Math.round(finalProgress * 60));
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
    setIsOvertime(false);
    soundService.playCountdownTick();
    setIsRunning(true);
  };

  const btnRounding =
    dynamicUi?.layout?.buttonStyle === 'pill'
      ? 'rounded-full'
      : dynamicUi?.layout?.buttonStyle === 'square'
      ? 'rounded-md'
      : 'rounded-2xl';

  return (
    <div className={`flex flex-col items-center w-full ${dynamicUi?.layout?.contentAlignment === 'compact' ? 'justify-center my-auto' : ''}`}>
      {/* Flow Overtime Banner */}
      {isOvertime && (
        <div
          className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono mb-2 animate-pulse"
          style={{ backgroundColor: `${theme.accent}20`, color: theme.accent, border: `1px solid ${theme.accent}40` }}
        >
          <span>⚡ ПОТОК +{Math.floor(overtimeSec / 60)}:{(overtimeSec % 60).toString().padStart(2, '0')}</span>
          <button
            onClick={() => {
              setIsOvertime(false);
              setOvertimeSec(0);
              setRemainingSeconds(totalSeconds);
            }}
            className="underline text-[10px] ml-1"
          >
            отдых
          </button>
        </div>
      )}

      {/* Ultradian Rhythm Selector: 25/5, 50/10, 90/20, Sprint */}
      <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] mb-2 font-mono">
        <button
          onClick={() => {
            setWorkRhythm('classic');
            setPresetMinutes(25);
          }}
          className={`px-2 py-0.5 rounded ${workRhythm === 'classic' ? 'bg-white/20 font-bold text-white' : 'opacity-60'}`}
        >
          25/5
        </button>
        <button
          onClick={() => {
            setWorkRhythm('deep50');
            setPresetMinutes(50);
          }}
          className={`px-2 py-0.5 rounded ${workRhythm === 'deep50' ? 'bg-white/20 font-bold text-white' : 'opacity-60'}`}
        >
          Deep 50
        </button>
        <button
          onClick={() => {
            setWorkRhythm('ultradian');
            setPresetMinutes(90);
          }}
          className={`px-2 py-0.5 rounded ${workRhythm === 'ultradian' ? 'bg-white/20 font-bold text-white' : 'opacity-60'}`}
        >
          90/20
        </button>
        <button
          onClick={() => setFlowMode(!flowMode)}
          title="Режим продления потока (без резкого звонка)"
          className={`px-2 py-0.5 rounded transition-colors ${flowMode ? 'text-emerald-400 bg-emerald-500/10 font-bold' : 'opacity-40'}`}
        >
          Flow {flowMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <RadialDial
        theme={theme}
        progress={isOvertime ? 1 : progress}
        primaryText={isOvertime ? `+${Math.floor(overtimeSec / 60)}:${(overtimeSec % 60).toString().padStart(2, '0')}` : formatPrimaryTime(remainingSeconds)}
        secondaryText={isOvertime ? 'OVERTIME' : dynamicUi?.layout?.showSubtimer !== false ? formatSubDigital(remainingSeconds) : undefined}
        isInteractive={!isRunning && !isOvertime}
        onProgressChange={handleProgressChange}
        onProgressCommit={handleProgressCommit}
        showTicks={dynamicUi?.dial?.showTicks ?? true}
        tickLength={dynamicUi?.dial?.tickLength ?? 'normal'}
        fontFamily={dynamicUi?.typography?.fontFamily ?? 'system-ui'}
        timeScale={dynamicUi?.typography?.timeScale ?? 1.0}
        size={dynamicUi?.dial?.size ?? 180}
        stylePreset={dynamicUi?.dial?.stylePreset ?? 'neon'}
      />
      {/* Control Buttons matching reference image */}
      <div className={`grid ${dynamicUi?.layout?.showPresetButtons === false ? 'grid-cols-2 max-w-[150px]' : 'grid-cols-2 max-w-[210px]'} gap-3 mt-4 w-full`}>
        {/* Top-Left: Play / Pause */}
        <button
          onClick={toggleRun}
          className={`h-14 ${btnRounding} flex items-center justify-center transition-transform active:scale-95 shadow-md`}
          style={{
            backgroundColor: theme.cardBg,
            border: `1.5px solid ${isRunning ? theme.accent : theme.border}`,
            color: isRunning ? theme.accent : theme.text,
          }}
          title={isRunning ? 'Пауза' : 'Старт'}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>

        {/* Top-Right: Stopwatch / Lap icon */}
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

        {/* Optional Preset Buttons */}
        {dynamicUi?.layout?.showPresetButtons !== false && (
          <>
            {/* Bottom-Left: SET button */}
            <button
              onClick={() => {
                const nextMins = totalSeconds === 25 * 60 ? 15 : totalSeconds === 15 * 60 ? 5 : 25;
                setPresetMinutes(nextMins);
              }}
              className={`h-14 ${btnRounding} flex items-center justify-center transition-transform active:scale-95 font-black text-sm tracking-wider shadow-md`}
              style={{
                backgroundColor: theme.cardBg,
                border: `1.5px solid ${theme.border}`,
                color: theme.text,
              }}
              title="Сменить пресет времени"
            >
              SET
            </button>

            {/* Bottom-Right: Preset Number display (e.g. 25) */}
            <button
              onClick={() => {
                const presets = [5, 10, 15, 20, 25, 30, 45, 60];
                const curMins = Math.round(totalSeconds / 60);
                const idx = presets.indexOf(curMins);
                const next = presets[(idx + 1) % presets.length];
                setPresetMinutes(next);
              }}
              className={`h-14 ${btnRounding} flex items-center justify-center transition-transform active:scale-95 font-mono font-extrabold text-2xl shadow-md hover:border-emerald-400/50`}
              style={{
                backgroundColor: theme.cardBg,
                border: `1.5px solid ${theme.border}`,
                color: theme.text,
              }}
              title="Нажмите чтобы переключить минуты"
            >
              {Math.round(totalSeconds / 60)}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
