import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TodayView } from '../TodayView';
import { THEMES } from '../../constants/themes';

const theme = THEMES.winter;

describe('TodayView without focus block card', () => {
  it('does not render the removed focus blocks section', () => {
    render(
      <TodayView
        theme={theme}
        schedules={[]}
        sessions={[]}
      />,
    );
    expect(screen.queryByText(/НАЧАТЬ БЛОК ФОКУСА/i)).toBeNull();
    expect(screen.queryByText(/Создайте направление в журнале/i)).toBeNull();
  });

  it('renders clean day status and next event', () => {
    render(
      <TodayView
        theme={theme}
        schedules={[]}
        sessions={[]}
      />,
    );
    expect(screen.getByText('Сегодня программ нет')).toBeDefined();
  });
});
