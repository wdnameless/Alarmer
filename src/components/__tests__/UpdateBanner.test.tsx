import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { UpdateBanner } from '../UpdateBanner';

const theme = {
  id: 'winter' as const,
  name: 'Winter',
  bg: '#050505',
  surface: '#0a0a0a',
  cardBg: '#0f0f0f',
  border: '#27272a',
  text: '#fafafa',
  subtext: '#a1a1aa',
  accent: '#ff7a1a',
  accentGlow: 'rgba(255,122,26,0.28)',
  ringTrack: '#1c1c1f',
  ringProgress: '#ff7a1a',
  ticks: '#3f3f46',
};

describe('UpdateBanner', () => {
  beforeEach(cleanup);

  it('stays out of the way when there is nothing to announce', () => {
    render(
      <UpdateBanner theme={theme} version={null} onOpenSettings={() => {}} onDismiss={() => {}} />,
    );

    // No version means no bar at all, not an empty strip on screen.
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('names the version it found', () => {
    render(
      <UpdateBanner theme={theme} version="0.3.0" onOpenSettings={() => {}} onDismiss={() => {}} />,
    );

    expect(screen.getByText(/0\.3\.0/)).toBeDefined();
  });

  it('opens settings when the user chooses to update', () => {
    const onOpenSettings = vi.fn();
    render(
      <UpdateBanner
        theme={theme}
        version="0.3.0"
        onOpenSettings={onOpenSettings}
        onDismiss={() => {}}
      />,
    );

    screen.getByTitle('Открыть настройки обновления').click();

    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('can be dismissed without updating', () => {
    const onDismiss = vi.fn();
    render(
      <UpdateBanner
        theme={theme}
        version="0.3.0"
        onOpenSettings={() => {}}
        onDismiss={onDismiss}
      />,
    );

    screen.getByLabelText('Скрыть уведомление об обновлении').click();

    // An available update is not urgent: declining must be possible.
    expect(onDismiss).toHaveBeenCalled();
  });
});
