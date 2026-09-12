import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { ThemeColors } from '../types';
import { RadialDial } from './RadialDial';
import { soundService } from '../services/sound';
import confetti from 'canvas-confetti';

interface TimerProps {
  theme: ThemeColors;
  initialMinutes?: number;
  onFinish?: () => void;
}

export const Timer: React.FC<TimerProps> = ({
  theme,
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
    if (isRunning && remainingSeconds > 0) {
      timer = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 4 && prev > 1) {
            soundService.playCountdownTick();
          } else if (prev === 1) {
            soundService.playFinishAlarm();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (isRunning && remainingSeconds === 0) {
      setIsRunning(false);
      soundService.playFinishAlarm();
      soundService.speak('Время вышло!');
      confetti({ particleCount: 50, spread: 50 });
      onFinish?.();
    }
    return () => window.clearInterval(timer);
  }, [isRunning, remainingSeconds, onFinish]);

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

  const formatDigital = (sec: number) => {
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

  const minutesRemaining = Math.ceil(remainingSeconds / 60);

  return (
    <div className="flex flex-col items-center w-full">
      <RadialDial
        theme={theme}
        progress={progress}
        primaryText={formatDigital(remainingSeconds)}
        secondaryText={`${minutesRemaining} мин`}
        isInteractive={!isRunning}
        onProgressChange={handleProgressChange}
      />

      {/* Control Buttons matching reference image */}
      <div className="flex items-center justify-center space-x-3 mt-4 w-full px-4">
        {/* Play/Pause Button */}
        <button
          onClick={toggleRun}
          className="flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-transform active:scale-95 shadow-md"
          style={{
            backgroundColor: theme.cardBg,
            border: `1px solid ${isRunning ? theme.accent : theme.border}`,
            color: isRunning ? theme.accent : theme.text,
          }}
        >
          {isRunning ? <Pause size={20} /> : <Play size={20} />}
          <span className="font-bold text-sm">{isRunning ? 'Пауза' : 'Старт'}</span>
        </button>

        {/* Reset / Set Button */}
        <button
          onClick={reset}
          className="py-3 px-5 rounded-xl flex items-center justify-center space-x-1.5 transition-transform active:scale-95 font-bold text-xs uppercase tracking-wider"
          style={{
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            color: theme.subtext,
          }}
          title="Сброс таймера"
        >
          <RotateCcw size={16} />
          <span>SET</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center justify-center space-x-2 mt-3 w-full px-4">
        {[5, 10, 15, 25, 45].map((m) => (
          <button
            key={m}
            onClick={() => setPresetMinutes(m)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors border ${
              totalSeconds === m * 60 ? 'border-emerald-400 text-emerald-400 bg-white/5' : 'border-white/10 opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: totalSeconds === m * 60 ? `${theme.accent}15` : theme.cardBg,
              borderColor: totalSeconds === m * 60 ? theme.accent : theme.border,
              color: totalSeconds === m * 60 ? theme.accent : theme.subtext,
            }}
          >
            {m}m
          </button>
        ))}
      </div>
    </div>
  );
};
