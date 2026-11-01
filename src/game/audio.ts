// Tiny WebAudio chiptune kit: synth SFX + looping music sequencer.

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type SfxName =
  | "jump"
  | "coin"
  | "stomp"
  | "bump"
  | "break"
  | "power"
  | "hurt"
  | "die"
  | "boost"
  | "finish"
  | "select"
  | "checkpoint"
  | "countdown";

export class AudioKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private track = 0;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.master);
      const len = Math.floor(this.ctx.sampleRate * 0.4);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.85;
  }

  private tone(
    freq: number,
    at: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    dest?: AudioNode
  ) {
    if (!this.ctx || !this.master) return;
    const t = Math.max(at, this.ctx.currentTime);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(at: number, dur: number, gain: number, freq: number, q = 1) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = Math.max(at, this.ctx.currentTime);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: SfxName) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "jump":
        this.tone(340, t, 0.16, "square", 0.13, 780);
        break;
      case "coin":
        this.tone(midi(88), t, 0.06, "square", 0.11);
        this.tone(midi(95), t + 0.06, 0.16, "square", 0.1);
        break;
      case "stomp":
        this.tone(220, t, 0.12, "triangle", 0.16, 60);
        this.noise(t, 0.1, 0.14, 900, 0.8);
        break;
      case "bump":
        this.tone(180, t, 0.08, "square", 0.1, 120);
        break;
      case "break":
        this.noise(t, 0.26, 0.2, 1600, 0.6);
        this.tone(320, t, 0.2, "sawtooth", 0.08, 90);
        break;
      case "power":
        [72, 76, 79, 84].forEach((m, i) => this.tone(midi(m), t + i * 0.06, 0.16, "square", 0.11));
        break;
      case "hurt":
        this.tone(400, t, 0.28, "sawtooth", 0.12, 110);
        break;
      case "die":
        [72, 67, 63, 58, 48].forEach((m, i) => this.tone(midi(m), t + i * 0.11, 0.24, "square", 0.12));
        break;
      case "boost":
        this.tone(220, t, 0.34, "sawtooth", 0.11, 1500);
        this.noise(t, 0.3, 0.12, 2600, 0.7);
        break;
      case "finish":
        [72, 72, 72, 67, 72, 79, 84].forEach((m, i) =>
          this.tone(midi(m), t + i * 0.12, 0.22, "square", 0.11)
        );
        break;
      case "checkpoint":
        this.tone(midi(79), t, 0.1, "triangle", 0.12);
        this.tone(midi(84), t + 0.1, 0.22, "triangle", 0.12);
        break;
      case "select":
        this.tone(660, t, 0.07, "square", 0.1, 990);
        break;
      case "countdown":
        this.tone(midi(76), t, 0.12, "square", 0.13);
        break;
    }
  }

  // ------------------------------------------------------------------ music
  private tracks: { lead: number[]; bass: number[]; step: number }[] = [
    {
      // overworld - bright major loop
      step: 0.135,
      lead: [76, 0, 79, 0, 83, 0, 79, 0, 76, 0, 72, 0, 74, 76, 0, 0, 74, 0, 77, 0, 81, 0, 77, 0, 74, 0, 71, 0, 72, 74, 0, 0],
      bass: [40, 0, 47, 0, 40, 0, 47, 0, 38, 0, 45, 0, 38, 0, 45, 0, 36, 0, 43, 0, 36, 0, 43, 0, 38, 0, 45, 0, 40, 0, 47, 0],
    },
    {
      // race - driving minor riff
      step: 0.115,
      lead: [69, 69, 0, 72, 0, 76, 0, 72, 69, 0, 67, 0, 69, 0, 0, 0, 70, 70, 0, 74, 0, 77, 0, 74, 70, 0, 68, 0, 70, 0, 0, 0],
      bass: [33, 33, 45, 33, 33, 45, 33, 45, 31, 31, 43, 31, 31, 43, 31, 43, 29, 29, 41, 29, 29, 41, 29, 41, 31, 31, 43, 31, 31, 43, 31, 43],
    },
    {
      // night - moody
      step: 0.15,
      lead: [72, 0, 75, 0, 79, 0, 77, 0, 75, 0, 72, 0, 70, 0, 0, 0, 70, 0, 74, 0, 77, 0, 75, 0, 74, 0, 70, 0, 68, 0, 0, 0],
      bass: [36, 0, 0, 43, 36, 0, 43, 0, 34, 0, 0, 41, 34, 0, 41, 0, 32, 0, 0, 39, 32, 0, 39, 0, 34, 0, 0, 41, 34, 0, 43, 0],
    },
  ];

  startMusic(track: number) {
    if (!this.ctx) return;
    this.track = track % this.tracks.length;
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private schedule() {
    if (!this.ctx || !this.musicGain) return;
    const tr = this.tracks[this.track];
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const i = this.step % tr.lead.length;
      const lead = tr.lead[i];
      const bass = tr.bass[i];
      if (lead && !this.muted)
        this.tone(midi(lead), this.nextTime, tr.step * 0.9, "square", 0.055, undefined, this.musicGain);
      if (bass && !this.muted)
        this.tone(midi(bass), this.nextTime, tr.step * 1.1, "triangle", 0.09, undefined, this.musicGain);
      if (i % 4 === 0 && !this.muted) this.noise(this.nextTime, 0.05, 0.05, 6000, 0.5);
      this.nextTime += tr.step;
      this.step++;
    }
  }
}

export const audio = new AudioKit();
