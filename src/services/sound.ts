import type { SoundProfileId } from '../types';
import { EdgeTtsService } from './edgeTts';
import { ticking } from '../constants/defaults';
import { StoreService } from '../services/store';

export class SoundService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Beep sound with custom frequency, duration, and curve
  playBeep(freq = 880, duration = 0.15, volume = 0.5) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // UI click sound (tabs, buttons, presets) with volume regulation
  playUiClick() {
    const enabled = StoreService.getPreference('alarmer_ui_clicks', true);
    if (!enabled) return;
    const clickVol = StoreService.getPreference('alarmer_click_volume', 0.5);
    const profile = StoreService.getPreference('alarmer_sound_profile', 'neon') as SoundProfileId;
    switch (profile) {
      case 'mechanical':
        this.playBeep(220, 0.04, 0.5 * clickVol);
        break;
      case 'soft':
        this.playBeep(440, 0.06, 0.25 * clickVol);
        break;
      case 'arcade':
        this.playBeep(980, 0.05, 0.35 * clickVol);
        break;
      case 'neon':
      default:
        this.playBeep(600, 0.05, 0.3 * clickVol);
        break;
    }
  }

  private tickingAudio: HTMLAudioElement | null = null;

  // Play user-supplied FLAC clock tick audio
  playClockTick() {
    const enabled = StoreService.getPreference('alarmer_clock_tick', true);
    if (!enabled) return;
    try {
      const clickVol = StoreService.getPreference('alarmer_click_volume', 0.7);
      if (!this.tickingAudio) {
        this.tickingAudio = new Audio(ticking);
      }
      this.tickingAudio.volume = Math.max(0, Math.min(1, clickVol));
      this.tickingAudio.currentTime = 0;
      this.tickingAudio.play().catch(() => {});
    } catch (e) {
      console.warn('Clock tick error:', e);
    }
  }
  playCountdownTick() {
    const enabled = StoreService.getPreference('alarmer_countdown_ticks', true);
    if (!enabled) return;
    this.playUiClick();
  }
  // High pitch completion sound with alarm volume regulation
  private customAlarmAudio: HTMLAudioElement | null = null;

  playFinishAlarm() {
    try {
      const alarmVol = StoreService.getPreference('alarmer_alarm_volume', 0.8);
      const customAudio = StoreService.getPreference('alarmer_custom_alarm_sound', '') || null;
      if (customAudio) {
        if (!this.customAlarmAudio) {
          this.customAlarmAudio = new Audio();
        }
        this.customAlarmAudio.src = customAudio;
        this.customAlarmAudio.volume = Math.max(0, Math.min(1, alarmVol));
        this.customAlarmAudio.currentTime = 0;
        this.customAlarmAudio.play().catch(() => {});
        return;
      }

      const ctx = this.getContext();
      const now = ctx.currentTime;
      [880, 1100, 1320, 1760].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.3 * alarmVol, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.25);
      });
    } catch (e) {
      console.warn('Finish alarm sound error:', e);
    }
  }
  speak(text: string, voiceId?: string) {
    const savedVoice = voiceId || StoreService.getPreference('alarmer_voice_id', 'none');
    if (savedVoice === 'none') {
      return; // Disabled by default
    }
    EdgeTtsService.speak(text, savedVoice);
  }

  stopSpeaking() {
    EdgeTtsService.stop();
  }
}

export const soundService = new SoundService();
