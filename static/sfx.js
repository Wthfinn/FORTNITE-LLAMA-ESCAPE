"use strict";

// Sound effects made with the browser's own audio (no sound files): booms, whooshes, thunder, zaps, glider pops,
// splats, ice cracks, glugs, chimes, fanfares... The cutscenes ask for them at certain moments ("cues").
// They follow the sound switch (M) like all other sounds. The old sound files are not touched.

const SFX = { ctx: null, noise: null, master: null };

SFX.audio = () => {
  if (!SFX.ctx) {
    try {
      SFX.ctx = new (window.AudioContext || window.webkitAudioContext)();
      SFX.master = SFX.ctx.createGain();
      SFX.master.gain.value = 0.55;
      SFX.master.connect(SFX.ctx.destination);
      const len = SFX.ctx.sampleRate * 2;
      SFX.noise = SFX.ctx.createBuffer(1, len, SFX.ctx.sampleRate);
      const d = SFX.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      SFX.ctx = null;
    }
  }
  if (SFX.ctx && SFX.ctx.state === "suspended") SFX.ctx.resume();
  return SFX.ctx;
};

// a burst of filtered noise: type/frequency (and an end frequency for a sweep), length, loudness and when it starts
SFX.hiss = (ctx, when, type, f0, f1, q, len, peak, attack) => {
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = SFX.noise;
  filter.type = type; filter.Q.value = q || 0.7;
  filter.frequency.setValueAtTime(f0, when);
  if (f1) filter.frequency.exponentialRampToValueAtTime(f1, when + len);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + (attack || 0.01));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + len);
  src.connect(filter); filter.connect(gain); gain.connect(SFX.master);
  src.start(when, Math.random() * 0.8, len + 0.05);
};

// a tone: wave shape, start and end frequency, length, loudness
SFX.tone = (ctx, when, shape, f0, f1, len, peak, attack) => {
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = shape;
  osc.frequency.setValueAtTime(f0, when);
  if (f1) osc.frequency.exponentialRampToValueAtTime(f1, when + len);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + (attack || 0.01));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + len);
  osc.connect(gain); gain.connect(SFX.master);
  osc.start(when); osc.stop(when + len + 0.05);
};

