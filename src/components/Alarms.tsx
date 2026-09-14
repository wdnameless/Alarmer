import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Bell, BellOff, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { ThemeColors, AlarmItem, AISettings } from '../types';
import { NotificationService } from '../services/notification';
import { soundService } from '../services/sound';
import { AIService } from '../services/ai';

interface AlarmsProps {
  theme: ThemeColors;
  alarms: AlarmItem[];
  aiSettings?: AISettings;
  onUpdateAlarms: (alarms: AlarmItem[]) => void;
  onOpenAISettings?: () => void;
}

export const Alarms: React.FC<AlarmsProps> = ({
  theme,
  alarms,
  aiSettings,
  onUpdateAlarms,
  onOpenAISettings,
}) => {
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('Утренняя разминка');
  const [currentTime, setCurrentTime] = useState('');
  const [ringingAlarm, setRingingAlarm] = useState<AlarmItem | null>(null);
  const triggeredAlarmsRef = useRef<Set<string>>(new Set());
  
  // AI Smart Setup state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Вот моя тренировка: в 7:00 подъем, в 7:15 силовая разминка, в 19:30 вечерняя растяжка');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Clock ticker & trigger check
  // Clock ticker & trigger check with deduplication and ringing screen
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0-6
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      setCurrentTime(timeStr);

      // Clear triggered cache on minute change
      if (now.getSeconds() === 0) {
        triggeredAlarmsRef.current.clear();
      }

      alarms.forEach((alarm) => {
        if (!alarm.enabled || alarm.time !== timeStr) return;
        
        // Check day match (if days array is specified and not empty)
        if (alarm.days && alarm.days.length > 0 && !alarm.days.includes(currentDay)) {
          return;
        }

        // Trigger once per minute per alarm
        const key = `${alarm.id}_${timeStr}`;
        if (!triggeredAlarmsRef.current.has(key)) {
          triggeredAlarmsRef.current.add(key);
          setRingingAlarm(alarm);
          soundService.playFinishAlarm();
          const announcement = alarm.voicePrompt || `Внимание! Будильник: ${alarm.label || alarm.title}`;
          soundService.speak(announcement);
          NotificationService.notify(alarm.label || alarm.title || 'Будильник Alarmer', announcement).catch(console.error);
        }
      });
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, [alarms]);

  const dismissRingingAlarm = () => {
    soundService.playCountdownTick();
    setRingingAlarm(null);
  };

  const toggleAlarm = (id: string) => {
    soundService.playCountdownTick();
    onUpdateAlarms(
      alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const deleteAlarm = (id: string) => {
    soundService.playCountdownTick();
    onUpdateAlarms(alarms.filter((a) => a.id !== id));
  };

  const addAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) return;

    soundService.playCountdownTick();
    const newAlarm: AlarmItem = {
      id: Date.now().toString(),
      title: newLabel || 'Будильник',
      label: newLabel || 'Будильник',
      time: newTime,
      days: [0, 1, 2, 3, 4, 5, 6],
      enabled: true,
      sound: 'gentle',
      voicePrompt: newLabel,
    };

    onUpdateAlarms([...alarms, newAlarm]);
    setNewLabel('');
  };

  const handleAiSchedule = async () => {
    if (!aiSettings?.apiKey) {
      onOpenAISettings?.();
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      soundService.playCountdownTick();
      const newAlarms = await AIService.generateAlarms(aiPrompt, aiSettings);
      if (newAlarms.length > 0) {
        onUpdateAlarms([...alarms, ...newAlarms]);
        soundService.speak(`ИИ настроил ${newAlarms.length} будильников!`);
        setShowAiModal(false);
      } else {
        setAiError('Не удалось выделить будильники из запроса.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка при обращении к ИИ';
      setAiError(msg);
      soundService.playBeep(200, 0.4, 0.4);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[340px] px-1 py-1 space-y-2.5 overflow-hidden">
      {/* Ringing Overlay */}
      {ringingAlarm && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-xl animate-pulse"
          style={{ backgroundColor: `${theme.bg}F0` }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-500/20 text-red-400 border border-red-500/40">
            <Bell size={32} className="animate-bounce" />
          </div>
          <h2 className="text-2xl font-black mb-1 tracking-tight" style={{ color: theme.text }}>
            {ringingAlarm.time}
          </h2>
          <p className="text-base font-bold mb-3 text-center" style={{ color: theme.accent }}>
            {ringingAlarm.label || ringingAlarm.title}
          </p>
          {ringingAlarm.voicePrompt && (
            <p className="text-xs text-center opacity-80 mb-4 italic max-w-xs" style={{ color: theme.subtext }}>
              "{ringingAlarm.voicePrompt}"
            </p>
          )}
          <button
            onClick={dismissRingingAlarm}
            className="w-full max-w-xs py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white shadow-xl active:scale-95 transition-all"
          >
            Остановить будильник
          </button>
        </div>
      )}
      {/* Responsive Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 w-full">
        <div className="flex items-center space-x-1.5 shrink-0">
          <Bell size={15} style={{ color: theme.accent }} />
          <span className="text-xs font-bold tracking-wider uppercase opacity-90 truncate">
            Будильники
          </span>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => {
              const sleepAlarm: AlarmItem = {
                id: 'sleep_' + Date.now(),
                title: 'Отход ко сну (Wind-down)',
                time: '23:00',
                days: [0, 1, 2, 3, 4, 5, 6],
                enabled: true,
                sound: 'gentle',
                voicePrompt: 'Пора готовиться ко сну. Закрой рабочие вкладки и отдохни.',
              };
              onUpdateAlarms([sleepAlarm, ...alarms]);
              soundService.playUiClick();
              soundService.speak('Будильник ко сну установлен на 23:00');
            }}
            className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all shrink-0"
            title="Reverse Alarm: Будильник ко сну"
          >
            🌙 Ко сну
          </button>
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all shadow-sm shrink-0"
            style={{
              backgroundColor: `${theme.accent}20`,
              color: theme.accent,
              border: `1px solid ${theme.accent}40`,
            }}
          >
            <Sparkles size={11} className="animate-pulse" />
            <span>ИИ</span>
          </button>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/5 shrink-0">
            {currentTime || '--:--'}
          </span>
        </div>
      </div>
      {/* AI Orchestration Modal Banner */}
      {showAiModal && (
        <div
          className="p-3 rounded-xl border flex flex-col space-y-2 animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: `${theme.surface}f0`,
            borderColor: `${theme.accent}60`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold" style={{ color: theme.accent }}>
              <Sparkles size={14} />
              <span>Умная расстановка будильников ИИ</span>
            </div>
            <button
              onClick={() => setShowAiModal(false)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] opacity-70">
            Напишите вашу тренировку, режим дня или задачи в свободной форме — ИИ сам расставит точное время и голосовые напоминания.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            className="w-full text-xs p-2 rounded-lg bg-black/40 border border-white/10 focus:outline-none"
            style={{ color: theme.text }}
            placeholder="Например: Вот моя тренировка: в 7:00 подъем, в 7:15 разминка, в 19:30 растяжка"
          />
          {aiError && <div className="text-[11px] text-red-400 font-medium">{aiError}</div>}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              onClick={() => setShowAiModal(false)}
              className="px-2.5 py-1 text-xs rounded-lg hover:bg-white/5 opacity-70"
            >
              Отмена
            </button>
            <button
              onClick={handleAiSchedule}
              disabled={aiLoading}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded-lg shadow-sm"
              style={{
                backgroundColor: theme.accent,
                color: theme.bg,
              }}
            >
              {aiLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Анализ и создание...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Расставить расписание</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Form */}
      {/* Responsive Quick Add Form */}
      <form
        onSubmit={addAlarm}
        className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/20 border border-white/5 w-full"
      >
        <input
          type="time"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          className="bg-black/40 text-xs font-mono px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none w-[80px] shrink-0"
          style={{ color: theme.text }}
        />
        <input
          type="text"
          placeholder="Название будильника..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="min-w-0 flex-1 bg-black/40 text-xs px-2 py-1.5 rounded-lg border border-white/10 focus:outline-none"
          style={{ color: theme.text }}
        />
        <button
          type="submit"
          className="w-7 h-7 rounded-lg transition-transform active:scale-95 flex items-center justify-center shrink-0"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
          title="Добавить будильник"
        >
          <Plus size={15} />
        </button>
      </form>
      {/* Alarm List */}
      <div className="flex flex-col space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {alarms.length === 0 ? (
          <div className="text-center py-6 text-xs opacity-40">
            Нет активных будильников. Добавьте вручную или нажмите «ИИ Настройка».
          </div>
        ) : (
          alarms.map((alarm) => (
            <div
              key={alarm.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                alarm.enabled ? 'bg-black/30' : 'bg-black/10 opacity-50'
              }`}
              style={{
                borderColor: alarm.enabled ? `${theme.accent}30` : 'rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleAlarm(alarm.id)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: alarm.enabled ? theme.accent : theme.subtext }}
                >
                  {alarm.enabled ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
                <div className="flex flex-col">
                  <div className="flex items-baseline space-x-2">
                    <span
                      className={`text-lg font-mono font-bold ${
                        alarm.enabled ? '' : 'line-through'
                      }`}
                      style={{ color: alarm.enabled ? theme.text : theme.subtext }}
                    >
                      {alarm.time}
                    </span>
                    <span className="text-xs font-medium truncate max-w-[130px]">
                      {alarm.label || alarm.title}
                    </span>
                  </div>
                  {alarm.voicePrompt && (
                    <span className="text-[10px] opacity-60 flex items-center space-x-1 truncate max-w-[180px]">
                      <Volume2 size={10} className="shrink-0" />
                      <span className="truncate">{alarm.voicePrompt}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => soundService.speak(alarm.voicePrompt || alarm.label || alarm.title)}
                  title="Прослушать голос"
                  className="p-1.5 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100"
                >
                  <Volume2 size={14} />
                </button>
                <button
                  onClick={() => deleteAlarm(alarm.id)}
                  title="Удалить"
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 opacity-60 hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
