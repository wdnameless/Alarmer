import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, BellOff, Volume2, Clock } from 'lucide-react';
import { ThemeColors, AlarmItem } from '../types';
import { soundService } from '../services/sound';

interface AlarmsProps {
  theme: ThemeColors;
  alarms: AlarmItem[];
  onUpdateAlarms: (alarms: AlarmItem[]) => void;
}

export const Alarms: React.FC<AlarmsProps> = ({
  theme,
  alarms,
  onUpdateAlarms,
}) => {
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('Утренняя разминка');
  const [currentTime, setCurrentTime] = useState('');

  // Clock ticker & trigger check
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      setCurrentTime(timeStr);

      // Check if second is 00 to trigger active alarms
      if (now.getSeconds() === 0) {
        alarms.forEach((alarm) => {
          if (alarm.enabled && alarm.time === timeStr) {
            soundService.playFinishAlarm();
            if (alarm.voicePrompt) {
              soundService.speak(alarm.voicePrompt);
            } else {
              soundService.speak(`Будильник: ${alarm.label}`);
            }
          }
        });
      }
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, [alarms]);

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
      days: [1, 2, 3, 4, 5, 6, 7],
      enabled: true,
      sound: 'gentle',
    };

    onUpdateAlarms([...alarms, newAlarm]);
    setNewLabel('');
  };

  return (
    <div className="flex flex-col w-full px-2 py-1 space-y-3">
      {/* Current Time Display */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl border"
        style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
      >
        <div className="flex items-center space-x-2">
          <Clock size={16} style={{ color: theme.accent }} />
          <span className="text-xs uppercase font-bold" style={{ color: theme.subtext }}>
            Текущее время
          </span>
        </div>
        <span className="text-xl font-extrabold font-mono" style={{ color: theme.text }}>
          {currentTime}
        </span>
      </div>

      {/* Add New Alarm Form */}
      <form onSubmit={addAlarm} className="flex flex-col space-y-2 p-3 rounded-xl border"
        style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
      >
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
          Новый будильник / напоминание
        </div>
        <div className="flex space-x-2">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-sm font-mono font-bold bg-white/5 border outline-none"
            style={{ borderColor: theme.border, color: theme.text }}
            required
          />
          <input
            type="text"
            placeholder="Название или упражнение"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-white/5 border outline-none"
            style={{ borderColor: theme.border, color: theme.text }}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg flex items-center justify-center transition-transform active:scale-95 font-bold"
            style={{
              backgroundColor: theme.accent,
              color: '#000000',
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </form>

      {/* Alarms List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {alarms.map((alarm) => (
          <div
            key={alarm.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              alarm.enabled ? '' : 'opacity-50'
            }`}
            style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
          >
            <div className="flex flex-col">
              <span className="text-lg font-bold font-mono tracking-tight" style={{ color: theme.text }}>
                {alarm.time}
              </span>
              <span className="text-xs truncate max-w-[150px]" style={{ color: theme.subtext }}>
                {alarm.label}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => soundService.speak(alarm.voicePrompt || alarm.label || 'Будильник')}
                title="Прослушать голос"
                className="p-1.5 rounded-lg hover:bg-white/10"
                style={{ color: theme.subtext }}
              >
                <Volume2 size={15} />
              </button>
              <button
                onClick={() => toggleAlarm(alarm.id)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: alarm.enabled ? theme.accent : theme.subtext }}
              >
                {alarm.enabled ? <Bell size={18} /> : <BellOff size={18} />}
              </button>
              <button
                onClick={() => deleteAlarm(alarm.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-neutral-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
