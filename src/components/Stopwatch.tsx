import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { ThemeColors } from '../types';
import { RadialDial } from './RadialDial';
import { soundService } from '../services/sound';

interface StopwatchProps {
  theme: ThemeColors;
}

export const Stopwatch: React.FC<StopwatchProps> = ({ theme }) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      const startTime = Date.now() - elapsedMs;
      interval = window.setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 30);
    }
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const toggleRun = () => {
    soundService.playCountdownTick();
    setIsRunning(!isRunning);
  };

  const reset = () => {
    soundService.playCountdownTick();
    setIsRunning(false);
    setElapsedMs(0);
    setLaps([]);
  };

  const addLap = () => {
    if (isRunning) {
      soundService.playCountdownTick();
      setLaps([elapsedMs, ...laps]);
    }
  };

  // Seconds dial: 0 to 60s
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const msRem = Math.floor((elapsedMs % 1000) / 10);
  const secProgress = (elapsedMs % 60000) / 60000;

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${cs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center w-full">
      <RadialDial
        theme={theme}
        progress={secProgress}
        primaryText={`${totalSeconds}.${msRem.toString().padStart(2, '0')}s`}
        secondaryText={formatTime(elapsedMs)}
        isInteractive={false}
      />

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-3 mt-4 w-full px-4">
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

        <button
          onClick={addLap}
          disabled={!isRunning}
          className="py-3 px-4 rounded-xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
          style={{
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
          title="Отсечка круга"
        >
          <Flag size={18} />
        </button>

        <button
          onClick={reset}
          className="py-3 px-4 rounded-xl flex items-center justify-center transition-transform active:scale-95"
          style={{
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            color: theme.subtext,
          }}
          title="Сброс"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Laps List */}
      {laps.length > 0 && (
        <div
          className="w-full mt-4 max-h-32 overflow-y-auto px-4 py-2 rounded-xl text-xs space-y-1"
          style={{ backgroundColor: `${theme.cardBg}80`, border: `1px solid ${theme.border}40` }}
        >
          {laps.map((lapMs, idx) => (
            <div key={idx} className="flex justify-between items-center py-1 border-b border-white/5">
              <span style={{ color: theme.subtext }}>Круг {laps.length - idx}</span>
              <span className="font-mono font-bold" style={{ color: theme.text }}>
                {formatTime(lapMs)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
