import React, { useState, useEffect } from 'react';
import { AIChatDrawer } from './AIChatDrawer';
import { TitleBar } from './TitleBar';
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
        <TitleBar
          theme={theme}
          isCompact={true}
          isPinned={false}
          onToggleCompact={() => {}}
          onTogglePin={() => {}}
        />

        {/* AI Chat Body filling entire companion window */}
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
          <AIChatDrawer
            isOpen={true}
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
