import React, { useState } from 'react';
import { ThemeColors } from '../types';

export interface QualityPromptProps {
  theme: ThemeColors;
  onRate: (quality: number) => void;
  onSkip: () => void;
  directionName?: string;
  directionColor?: string;
}

/**
 * Quality rating prompt (1-10) shown after completing a focus block in block mode.
 *
 * It is skippable (which stores nothing, keeping the quality value absent),
 * and does not pause or interrupt the underlying rest phase.
 */
export const QualityPrompt: React.FC<QualityPromptProps> = ({
  theme,
  onRate,
  onSkip,
  directionName,
  directionColor,
}) => {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (val: number) => {
    setSelected(val);
    onRate(val);
  };

  return (
    <div
      role="region"
      aria-label="Оценка качества блока"
      className="flex flex-col items-center w-full max-w-[280px] p-4 rounded-2xl shadow-lg border transition-all my-3"
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      <div className="flex items-center space-x-2 mb-2 text-xs font-semibold uppercase tracking-wider text-center">
        {directionColor && (
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: directionColor }}
          />
        )}
        <span style={{ color: theme.text }}>
          {directionName ? `Блок завершён: ${directionName}` : 'Блок фокуса завершён'}
        </span>
      </div>

      <p className="text-xs mb-3 text-center" style={{ color: theme.subtext }}>
        Как оцениваете качество фокуса? (1–10)
      </p>

      {/* 1-10 buttons grid */}
      <div className="grid grid-cols-5 gap-1.5 w-full mb-3">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => {
          const isSelected = selected === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => handleSelect(val)}
              className={`h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                isSelected ? 'ring-2 ring-offset-1' : ''
              }`}
              style={{
                backgroundColor: isSelected
                  ? theme.accent
                  : 'rgba(255, 255, 255, 0.05)',
                color: isSelected ? '#ffffff' : theme.text,
                border: `1px solid ${isSelected ? theme.accent : theme.border}`,
              }}
              title={`Оценка ${val}`}
            >
              {val}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end w-full">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs px-2 py-1 rounded transition-colors hover:underline"
          style={{ color: theme.subtext }}
        >
          Пропустить
        </button>
      </div>
    </div>
  );
};
