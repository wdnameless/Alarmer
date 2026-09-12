class SoundService {
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

  // 3 quick countdown beeps
  playCountdownTick() {
    this.playBeep(600, 0.08, 0.3);
  }

  // High pitch completion sound
  playFinishAlarm() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      [880, 1100, 1320, 1760].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.5, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.35);
      });
    } catch (e) {
      console.warn('Finish alarm sound error:', e);
    }
  }

  // TTS Speech Synthesis voice announcement
  speak(text: string, volume = 0.9) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

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
