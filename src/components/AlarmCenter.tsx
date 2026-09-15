import React, { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Bell } from 'lucide-react';
import type { AlarmItem, Schedule, ScheduleStep, SessionRecord, ThemeColors } from '../types';
import { findStepByFiringId } from '../services/scheduleEngine';
import { soundService } from '../services/sound';
import { StoreService } from '../services/store';
import { BlockPlayer } from './BlockPlayer';
import { isTauri } from '../services/platform';

type BlockStep = Extract<ScheduleStep, { kind: 'block' }>;

/** What the backend reports when an alarm rings. */
interface FiredPayload {
  id: string;
  label: string;
  time: string;
  voice_prompt: string | null;
  snoozed_for: number;
  late_by_minutes: number;
  consumed: boolean;
}

interface AlarmCenterProps {
  theme: ThemeColors;
  /** Every firing the backend should enforce, schedules already expanded. */
  firings: AlarmItem[];
  schedules: Schedule[];
  /** Alarm volume 0..1, mirrored to the backend ringer. */
  alarmVolume: number;
  /** Whether alarms make a sound at all; muting passes volume 0. */
  alarmEnabled: boolean;
  /** A one-shot alarm switched itself off after ringing. */
  onDisableAlarm?: (id: string) => void;
  /** A finished interval block, so its focus time can be recorded. */
  onSession?: (session: SessionRecord) => void;
  children: React.ReactNode;
}

/**
 * Owns alarm firing for the whole application.
 *
 * Firing used to live inside the Alarms sub-tab, which meant the schedule was
 * never pushed to the backend and the ringing UI was never mounted unless the
 * user happened to be looking at that tab — the app's own default screen had a
 * silent alarm clock. Both the sync and the ringing surface now sit above the
 * tabs, so they run whatever is on screen.
 */
