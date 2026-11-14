import type { GameSettings } from './types';

export class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicIntervalId: number | null = null;
  private musicStep = 0;
  private isMusicPlaying = false;
  private lastVoiceTime = 0;
  private settings: GameSettings = {
    soundEnabled: true,
    musicEnabled: true,
    voiceEnabled: true,
  };

  public updateSettings(next: GameSettings): void {
    this.settings = { ...next };
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.settings.soundEnabled ? 0.85 : 0;
    }
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.soundEnabled && this.settings.musicEnabled ? 0.28 : 0;
    }
    if (!this.settings.soundEnabled || !this.settings.voiceEnabled) {
      this.cancelSpeech();
    }
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.settings.soundEnabled ? 0.85 : 0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.soundEnabled && this.settings.musicEnabled ? 0.28 : 0;
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public startMusic(): void {
    this.unlock();
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.musicStep = 0;

    // 144 BPM energetic Indian chase percussion + bass groove
    const stepMs = 104;
    this.musicIntervalId = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
      if (!this.settings.soundEnabled || !this.settings.musicEnabled) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const step = this.musicStep % 16;
      this.musicStep += 1;

      // Dhol/Kick on 0, 3, 6, 8, 11, 14
      if (step === 0 || step === 3 || step === 8 || step === 11) {
        this.playDrumKick(now, step === 0 || step === 8 ? 1.0 : 0.7);
      }
      // Snappy tabla rim on 4 and 12
      if (step === 4 || step === 12 || step === 15) {
        this.playTablaHit(now, step === 15 ? 0.5 : 0.85);
      }

      // Driving bassline (D minor / Bhairav-style chase flavor)
      const bassNotes = [73.42, 0, 73.42, 87.31, 0, 82.41, 73.42, 0, 73.42, 0, 98.0, 0, 87.31, 82.41, 65.41, 0];
      const bassFreq = bassNotes[step];
      if (bassFreq > 0) {
        this.playMusicTone(bassFreq, 'sawtooth', now, 0.09, 0.22, 420);
      }

      // Energetic lead riff
      const leadNotes = [293.66, 0, 349.23, 329.63, 293.66, 0, 440.0, 0, 392.0, 0, 349.23, 329.63, 293.66, 261.63, 293.66, 0];
      const leadFreq = leadNotes[step];
      if (leadFreq > 0) {
        this.playMusicTone(leadFreq, 'triangle', now, 0.08, 0.14, 1800);
      }
    }, stepMs);
  }

  public stopMusic(): void {
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      window.clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  private playDrumKick(time: number, gainAmount: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);
    gain.gain.setValueAtTime(0.42 * gainAmount, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  private playTablaHit(time: number, gainAmount: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, time);
    osc.frequency.exponentialRampToValueAtTime(195, time + 0.055);
    gain.gain.setValueAtTime(0.24 * gainAmount, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  private playMusicTone(
    freq: number,
    type: OscillatorType,
    time: number,
    duration: number,
    volume: number,
    cutoff: number,
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  public playCoin(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(988 * jitter, now);
    osc.frequency.setValueAtTime(1318 * jitter, now + 0.045);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playSwipe(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playJump(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.14);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playSlide(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playTrainHorn(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Authentic dual-tone locomotive horn chord
    [277.18, 349.23].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.96, now + 0.45);
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  public playStumble(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playPoliceWhistle(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2750, now);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(34, now);
    lfoGain.gain.setValueAtTime(140, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
    gain.gain.setValueAtTime(0.16, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 0.35);
    osc.stop(now + 0.35);
  }

  public playCrash(): void {
    if (!this.settings.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public speakAbhijeetLine(line: string, priority: 'close' | 'caught'): void {
    if (!this.settings.soundEnabled || !this.settings.voiceEnabled) return;
    const nowMs = Date.now();
    if (priority === 'close' && nowMs - this.lastVoiceTime < 3500) {
      return;
    }
    this.lastVoiceTime = nowMs;

    this.playPoliceWhistle();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line);
      const voices = window.speechSynthesis.getVoices();
      const hindiOrIndianVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
        voices.find((v) => v.lang.toLowerCase().includes('in')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en'));

      if (hindiOrIndianVoice) {
        utterance.voice = hindiOrIndianVoice;
        utterance.lang = hindiOrIndianVoice.lang;
      } else {
        utterance.lang = 'hi-IN';
      }

      // Expressive Bollywood police-inspector cadence
      utterance.pitch = priority === 'caught' ? 0.88 : 0.96;
      utterance.rate = priority === 'caught' ? 0.98 : 1.06;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch {
      // Safe fallback if browser blocks speechSynthesis without gesture
    }
  }

  public cancelSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public dispose(): void {
    this.stopMusic();
    this.cancelSpeech();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
