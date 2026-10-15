// An original, fully synthesised score (Web Audio). No audio files, no licensed music.
// Layers: drone pad, rhythmic pulse, drums, tension string, Shepard riser, fall wind,
// one-shot "braams" and impacts, all through a generated reverb and a compressor.

// Drum patterns: one value per step (0 = rest, otherwise hit strength).
const HEART = [1, 0, 1, 0, 1, 0, 1, 0]; // each hit is a lub-dub
const FRANTIC = [1, 0, 0, 0.5, 0, 0, 1, 0, 0, 0.5, 0, 0, 1, 0, 0.7, 0.4];
const MARCH = [1, 0, 0.5, 0, 1, 0, 0.5, 0.3];
const WAR = [1, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0.5, 0];

// Pulse melody as frequency ratios of the root, cycled per step.
const PULSE = [1, 1, 2, 1, 1.5, 1, 2, 1.189];

// root Hz, "third" ratio (1.189 minor, 1.26 major, 1.414 tritone), filter cutoff,
// tempo, steps per beat, pulse level, drum pattern, heartbeat, tension string level
const MOODS = {
  intro: { root: 73.42, third: 1.189, cutoff: 320, bpm: 70, steps: 2, pulse: 0, drums: null, string: 0 },
  fear: { root: 73.42, third: 1.189, cutoff: 380, bpm: 62, steps: 2, pulse: 0.25, drums: HEART, heart: true, string: 0 },
  chaos: { root: 73.42, third: 1.414, cutoff: 900, bpm: 148, steps: 4, pulse: 0.5, drums: FRANTIC, string: 0.07 },
  rise: { root: 73.42, third: 1.26, cutoff: 650, bpm: 112, steps: 2, pulse: 0.4, drums: MARCH, string: 0 },
  vengeance: { root: 65.41, third: 1.189, cutoff: 520, bpm: 84, steps: 4, pulse: 0.2, drums: WAR, string: 0.035 },
  signal: { root: 73.42, third: 1.26, cutoff: 1100, bpm: 60, steps: 2, pulse: 0, drums: null, string: 0 },
  dawn: { root: 73.42, third: 1.26, cutoff: 1500, bpm: 60, steps: 2, pulse: 0, drums: null, string: 0 },
};

export class Score {
  constructor() {
    this.on = false;
    this.mood = MOODS.intro;
    this.moodName = "intro";
    this.step = 0;
    this.rise = 0;
    this.shepardPhase = 0;
  }

  init() {
    const ctx = (this.ctx = new AudioContext());

    // master chain: bus -> compressor (glue) -> volume -> limiter (never clips) -> speakers
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.12;
    this.bus = ctx.createGain();
    this.bus.connect(comp).connect(this.master).connect(limiter).connect(ctx.destination);

    // reverb send (generated impulse response: decaying stereo noise)
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse(ctx, 4.2, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(this.bus);
    this.send = (node, amount) => {
      const g = ctx.createGain();
      g.gain.value = amount;
      node.connect(g).connect(this.reverb);
    };

    this.noise = noiseBuffer(ctx);
    this.buildDrone();
    this.buildString();
    this.buildShepard();
    this.buildWind();

    this.applyMood(0.01);
    this.nextStep = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  /* ---------- continuous layers ---------- */

  buildDrone() {
    const ctx = this.ctx;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.Q.value = 4;
    const g = ctx.createGain();
    g.gain.value = 0.32;
    this.droneFilter.connect(g).connect(this.bus);
    this.send(g, 0.4);

    const voice = (type, gain, detune) => {
      const o = ctx.createOscillator();
      const v = ctx.createGain();
      o.type = type;
      o.detune.value = detune;
      v.gain.value = gain;
      o.connect(v).connect(this.droneFilter);
      o.start();
      return o;
    };
    // [oscillator, which ratio it follows]
    this.drone = [
      [voice("sine", 0.9, 0), "sub"],
      [voice("sawtooth", 0.28, -7), "root"],
      [voice("sawtooth", 0.28, 7), "root"],
      [voice("sawtooth", 0.18, 3), "fifth"],
      [voice("triangle", 0.16, -4), "third"],
      [voice("sawtooth", 0.08, 5), "octave"],
    ];

    // slow breathing on the filter
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.08;
    depth.gain.value = 120;
    lfo.connect(depth).connect(this.droneFilter.frequency);
    lfo.start();
  }

  // high, wavering string with a slow unsettling pitch drift (Chaos, Vengeance)
  buildString() {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    const vib = ctx.createOscillator();
    const vibDepth = ctx.createGain();
    vib.frequency.value = 6.2;
    vibDepth.gain.value = 9;
    vib.connect(vibDepth).connect(o.detune);
    const drift = ctx.createOscillator();
    const driftDepth = ctx.createGain();
    drift.frequency.value = 0.045;
    driftDepth.gain.value = 120;
    drift.connect(driftDepth).connect(o.detune);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 2;
    this.stringGain = ctx.createGain();
    this.stringGain.gain.value = 0;
    o.connect(bp).connect(this.stringGain).connect(this.bus);
    this.send(this.stringGain, 0.8);
    [o, vib, drift].forEach((n) => n.start());
    this.stringOsc = o;
  }

  // Shepard tone: octave-spaced sines that glide up forever (the Rise climb)
  buildShepard() {
    const ctx = this.ctx;
    this.shepardGain = ctx.createGain();
    this.shepardGain.gain.value = 0;
    this.shepardGain.connect(this.bus);
    this.send(this.shepardGain, 0.6);
    this.shepard = Array.from({ length: 6 }, () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      g.gain.value = 0;
      o.connect(g).connect(this.shepardGain);
      o.start();
      return { o, g };
    });
  }

  // wind rush for the fall into the well
  buildWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.Q.value = 1.2;
    this.windFilter.frequency.value = 2000;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(this.windFilter).connect(this.windGain).connect(this.bus);
    this.send(this.windGain, 0.3);
    src.start();
  }

