"use strict";

// The big moments around the Storm and the win: stepping into the Storm, the hug with the Llama, the Victory Royale
// film and its card, drinking the Chug Jug and the sound cues of every film. Same cinematic standard as the death films
// (layered scenery, camera, shake, bars, fades, particles) and no spoken words.
// Nothing in here decides game rules: it only draws what the page tells it to.

const FIN = {};

FIN.heart = (c, x, y, s, col) => {                       // a pixel heart (7 x 6 cells of size s)
  const rows = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
  rows.forEach((r, ry) => { for (let rx = 0; rx < 7; rx++) if (r[rx] === "1") px(c, Math.round(x + rx * s), Math.round(y + ry * s), s, s, col); });
  px(c, Math.round(x + s), Math.round(y + s), s, s, "rgba(255,255,255,0.55)");
};

FIN.bolt = (c, x, y0, y1, seed, col) => {                // a jagged lightning bolt
  let bx = x;
  for (let y = y0; y < y1; y += 8) { const nx = x + Math.round(Math.sin(y * 0.2 + seed) * 10); px(c, Math.min(bx, nx), y, Math.abs(nx - bx) + 2, 9, col); bx = nx; }
};

FIN.firework = (c, x, y, p, rgb) => {                    // p 0 -> 1: the rocket climbs, bursts and the sparks fall
  if (p < 0.25) { const k = p / 0.25; px(c, Math.round(x), Math.round(lerp(y + 60, y, k)), 2, 5, "#ffe9a8"); for (let i = 0; i < 5; i++) px(c, Math.round(x), Math.round(lerp(y + 60, y, k) + 6 + i * 3), 1, 2, "rgba(255,200,120," + (0.6 - i * 0.1).toFixed(2) + ")"); return; }
  const k = (p - 0.25) / 0.75, n = 22;
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283, d = 6 + 34 * Math.sqrt(k), dy = 16 * k * k;
    px(c, Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d + dy), 2, 2, "rgba(" + rgb + "," + (1 - k).toFixed(2) + ")");
    px(c, Math.round(x + Math.cos(a) * d * 0.7), Math.round(y + Math.sin(a) * d * 0.7 + dy), 1, 1, "rgba(255,255,255," + (0.9 - k).toFixed(2) + ")");
  }
  FX.glow(c, x, y, 26 * (1 - k * 0.5), rgb, 0.3 * (1 - k));
};

FIN.confetti = (c, t, x, y, dir, t0) => {                // a cannon shoots confetti that flutters down
  const k = t - t0;
  if (k < 0) return;
  const cols = ["#ff4f5e", "#ffd23f", "#3ad6c0", "#b673ff", "#3a90e8", "#ff8fc8", "#ffffff"];
  for (let i = 0; i < 34; i++) {
    const vx = dir * (30 + hash(i, 1, 160) % 70), vy = -(80 + hash(i, 2, 160) % 80);
    const px_ = x + vx * k * 0.7 + Math.sin(k * 6 + i) * 4, py_ = y + vy * k + 90 * k * k;
    if (py_ < SH + 6 && k < 3.2) px(c, Math.round(px_), Math.round(py_), 2, 3, cols[i % cols.length]);
  }
};

