import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, PlayCircle, Bell, Check, User } from 'lucide-react';
import { ThemeColors, AISettings, WorkoutRoutine, AlarmItem, DynamicUIConfig } from '../types';
import { AIPlanResult } from '../services/ai';
import { AICompilerService } from '../services/aiCompiler';
import { soundService } from '../services/sound';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  result?: AIPlanResult;
  time: string;
}

interface AITrainerProps {
  theme: ThemeColors;
  aiSettings: AISettings;
  currentUi: DynamicUIConfig;
  alarms?: AlarmItem[];
  onUpdateAISettings: (settings: AISettings) => void;
  onSelectRoutine: (routine: WorkoutRoutine) => void;
  onApplyAlarms?: (alarms: AlarmItem[]) => void;
  onApplyUI?: (ui: DynamicUIConfig) => void;
  onSwitchTab?: (tab: 'workout' | 'alarm') => void;
}

export const AITrainer: React.FC<AITrainerProps> = ({
  theme,
  aiSettings,
  currentUi,
  alarms: _alarms = [],
  onSelectRoutine,
  onApplyAlarms,
  onApplyUI,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: '1',
        sender: 'assistant',
        text: 'Привет! Я твой AI Co-Pilot. Я умею управлять будильниками, создавать программы тренировок (HIIT, Табата), настраивать таймеры и динамически менять интерфейс приложения. Чем могу помочь?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    soundService.playUiClick();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Execute AICompiler for deep live UI transformation, alarms & workouts
      const mutation = await AICompilerService.compileUserIntent(query, currentUi, aiSettings);
      if (mutation.ui && onApplyUI) {
        onApplyUI({
          ...currentUi,
          ...mutation.ui,
          colors: { ...currentUi.colors, ...(mutation.ui.colors || {}) },
          dial: { ...currentUi.dial, ...(mutation.ui.dial || {}) },
          typography: { ...currentUi.typography, ...(mutation.ui.typography || {}) },
          layout: { ...currentUi.layout, ...(mutation.ui.layout || {}) },
        });
      }
      if (mutation.alarms && mutation.alarms.length > 0 && onApplyAlarms) {
        onApplyAlarms(mutation.alarms);
      }
      if (mutation.workout && onSelectRoutine) {
        onSelectRoutine(mutation.workout);
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: mutation.explanation || 'Изменения успешно применены!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (mutation.explanation) soundService.speak(mutation.explanation);
    } catch (err: unknown) {
      console.error(err);
      const errMessage = err instanceof Error ? err.message : 'Ошибка обработки запроса';
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Ошибка: ${errMessage}. Проверьте подключение или API ключ в Настройках.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col w-full h-full p-2 space-y-2 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center space-x-2">
          <Bot size={18} style={{ color: theme.accent }} />
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">AI Co-Pilot</span>
        </div>
        <span className="text-[10px] opacity-50 font-mono">
          {aiSettings.apiKey ? aiSettings.model : 'Offline Smart Parser'}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 space-y-2.5 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-end space-x-1.5 max-w-[88%]">
              {m.sender === 'assistant' && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mb-1"
                  style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}
                >
                  <Bot size={12} />
                </div>
              )}
              <div
                className={`p-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  m.sender === 'user' ? 'rounded-br-none' : 'rounded-bl-none'
                }`}
                style={{
                  backgroundColor: m.sender === 'user' ? theme.accent : theme.surface,
                  color: m.sender === 'user' ? '#000000' : theme.text,
                  border: m.sender === 'assistant' ? `1px solid ${theme.border}` : undefined,
                }}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Plan result interactive cards */}
                {m.result && (
                  <div className="mt-2.5 pt-2 border-t flex flex-col space-y-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    {m.result.alarms && m.result.alarms.length > 0 && (
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/20 text-[11px]">
                        <div className="flex items-center space-x-1.5 truncate">
                          <Bell size={13} style={{ color: theme.accent }} />
                          <span className="truncate">{m.result.alarms.length} будильника(ов)</span>
                        </div>
                        {onApplyAlarms && (
                          <button
                            onClick={() => {
                              onApplyAlarms(m.result!.alarms!);
                              soundService.playUiClick();
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-white/20 transition-all flex items-center space-x-1"
                          >
                            <Check size={10} />
                            <span>Установить</span>
                          </button>
                        )}
                      </div>
                    )}

                    {m.result.workout && (
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-black/20 text-[11px]">
                        <div className="flex items-center space-x-1.5 truncate">
                          <PlayCircle size={13} style={{ color: theme.accent }} />
                          <span className="truncate">{m.result.workout.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            onSelectRoutine(m.result!.workout!);
                            soundService.playUiClick();
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-white/20 transition-all flex items-center space-x-1"
                        >
                          <PlayCircle size={10} />
                          <span>Начать</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {m.sender === 'user' && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mb-1"
                  style={{ backgroundColor: `${theme.text}20`, color: theme.text }}
                >
                  <User size={12} />
                </div>
              )}
            </div>
            <span className="text-[9px] opacity-40 mt-0.5 px-7">{m.time}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs opacity-60 px-2 py-1">
            <Loader2 size={13} className="animate-spin" style={{ color: theme.accent }} />
            <span>AI Co-Pilot думает...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-1 px-1 no-scrollbar opacity-75">
        {[
          'Что ты умеешь?',
          'Табата на 15 минут',
          'Будильник на 07:00 и 22:30',
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            className="text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap bg-white/5 hover:bg-white/10 border transition-all"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="flex items-center space-x-1.5 p-1 rounded-xl border bg-black/20" style={{ borderColor: theme.border }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение AI Co-Pilot..."
          className="flex-1 bg-transparent px-2.5 py-1.5 text-xs focus:outline-none"
          style={{ color: theme.text }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="p-2 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          style={{
            backgroundColor: theme.accent,
            color: '#000000',
          }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
};
