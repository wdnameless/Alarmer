import { EdgeTtsService } from './edgeTts';
import { ticking } from '../constants/defaults';

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
    const enabled = localStorage.getItem('alarmer_ui_clicks') !== 'false';
    if (!enabled) return;
    const clickVol = parseFloat(localStorage.getItem('alarmer_click_volume') || '0.5');
    const profile = localStorage.getItem('alarmer_sound_profile') || 'neon';
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
  playClockTick(_isTock = false) {
    const enabled = localStorage.getItem('alarmer_clock_tick') !== 'false';
    if (!enabled) return;
    try {
      const clickVol = parseFloat(localStorage.getItem('alarmer_click_volume') || '0.7');
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
    const enabled = localStorage.getItem('alarmer_countdown_ticks') !== 'false';
    if (!enabled) return;
    this.playUiClick();
  }
  // High pitch completion sound with alarm volume regulation
  playFinishAlarm() {
    try {
      const alarmVol = parseFloat(localStorage.getItem('alarmer_alarm_volume') || '0.8');
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
    const savedVoice = voiceId || localStorage.getItem('alarmer_voice_id') || 'none';
    if (savedVoice === 'none') {
      return; // Disabled by default
    }
    EdgeTtsService.speak(text, savedVoice);
  }

  stopSpeaking() {
    EdgeTtsService.stop();
  }

  legacySpeak(text: string, volume = 0.9) {
    try {
      window.speechSynthesis.cancel(); // stop current
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const doSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const ruVoice = voices.find(v => v.lang.toLowerCase().includes('ru'));
        if (ruVoice) {
          utterance.voice = ruVoice;
        }
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          doSpeak();
        };
      } else {
        doSpeak();
      }
    } catch (e) {
      console.warn('TTS voice error:', e);
    }
  }
}

export const soundService = new SoundService();
