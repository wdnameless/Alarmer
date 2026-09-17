import React, { useState, useMemo } from 'react';
import { ThemeColors, SessionRecord, Direction, TaskItem } from '../types';
import {
  weekSummaries,
  monthGrid,
  directionProgress,
  paceLight,
  averageQuality,
  blocksOnDay,
  TrafficLight,
  unattributedBlocks,
  weekElapsed,
  formatBlocks,
} from '../services/focusBudget';
import { DirectionEditor } from './DirectionEditor';

interface JournalViewProps {
  theme: ThemeColors;
  sessions: SessionRecord[];
  directions: Direction[];
  tasks?: TaskItem[];
  onUpdateDirections?: (directions: Direction[]) => void;
  onOpenDirectionEditor?: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  theme,
  sessions,
  directions,
  tasks = [],
  onUpdateDirections,
}) => {
  const [subView, setSubView] = useState<'budget' | 'history'>('budget');
  const [activeTab, setActiveTab] = useState<'weeks' | 'month' | 'directions'>('weeks');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const now = useMemo(() => new Date(), []);

  // Budget calculations
  const summaries = useMemo(() => weekSummaries(sessions, directions, 6, now), [sessions, directions, now]);
  const monthWeeks = useMemo(() => monthGrid(sessions, directions, now), [sessions, directions, now]);

  // Overall calculations across all active directions
  const activeDirections = useMemo(() => directions.filter((d) => !d.archived), [directions]);
  const totalWeeklyBudget = useMemo(
    () => activeDirections.reduce((acc, d) => acc + d.weeklyBlockBudget, 0),
    [activeDirections]
  );

  const dirProgressList = useMemo(() => {
    return directionProgress(sessions, directions, now);
  }, [sessions, directions, now]);

  const totalUsedBlocks = useMemo(() => {
    const dirTotal = dirProgressList
      .filter((p) => !p.direction.archived)
      .reduce((acc, p) => acc + p.used, 0);
    const unattributed = unattributedBlocks(sessions, directions, now);
    return dirTotal + unattributed;
  }, [dirProgressList, sessions, directions, now]);

  const overallLight: TrafficLight = useMemo(() => {
    return paceLight(totalUsedBlocks, totalWeeklyBudget, now);
  }, [totalUsedBlocks, totalWeeklyBudget, now]);

  const elapsedPct = useMemo(() => Math.round(weekElapsed(now) * 100), [now]);
  const targetBlocks = useMemo(
    () => Math.round(totalWeeklyBudget * weekElapsed(now)),
    [totalWeeklyBudget, now]
  );

  const hasAnyDirections = directions.length > 0;
  const hasAnySessions = sessions.length > 0;

  // History / classic stats calculations (folded from StatsView)
  const totalFocusSec = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.focusedSec || 0), 0),
    [sessions]
  );
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.completed).length,
    [sessions]
  );

  const avgQuality = useMemo(() => averageQuality(sessions), [sessions]);

  // Daily focus distribution for last 7 days
  const last7Days = useMemo(() => {
    const days: { label: string; dateStr: string; minutes: number; blocks: number }[] = [];
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = sessions.filter((s) => s.startedAt.startsWith(dateStr));
      const minutes = Math.round(daySessions.reduce((acc, s) => acc + (s.focusedSec || 0), 0) / 60);
      const blocks = blocksOnDay(sessions, d);
      days.push({
        label: dayNames[d.getDay()],
        dateStr,
        minutes,
        blocks,
      });
      }
      return days;
    }, [sessions, now]);

  const maxDayMinutes = useMemo(
    () => Math.max(...last7Days.map((d) => d.minutes), 60),
    [last7Days]
  );

  // Peak focus hour
  const peakHour = useMemo(() => {
    if (sessions.length === 0) return null;
    const hourCounts: Record<number, number> = {};
    for (const s of sessions) {
      const h = new Date(s.startedAt).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + (s.focusedSec || 0);
    }
    let maxH = 0;
    let maxSec = 0;
    for (const [h, sec] of Object.entries(hourCounts)) {
      if (sec > maxSec) {
        maxSec = sec;
        maxH = Number(h);
      }
    }
    return maxSec > 0 ? `${String(maxH).padStart(2, '0')}:00` : null;
  }, [sessions]);

  // Current day streak
  const streak = useMemo(() => {
    if (sessions.length === 0) return 0;
    let count = 0;
    const checkDate = new Date(now);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasSession = sessions.some(
        (s) => s.startedAt.startsWith(dateStr) && (s.focusedSec || 0) > 0
      );
      if (hasSession) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (count === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = checkDate.toISOString().split('T')[0];
          const hasYesterday = sessions.some(
            (s) => s.startedAt.startsWith(yesterdayStr) && (s.focusedSec || 0) > 0
          );
          if (hasYesterday) {
            count = 1;
            checkDate.setDate(checkDate.getDate() - 1);
            while (true) {
              const prevStr = checkDate.toISOString().split('T')[0];
              if (sessions.some((s) => s.startedAt.startsWith(prevStr) && (s.focusedSec || 0) > 0)) {
                count++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }
          }
        }
        break;
      }
    }
    return count;
  }, [sessions, now]);

  // Format helpers
  const formatTime = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    return `${minutes} мин`;
  };

  const formatWeekLabel = (startDate: Date) => {
    const d = new Date(startDate);
    const end = new Date(d);
    end.setDate(d.getDate() + 6);
    const fmt = (date: Date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `${fmt(d)} – ${fmt(end)}`;
  };

  const getLightColor = (light: TrafficLight) => {
    switch (light) {
      case 'on':
        return '#22c55e';
      case 'behind':
        return '#eab308';
      case 'over':
        return '#ef4444';
    }
  };

  const getLightLabel = (light: TrafficLight) => {
    switch (light) {
      case 'on':
        return 'В темпе';
      case 'behind':
        return 'Отстает';
      case 'over':
        return 'Сверх лимита';
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-y-auto" style={{ color: theme.text }}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide">Журнал фокуса</h2>
          <p className="text-[10px] opacity-60">Бюджет блоков и история продуктивности</p>
        </div>
        <div className="flex items-center gap-2">
          {/* SubView switcher */}
          <div
            className="flex p-0.5 rounded-lg border text-[11px]"
            style={{ backgroundColor: `${theme.cardBg}80`, borderColor: `${theme.accent}20` }}
          >
            <button
              onClick={() => setSubView('budget')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                subView === 'budget' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: subView === 'budget' ? theme.accent : 'transparent',
                color: subView === 'budget' ? '#ffffff' : theme.text,
              }}
            >
              Бюджет
            </button>
            <button
              onClick={() => setSubView('history')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                subView === 'history' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: subView === 'history' ? theme.accent : 'transparent',
                color: subView === 'history' ? '#ffffff' : theme.text,
              }}
            >
              История
            </button>
          </div>

          <button
            onClick={() => setIsEditorOpen(true)}
            className="px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: `${theme.accent}40`,
              backgroundColor: `${theme.cardBg}90`,
              color: theme.accent,
            }}
          >
            Направления
          </button>
        </div>
      </div>

      {subView === 'budget' ? (
        <div className="flex flex-col gap-4">
          {/* Traffic Light Summary Row (Overall) */}
          <div
            className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: `${theme.accent}20`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 animate-pulse"
                style={{ backgroundColor: getLightColor(overallLight) }}
                title={`Светофор: ${getLightLabel(overallLight)}`}
                aria-label={`Светофор: ${getLightLabel(overallLight)}`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Общий темп недели</span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${getLightColor(overallLight)}20`,
                      color: getLightColor(overallLight),
                    }}
                  >
                    {getLightLabel(overallLight)}
                  </span>
                </div>
                <div className="text-[10px] opacity-70 mt-0.5">
                  Выполнено {formatBlocks(totalUsedBlocks)} из {totalWeeklyBudget} блоков (план к текущему дню {elapsedPct}%: {targetBlocks})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-xs font-bold font-mono">
                  {formatBlocks(totalUsedBlocks)} / {totalWeeklyBudget}
                </div>
                <div className="text-[9px] opacity-60">
                  {totalWeeklyBudget > 0
                    ? `${Math.round((totalUsedBlocks / totalWeeklyBudget) * 100)}% от лимита`
                    : 'бюджет не задан'}
                </div>
              </div>
            </div>
          </div>

          {/* Tab navigation for Budget view */}
          <div className="flex border-b pb-1 gap-4 text-[11px] font-medium" style={{ borderColor: `${theme.accent}20` }}>
            <button
              onClick={() => setActiveTab('weeks')}
              className={`pb-1 transition-all ${
                activeTab === 'weeks' ? 'border-b-2 font-semibold' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                borderColor: activeTab === 'weeks' ? theme.accent : 'transparent',
                color: activeTab === 'weeks' ? theme.accent : theme.text,
              }}
            >
              Последние 6 недель
            </button>
            <button
              onClick={() => setActiveTab('month')}
              className={`pb-1 transition-all ${
                activeTab === 'month' ? 'border-b-2 font-semibold' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                borderColor: activeTab === 'month' ? theme.accent : 'transparent',
                color: activeTab === 'month' ? theme.accent : theme.text,
              }}
            >
              Сетка месяца
            </button>
            <button
              onClick={() => setActiveTab('directions')}
              className={`pb-1 transition-all ${
                activeTab === 'directions' ? 'border-b-2 font-semibold' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                borderColor: activeTab === 'directions' ? theme.accent : 'transparent',
                color: activeTab === 'directions' ? theme.accent : theme.text,
              }}
            >
              По направлениям
            </button>
          </div>

          {/* Empty states handling */}
          {!hasAnyDirections && (
            <div
              className="p-4 rounded-xl border text-center my-2"
              style={{
                backgroundColor: `${theme.cardBg}50`,
                borderColor: `${theme.accent}15`,
              }}
            >
              <p className="text-xs font-medium">Нет активных направлений</p>
              <p className="text-[10px] opacity-60 mt-1 max-w-sm mx-auto">
                Создайте направления и задайте недельный бюджет блоков, чтобы отслеживать свой темп и фокусироваться на главном.
              </p>
              <button
                onClick={() => setIsEditorOpen(true)}
                className="mt-3 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all hover:scale-105"
                style={{
                  borderColor: theme.accent,
                  backgroundColor: theme.accent,
                  color: '#ffffff',
                }}
              >
                Создать направление
              </button>
            </div>
          )}

          {!hasAnySessions && hasAnyDirections && (
            <div
              className="p-4 rounded-xl border text-center my-2"
              style={{
                backgroundColor: `${theme.cardBg}50`,
                borderColor: `${theme.accent}15`,
              }}
            >
              <p className="text-xs font-medium">Нет зафиксированных сессий</p>
              <p className="text-[10px] opacity-60 mt-1 max-w-sm mx-auto">
                Запускайте блоки фокуса в таймере или с вкладки «Сегодня», чтобы в журнале отображались блоки и статистика.
              </p>
            </div>
          )}

          {/* TAB 1: 6 WEEKS PROGRESS */}
          {activeTab === 'weeks' && (
            <div className="flex flex-col gap-2.5">
              {summaries.map((summary, idx) => {
                const isCurrent = idx === summaries.length - 1;
                const budget = summary.budgetTotal;
                const total = summary.blocks;
                const isOver = summary.over;
                const withinBudgetBlocks = budget > 0 ? Math.min(total, budget) : total;
                const overBudgetBlocks = isOver ? total - budget : 0;
                const weekLight = paceLight(total, budget, isCurrent ? now : summary.start);

                return (
                  <div
                    key={summary.key}
                    className="p-3 rounded-xl border flex flex-col gap-2 transition-all"
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: isCurrent ? `${theme.accent}60` : `${theme.accent}15`,
                    }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getLightColor(weekLight) }}
                          title={`Статус: ${getLightLabel(weekLight)}`}
                        />
                        <span className="font-medium">
                          {formatWeekLabel(summary.start)}
                        </span>
                        {isCurrent && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded font-medium"
                            style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                          >
                            Текущая
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className={isOver ? 'text-red-400 font-bold' : ''}>
                          {formatBlocks(total)} / {budget} блоков
                        </span>
                        {isOver && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-sans font-semibold">
                            +{overBudgetBlocks} сверх
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Visual Block Bar */}
                    <div
                      className="w-full h-3 rounded-md overflow-hidden flex bg-black/20 relative"
                      title={`${formatBlocks(total)} из ${budget} блоков`}
                    >
                      {/* Normal / within budget portion */}
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${budget > 0 ? Math.min(100, (withinBudgetBlocks / budget) * 100) : total > 0 ? 100 : 0}%`,
                          backgroundColor: theme.accent,
                        }}
                      />
                      {/* Over-budget red tail */}
                      {isOver && (
                        <div
                          className="h-full bg-red-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (overBudgetBlocks / budget) * 100)}%`,
                          }}
                        />
                      )}
                    </div>

                    {/* Breakdown by directions */}
                    {summary.byDirection.size > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5 text-[10px]">
                        {Array.from(summary.byDirection.entries()).map(([dirId, count]) => {
                          const dir = dirId ? directions.find((d) => d.id === dirId) : null;
                          const name = dir?.name ?? 'Без направления';
                          const color = dir?.color ?? '#888888';
                          return (
                            <div key={dirId ?? 'unassigned'} className="flex items-center gap-1.5 opacity-80">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                              <span>{name}:</span>
                              <span className="font-mono font-medium">{formatBlocks(count)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: MONTH GRID */}
          {activeTab === 'month' && (
            <div
              className="p-3.5 rounded-xl border flex flex-col gap-3"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: `${theme.accent}20`,
              }}
            >
              <div className="text-xs font-semibold opacity-90">
                Сетка месяца: строки — недели, квадраты — выполненные блоки
              </div>
              <p className="text-[10px] opacity-60">
                Красным выделены блоки, превышающие лимит недели.
              </p>

              <div className="flex flex-col gap-3 mt-1">
                {monthWeeks.map((row) => {
                  return (
                    <div
                      key={row.weekKey}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-black/10"
                    >
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <span className="text-[11px] font-medium">
                          {formatWeekLabel(row.start)}
                        </span>
                        <span className="text-[10px] opacity-60 font-mono">
                          ({row.blocks.length}/{row.budgetTotal})
                        </span>
                      </div>

                      {/* Squares for blocks */}
                      <div className="flex flex-wrap gap-1.5 items-center flex-1 sm:justify-end">
                        {row.blocks.length === 0 ? (
                          <span className="text-[10px] opacity-40 italic">нет блоков</span>
                        ) : (
                          row.blocks.map((b, idx) => {
                            const dir = b.directionId
                              ? directions.find((d) => d.id === b.directionId)
                              : null;
                            const color = b.over ? '#ef4444' : (dir?.color ?? b.color ?? theme.accent);

                            return (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-sm transition-transform hover:scale-125 relative group flex items-center justify-center text-[8px] font-bold"
                                style={{
                                  backgroundColor: color,
                                  border: b.over ? '1px solid #f87171' : 'none',
                                }}
                                title={`${dir?.name ?? 'Фокус'}${b.over ? ' [Сверх лимита]' : ''}`}
                              >
                                {b.over && <span className="text-white">!</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DIRECTIONS PROGRESS & LIGHTS */}
          {activeTab === 'directions' && (
            <div className="flex flex-col gap-2.5">
              {dirProgressList
                .filter((p) => !p.direction.archived)
                .map(({ direction: dir, used, budget, over, light }) => {
                  const target = Math.round(budget * weekElapsed(now));
                  return (
                    <div
                      key={dir.id}
                      className="p-3.5 rounded-xl border flex flex-col gap-2.5"
                      style={{
                        backgroundColor: theme.cardBg,
                        borderColor: `${theme.accent}15`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: dir.color }}
                          />
                          <span className="text-xs font-semibold">{dir.name}</span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${getLightColor(light)}20`,
                              color: getLightColor(light),
                            }}
                          >
                            {getLightLabel(light)}
                          </span>
                        </div>

                        <div className="text-xs font-mono font-bold">
                          {formatBlocks(used)} / {budget} бл.
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 rounded-full overflow-hidden bg-black/20 relative">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${budget > 0 ? Math.min(100, (used / budget) * 100) : used > 0 ? 100 : 0}%`,
                            backgroundColor: over ? '#ef4444' : dir.color,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] opacity-70">
                        <span>План к текущему дню: {target} бл.</span>
                        <span>
                          {budget > 0
                            ? `${Math.round((used / budget) * 100)}% выполнено`
                            : 'Бюджет не задан'}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {dirProgressList.filter((p) => !p.direction.archived).length === 0 && (
                <div className="text-center py-6 text-xs opacity-50">
                  Нет активных направлений. Нажмите «Направления», чтобы добавить первое.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* SUBVIEW: HISTORY / CLASSIC STATS (folded from StatsView) */
        <div className="flex flex-col gap-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              className="p-3 rounded-xl border flex flex-col gap-1"
              style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accent}15` }}
            >
              <span className="text-[10px] opacity-60">Всего фокуса</span>
              <span className="text-sm font-bold font-mono">{formatTime(totalFocusSec)}</span>
            </div>

            <div
              className="p-3 rounded-xl border flex flex-col gap-1"
              style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accent}15` }}
            >
              <span className="text-[10px] opacity-60">Сессий завершено</span>
              <span className="text-sm font-bold font-mono">{completedSessions}</span>
            </div>

            <div
              className="p-3 rounded-xl border flex flex-col gap-1"
              style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accent}15` }}
            >
              <span className="text-[10px] opacity-60">Серия дней</span>
              <span className="text-sm font-bold font-mono">
                {streak} {streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'}
              </span>
            </div>

            <div
              className="p-3 rounded-xl border flex flex-col gap-1"
              style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accent}15` }}
            >
              <span className="text-[10px] opacity-60">Ср. оценка качества</span>
              <span className="text-sm font-bold font-mono">
                {avgQuality !== null ? `${avgQuality.toFixed(1)} / 10` : '—'}
              </span>
            </div>
          </div>

          {/* Daily Distribution Bars */}
          <div
            className="p-3.5 rounded-xl border flex flex-col gap-2.5"
            style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accent}20` }}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Фокус за последние 7 дней</span>
              {peakHour && <span className="text-[10px] opacity-60 font-normal">Пик: {peakHour}</span>}
            </div>

            <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-1">
              {last7Days.map((d) => {
                const heightPct = maxDayMinutes > 0 ? (d.minutes / maxDayMinutes) * 100 : 0;
                return (
                  <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] opacity-60 font-mono">
                      {d.minutes > 0 ? `${d.minutes}м` : ''}
                    </span>
                    <div
                      className="w-full max-w-[28px] rounded-t transition-all duration-300 min-h-[2px]"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        backgroundColor: d.minutes > 0 ? theme.accent : `${theme.text}10`,
                      }}
                      title={`${d.label} (${d.dateStr}): ${d.minutes} мин (${formatBlocks(d.blocks)} блоков)`}
                    />
                    <span className="text-[10px] font-medium opacity-70">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Progress (if any) */}
          {tasks.length > 0 && (
            <div
              className="p-3.5 rounded-xl border flex flex-col gap-2"
              style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accent}15` }}
            >
              <div className="text-xs font-semibold">Прогресс задач</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="opacity-70">
                  Выполнено {tasks.filter((t) => t.done).length} из {tasks.length}
                </span>
                <span className="font-mono font-bold">
                  {Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/20">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(tasks.filter((t) => t.done).length / tasks.length) * 100}%`,
                    backgroundColor: theme.accent,
                  }}
                />
              </div>
            </div>
          )}

          {/* Recent Sessions List */}
          <div
            className="p-3.5 rounded-xl border flex flex-col gap-2"
            style={{ backgroundColor: theme.cardBg, borderColor: `${theme.accent}15` }}
          >
            <div className="text-xs font-semibold">Последние сессии</div>
            {sessions.length === 0 ? (
              <div className="text-center py-4 text-[11px] opacity-50">Сессий еще нет</div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                {[...sessions].reverse().slice(0, 15).map((s) => {
                  const dir = s.directionId ? directions.find((d) => d.id === s.directionId) : null;
                  const dateFormatted = new Date(s.startedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={s.id}
                      className="p-2 rounded-lg bg-black/10 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        {dir ? (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: dir.color }}
                            title={dir.name}
                          />
                        ) : (
                          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-500" />
                        )}
                        <span className="font-medium">{s.label || 'Сессия фокуса'}</span>
                        {dir && <span className="text-[9px] opacity-60">({dir.name})</span>}
                        {s.quality && (
                          <span
                            className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold"
                            style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}
                          >
                            ★ {s.quality}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium">{formatTime(s.focusedSec || 0)}</span>
                        <span className="text-[9px] opacity-50">{dateFormatted}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Direction Editor */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl">
            <DirectionEditor
              theme={theme}
              directions={directions}
              onSaveDirections={(updated) => {
                onUpdateDirections?.(updated);
              }}
              onClose={() => setIsEditorOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