FIN.banner = (c, p, t) => {                              // the gold VICTORY ROYALE banner
  const e = smooth(clamp01(p)), y = Math.round(lerp(-40, 26, e));
  if (e <= 0) return;
  c.save();
  c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(54, y + 4, 212, 40);
  const g = c.createLinearGradient(0, y, 0, y + 36); g.addColorStop(0, "#fff3a0"); g.addColorStop(0.5, "#f4c542"); g.addColorStop(1, "#b8861a");
  c.fillStyle = g; c.beginPath(); c.moveTo(60, y); c.lineTo(266, y); c.lineTo(256, y + 38); c.lineTo(50, y + 38); c.closePath(); c.fill();
  c.fillStyle = "#14101c"; c.fillRect(56, y + 33, 204, 3);
  c.restore();
  outlined(c, "VICTORY ROYALE", 160, y + 27, "#fffbe0", 20);
  const sweep = ((t * 0.5) % 1.6) * 260 - 40;                                           // a shine sweeping across
  c.save(); c.beginPath(); c.rect(56, y, 200, 36); c.clip(); c.fillStyle = "rgba(255,255,255,0.4)"; c.fillRect(sweep, y, 10, 38); c.restore();
  px(c, 36, y + 8, 22, 22, "#14101c"); px(c, 38, y + 10, 18, 18, "#f4c542"); px(c, 38, y + 10, 18, 3, "#fff3a0");              // the "#1" badge with a crown
  outlined(c, "#1", 47, y + 26, "#14101c", 11);
  px(c, 41, y + 2, 12, 4, "#f4c542"); px(c, 41, y - 1, 2, 4, "#f4c542"); px(c, 47, y - 2, 2, 5, "#f4c542"); px(c, 51, y - 1, 2, 4, "#f4c542");
};

// ---------- stepping into the Storm: the wall of purple closes in on Polar Peak ----------

const STORM_ENTER_FILM = cinematic({
  dur: 3.8,
  cam: { from: [1.0, 160, 112], to: [1.5, 160, 96], shake: [[2.3, 5, 0.9]] },
  cues: [[0.1, "gust", 0.8], [0.9, "thunder", 0.7], [2.2, "thunder", 1], [3.0, "rise", 0.45]],
  draw(c, t) {
    const k = clamp01(t / 3.0);
    FX.daySnow(c, t);
    c.fillStyle = "rgba(40,10,90," + (0.12 + 0.5 * k).toFixed(2) + ")"; c.fillRect(0, 0, SW, 150);               // the sky darkens as the storm rolls in
    for (let i = 0; i < 24; i++) {                                                                                 // the wall: swirling purple clouds
      const x = ((i * 15 + Math.sin(t * 0.9 + i) * 7) % 345) - 12, y = 30 + (i % 6) * 15 + Math.cos(t * 0.7 + i) * 4 + (1 - k) * 22;
      ellipse(c, Math.round(x), Math.round(y), 26 + (i % 3) * 9, 12 + (i % 2) * 4, i % 2 ? "#3a1470" : "#5a2a9a");
      ellipse(c, Math.round(x + 5), Math.round(y - 3), 15, 6, i % 3 ? "#7a45c8" : "#9a65e0");
    }
    px(c, 0, 128, SW, 22, "rgba(110,60,190," + (0.35 + 0.3 * k).toFixed(2) + ")");
    FX.glow(c, 160, 138, 150, "170,100,255", 0.25 + 0.2 * k);
    if (Math.floor(t * 3.1) % 3 === 0 && (t * 3.1) % 1 < 0.22) { FIN.bolt(c, 110 + Math.floor(t * 3) % 3 * 40, 0, 130, t, "#fff7b0"); FIN.bolt(c, 230, 10, 120, t + 2, "#e8d0ff"); c.fillStyle = "rgba(220,190,255,0.16)"; c.fillRect(0, 0, SW, SH); }
    c.fillStyle = "#d9c9a0";                                                                                      // the stone path leading up to the gate
    c.beginPath(); c.moveTo(86, 192); c.lineTo(234, 192); c.lineTo(178, 132); c.lineTo(142, 132); c.closePath(); c.fill();
    c.fillStyle = "#b8a880"; c.beginPath(); c.moveTo(86, 192); c.lineTo(110, 192); c.lineTo(150, 132); c.lineTo(142, 132); c.closePath(); c.fill();
    for (let q = 0; q < 6; q++) px(c, 120 + q * 4 - q, 140 + q * 9, 30 + q * 8, 1, "rgba(0,0,0,0.15)");
    [[130, 128, 8], [188, 128, 8]].forEach(([x, y, h]) => { px(c, x, y - h, 3, h + 4, "#8a8f9c"); px(c, x - 2, y - h - 2, 7, 3, "#c4c8d4"); });             // the gate posts
    for (let i = 0; i < 34; i++) {                                                                                 // snow gets sucked into the storm
      const sx = ((hash(i, 1, 170) % 340) + 340 - t * (60 + i % 5 * 20) * (hash(i, 3, 170) % 2 ? 1 : -1)) % 340, sy = 30 + hash(i, 2, 170) % 130;
      px(c, Math.round(sx), sy, 3 + i % 4 * 2, 1, "rgba(255,255,255,0.8)");
    }
    npcBig(c, 62, 158, "referee", "idle", t, { scale: 1.6 });                                                       // the referee watches him go
    px(c, 52, 118, 3, 16, "#c9743a"); px(c, 50, 114 + Math.floor(t * 4) % 2 * 2, 7, 4, "#f4f4f4");
    const hy = lerp(180, 138, smooth(k)), sc = lerp(2, 1.25, k);
    FX.hero(c, 160, hy, { dir: "up", step: Math.floor(t * 6) % 2, scale: sc, t, shadow: 16 });                      // the fish walks up to the gate
    if (t > 3.0) { c.fillStyle = "rgba(130,70,220," + clamp01((t - 3.0) / 0.7).toFixed(2) + ")"; c.fillRect(0, 0, SW, SH); }
  },
});

