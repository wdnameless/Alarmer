import React from 'react';
import { Minus, X, Maximize2, Minimize2, Pin, PinOff } from 'lucide-react';
import { ThemeColors } from '../types';
import { WindowService } from '../services/window';

interface TitleBarProps {
  theme: ThemeColors;
  isCompact: boolean;
  isPinned: boolean;
  onToggleCompact: () => void;
  onTogglePin: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  theme,
  isCompact,
  isPinned,
  onToggleCompact,
  onTogglePin,
}) => {
  return (
    <div
      data-tauri-drag-region
      onPointerDown={(e) => {
        // Only drag if clicking the background, not buttons
        if ((e.target as HTMLElement).closest('button')) return;
        WindowService.startDragging();
      }}
      className="w-full flex items-center justify-between px-3 py-2 select-none cursor-move transition-colors"
      style={{
        backgroundColor: theme.bg,
        borderBottom: `1px solid ${theme.border}40`,
      }}
    >
      <div className="flex items-center space-x-2 pointer-events-none">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: theme.accent,
            boxShadow: `0 0 6px ${theme.accentGlow}`,
          }}
        />
        <span className="text-xs font-bold tracking-wider uppercase" style={{ color: theme.subtext }}>
          Alarmer
        </span>
      </div>

      <div className="flex items-center space-x-1">
        {/* Always on top toggle */}
        <button
          onClick={onTogglePin}
          title={isPinned ? 'Открепить поверх всех окон' : 'Закрепить поверх всех окон'}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: isPinned ? theme.accent : theme.subtext }}
        >
          {isPinned ? <Pin size={13} /> : <PinOff size={13} />}
        </button>

        {/* Toggle Compact / Expanded mode */}
        <button
          onClick={onToggleCompact}
          title={isCompact ? 'Развернуть меню' : 'Свернуть в мини-оверлей'}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: theme.subtext }}
        >
          {isCompact ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
        </button>

        {/* Minimize */}
        <button
          onClick={() => WindowService.minimize()}
          title="Свернуть"
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: theme.subtext }}
        >
          <Minus size={14} />
        </button>

        {/* Close */}
        <button
          onClick={() => WindowService.close()}
          title="Закрыть"
          className="p-1.5 rounded-md hover:bg-red-500/30 hover:text-red-400 transition-colors"
          style={{ color: theme.subtext }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