export const AlarmCenter: React.FC<AlarmCenterProps> = ({
  theme,
  firings,
  schedules,
  alarmVolume,
  alarmEnabled,
  onDisableAlarm,
  onSession,
  children,
}) => {
  const [ringing, setRinging] = useState<AlarmItem | null>(null);
  const [runningBlock, setRunningBlock] = useState<BlockStep | null>(null);
  const [runningBlockSchedule, setRunningBlockSchedule] = useState<string | undefined>(undefined);

  // Push the effective schedule down whenever it changes.
  useEffect(() => {
    if (!isTauri()) return;
    void invoke('sync_alarms', {
      alarms: firings.map((a) => ({
        id: a.id,
        label: a.label || a.title,
        time: a.time,
        days: a.days ?? [],
        repeat: a.repeat,
        enabled: a.enabled,
        sound: a.sound,
        voice_prompt: a.voicePrompt ?? null,
      })),
    }).catch((e) => console.warn('Failed to sync alarms to scheduler:', e));
  }, [firings]);

  // Keep the backend's own ringer at the user's volume, so an alarm that rings
  // while the window is hidden is as loud as one that rings on screen.
  useEffect(() => {
    if (!isTauri()) return;
    const volume = StoreService.getPreference('alarmer_alarm_volume', 0.8);
    const enabled = StoreService.getPreference('alarmer_alarm_enabled', true);
    void invoke('set_alarm_audio_prefs', { volume: enabled ? volume : 0, enabled }).catch(() => {});
  }, [alarmVolume, alarmEnabled]);

  // Ring when the backend says it is time.
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listen<FiredPayload>('alarm://fired', (event) => {
      const payload = event.payload;
      const alarm = firings.find((a) => a.id === payload.id) ?? {
        id: payload.id,
        title: payload.label,
        label: payload.label,
        time: payload.time,
        days: [],
        repeat: 'days' as const,
        enabled: true,
        sound: 'gentle',
        voicePrompt: payload.voice_prompt ?? undefined,
      };

      if (payload.consumed) onDisableAlarm?.(payload.id);

      setRinging(alarm);
      soundService.startAlarmRamp(alarm.sound, alarm.id);
      soundService.speak(payload.voice_prompt || `Внимание! Будильник: ${payload.label}`);
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [firings, onDisableAlarm]);

  // An alarm that started ringing while the window was hidden is still ringing.
  // Without this, opening the window mid-ring shows a silent, calm app while the
  // backend keeps sounding the alarm.
  useEffect(() => {
    if (!isTauri()) return;
    void invoke<string | null>('ringing_alarm_id')
      .then((id) => {
        if (!id) return;
        const alarm = firings.find((a) => a.id === id);
        if (alarm) setRinging(alarm);
      })
      .catch(() => {});
    // Deliberately keyed on mount only: this is a start-up reconciliation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRinging = useCallback(() => {
    soundService.stopAlarmRamp();
    soundService.stopSpeaking();
    setRinging(null);
  }, []);

  const dismiss = () => {
    soundService.playCountdownTick();
    if (isTauri() && ringing) {
      void invoke('dismiss_alarm', { id: ringing.id }).catch(() => {});
    }
    stopRinging();
  };

  const snooze = (minutes: number) => {
    soundService.playCountdownTick();
    if (isTauri() && ringing) {
      void invoke('snooze_alarm', { id: ringing.id, minutes }).catch(() => {});
    }
    stopRinging();
  };

  /** The alarm behind an interval block, so it can be run right from the ring. */
  const ringingBlock = ringing ? findStepByFiringId(schedules, ringing.id) : null;

  const startRingingBlock = () => {
    if (!ringingBlock || ringingBlock.step.kind !== 'block') return;
    soundService.playUiClick();
    setRunningBlockSchedule(ringingBlock.schedule.id);
    dismiss();
    setRunningBlock(ringingBlock.step);
  };

  return (
    <>
      {children}

      {runningBlock && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ backgroundColor: `${theme.bg}F2`, backdropFilter: 'blur(8px)' }}
        >
          <BlockPlayer
            theme={theme}
            block={runningBlock}
            scheduleId={runningBlockSchedule}
            onSession={onSession}
            onClose={() => setRunningBlock(null)}
          />
        </div>
      )}

      {ringing && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-5"
          style={{ backgroundColor: theme.accent }}
        >
          <style>{`
            @keyframes alarmer-pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
            @media (prefers-reduced-motion: reduce) {
              .alarmer-pulse { animation: none !important; }
            }
            .alarmer-pulse { animation: alarmer-pulse 1.4s ease-in-out infinite; }
          `}</style>

          <Bell size={30} color="#0a0a0a" className="alarmer-pulse mb-5" />

          {/* Dark-on-warm: the measured contrast here is 7.59:1, where white on
              the warm surface is only 2.61:1. */}
          <span className="text-[52px] font-bold leading-none tabular-nums" style={{ color: '#0a0a0a' }}>
            {ringing.time}
          </span>

          <span
            className="mt-2 text-sm font-semibold text-center max-w-[280px]"
            style={{ color: 'rgba(10,10,10,0.82)' }}
          >
            {ringing.label || ringing.title}
          </span>

          {ringing.voicePrompt && (
            <span
              className="mt-3 text-[11px] text-center max-w-[280px] leading-relaxed"
              style={{ color: 'rgba(10,10,10,0.62)' }}
            >
              {ringing.voicePrompt}
            </span>
          )}

          {ringingBlock?.step.kind === 'block' && (
            <button
              onClick={startRingingBlock}
              className="mt-6 w-full max-w-[280px] py-3 rounded-lg text-xs font-bold uppercase tracking-widest active:scale-[0.97] transition-transform"
              style={{ backgroundColor: 'rgba(10,10,10,0.14)', color: '#0a0a0a' }}
            >
              Начать блок
            </button>
          )}

          <div className="flex items-center space-x-2 mt-4">
            {[5, 10, 15].map((mins) => (
              <button
                key={mins}
                onClick={() => snooze(mins)}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold active:scale-95 transition-transform"
                style={{ color: '#0a0a0a', border: '1px solid rgba(10,10,10,0.28)' }}
                title={`Отложить на ${mins} минут`}
              >
                +{mins} мин
              </button>
            ))}
          </div>

          <button
            onClick={dismiss}
            className="mt-3 w-full max-w-[280px] py-3.5 rounded-lg text-xs font-bold uppercase tracking-widest active:scale-[0.97] transition-transform"
            style={{ backgroundColor: '#0a0a0a', color: theme.accent }}
          >
            Остановить
          </button>
        </div>
      )}
    </>
  );
};