// ---------- the hug: he lands next to the Llama in the middle of the Storm ----------

const HUG_FILM = cinematic({
  dur: 3.8,
  cam: { from: [1.0, 150, 110], to: [1.25, 170, 120], shake: [[0.9, 4, 0.4]] },
  cues: [[0.2, "whoosh", 0.5], [0.95, "thud", 0.5], [1.05, "squeak", 1], [1.3, "chime", 0.8], [2.8, "click", 1], [2.85, "zap", 0.25]],
  draw(c, t) {
    band(c, 0, SH, ["#1d0f40", "#2a1458", "#3a1f78", "#5a2fa0", "#7a45c8", "#9a5de0"]);                              // the Storm all around
    for (let i = 0; i < 14; i++) ellipse(c, Math.round(((i * 53 + t * 8) % 360) - 20), 20 + (i * 23) % 120, 34 + i % 3 * 10, 9 + i % 2 * 3, i % 2 ? "rgba(90,47,160,0.8)" : "rgba(122,69,200,0.8)");
    if (Math.floor(t * 2.4) % 5 === 0 && (t * 2.4) % 1 < 0.18) { FIN.bolt(c, 240, 0, 110, t, "#fff7b0"); c.fillStyle = "rgba(210,180,255,0.12)"; c.fillRect(0, 0, SW, SH); }
    px(c, 0, 150, 130, SH - 150, "#4a3a6a"); px(c, 0, 150, 130, 4, "#7a6aa0"); px(c, 190, 150, 130, SH - 150, "#4a3a6a"); px(c, 190, 150, 130, 4, "#7a6aa0");   // the valley edge and the broken bridge behind
    [[126, 150, 5], [134, 150, 4], [184, 150, 6]].forEach(([x, y, h]) => px(c, x, y, 7, h * 2, "#6b4423"));
    ellipse(c, 160, 192, 90, 24, "rgba(122,69,200,0.5)");
    for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283 + t, d = 20 + (i % 4) * 14; px(c, Math.round(160 + Math.cos(a) * d * 1.6), Math.round(120 + Math.sin(a) * d * 0.8 - (t * 12 + i * 5) % 30), 1, 2, i % 2 ? "#ffd23f" : "#ffffff"); }   // sparkles of joy
    const hug = smooth(clamp01((t - 0.9) / 0.5));
    FX.glow(c, 170, 120, 70, "255,214,120", 0.25 + 0.3 * hug);                                                       // a warm light against the cold storm
    const llama = sprites && sprites.llama, bob = Math.round(Math.abs(Math.sin(t * 6)) * 5 * hug);
    if (llama && llama.complete && llama.naturalWidth) { c.save(); c.imageSmoothingEnabled = false; ellipse(c, 196, 168, 36, 7, "rgba(0,0,0,0.3)"); c.translate(196, 168 - bob); c.rotate(Math.sin(t * 7) * 0.06 * hug); c.drawImage(llama, -34, -122, 68, 120); c.restore(); }
    const fx = t < 0.9 ? lerp(40, 146, smooth(clamp01(t / 0.9))) : 146 + Math.sin(t * 6) * 1;
    FX.hero(c, fx, 172 - (t < 0.9 ? Math.abs(Math.sin(t * 12)) * 6 : 0), { dir: "right", pose: t < 0.9 ? "walk" : "wave", step: Math.floor(t * 10) % 2, scale: 3, t, shadow: 26 });
    if (hug > 0.3) {                                                                                                 // his arms around the llama's neck
      px(c, 178, 100 - bob, 26, 8, "#f2692d"); px(c, 178, 100 - bob, 26, 2, "#ff9a5a"); px(c, 200, 96 - bob, 8, 12, "#c9743a");
    }
    for (let i = 0; i < 7; i++) {                                                                                    // hearts float up
      const age = (t - 1.2 - i * 0.28) % 1.6;
      if (t > 1.2 && age > 0) FIN.heart(c, 150 + (i * 23) % 70 + Math.sin(age * 5 + i) * 6, 100 - age * 60, 2 + i % 2, i % 2 ? "#ff4f7e" : "#ff9ab8");
    }
    if (t > 2.6) {                                                                                                   // then he pulls out another Impulse Grenade
      const g = sprites && sprites.item_impulse_grenades, p = smooth(clamp01((t - 2.6) / 0.4));
      FX.glow(c, 120, 100, 30 * p, "190,140,255", 0.5);
      if (g && g.complete && g.naturalWidth) { c.imageSmoothingEnabled = false; c.drawImage(g, 106, Math.round(lerp(150, 84, p)), 36, 33); }
      if (Math.floor(t * 10) % 2 === 0) { px(c, 126, 80, 8, 1, "#fff"); px(c, 130, 76, 1, 8, "#fff"); }
    }
  },
});

