import React, { useState, useEffect } from 'react';
import { AIChatDrawer } from './AIChatDrawer';
import { ResizeHandles } from './ResizeHandles';
import { THEMES } from '../constants/themes';
import { DEFAULT_AI_SETTINGS } from '../constants/defaults';
import { ThemeColors, DynamicUIConfig, AISettings, AlarmItem, DEFAULT_DYNAMIC_UI } from '../types';
import { ChatMessage } from '../services/aiCompiler';
import { WindowService } from '../services/window';

export const AICompanionWindow: React.FC = () => {
  const [dynamicUi, setDynamicUi] = useState<DynamicUIConfig>(() => {
    try {
      const saved = localStorage.getItem('alarmer_dynamic_ui');
      return saved ? JSON.parse(saved) : DEFAULT_DYNAMIC_UI;
    } catch {
      return DEFAULT_DYNAMIC_UI;
    }
  });

  const [aiSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('alarmer_ai_settings');
      return saved ? JSON.parse(saved) : DEFAULT_AI_SETTINGS;
    } catch {
      return DEFAULT_AI_SETTINGS;
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('alarmer_chat_history');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: '1',
              sender: 'assistant',
              text: 'Привет! Я твой AI Co-Pilot. Я работаю в отдельном привязанном окне. Чем могу помочь?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('alarmer_chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);
  const baseTheme = THEMES['dark-neon'];
  const theme: ThemeColors = {
    ...baseTheme,
    ...dynamicUi.colors,
    id: 'dark-neon',
  };

  const handleApplyAlarms = (newAlarms: AlarmItem[]) => {
    try {
      const raw = localStorage.getItem('alarmer_alarms');
      const cur: AlarmItem[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem('alarmer_alarms', JSON.stringify([...cur, ...newAlarms]));
      // Signal main window to reload alarms
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetTimerMinutes = (mins: number) => {
    localStorage.setItem('alarmer_timer_preset', mins.toString());
    localStorage.setItem('alarmer_target_module', 'timer');
    window.dispatchEvent(new Event('storage'));
  };

  const handleNavigateToModule = (mod: 'timer' | 'workout' | 'stopwatch' | 'alarms') => {
    localStorage.setItem('alarmer_target_module', mod);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="w-screen h-screen m-0 p-0 bg-transparent overflow-hidden select-none">
      <div
        className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl border transition-colors duration-200"
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderColor: theme.border,
        }}
      >
        <ResizeHandles />
        {/* Native custom titlebar for AI Companion */}
        {/* Drag Region Header for AI Companion Window */}
        <div
          data-tauri-drag-region
          className="w-full flex items-center justify-between px-3.5 py-2.5 border-b select-none shrink-0"
          style={{ borderColor: `${theme.border}` }}
        >
          <div className="flex items-center space-x-2 pointer-events-none">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${theme.accent}25`, color: theme.accent }}
            >
              <span className="text-xs">✨</span>
            </div>
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: theme.text }}>
              AI Co-Pilot
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => WindowService.minimize()}
              title="Свернуть"
              className="w-6 h-6 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/10 active:scale-95 transition-colors text-white/50 hover:text-white"
            >
              <span className="text-xs leading-none">─</span>
            </button>
            <button
              type="button"
              onClick={() => WindowService.closeAiCompanionWindow()}
              title="Закрыть"
              className="w-6 h-6 rounded-md flex items-center justify-center bg-white/5 hover:bg-rose-500/30 hover:text-rose-300 active:scale-95 transition-colors text-white/50"
            >
              <span className="text-xs leading-none">✕</span>
            </button>
          </div>
        </div>
        {/* AI Chat Body filling entire companion window */}
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
          <AIChatDrawer
            isOpen={true}
            hideHeader={true}
            onClose={() => WindowService.closeAiCompanionWindow()}
            theme={theme}
            currentUi={dynamicUi}
            aiSettings={aiSettings}
            onApplyUI={(newUi) => {
              setDynamicUi(newUi);
              localStorage.setItem('alarmer_dynamic_ui', JSON.stringify(newUi));
              window.dispatchEvent(new Event('storage'));
            }}
            onApplyAlarms={handleApplyAlarms}
            onApplyWorkout={() => {}}
            onSetTimerMinutes={handleSetTimerMinutes}
            onNavigateToModule={handleNavigateToModule}
            messages={chatMessages}
            onSendMessage={(msg) => setChatMessages((prev) => [...prev, msg])}
          />
        </div>
      </div>
    </div>
  );
};