  /* ---------- public controls ---------- */

  toggle(force) {
    if (!this.ctx) this.init();
    this.on = force ?? !this.on;
    const now = this.ctx.currentTime;
    if (this.on) {
      this.ctx.resume();
      this.master.gain.setTargetAtTime(0.7, now, 0.6);
    } else {
      this.master.gain.setTargetAtTime(0, now, 0.25);
    }
    return this.on;
  }

  setMood(name) {
    if (!MOODS[name] || name === this.moodName) return;
    this.moodName = name;
    this.mood = MOODS[name];
    if (this.ctx) this.applyMood(1.2);
  }

  applyMood(glide) {
    const { root, third, cutoff, string } = this.mood;
    const now = this.ctx.currentTime;
    const ratio = { sub: 0.5, root: 1, fifth: 1.5, third: third * 2, octave: 2 };
    for (const [osc, role] of this.drone) osc.frequency.setTargetAtTime(root * ratio[role], now, glide);
    this.droneFilter.frequency.setTargetAtTime(cutoff, now, glide);
    this.stringOsc.frequency.setTargetAtTime(root * 8, now, glide);
    this.stringGain.gain.setTargetAtTime(string, now, glide);
  }

  // 0..1 while falling down the well
  setFall(p) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const active = p > 0.01 && p < 0.995;
    this.windGain.gain.setTargetAtTime(active ? 0.08 + p * 0.35 : 0, now, 0.15);
    this.windFilter.frequency.setTargetAtTime(2600 - p * 2300, now, 0.15);
  }

  // 0..1 while climbing out of the pit
  setRise(p) {
    this.rise = p;
    if (!this.ctx) return;
    const active = p > 0.01 && p < 0.99;
    this.shepardGain.gain.setTargetAtTime(active ? 0.05 + p * 0.16 : 0, this.ctx.currentTime, 0.3);
  }

  // Cinematic brass hit. size 0..1.5
  braam(size = 1) {
    if (!this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const { root, third } = this.mood;
    const dur = 2.6 + size * 1.4;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.exponentialRampToValueAtTime(900 + size * 1400, t + 0.25);
    filter.frequency.exponentialRampToValueAtTime(220, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32 * size + 0.1, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    filter.connect(g).connect(this.bus);
    this.send(g, 0.9);

    const freqs = [root / 2, root, root, root * 1.5, root * 2, root * third * 2];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = (i % 2 ? 1 : -1) * (6 + i * 3);
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
    this.impact(0.8 * size, t);
  }

  // Deep drum boom (taiko-ish): pitch-dropping sine plus a noise transient.
  impact(strength = 1, at) {
    if (!this.on) return;
    const ctx = this.ctx;
    const t = at ?? ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6 * strength, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g).connect(this.bus);
    this.send(g, 0.35);
    o.start(t);
    o.stop(t + 1.2);

    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const nf = ctx.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.4 * strength, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(nf).connect(ng).connect(this.bus);
    n.start(t);
    n.stop(t + 0.2);
  }

  // Leathery wing flutter for scattered bats
  flutter() {
    if (!this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1300;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 9; i++) {
      const at = t + i * 0.028;
      const level = 0.16 * (1 - i / 10);
      g.gain.setValueAtTime(level, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.022);
    }
    n.connect(f).connect(g).connect(this.bus);
    this.send(g, 0.25);
    n.start(t);
    n.stop(t + 0.3);
  }

  /* ---------- sequencer: looks 120ms ahead so timing stays tight ---------- */

  schedule() {
    const ctx = this.ctx;
    this.updateShepard();
    if (!this.on) {
      this.nextStep = ctx.currentTime + 0.05;
      return;
    }
    while (this.nextStep < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextStep);
      this.nextStep += 60 / this.mood.bpm / this.mood.steps;
      this.step++;
    }
  }

  playStep(step, t) {
    const m = this.mood;
    if (m.drums) {
      const hit = m.drums[step % m.drums.length];
      if (hit) {
        this.impact(hit * 0.55, t);
        if (m.heart) this.impact(hit * 0.35, t + 0.21);
      }
    }
    if (m.pulse) {
      const ratio = PULSE[step % PULSE.length] === 1.189 ? m.third : PULSE[step % PULSE.length];
      // Rise: the pulse brightens as he climbs
      const bright = this.moodName === "rise" ? this.rise : 0;
      this.pluck(m.root * 2 * ratio, t, m.pulse, 1400 + bright * 2400);
    }
  }

  pluck(freq, t, level, cutoff) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 6;
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * level, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(f).connect(g).connect(this.bus);
    this.send(g, 0.3);
    o.start(t);
    o.stop(t + 0.22);
  }

  updateShepard() {
    if (this.rise <= 0.01) return;
    const now = this.ctx.currentTime;
    // climbs faster as Bruce gets closer to the light
    this.shepardPhase = (this.shepardPhase + 0.0016 + this.rise * 0.004) % 1;
    const base = 55;
    this.shepard.forEach(({ o, g }, i) => {
      const pos = (i + this.shepardPhase) / this.shepard.length; // 0..1 across 6 octaves
      o.frequency.setTargetAtTime(base * 2 ** (pos * 6), now, 0.03);
      g.gain.setTargetAtTime(Math.sin(pos * Math.PI) ** 2 * 0.25, now, 0.03); // loudest in the middle
    });
  }
}

function noiseBuffer(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function impulse(ctx, seconds, decay) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}