SFX.sounds = {
  boom(ctx, t, v) {                                   // a big explosion: a low thump, a roar and crackling debris
    SFX.tone(ctx, t, "sine", 90, 28, 0.9, 0.9 * v, 0.005);
    SFX.hiss(ctx, t, "lowpass", 900, 90, 0.7, 1.1, 0.9 * v, 0.004);
    SFX.hiss(ctx, t + 0.08, "highpass", 3000, 1200, 0.7, 0.8, 0.25 * v, 0.02);
    for (let k = 0; k < 6; k++) SFX.hiss(ctx, t + 0.25 + k * 0.1, "bandpass", 2500 + k * 300, 0, 2, 0.05, 0.12 * v, 0.004);
  },
  pop(ctx, t, v) {                                    // a small pop (smoke grenade, confetti cannon)
    SFX.tone(ctx, t, "triangle", 320, 90, 0.16, 0.7 * v, 0.003);
    SFX.hiss(ctx, t, "bandpass", 1800, 600, 1.2, 0.14, 0.5 * v, 0.003);
  },
  whoosh(ctx, t, v) {                                 // something fast flying past
    SFX.hiss(ctx, t, "bandpass", 300, 2600, 1.4, 0.55, 0.55 * v, 0.2);
    SFX.hiss(ctx, t + 0.4, "bandpass", 2600, 300, 1.4, 0.5, 0.4 * v, 0.02);
  },
  rise(ctx, t, v) {                                   // a long whoosh upwards (blasting off)
    SFX.hiss(ctx, t, "bandpass", 200, 3500, 1.2, 1.2, 0.6 * v, 0.3);
    SFX.tone(ctx, t, "sawtooth", 120, 900, 1.0, 0.18 * v, 0.2);
  },
  zap(ctx, t, v) {                                    // the Launch Pad and the Impulse Grenade: an electric charge and a punch
    SFX.tone(ctx, t, "sawtooth", 200, 1900, 0.35, 0.35 * v, 0.02);
    SFX.tone(ctx, t, "square", 90, 1400, 0.35, 0.18 * v, 0.02);
    SFX.hiss(ctx, t + 0.28, "highpass", 2000, 6000, 0.8, 0.25, 0.5 * v, 0.005);
    SFX.tone(ctx, t + 0.3, "sine", 160, 50, 0.4, 0.8 * v, 0.004);
  },
  thunder(ctx, t, v) {                                // a rolling rumble with a crack in front
    SFX.hiss(ctx, t, "highpass", 4000, 1500, 0.8, 0.25, 0.6 * v, 0.003);
    SFX.hiss(ctx, t + 0.1, "lowpass", 380, 60, 0.9, 2.4, 0.95 * v, 0.25);
    SFX.tone(ctx, t + 0.15, "sine", 60, 30, 1.8, 0.5 * v, 0.2);
  },
  gust(ctx, t, v) {                                   // wind blowing for a good while
    SFX.hiss(ctx, t, "bandpass", 500, 1100, 0.6, 1.6, 0.35 * v, 0.5);
    SFX.hiss(ctx, t + 0.3, "bandpass", 900, 400, 0.6, 1.6, 0.25 * v, 0.5);
  },
  glider(ctx, t, v) {                                 // the glider snapping open
    SFX.hiss(ctx, t, "highpass", 1500, 4500, 0.7, 0.12, 0.7 * v, 0.004);
    SFX.tone(ctx, t + 0.02, "sine", 200, 80, 0.25, 0.6 * v, 0.004);
    SFX.hiss(ctx, t + 0.1, "bandpass", 700, 300, 0.8, 0.5, 0.3 * v, 0.05);
  },
  thud(ctx, t, v) {                                   // a heavy body landing
    SFX.tone(ctx, t, "sine", 130, 38, 0.35, 0.95 * v, 0.003);
    SFX.hiss(ctx, t, "lowpass", 600, 100, 0.8, 0.3, 0.6 * v, 0.003);
  },
  splat(ctx, t, v) {                                  // a wet crunch
    SFX.sounds.thud(ctx, t, v);
    SFX.hiss(ctx, t + 0.02, "bandpass", 500, 180, 2.5, 0.3, 0.5 * v, 0.004);
    SFX.tone(ctx, t + 0.05, "triangle", 300, 70, 0.2, 0.35 * v, 0.004);
  },
  clank(ctx, t, v) {                                  // metal on metal (a trap springing)
    SFX.tone(ctx, t, "square", 920, 700, 0.25, 0.3 * v, 0.002);
    SFX.tone(ctx, t, "triangle", 1480, 1200, 0.35, 0.25 * v, 0.002);
    SFX.hiss(ctx, t, "bandpass", 3800, 0, 3, 0.08, 0.4 * v, 0.002);
  },
  rattle(ctx, t, v) {                                 // a burst of gunfire
    for (let k = 0; k < 7; k++) { SFX.hiss(ctx, t + k * 0.075, "lowpass", 2200, 400, 0.8, 0.09, 0.55 * v, 0.002); SFX.tone(ctx, t + k * 0.075, "sine", 110, 50, 0.08, 0.35 * v, 0.002); }
  },
  snipe(ctx, t, v) {                                  // one loud shot with an echo
    SFX.hiss(ctx, t, "highpass", 1200, 300, 0.7, 0.35, 0.9 * v, 0.002);
    SFX.tone(ctx, t, "sine", 140, 40, 0.4, 0.9 * v, 0.002);
    SFX.hiss(ctx, t + 0.35, "lowpass", 1400, 200, 0.7, 0.8, 0.25 * v, 0.1);
  },
  ice(ctx, t, v) {                                    // ice cracking
    for (let k = 0; k < 9; k++) SFX.hiss(ctx, t + k * 0.07 + (k % 3) * 0.02, "bandpass", 3000 + (k * 430) % 2600, 0, 4, 0.05, 0.4 * v, 0.002);
    SFX.tone(ctx, t, "sine", 90, 60, 0.6, 0.25 * v, 0.1);
  },
  splash(ctx, t, v) {                                 // falling into water
    SFX.hiss(ctx, t, "lowpass", 1600, 300, 0.6, 0.9, 0.8 * v, 0.01);
    SFX.hiss(ctx, t + 0.05, "bandpass", 900, 400, 1.2, 0.6, 0.4 * v, 0.02);
    SFX.tone(ctx, t, "sine", 180, 60, 0.4, 0.5 * v, 0.004);
  },
  rumble(ctx, t, v) {                                 // the mountain groaning (avalanche)
    SFX.hiss(ctx, t, "lowpass", 220, 90, 0.8, 1.8, 0.9 * v, 0.4);
    SFX.tone(ctx, t, "sine", 48, 34, 1.8, 0.5 * v, 0.4);
  },
  chime(ctx, t, v) {                                  // a happy sparkle
    [880, 1319, 1760, 2349].forEach((f, k) => SFX.tone(ctx, t + k * 0.07, "triangle", f, 0, 0.5, 0.28 * v, 0.004));
  },
  glug(ctx, t, v) {                                   // drinking: bubbly gulps
    [0, 0.17, 0.36, 0.52].forEach((d, k) => { SFX.tone(ctx, t + d, "sine", 260 + k * 30, 520 - k * 40, 0.13, 0.5 * v, 0.004); SFX.hiss(ctx, t + d, "bandpass", 700, 1100, 2, 0.1, 0.2 * v, 0.004); });
  },
  squeak(ctx, t, v) {                                 // a happy llama
    SFX.tone(ctx, t, "triangle", 700, 1500, 0.22, 0.5 * v, 0.01);
    SFX.tone(ctx, t + 0.25, "triangle", 1300, 850, 0.2, 0.4 * v, 0.01);
  },
  fanfare(ctx, t, v) {                                // Victory Royale: bright brass
    [[392, 0], [523, 0.16], [659, 0.32], [784, 0.5]].forEach(([f, d]) => { SFX.tone(ctx, t + d, "sawtooth", f, 0, 0.5, 0.2 * v, 0.02); SFX.tone(ctx, t + d, "square", f * 2, 0, 0.45, 0.07 * v, 0.02); });
    [523, 659, 784, 1047].forEach((f) => SFX.tone(ctx, t + 0.75, "sawtooth", f, 0, 1.4, 0.16 * v, 0.03));
  },
  firework(ctx, t, v) {                               // a rocket up, a bang and a crackle
    SFX.hiss(ctx, t, "bandpass", 600, 3000, 1.5, 0.45, 0.3 * v, 0.05);
    SFX.sounds.pop(ctx, t + 0.5, v * 1.2);
    for (let k = 0; k < 9; k++) SFX.hiss(ctx, t + 0.55 + k * 0.06, "highpass", 4000, 0, 0.8, 0.04, 0.2 * v, 0.002);
  },
  click(ctx, t, v) {                                  // a button or a scope
    SFX.tone(ctx, t, "square", 1200, 600, 0.04, 0.25 * v, 0.001);
  },
};

SFX.play = (name, vol, delay) => {
  if (typeof muted !== "undefined" && muted) return;
  const ctx = SFX.audio();
  if (!ctx || !SFX.sounds[name]) return;
  SFX.sounds[name](ctx, ctx.currentTime + (delay || 0) + 0.01, vol === undefined ? 1 : vol);
};
