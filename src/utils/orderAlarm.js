// Web Audio API Order Alarm for Owner Portal
// Plays a loud, repeating supermarket order chime until accepted

class OrderAlarmService {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  playChime() {
    try {
      this.init();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Loud, bright 4-tone supermarket alert chime: E5, A5, C6, E6
      const notes = [
        { freq: 659.25, time: 0.0, duration: 0.25 },
        { freq: 880.00, time: 0.2, duration: 0.3 },
        { freq: 1046.50, time: 0.45, duration: 0.35 },
        { freq: 1318.51, time: 0.75, duration: 0.7 },
      ];

      notes.forEach(({ freq, time, duration }) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle'; // resonant, rich bell tone
        osc.frequency.setValueAtTime(freq, now + time);

        // High volume envelope for prominent sound
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.95, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration);
      });
    } catch (err) {
      console.warn('Audio alert error:', err);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playChime();

    // Repeat loud chime every 2.2 seconds until explicitly accepted or stopped
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playChime();
      }
    }, 2200);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const orderAlarm = new OrderAlarmService();