// ---------- Victory Royale: down onto the meadow, the umbrella goes in the ground, fireworks and confetti ----------

const WIN_FILM = cinematic({
  dur: 7.6,
  cam: { from: [1.2, 160, 100], to: [1.0, 160, 96], shake: [[3.05, 5, 0.5]] },
  cues: [[0.2, "whoosh", 0.5], [2.9, "glider", 0.7], [3.15, "thud", 0.5], [3.4, "squeak", 0.9], [3.7, "pop"], [3.9, "pop"], [4.0, "fanfare", 0.9], [4.1, "chime"], [4.5, "firework", 0.8], [5.3, "firework", 0.8], [6.0, "firework", 0.8]],
  draw(c, t) {
    const llama = sprites && sprites.llama;
    if (t < 3.0) {                                                                                                  // gliding home at sunrise
      const k = t / 3.0;
      SKY.skyBands(c, 0.45 * (1 - k));
      FX.glow(c, 80, 130 - k * 20, 90, "255,200,120", 0.5); ellipse(c, 80, 130 - k * 20, 14, 14, "#ffe9a8");
      SKY.aerial(c, "pleasant_park", 0, 0, lerp(0.8, 3.4, smooth(k)), t);
      c.globalAlpha = 1 - k; SKY.cloudRows(c, t * 4, 60, 2, "255,235,220"); c.globalAlpha = 1;
      if (k < 0.7) SKY.bus(c, lerp(40, 300, k / 0.7), lerp(-10, -70, k / 0.7), 0.35, t, { noShadow: true });        // the Battle Bus drives past; the driver waves
      for (let i = 0; i < 3; i++) SKY.diver(c, 40 + i * 110 + Math.sin(t + i) * 8, 40 + i * 20 + k * 30, t, i + 2);
      const x = 160 + Math.sin(t * 1.4) * 8, y = lerp(70, 104, smooth(k));
      SKY.glider(c, x, y, 1, t, { tilt: Math.sin(t * 1.4) * 0.07, w: 40, h: 19, l: 26 });
      if (llama && llama.complete && llama.naturalWidth) { c.save(); c.imageSmoothingEnabled = false; c.translate(Math.round(x + 18), Math.round(y + 16)); c.rotate(Math.sin(t * 3) * 0.08); c.drawImage(llama, -10, -16, 20, 36); c.restore(); }
      FX.hero(c, x, y + 28, { pose: "dance", scale: 2, t, noShadow: true });
      for (let q = 0; q < 6; q++) FIN.heart(c, x + 20 + Math.sin(t * 2 + q) * 10, y - 6 - ((t * 20 + q * 11) % 40), 1, "#ff6a8e");
      return;
    }
    const k = t - 3.0;                                                                                              // the meadow
    FX.dayMeadow(c, t);
    band(c, 0, 90, ["#7ab4ee", "#9ac8f4", "#b8d8f8", "#d8e8fa", "#f4e8d8"]);
    FX.glow(c, 262, 70, 80, "255,210,140", 0.5); ellipse(c, 262, 70, 12, 12, "#fff3c8");
    FX.ridge(c, 112, 6, 1, "#9ab8d8", 0.03); FX.ridge(c, 124, 5, 3, "#78a89a", 0.05); FX.trees(c, t, 142, 2, ["#2f7a3c", "#46a04e"], 14);
    for (let q = 0; q < 3; q++) FIN.firework(c, [90, 160, 232][q], [70, 52, 74][q], clamp01((t - [4.5, 5.3, 6.0][q]) / 1.1), ["255,210,63", "255,79,142", "90,210,255"][q]);
    px(c, 0, 158, SW, 24, "#c8a36a"); px(c, 0, 158, SW, 2, "#dcb87c");
    const gx = 120;                                                                                                // the glider comes down and the fish lands with the llama
    const down = clamp01(k / 0.4);
    if (k < 0.55) SKY.glider(c, gx, lerp(90, 148, smooth(down)), 1 - clamp01((k - 0.25) / 0.3), t, { w: 34, h: 16, l: 24 });
    FX.dust(c, gx, 160, clamp01((k - 0.3) / 1.0), 8, "200,180,140", 40);
    const umbrella = clamp01((k - 0.9) / 0.3);                                                                     // he plants the umbrella (the glider) in the ground
    if (umbrella > 0) { px(c, 58, 120, 2, 40, "#8a92a6"); SKY.glider(c, 59, 138 + (1 - smooth(umbrella)) * 14, smooth(umbrella), t, { w: 22, h: 11, l: 16 }); }
    if (llama && llama.complete && llama.naturalWidth) { const bob = Math.round(Math.abs(Math.sin(t * 6)) * 6); c.save(); c.imageSmoothingEnabled = false; ellipse(c, 196, 162, 22, 5, "rgba(0,0,0,0.3)"); c.drawImage(llama, 196 - 22, 160 - 78 - bob + (k < 0.4 ? -(1 - down) * 60 : 0), 44, 78); c.restore(); }
    FX.hero(c, gx + (k > 0.5 ? Math.min(70, (k - 0.5) * 60) : 0), 160 - (k < 0.4 ? (1 - down) * 60 : 0), { pose: k < 0.6 ? "scared" : "dance", scale: 2, t });
    FIN.confetti(c, t, 14, 150, 1, 3.8); FIN.confetti(c, t, 306, 150, -1, 3.9); FIN.confetti(c, t, 14, 150, 1, 5.3); FIN.confetti(c, t, 306, 150, -1, 5.4);
    for (let q = 0; q < 6; q++) FIN.heart(c, 150 + q * 12 + Math.sin(t * 2 + q) * 6, 110 - ((t * 20 + q * 13) % 50), 2, q % 2 ? "#ff4f7e" : "#ff9ab8");
    FIN.banner(c, (t - 4.2) / 0.5, t);
  },
});

