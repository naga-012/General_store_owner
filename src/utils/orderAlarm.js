// Ultra-Loud Web Audio & HTML5 Audio Alarm for Kirana Store Owner Portal
// Designed to cut through background noise and bypass browser autoplay restrictions

class OrderAlarmService {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
    this.isUnlocked = false;
    this.audioElement = null;

    if (typeof window !== 'undefined') {
      this.attachUnlockListeners();
      this.initAudioElement();
    }
  }

  attachUnlockListeners() {
    const unlock = () => {
      this.init();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.isUnlocked = true;
      console.log('🔊 AudioContext unlocked by user interaction');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('click', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }

  init() {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('Could not initialize AudioContext:', e);
    }
  }

  initAudioElement() {
    try {
      // Synthesize a backup high-pitched loud WAV data URL
      const wavDataUri = this.generatePiercingWav();
      this.audioElement = new Audio(wavDataUri);
      this.audioElement.volume = 1.0;
    } catch (e) {
      console.warn('Backup audio init error:', e);
    }
  }

  // Generates an urgent dual-beep WAV data URI in memory
  generatePiercingWav() {
    const sampleRate = 22050;
    const duration = 0.8;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate dual-tone alert waveform (1000Hz + 1500Hz)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      if (t < 0.35) {
        // High alert tone 1
        sample = Math.sin(2 * Math.PI * 1050 * t) * 0.7 + (Math.sin(2 * Math.PI * 2100 * t) > 0 ? 0.3 : -0.3);
      } else if (t >= 0.4 && t < 0.75) {
        // High alert tone 2
        sample = Math.sin(2 * Math.PI * 1400 * t) * 0.7 + (Math.sin(2 * Math.PI * 2800 * t) > 0 ? 0.3 : -0.3);
      }
      const val = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + i * 2, val < 0 ? val * 0x8000 : val * 0x7fff, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  // Play high-volume piercing supermarket order siren
  playChime() {
    this.init();

    // Secondary backup: play HTML5 audio
    if (this.audioElement) {
      try {
        this.audioElement.currentTime = 0;
        this.audioElement.play().catch(() => {});
      } catch (e) {}
    }

    if (!this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Dynamics Compressor to maximize perceived loudness without clipping
      const compressor = this.audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, now);
      compressor.knee.setValueAtTime(6, now);
      compressor.ratio.setValueAtTime(16, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.25, now);
      compressor.connect(this.audioCtx.destination);

      // 4-stage piercing siren notes: High-frequency tones with square harmonics
      const sirenNotes = [
        { freq1: 880, freq2: 1760, time: 0.0, duration: 0.18, type: 'sawtooth' },
        { freq1: 1175, freq2: 2350, time: 0.2, duration: 0.22, type: 'sawtooth' },
        { freq1: 1568, freq2: 3136, time: 0.44, duration: 0.22, type: 'square' },
        { freq1: 2093, freq2: 1046, time: 0.68, duration: 0.45, type: 'triangle' },
      ];

      sirenNotes.forEach(({ freq1, freq2, time, duration, type }) => {
        // Oscillator 1 - fundamental tone
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = type;
        osc1.frequency.setValueAtTime(freq1, now + time);

        gain1.gain.setValueAtTime(0.001, now + time);
        gain1.gain.linearRampToValueAtTime(1.0, now + time + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

        osc1.connect(gain1);
        gain1.connect(compressor);

        // Oscillator 2 - high harmonic for piercing loudness
        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq2, now + time);

        gain2.gain.setValueAtTime(0.001, now + time);
        gain2.gain.linearRampToValueAtTime(0.6, now + time + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

        osc2.connect(gain2);
        gain2.connect(compressor);

        osc1.start(now + time);
        osc1.stop(now + time + duration);
        osc2.start(now + time);
        osc2.stop(now + time + duration);
      });
    } catch (err) {
      console.warn('Audio alert error:', err);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playChime();

    // Continuous loud repetition every 1.8 seconds until owner accepts or stops
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playChime();
      }
    }, 1800);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Allows owner to preview the loud sound
  testSound() {
    this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.playChime();
  }
}

export const orderAlarm = new OrderAlarmService();
