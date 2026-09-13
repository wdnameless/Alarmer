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
            }
            return prev - 1;
          }

          // prev is 1 -> reach 0
          setIsRunning(false);
          soundService.playFinishAlarm();
          soundService.speak('Время вышло!');
          confetti({ particleCount: 60, spread: 60 });
          onFinish?.();
          return 0;
        });
      }, 1000);
    }
    return () => window.clearInterval(timer);
  }, [isRunning, onFinish]);

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

  // Dial progress 0..1
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;

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
  const handleProgressChange = (newProgress: number) => {
    if (!isRunning) {
      // 0..1 maps to 1..60 minutes
      const mins = Math.max(1, Math.round(newProgress * 60));
      setTotalSeconds(mins * 60);
      setRemainingSeconds(mins * 60);
    }
  };

  const btnRounding =
    dynamicUi?.layout?.buttonStyle === 'pill'
      ? 'rounded-full'
      : dynamicUi?.layout?.buttonStyle === 'square'
      ? 'rounded-md'
      : 'rounded-2xl';

  return (
    <div className={`flex flex-col items-center w-full ${dynamicUi?.layout?.contentAlignment === 'compact' ? 'justify-center my-auto' : ''}`}>
      <RadialDial
        theme={theme}
        progress={progress}
        primaryText={formatPrimaryTime(remainingSeconds)}
        secondaryText={dynamicUi?.layout?.showSubtimer !== false ? formatSubDigital(remainingSeconds) : undefined}
        isInteractive={!isRunning}
        onProgressChange={handleProgressChange}
        showTicks={dynamicUi?.dial?.showTicks ?? true}
        tickLength={dynamicUi?.dial?.tickLength ?? 'normal'}
        fontFamily={dynamicUi?.typography?.fontFamily ?? 'system-ui'}
        timeScale={dynamicUi?.typography?.timeScale ?? 1.0}
        size={dynamicUi?.dial?.size ?? 200}
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