// ---------- the card for Ending A: the same scene, moving, with the banner and a line from the kill feed ----------

function drawVictoryCard(c, t) {
  FX.dayMeadow(c, t);
  band(c, 0, 90, ["#7ab4ee", "#9ac8f4", "#b8d8f8", "#d8e8fa", "#f4e8d8"]);
  FX.glow(c, 262, 70, 80, "255,210,140", 0.5); ellipse(c, 262, 70, 12, 12, "#fff3c8");
  FX.ridge(c, 112, 6, 1, "#9ab8d8", 0.03); FX.ridge(c, 124, 5, 3, "#78a89a", 0.05); FX.trees(c, t, 142, 2, ["#2f7a3c", "#46a04e"], 14);
  for (let q = 0; q < 3; q++) FIN.firework(c, [80, 160, 240][q], [78, 58, 80][q], ((t * 0.5 + q / 3) % 1), ["255,210,63", "255,79,142", "90,210,255"][q]);
  px(c, 0, 158, SW, 24, "#c8a36a"); px(c, 0, 158, SW, 2, "#dcb87c");
  px(c, 58, 120, 2, 40, "#8a92a6"); SKY.glider(c, 59, 138, 1, t, { w: 22, h: 11, l: 16 });
  const llama = sprites && sprites.llama;
  if (llama && llama.complete && llama.naturalWidth) { const bob = Math.round(Math.abs(Math.sin(t * 6)) * 6); c.save(); c.imageSmoothingEnabled = false; ellipse(c, 196, 162, 22, 5, "rgba(0,0,0,0.3)"); c.drawImage(llama, 196 - 22, 160 - 78 - bob, 44, 78); c.restore(); }
  FX.hero(c, 140, 160, { pose: "dance", scale: 2, t });
  for (let i = 0; i < 4; i++) FIN.confetti(c, t + 1, i % 2 ? 306 : 14, 150, i % 2 ? -1 : 1, 0);
  for (let q = 0; q < 6; q++) FIN.heart(c, 150 + q * 12 + Math.sin(t * 2 + q) * 6, 110 - ((t * 20 + q * 13) % 50), 2, q % 2 ? "#ff4f7e" : "#ff9ab8");
  const vg = c.createRadialGradient(SW / 2, SH / 2, 90, SW / 2, SH / 2, 220); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(60,30,0,0.35)"); c.fillStyle = vg; c.fillRect(0, 0, SW, SH);
  FIN.banner(c, t / 0.5, t);
  const fy = SH - 22;                                                                                               // the kill feed: nobody got them
  px(c, 0, fy, SW, 16, "rgba(10,5,20,0.86)"); px(c, 0, fy, 3, 16, "#f4c542"); px(c, 0, fy, SW, 1, "rgba(255,255,255,0.18)");
  px(c, 10, fy + 4, 9, 4, "#f4c542"); px(c, 10, fy + 8, 9, 4, "#fff3a0"); px(c, 12, fy + 2, 1, 3, "#f4c542"); px(c, 16, fy + 2, 1, 3, "#f4c542");
  c.font = 'bold 9px "Courier New", Courier, monospace'; c.textAlign = "left";
  c.fillStyle = "#aab0cc"; c.fillText("Eliminated by: ", 24, fy + 11);
  const w = Math.round(c.measureText("Eliminated by: ").width);
  c.fillStyle = "#ffd23f"; c.fillText("nobody. You both escaped the Storm.", 24 + w, fy + 11);
}

