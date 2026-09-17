import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TodayView } from '../TodayView';
import type { Direction, SessionRecord, ThemeColors } from '../../types';

const theme: ThemeColors = {
  id: 'winter',
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

describe('TodayView - Focus Blocks Integration', () => {
  beforeEach(cleanup);

  const directions: Direction[] = [
    { id: 'd1', name: 'Код', color: '#ff7a1a', weeklyBlockBudget: 20, archived: false },
    { id: 'd2', name: 'Дизайн', color: '#3b82f6', weeklyBlockBudget: 10, archived: false },
    { id: 'd3', name: 'Архив', color: '#888888', weeklyBlockBudget: 5, archived: true },
  ];

  it('renders completed blocks on day counter', () => {
    const now = new Date();
    const sessions: SessionRecord[] = [
      {
        id: 's1',
        label: 'Блок',
        startedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0).toISOString(),
        endedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 50).toISOString(),
        focusedSec: 50 * 60,
        completed: true,
        directionId: 'd1',
      },
      {
        id: 's2',
        label: 'Блок',
        startedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0).toISOString(),
        endedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 50).toISOString(),
        focusedSec: 50 * 60,
        completed: true,
        directionId: 'd2',
      },
    ];

    render(
      <TodayView
        theme={theme}
        schedules={[]}
        directions={directions}
        sessions={sessions}
      />
    );

    // blocksOnDay should report 2 blocks for today
    expect(screen.getByText('2')).toBeDefined();
  });

  it('renders active directions list with progress and budget, excluding archived', () => {
    render(
      <TodayView
        theme={theme}
        schedules={[]}
        directions={directions}
        sessions={[]}
      />
    );

    expect(screen.getByText('Код')).toBeDefined();
    expect(screen.getByText('Дизайн')).toBeDefined();
    expect(screen.queryByText('Архив')).toBeNull();
    // Progress shown against budget: 0/20 бл and 0/10 бл
    expect(screen.getByText('0/20 бл')).toBeDefined();
    expect(screen.getByText('0/10 бл')).toBeDefined();
  });

  it('triggers onStartBlock when clicking a direction', () => {
    const onStartBlock = vi.fn();
    render(
      <TodayView
        theme={theme}
        schedules={[]}
        directions={directions}
        sessions={[]}
        onStartBlock={onStartBlock}
      />
    );

    const startBtn = screen.getByTestId('start-block-d1');
    fireEvent.click(startBtn);

    expect(onStartBlock).toHaveBeenCalledWith('d1');
  });

  it('displays empty state when no active directions exist', () => {
    const onNavigateToJournal = vi.fn();
    render(
      <TodayView
        theme={theme}
        schedules={[]}
        directions={[]}
        sessions={[]}
        onNavigateToJournal={onNavigateToJournal}
      />
    );

    expect(screen.getByText(/Создайте направление в журнале/)).toBeDefined();
    const link = screen.getByText('Перейти в журнал');
    fireEvent.click(link);
    expect(onNavigateToJournal).toHaveBeenCalled();
  });
});
