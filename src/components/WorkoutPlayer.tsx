import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { ThemeColors, WorkoutRoutine, WorkoutStep } from '../types';
import { RadialDial } from './RadialDial';
import { soundService } from '../services/sound';
import confetti from 'canvas-confetti';

interface WorkoutPlayerProps {
  theme: ThemeColors;
  routine: WorkoutRoutine;
  onFinish?: () => void;
}

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({
  theme,
  routine,
  onFinish,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(routine.steps[0]?.durationSec || 30);
  const [isRunning, setIsRunning] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const currentStep: WorkoutStep | undefined = routine.steps[stepIndex];
  const totalSteps = routine.steps.length;

  // Voice announcement on step change
  useEffect(() => {
    if (!currentStep) return;
    setTimeRemaining(currentStep.durationSec);

    if (voiceEnabled && isRunning) {
      const prompt = currentStep.voicePrompt || currentStep.name;
      soundService.speak(prompt);
    }
  }, [stepIndex, currentRound]);

  // Main tick interval
  useEffect(() => {
    let timer: number | undefined;
    if (isRunning) {
      timer = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev > 1) {
            if (prev <= 4) {
              soundService.playCountdownTick();
            }
            return prev - 1;
          }

          // prev is 1 -> finishes now
            soundService.playFinishAlarm();

          // Transition to next step or next round
          if (stepIndex < totalSteps - 1) {
            setStepIndex((s) => s + 1);
          } else {
            if (currentRound < routine.repeatCount) {
              setCurrentRound((r) => r + 1);
              setStepIndex(0);
              if (voiceEnabled) {
                soundService.speak(`Раунд ${currentRound + 1}`);
              }
            } else {
              setIsRunning(false);
              soundService.playFinishAlarm();
              if (voiceEnabled) {
                soundService.speak('Тренировка завершена! Отличная работа!');
              }
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
              });
              onFinish?.();
            }
          }
          return 0;
        });
      }, 1000);
    }
    return () => window.clearInterval(timer);
  }, [isRunning, stepIndex, currentRound, routine.repeatCount, totalSteps, voiceEnabled, onFinish]);

  const toggleRun = () => {
    if (!isRunning && timeRemaining === currentStep?.durationSec && voiceEnabled) {
      soundService.speak(currentStep.voicePrompt || currentStep.name);
    }
    soundService.playCountdownTick();
    setIsRunning(!isRunning);
  };

  const reset = () => {
    soundService.playCountdownTick();
    setIsRunning(false);
    setCurrentRound(1);
    setStepIndex(0);
    setTimeRemaining(routine.steps[0]?.durationSec || 30);
  };

  const stepDuration = currentStep?.durationSec || 1;
  const progress = 1 - timeRemaining / stepDuration;

  // Step color tags
  const getStepTypeColor = (type: WorkoutStep['type']) => {
    switch (type) {
      case 'work':
        return theme.accent;
      case 'rest':
        return '#3b82f6'; // blue
      case 'prepare':
        return '#f59e0b'; // amber
      case 'cooldown':
        return '#10b981'; // emerald
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Exercise and Round Info Header */}
      <div className="w-full flex items-center justify-between px-2 mb-2 text-xs">
        <span
          className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${getStepTypeColor(currentStep?.type || 'work')}25`,
            color: getStepTypeColor(currentStep?.type || 'work'),
          }}
        >
          {currentStep?.type === 'work'
            ? 'Работа'
            : currentStep?.type === 'rest'
            ? 'Отдых'
            : currentStep?.type === 'prepare'
            ? 'Подготовка'
            : 'Заминка'}
        </span>
        <span style={{ color: theme.subtext }}>
          Раунд {currentRound}/{routine.repeatCount} • Шаг {stepIndex + 1}/{totalSteps}
        </span>
      </div>

      {/* Radial Dial */}
      <RadialDial
        theme={theme}
        progress={progress}
        primaryText={`${timeRemaining}s`}
        secondaryText={currentStep?.name || 'Готово'}
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
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="py-3 px-4 rounded-xl flex items-center justify-center transition-transform active:scale-95"
          style={{
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            color: voiceEnabled ? theme.accent : theme.subtext,
          }}
          title={voiceEnabled ? 'Голосовые подсказки включены' : 'Голос выключен'}
        >
          {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <button
          onClick={reset}
          className="py-3 px-4 rounded-xl flex items-center justify-center transition-transform active:scale-95"
          style={{
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`,
            color: theme.subtext,
          }}
          title="Сбросить"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Step Queue Preview */}
      <div className="w-full mt-3 px-2 flex space-x-1.5 overflow-x-auto py-1">
        {routine.steps.map((step, idx) => {
          const isCurrent = idx === stepIndex;
          const isDone = idx < stepIndex;
          return (
            <div
              key={step.id}
              className={`flex-shrink-0 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                isCurrent ? 'ring-1 ring-white/50' : 'opacity-60'
              }`}
              style={{
                backgroundColor: theme.cardBg,
                borderColor: isCurrent ? theme.accent : `${theme.border}50`,
                color: isDone ? theme.subtext : theme.text,
              }}
            >
              <span>{step.name}</span>{' '}
              <span className="opacity-70 font-mono">({step.durationSec}s)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
