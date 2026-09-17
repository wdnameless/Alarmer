import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ThemeColors } from '../types';

interface UpdateBannerProps {
  theme: ThemeColors;
  /** Version found in the background; the bar only renders when this is set. */
  version: string | null;
  /** Opens wherever the user can actually start the update. */
  onOpenSettings: () => void;
  onDismiss: () => void;
}

/**
 * A quiet bar announcing a version found in the background.
 *
 * Deliberately not a modal and not a toast: an available update is not urgent,
 * and interrupting a timer or a block to say so would be worse than saying
 * nothing. It also never covers the ringing takeover, which owns the screen when
 * an alarm fires.
 */
export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  theme,
  version,
  onOpenSettings,
  onDismiss,
}) => {
  if (!version) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 text-[10px] shrink-0"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderBottom: `1px solid ${theme.border}` }}
      role="status"
    >
      <Sparkles size={11} style={{ color: theme.accent }} />
      <span className="flex-1 truncate" style={{ color: theme.text }}>
        Доступна версия {version}
      </span>
      <button
        onClick={onOpenSettings}
        className="px-2 py-0.5 rounded-lg font-semibold shrink-0 transition-colors hover:bg-white/10"
        style={{ color: theme.text }}
        title="Открыть настройки обновления"
      >
        Обновить
      </button>
      <button
        onClick={onDismiss}
        className="px-1.5 py-0.5 rounded-lg shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: theme.subtext }}
        title="Скрыть"
        aria-label="Скрыть уведомление об обновлении"
      >
        ✕
      </button>
    </div>
  );
};
