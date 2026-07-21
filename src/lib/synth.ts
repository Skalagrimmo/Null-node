// Real-time audio synthesis using HTML5 Web Audio API
// Emulates the high-voltage vector hardware sound design of a cybernetic terminal.

class SoundSynth {
  private ctx: AudioContext | null = null;
  private willpowerNode: OscillatorNode | null = null;
  private willpowerGain: GainNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a brief high-contrast vector tick
  playTick(freq = 1200, duration = 0.04, volume = 0.15) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio blocked or failed
    }
  }

  // Play threat vector warning alarm
  playThreatWarning() {
    this.playTick(880, 0.15, 0.25);
    setTimeout(() => this.playTick(660, 0.1, 0.2), 80);
  }

  // Play player slide / movement whoosh
  playMove() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // Play damage glitch sound
  playDamage() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      // Play custom white noise burst
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      noise.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();

      // Low pitch click
      this.playTick(120, 0.2, 0.4);
    } catch (e) {}
  }

  // Continuous Willpower resonance synthesizer
  startWillpowerResonance(frequencyHz: number) {
    try {
      this.initCtx();
      if (!this.ctx) return;

      if (this.willpowerNode) {
        this.willpowerNode.frequency.setValueAtTime(frequencyHz, this.ctx.currentTime);
        return;
      }

      this.willpowerNode = this.ctx.createOscillator();
      this.willpowerGain = this.ctx.createGain();

      this.willpowerNode.type = 'sine';
      this.willpowerNode.frequency.setValueAtTime(frequencyHz, this.ctx.currentTime);

      this.willpowerGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

      this.willpowerNode.connect(this.willpowerGain);
      this.willpowerGain.connect(this.ctx.destination);

      this.willpowerNode.start();
    } catch (e) {}
  }

  updateWillpowerResonance(frequencyHz: number, volume: number) {
    try {
      if (this.willpowerNode && this.ctx) {
        this.willpowerNode.frequency.setValueAtTime(frequencyHz, this.ctx.currentTime);
      }
      if (this.willpowerGain && this.ctx) {
        this.willpowerGain.gain.setValueAtTime(volume * 0.25, this.ctx.currentTime);
      }
    } catch (e) {}
  }

  stopWillpowerResonance() {
    try {
      if (this.willpowerNode) {
        this.willpowerNode.stop();
        this.willpowerNode.disconnect();
        this.willpowerNode = null;
      }
      if (this.willpowerGain) {
        this.willpowerGain.disconnect();
        this.willpowerGain = null;
      }
    } catch (e) {}
  }

  playSuccess() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.1); // G5
      osc1.frequency.setValueAtTime(1046.50, this.ctx.currentTime + 0.2); // C6

      osc2.frequency.setValueAtTime(659.25, this.ctx.currentTime); // E5
      osc2.frequency.setValueAtTime(987.77, this.ctx.currentTime + 0.1); // B5
      osc2.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.2); // E6

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(this.ctx.currentTime + 0.45);
      osc2.stop(this.ctx.currentTime + 0.45);
    } catch (e) {}
  }
}

export const synth = new SoundSynth();
