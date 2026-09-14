import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, X, Check, Loader2, ArrowRight } from 'lucide-react';
import { ThemeColors, DynamicUIConfig, AISettings, AlarmItem, WorkoutRoutine } from '../types';
import { AICompilerService, ChatMessage } from '../services/aiCompiler';
import { soundService } from '../services/sound';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeColors;
  currentUi: DynamicUIConfig;
  aiSettings: AISettings;
  onApplyUI: (newUi: DynamicUIConfig) => void;
  onApplyAlarms?: (alarms: AlarmItem[]) => void;
  onApplyWorkout?: (workout: WorkoutRoutine) => void;
  onSetTimerMinutes?: (minutes: number) => void;
  onNavigateToModule?: (module: 'timer' | 'workout' | 'stopwatch' | 'alarms') => void;
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  theme,
  currentUi,
  aiSettings,
  onApplyUI,
  onApplyAlarms,
  onApplyWorkout,
  onSetTimerMinutes,
  onNavigateToModule,
  messages,
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    soundService.playCountdownTick();
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onSendMessage(userMsg);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const mutation = await AICompilerService.compileUserIntent(textToSend, currentUi, aiSettings);

      if (mutation.ui) {
        onApplyUI({
          ...currentUi,
          ...mutation.ui,
          colors: { ...currentUi.colors, ...mutation.ui.colors },
          dial: { ...currentUi.dial, ...mutation.ui.dial },
          typography: { ...currentUi.typography, ...mutation.ui.typography },
          layout: { ...currentUi.layout, ...mutation.ui.layout },
        });
      }

      if (mutation.alarms && onApplyAlarms) {
        onApplyAlarms(mutation.alarms);
        onNavigateToModule?.('alarms');
      }

      if (mutation.workout && onApplyWorkout) {
        onApplyWorkout(mutation.workout);
        onNavigateToModule?.('workout');
      }

      // Check for timer intent in text
      const timerMatch = textToSend.match(/таймер.*?(\d+)\s*(мин|m)/i) || textToSend.match(/(\d+)\s*(мин|m).*?таймер/i);
      if (timerMatch && onSetTimerMinutes) {
        const mins = parseInt(timerMatch[1], 10);
        onSetTimerMinutes(mins);
        onNavigateToModule?.('timer');
      }

      soundService.speak(mutation.explanation);

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: mutation.explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mutation,
      };

      onSendMessage(assistantMsg);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Ошибка компиляции интерфейса';
      onSendMessage({
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `Не удалось применить: ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Сделай киберпанк тему с неоновым розовым и круглыми кнопками',
    'Ультра-минимализм: черный AMOLED, без засечек и пресетов',
    'Янтарный спортивный таймер с крупным шрифтом',
    'Поставь будильник на 07:00 и 21:30',
  ];

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col backdrop-blur-xl transition-all duration-300 select-none animate-in fade-in"
      style={{
        backgroundColor: `${theme.bg}FA`,
        color: theme.text,
      }}
    >
      {/* Drawer Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `${theme.accent}30` }}
      >
        <div className="flex items-center space-x-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
          >
            <Bot size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              AI Co-Pilot & UI Compiler
              <Sparkles size={12} style={{ color: theme.accent }} />
            </h3>
            <span className="text-[10px] opacity-60">Диктуйте стиль, таймеры и сценарии</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/70 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-md ${
                m.sender === 'user'
                  ? 'text-black font-medium'
                  : 'bg-white/5 border border-white/10'
              }`}
              style={{
                backgroundColor: m.sender === 'user' ? theme.accent : undefined,
                color: m.sender === 'user' ? '#000000' : theme.text,
              }}
            >
              {m.text}

              {m.mutation && (
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1">
                  {m.mutation.ui && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 flex items-center gap-1">
                      <Check size={10} style={{ color: theme.accent }} /> UI трансформирован
                    </span>
                  )}
                  {m.mutation.alarms && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 flex items-center gap-1">
                      <Check size={10} style={{ color: theme.accent }} /> Будильники добавлены
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-[9px] opacity-40 px-1 mt-0.5">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs opacity-60 p-2">
            <Loader2 size={13} className="animate-spin" style={{ color: theme.accent }} />
            <span>AI компилирует интерфейс и сценарии...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-1.5 border-t border-white/5 overflow-x-auto flex gap-1.5 no-scrollbar">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-[10px] whitespace-nowrap px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 active:scale-95 transition-all text-left flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <span>{q}</span>
            <ArrowRight size={10} />
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-2 border-t border-white/10 bg-black/20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Например: Сделай черный AMOLED и убери засечки..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-white/30 transition-colors"
            style={{ color: theme.text }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 disabled:opacity-30"
            style={{
              backgroundColor: theme.accent,
              color: '#000000',
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