function victoryCard() {
  const card = el("canvas", "pixel");
  card.width = SW; card.height = SH;
  card.setAttribute("aria-label", "Victory Royale: you and your Llama escaped the Storm");
  const cx = card.getContext("2d");
  const t0 = performance.now();
  const tick = (now) => {
    if (!card.isConnected) return;
    cx.imageSmoothingEnabled = false;
    drawVictoryCard(cx, (now - t0) / 1000);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return card;
}

// ---------- drinking the Chug Jug in the Storm: the jug goes up, he gulps, and a green glow heals him ----------

function drawDrinkFx(c, x, y, p, t) {                  // (x, y) = top left of the player's tile; p goes 0 -> 1
  const img = sprites && sprites.item_chug_jug;
  const up = smooth(clamp01(p / 0.3)), tilt = lerp(0, -1.0, smooth(clamp01((p - 0.15) / 0.3))), gulp = p > 0.4 && p < 0.85;
  if (p > 0.35) {
    for (let k = 0; k < 4; k++) { const ph = (t * 3 + k / 4) % 1; ellipse(c, Math.round(x + 9 + Math.sin(t * 8 + k) * 3), Math.round(y - 6 - ph * 14), 1 + (k % 2), 1 + (k % 2), "rgba(150,230,255," + (0.8 * (1 - ph)).toFixed(2) + ")"); }   // bubbles in the jug
  }
  c.save(); c.translate(Math.round(x + 12), Math.round(y - 2 - 8 * up)); c.rotate(tilt);
  if (img && img.complete && img.naturalWidth) { c.imageSmoothingEnabled = false; c.drawImage(img, -8, -8, 16, 16); }
  c.restore();
  if (p > 0.55) {                                                                                                     // the heal: rings and rising green sparks
    const hp = (p - 0.55) / 0.45;
    for (let k = 0; k < 2; k++) { const rp = clamp01(hp - k * 0.2); ellipse(c, Math.round(x + 8), Math.round(y + 14), Math.round(6 + 16 * rp), Math.round(3 + 7 * rp), "rgba(90,255,170," + (0.5 * (1 - rp)).toFixed(2) + ")"); }
    for (let k = 0; k < 10; k++) px(c, Math.round(x + 2 + (k * 7) % 14), Math.round(y + 12 - hp * 26 - (k % 3) * 5), 2, 2, k % 2 ? "#9affc8" : "#ffffff");
    FX.glow(c, x + 8, y + 8, 18, "120,255,190", 0.35 * (1 - hp));
  }
  if (gulp && Math.floor(t * 8) % 2 === 0) px(c, Math.round(x + 6), Math.round(y + 7), 4, 1, "rgba(120,200,255,0.8)");
}

// ---------- the sound cues of the films ----------
// Each cue is [seconds, sound, loudness]. The page plays it when the film reaches that time.

const FILM_CUES = {
  H1: [[1.85, "clank", 1], [1.95, "pop", 0.6], [2.6, "thud", 0.4]],
  H5: [[0.55, "pop", 0.5], [0.9, "pop", 0.5], [1.25, "pop", 0.5], [1.6, "rattle", 0.8], [2.2, "rattle", 0.7], [2.85, "thud", 0.6]],
  H2: [[2.1, "rattle", 1], [2.5, "rattle", 0.8], [3.0, "thud", 0.6]],
  H4: [[1.75, "click", 0.8], [2.9, "click", 1], [3.0, "snipe", 1], [3.5, "thud", 0.5]],
  H7: [[2.2, "whoosh", 0.7], [2.9, "gust", 1], [3.4, "gust", 0.8], [4.9, "thud", 0.5]],
  H8: [[2.3, "boom", 0.8], [2.4, "rattle", 0.4], [2.9, "thud", 0.6]],
  H3: [[0.45, "pop", 0.5], [0.95, "whoosh", 0.9], [2.7, "boom", 1]],
  H6: [[1.45, "zap", 1], [1.75, "rise", 0.8], [3.5, "gust", 0.8], [4.88, "splat", 1], [5.1, "zap", 0.2]],
  H9: [[1.2, "ice", 0.8], [2.0, "ice", 1], [2.7, "ice", 1], [2.75, "splash", 1]],
  H10: [[0.9, "rumble", 0.8], [1.9, "rumble", 1], [2.5, "whoosh", 0.8], [3.0, "thud", 0.6]],
  H11: [[1.3, "pop", 0.7], [2.0, "rattle", 1], [2.4, "clank", 0.8], [2.9, "clank", 0.8]],
  H12: [[2.3, "whoosh", 1], [3.5, "boom", 1]],
};
Object.keys(FILM_CUES).forEach((id) => { if (DEATHS[id]) DEATHS[id].cues = FILM_CUES[id]; });
BUS_FILM.cues = [[0.15, "gust", 0.6], [1.3, "whoosh", 0.9], [1.5, "gust", 0.9], [3.5, "click", 0.7], [4.3, "glider", 1]];
STORM_ESCAPE_FILM.cues = [[0.15, "zap", 1], [0.5, "rise", 0.9], [3.0, "glider", 0.9], [3.4, "chime", 0.8]];
