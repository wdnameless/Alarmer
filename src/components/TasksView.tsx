import React, { useState } from 'react';
import { Plus, Trash2, Check, Circle } from 'lucide-react';
import type { TaskItem, ThemeColors } from '../types';
import { taskProgress } from '../services/stats';
import { soundService } from '../services/sound';

interface TasksViewProps {
  theme: ThemeColors;
  tasks: TaskItem[];
  onUpdateTasks: (tasks: TaskItem[]) => void;
}

/**
 * The day's work, as opposed to the day's timetable.
 *
 * A schedule says a block starts at 07:15; this says what the block is for. The
 * two are linked by `stepId`, so a task created from a program step carries the
 * context of where it came from.
 */
export const TasksView: React.FC<TasksViewProps> = ({ theme, tasks, onUpdateTasks }) => {
  const [draft, setDraft] = useState('');
  const { done, total } = taskProgress(tasks);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;

    soundService.playCountdownTick();
    onUpdateTasks([
      ...tasks,
      { id: `task_${Date.now()}`, title, done: false, createdAt: new Date().toISOString() },
    ]);
    setDraft('');
  };

  const toggleTask = (id: string) => {
    soundService.playCountdownTick();
    onUpdateTasks(
      tasks.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined }
          : t,
      ),
    );
  };

  const deleteTask = (id: string) => {
    soundService.playCountdownTick();
    onUpdateTasks(tasks.filter((t) => t.id !== id));
  };

  const open = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);

  return (
    <div className="flex flex-col w-full max-w-[340px] px-1 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider uppercase opacity-90">Задачи</span>
        {total > 0 && (
          <span className="text-[10px] font-mono tabular-nums" style={{ color: theme.subtext }}>
            {done} / {total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${(done / total) * 100}%`, backgroundColor: theme.accent }}
          />
        </div>
      )}

      <form
        onSubmit={addTask}
        className="flex items-center gap-1.5 p-2 rounded-2xl border w-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Что нужно сделать?"
          className="min-w-0 flex-1 bg-black/40 text-xs px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none"
          style={{ color: theme.text }}
          aria-label="Новая задача"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="w-7 h-7 rounded-lg transition-transform active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-30"
          style={{ backgroundColor: '#fafafa', color: '#0a0a0a' }}
          title="Добавить задачу"
        >
          <Plus size={15} />
        </button>
      </form>

      {total === 0 && (
        <div
          className="rounded-2xl border px-4 py-6 text-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          <span className="text-[11px] leading-relaxed" style={{ color: theme.subtext }}>
            Пока пусто. Добавьте задачи — расписание подскажет, когда за них взяться.
          </span>
        </div>
      )}

      <div className="flex flex-col space-y-1.5">
        {open.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 p-2.5 rounded-xl border"
            style={{ backgroundColor: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.10)' }}
          >
            <button
              onClick={() => toggleTask(task.id)}
              className="shrink-0"
              style={{ color: theme.subtext }}
              title="Отметить выполненной"
              aria-label={`Отметить «${task.title}» выполненной`}
            >
              <Circle size={16} />
            </button>
            <span className="flex-1 text-xs truncate" style={{ color: theme.text }}>
              {task.title}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1 rounded transition-colors hover:bg-red-500/20 text-red-400 opacity-50 hover:opacity-100 shrink-0"
              title="Удалить"
              aria-label={`Удалить «${task.title}»`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <span className="text-[10px] uppercase tracking-wider mt-1" style={{ color: theme.subtext }}>
              Выполнено
            </span>
            {completed.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 p-2.5 rounded-xl border"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="shrink-0"
                  style={{ color: theme.accent }}
                  title="Вернуть в работу"
                  aria-label={`Вернуть «${task.title}» в работу`}
                >
                  <Check size={16} />
                </button>
                <span className="flex-1 text-xs truncate line-through opacity-55" style={{ color: theme.subtext }}>
                  {task.title}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1 rounded transition-colors hover:bg-red-500/20 text-red-400 opacity-40 hover:opacity-100 shrink-0"
                  title="Удалить"
                  aria-label={`Удалить «${task.title}»`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
