import React, { useState } from 'react';
import { ThemeColors, Direction, DIRECTION_COLORS } from '../types';

export interface DirectionEditorProps {
  theme: ThemeColors;
  directions: Direction[];
  onSaveDirections?: (directions: Direction[]) => void;
  onUpdateDirections?: (directions: Direction[]) => void;
  onClose?: () => void;
}

export const DirectionEditor: React.FC<DirectionEditorProps> = ({
  theme,
  directions,
  onSaveDirections,
  onUpdateDirections,
  onClose,
}) => {
  const notifyChange = (updated: Direction[]) => {
    onSaveDirections?.(updated);
    onUpdateDirections?.(updated);
  };
  const [items, setItems] = useState<Direction[]>(directions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState<string>(DIRECTION_COLORS[0]);
  const [budgetInput, setBudgetInput] = useState<string>('10');
  const [error, setError] = useState<string | null>(null);

  const startCreating = () => {
    setEditingId('new');
    setNameInput('');
    setColorInput(DIRECTION_COLORS[items.length % DIRECTION_COLORS.length] || DIRECTION_COLORS[0]);
    setBudgetInput('10');
    setError(null);
  };

  const startEditing = (dir: Direction) => {
    setEditingId(dir.id);
    setNameInput(dir.name);
    setColorInput(dir.color);
    setBudgetInput(String(dir.weeklyBlockBudget));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const handleSaveItem = () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setError('Название направления не может быть пустым');
      return;
    }

    const parsedBudget = parseInt(budgetInput, 10);
    if (isNaN(parsedBudget) || parsedBudget < 1) {
      setError('Бюджет должен быть положительным числом блоков');
      return;
    }

    if (editingId === 'new') {
      const newDir: Direction = {
        id: `dir_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        color: colorInput,
        weeklyBlockBudget: parsedBudget,
        archived: false,
      };
      const updated = [...items, newDir];
      setItems(updated);
      notifyChange(updated);
    } else if (editingId) {
      const updated = items.map((dir) =>
        dir.id === editingId
          ? {
              ...dir,
              name: trimmedName,
              color: colorInput,
              weeklyBlockBudget: parsedBudget,
            }
          : dir
      );
      setItems(updated);
      notifyChange(updated);
    }

    setEditingId(null);
    setError(null);
  };

  const handleToggleArchive = (id: string) => {
    const updated = items.map((dir) =>
      dir.id === id ? { ...dir, archived: !dir.archived } : dir
    );
    setItems(updated);
    notifyChange(updated);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((dir) => dir.id !== id);
    setItems(updated);
    notifyChange(updated);
    if (editingId === id) {
      setEditingId(null);
    }
  };

  return (
    <div
      className="w-full flex flex-col p-4 rounded-xl max-h-[80vh] overflow-hidden"
      style={{
        backgroundColor: theme.cardBg,
        color: theme.text,
        border: `1px solid ${theme.accent}20`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: `${theme.accent}20` }}>
        <div>
          <h3 className="text-sm font-semibold">Направления фокуса</h3>
          <p className="text-[10px] opacity-60">Сферы работы с недельным бюджетом блоков</p>
        </div>
        <div className="flex items-center gap-2">
          {editingId === null && (
            <button
              onClick={startCreating}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all hover:scale-105"
              style={{
                backgroundColor: theme.accent,
                color: '#ffffff',
              }}
            >
              + Новое
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1 text-[11px] rounded-lg opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Editing / Creating Form */}
      {editingId !== null && (
        <div
          className="p-3 my-3 rounded-lg border flex flex-col gap-2.5 bg-black/10"
          style={{ borderColor: `${theme.accent}30` }}
        >
          <div className="text-xs font-semibold">
            {editingId === 'new' ? 'Новое направление' : 'Редактирование направления'}
          </div>

          {error && <div className="text-[10px] text-red-400">{error}</div>}

          <div>
            <label className="text-[10px] opacity-70 block mb-1">Название</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Например: Разработка, Английский, Чтение"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none bg-transparent"
              style={{
                borderColor: `${theme.accent}30`,
                color: theme.text,
              }}
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] opacity-70 block mb-1">Цвет метки</label>
            <div className="flex flex-wrap gap-2 items-center">
              {DIRECTION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorInput(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    colorInput === c ? 'scale-125 ring-2 ring-white shadow' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Выбрать цвет ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] opacity-70 block mb-1">
              Недельный бюджет блоков (1 блок ≈ 50 мин фокуса)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-24 px-2.5 py-1.5 text-xs rounded-lg border outline-none bg-transparent"
              style={{
                borderColor: `${theme.accent}30`,
                color: theme.text,
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-2.5 py-1 text-[11px] rounded-lg border opacity-70 hover:opacity-100"
              style={{ borderColor: `${theme.text}20` }}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSaveItem}
              className="px-3 py-1 text-[11px] font-medium rounded-lg transition-transform hover:scale-105"
              style={{
                backgroundColor: theme.accent,
                color: '#ffffff',
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* List of Directions */}
      <div className="flex-1 overflow-y-auto mt-2 flex flex-col gap-2 pr-1">
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs opacity-50">
            Нет созданных направлений. Добавьте направления, чтобы задать недельный лимит блоков!
          </div>
        ) : (
          items.map((dir) => (
            <div
              key={dir.id}
              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                dir.archived ? 'opacity-40 bg-black/5' : 'bg-black/10'
              }`}
              style={{ borderColor: `${theme.accent}15` }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dir.color }}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{dir.name}</span>
                    {dir.archived && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-500/20 text-gray-400">
                        Архив
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] opacity-60">
                    Бюджет: {dir.weeklyBlockBudget} бл./нед.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEditing(dir)}
                  className="px-2 py-1 text-[10px] rounded hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                  title="Редактировать"
                >
                  Изм.
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleArchive(dir.id)}
                  className="px-2 py-1 text-[10px] rounded hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                  title={dir.archived ? 'Вернуть из архива' : 'В архив'}
                >
                  {dir.archived ? 'Разархивировать' : 'В архив'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(dir.id)}
                  className="px-2 py-1 text-[10px] rounded hover:bg-red-500/20 text-red-400 opacity-60 hover:opacity-100 transition-colors"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
