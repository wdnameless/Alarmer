import React from 'react';
import { Minus, X, Maximize2, Minimize2, Pin, PinOff, Hourglass, PictureInPicture2 } from 'lucide-react';
import { ThemeColors } from '../types';
import { WindowService } from '../services/window';

interface TitleBarProps {
  theme: ThemeColors;
  isCompact: boolean;
  isPinned: boolean;
  onToggleCompact: () => void;
  onTogglePin: () => void;
  onToggleOverlay?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  theme,
  isCompact,
  isPinned,
  onToggleCompact,
  onTogglePin,
  onToggleOverlay,
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
      <div className="flex items-center space-x-1.5 cursor-pointer" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {!isCompact && (
          <>
            <Hourglass size={13} className="text-white/80" />
            <span className="text-xs font-bold tracking-wider uppercase opacity-75 hover:opacity-100" style={{ color: theme.subtext }}>
              Alarmer
            </span>
          </>
        )}
        {isCompact && (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompact();
              }}
              title="Развернуть окно"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <Maximize2 size={12} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleOverlay?.();
              }}
              title="Мини-оверлей поверх всех окон"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <PictureInPicture2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {!isCompact && (
          <>
            {/* Always on top toggle */}
            <button
              onClick={onTogglePin}
              title={isPinned ? 'Открепить поверх всех окон' : 'Закрепить поверх всех окон'}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
              style={{ color: isPinned ? theme.text : theme.subtext }}
            >
              {isPinned ? <Pin size={13} /> : <PinOff size={13} />}
            </button>

            {/* Toggle Compact mode */}
            <button
              onClick={onToggleCompact}
              title="Свернуть в мини-виджет"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
              style={{ color: theme.subtext }}
            >
              <Minimize2 size={13} />
            </button>
          </>
        )}

        {/* Minimize (matches reference —) */}
        <button
          onClick={() => WindowService.minimize()}
          title="Свернуть"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 active:scale-95 transition-all text-white/80"
        >
          <Minus size={15} strokeWidth={2.5} />
        </button>

        {/* Maximize / Restore to full screen */}
        <button
          onClick={() => WindowService.toggleMaximize()}
          title="Развернуть на весь экран"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/15 active:scale-95 transition-all text-white/80"
        >
          <Maximize2 size={13} strokeWidth={2.2} />
        </button>
        {/* Close (matches reference ✕) */}
        <button
          onClick={async () => {
            await WindowService.close();
          }}
          title="Скрыть в трей (фоновая работа)"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/80 hover:text-white active:scale-95 transition-all text-white/80"
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
