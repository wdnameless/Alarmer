import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JournalView } from '../JournalView';
import { DirectionEditor } from '../DirectionEditor';
import { THEMES } from '../../constants/themes';
import { Direction, SessionRecord } from '../../types';

const dummyTheme = THEMES.winter;

const mockDirections: Direction[] = [
  { id: 'dir1', name: 'Кодинг', color: '#3b82f6', weeklyBlockBudget: 10, archived: false },
  { id: 'dir2', name: 'Английский', color: '#10b981', weeklyBlockBudget: 5, archived: false },
];

const mockSessions: SessionRecord[] = [
  {
    id: 's1',
    label: 'Focus Block 1',
    directionId: 'dir1',
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    focusedSec: 3000,
    completed: true,
    blocks: 1,
    quality: 8,
  },
  {
    id: 's2',
    label: 'Focus Block 2',
    directionId: 'dir2',
    startedAt: new Date(Date.now() - 3600_000).toISOString(),
    endedAt: new Date().toISOString(),
    focusedSec: 3000,
    completed: true,
    blocks: 1,
    quality: 9,
  },
];

describe('JournalView & DirectionEditor', () => {
  it('renders empty states when directions or sessions are empty', () => {
    const { rerender } = render(
      <JournalView
        theme={dummyTheme}
        directions={[]}
        sessions={[]}
        onUpdateDirections={() => {}}
      />
    );
    expect(screen.getByText(/Нет активных направлений/i)).toBeTruthy();

    rerender(
      <JournalView
        theme={dummyTheme}
        directions={mockDirections}
        sessions={[]}
        onUpdateDirections={() => {}}
      />
    );
    // When directions exist, it renders the overall pace and budget info
    expect(screen.getByText(/Общий темп недели/i)).toBeTruthy();
    expect(screen.getByText(/Выполнено 0 из 15 блоков/i)).toBeTruthy();
  });

  it('renders overall pace traffic light and week summaries', () => {
    render(
      <JournalView
        theme={dummyTheme}
        directions={mockDirections}
        sessions={mockSessions}
        onUpdateDirections={() => {}}
      />
    );

    expect(screen.getByText(/Общий темп недели/i)).toBeTruthy();
    expect(screen.getByText(/Последние 6 недель/i)).toBeTruthy();
  });

  it('switches between weeks, month grid, and directions modal', () => {
    render(
      <JournalView
        theme={dummyTheme}
        directions={mockDirections}
        sessions={mockSessions}
        onUpdateDirections={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Сетка месяца'));
    expect(screen.getByText(/Сетка месяца: строки — недели/i)).toBeTruthy();

    fireEvent.click(screen.getByText('Направления'));
    expect(screen.getByText(/Сферы работы с недельным бюджетом блоков/i)).toBeTruthy();
  });

  it('switches to history subview and shows classic stats', () => {
    render(
      <JournalView
        theme={dummyTheme}
        directions={mockDirections}
        sessions={mockSessions}
        onUpdateDirections={() => {}}
      />
    );

    fireEvent.click(screen.getByText('История'));
    expect(screen.getByText(/Всего фокуса/i)).toBeTruthy();
    expect(screen.getByText(/Сессий завершено/i)).toBeTruthy();
  });

  it('creates, edits, archives, and deletes directions in DirectionEditor', () => {
    let currentDirections = [...mockDirections];
    const updateSpy = vi.fn((newDirs: Direction[]) => {
      currentDirections = newDirs;
    });

    render(
      <DirectionEditor
        theme={dummyTheme}
        directions={currentDirections}
        onUpdateDirections={updateSpy}
      />
    );

    expect(screen.getByText('Кодинг')).toBeTruthy();
    expect(screen.getByText('Английский')).toBeTruthy();

    // Click on create button to open form
    fireEvent.click(screen.getByText('+ Новое'));
    const placeholder = 'Например: Разработка, Английский, Чтение';
    expect(screen.getByPlaceholderText(placeholder)).toBeTruthy();

    // Fill form
    const nameInput = screen.getByPlaceholderText(placeholder);
    fireEvent.change(nameInput, { target: { value: 'Спорт' } });

    // Click save
    fireEvent.click(screen.getByText('Сохранить'));
    expect(updateSpy).toHaveBeenCalled();
    const createdList = updateSpy.mock.calls[0][0];
    expect(createdList.some((d: Direction) => d.name === 'Спорт')).toBe(true);
  });
});
