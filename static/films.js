"use strict";

// The 12 elimination films: what happens to the fish when a danger on the path gets him.
// Every film is drawn in code on the 320 x 192 pixel screen (about 5 seconds, no talking: only pictures
// and motion). They are made to feel like little movies: layered backgrounds that move at different
// speeds, a camera that pushes in or follows the action, screen shake on impacts, light, dust and smoke,
// black bars at the top and bottom and a slow fade in and out.
// Nothing in here decides game rules: it only draws what the page tells it to.

const FX = {};

// ---------- small drawing helpers (all inside FX so they cannot clash with other scripts) ----------

FX.shadow = (c, x, y, w) => ellipse(c, Math.round(x), Math.round(y + 1), w, Math.max(2, Math.round(w / 5)), "rgba(0,0,0,0.3)");

FX.glow = (c, x, y, r, rgb, a) => {
  for (let k = 3; k >= 1; k--) ellipse(c, Math.round(x), Math.round(y), Math.round(r * k / 3), Math.round(r * k / 3 * 0.8), "rgba(" + rgb + "," + (a / (4 - k + 1)).toFixed(2) + ")");
};

FX.rays = (c, x, y, t, rgb, n) => {              // soft beams of light fanning out from a point
  for (let i = 0; i < n; i++) {
    const a = -2.5 + i * (2.2 / n) + Math.sin(t * 0.3 + i) * 0.04, len = 220;
    c.fillStyle = "rgba(" + rgb + "," + (0.05 + 0.03 * Math.sin(t * 0.8 + i)).toFixed(3) + ")";
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a - 0.05) * len, y + Math.sin(a - 0.05) * len); c.lineTo(x + Math.cos(a + 0.05) * len, y + Math.sin(a + 0.05) * len); c.closePath(); c.fill();
  }
};

FX.clouds = (c, t, y, rgb, n, speed, seed) => {
  for (let i = 0; i < n; i++) {
    const x = ((hash(i, seed, 3) % 420) + t * speed * (0.6 + (i % 3) * 0.3)) % 420 - 50, yy = y + hash(i, seed, 4) % 26, s = 0.9 + (hash(i, seed, 5) % 10) / 10;
    ellipse(c, Math.round(x), yy, Math.round(18 * s), Math.round(5 * s), "rgba(" + rgb + ",0.75)");
    ellipse(c, Math.round(x + 10 * s), yy + 2, Math.round(12 * s), Math.round(4 * s), "rgba(" + rgb + ",0.75)");
    ellipse(c, Math.round(x - 12 * s), yy + 2, Math.round(10 * s), Math.round(4 * s), "rgba(" + rgb + ",0.6)");
  }
};

FX.birds = (c, t, y, n, speed, seed, col) => {
  for (let i = 0; i < n; i++) {
    const x = ((hash(i, seed, 6) % 380) + t * speed) % 380 - 30, yy = Math.round(y + (hash(i, seed, 7) % 22) + Math.sin(t * 2 + i) * 3), flap = Math.floor(t * 6 + i) % 2;
    px(c, Math.round(x) - 3, yy + (flap ? 1 : 0), 3, 1, col || "#2a1a3a"); px(c, Math.round(x), yy + (flap ? 0 : 1), 3, 1, col || "#2a1a3a");
  }
};

FX.ridge = (c, y, amp, seed, col, freq) => {      // a silhouette of far hills or mountains
  for (let x = 0; x < SW; x++) {
    const h = Math.round(y + Math.sin(x * (freq || 0.03) + seed) * amp + Math.sin(x * 0.083 + seed * 2.3) * amp * 0.45);
    px(c, x, h, 1, SH - h, col);
  }
};

FX.trees = (c, t, y, seed, cols, n) => {         // a row of round trees that sway a little
  for (let i = 0; i < n; i++) {
    const x = i * (SW / n) + hash(i, seed, 8) % 14, h = 14 + hash(i, seed, 9) % 14, sway = Math.round(Math.sin(t * 1.3 + i) * 1);
    px(c, x, y - 4, 3, 8, "#3a2418");
    ellipse(c, x + 1 + sway, y - h / 2 - 4, 9, Math.round(h / 2) + 3, cols[0]);
    ellipse(c, x - 2 + sway, y - h / 2 - 6, 5, Math.round(h / 2) - 1, cols[1]);
  }
};

FX.grass = (c, t, y0, y1, col1, col2) => {       // tufts of grass swaying in the wind
  for (let x = 0; x < SW; x += 5) {
    const h = 3 + hash(x, y0, 11) % 5, yy = y0 + hash(x, y0, 12) % (y1 - y0), sway = Math.round(Math.sin(t * 2 + x * 0.3) * 1);
    px(c, x + sway, yy - h, 1, h, col1); px(c, x + 2, yy - h + 1, 1, h - 1, col2);
  }
};

FX.dust = (c, x, y, p, n, rgb, spread) => {      // a burst of dust, p goes 0 -> 1
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1 || 1)) * Math.PI, d = spread * Math.sqrt(p) * (0.5 + (i % 3) * 0.3);
    ellipse(c, Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d * 0.45), Math.round(3 + 6 * p), Math.round(2 + 4 * p), "rgba(" + rgb + "," + (0.55 * (1 - p)).toFixed(2) + ")");
  }
};

FX.chunks = (c, x, y, p, n, cols, vx, vy, g, seed) => {   // flying bits (stones, leaves, planks) with gravity
  for (let i = 0; i < n; i++) {
    const dx = ((hash(i, seed, 13) % 100) / 50 - 1) * vx, dy = -((hash(i, seed, 14) % 100) / 100) * vy - vy * 0.3;
    px(c, Math.round(x + dx * p * 60), Math.round(y + dy * p * 60 + g * p * p * 60), 2 + i % 3, 2 + (i + 1) % 2, cols[i % cols.length]);
  }
};

FX.sparks = (c, x, y, p, n, seed) => {
  for (let i = 0; i < n; i++) {
    const a = (hash(i, seed, 15) % 628) / 100, d = (8 + hash(i, seed, 16) % 30) * Math.sqrt(p);
    px(c, Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d + p * p * 14), 2, 1, i % 2 ? "#ffe680" : "#ff9a3a");
  }
};

FX.plume = (c, x, y, p, h, rgb) => {             // a column of smoke rising and spreading
  for (let i = 0; i < 9; i++) {
    const k = clamp01(p * 1.2 - i * 0.06);
    if (k <= 0) continue;
    ellipse(c, Math.round(x + Math.sin(i * 2 + p * 3) * (6 + k * 8)), Math.round(y - k * h), Math.round(5 + k * 14 + i), Math.round(4 + k * 9), "rgba(" + rgb + "," + (0.5 * (1 - k * 0.7)).toFixed(2) + ")");
  }
};

FX.blast = (c, x, y, p, size) => {               // a big explosion: fireball, shock ring, sparks and a column of black smoke
  const s = size || 1;
  boom(c, x, y, clamp01(p * 1.4), s * 1.2);
  if (p < 0.5) shockRing(c, x, y + 6, p * 2);
  FX.sparks(c, x, y, clamp01(p * 1.2), 22, 5);
  if (p > 0.15) FX.plume(c, x, y - 4, clamp01((p - 0.15) * 1.1), 70 * s, "40,36,44");
};

FX.snow = (c, t, n, wind) => {
  for (let i = 0; i < n; i++) {
    const x = ((hash(i, 1, 20) % 340) + t * (wind + (i % 4) * 5)) % 340 - 10, y = ((hash(i, 2, 20) % 220) + t * (22 + (i % 5) * 10)) % 210 - 8;
    px(c, Math.round(x), Math.round(y), i % 3 ? 1 : 2, i % 3 ? 1 : 2, "rgba(255,255,255,0.85)");
  }
};

FX.embers = (c, x, y, t, n) => {
  for (let i = 0; i < n; i++) {
    const yy = y - ((t * 22 + i * 17) % 70), xx = x + Math.sin(t * 2 + i) * 10 + hash(i, 3, 21) % 16 - 8;
    px(c, Math.round(xx), Math.round(yy), 1, 2, i % 2 ? "#ffb347" : "#ff6a2a");
  }
};

FX.muzzle = (c, x, y, dir, k) => {               // a muzzle flash; k = 0..1
  if (k <= 0) return;
  const s = 1 + k * 0.4;
  ellipse(c, Math.round(x + dir * 5 * s), Math.round(y), Math.round(8 * s), Math.round(5 * s), "rgba(255,200,80,0.9)");
  ellipse(c, Math.round(x + dir * 7 * s), Math.round(y), Math.round(5 * s), Math.round(3 * s), "#fff6c0");
  px(c, Math.round(x + dir * 12 * s) - (dir < 0 ? 12 * s : 0), Math.round(y) - 1, Math.round(12 * s), 2, "rgba(255,230,140,0.9)");
};

FX.runDust = (c, x, y, t) => {                   // dust kicked up behind a runner
  for (let i = 0; i < 5; i++) {
    const age = (t * 5 + i * 0.2) % 1;
    ellipse(c, Math.round(x - 10 - age * 22), Math.round(y - 1 - age * 6), Math.round(1 + age * 4), Math.round(1 + age * 2), "rgba(210,190,150," + (0.5 * (1 - age)).toFixed(2) + ")");
  }
};

FX.hero = (c, x, y, o) => {                      // the fish with a shadow
  o = o || {};
  if (!o.noShadow) FX.shadow(c, x, y + (o.shadowDrop || 0), o.shadow || 20);
  fishAt(c, x, y, o);
};

FX.ring = (c, cx, cy, rx, ry, color) => {
  for (let a = 0; a < 6.28; a += 0.22) px(c, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 2, 1, color);
};

FX.bricks = (c, x, y, w, h, base, mortar) => {   // a brick wall
  px(c, x, y, w, h, base);
  for (let row = 0; row * 6 < h; row++) {
    px(c, x, y + row * 6, w, 1, mortar);
    for (let bx = (row % 2) * 8; bx < w; bx += 16) px(c, x + bx, y + row * 6, 1, 6, mortar);
  }
};

FX.lamp = (c, x, y, on, t) => {                  // a street lamp
  px(c, x, y - 40, 2, 42, "#2a2d38"); px(c, x - 4, y - 44, 10, 4, "#2a2d38"); px(c, x - 3, y - 41, 8, 2, on ? "#ffe9a0" : "#5a5f6e");
  if (on) FX.glow(c, x + 1, y - 38, 22, "255,226,140", 0.45 + 0.05 * Math.sin(t * 7));
};

// ---------- the places ----------

FX.meadow = (c, t, o) => {                       // a grassy path at golden hour (Pleasant Park)
  o = o || {};
  band(c, 0, 130, o.sky || ["#3a2a6a", "#6a3a7a", "#b24a6a", "#e8704a", "#f6a050", "#fbd080"]);
  const sx = o.sunX || 250, sy = o.sunY || 108;
  FX.glow(c, sx, sy, 60, "255,230,160", 0.5); ellipse(c, sx, sy, 18, 18, "#fff0c0"); ellipse(c, sx, sy, 13, 13, "#ffffff");
  FX.rays(c, sx, sy, t, "255,230,160", 7);
  FX.clouds(c, t, 30, "255,190,170", 3, 4, 1);
  FX.ridge(c, 118, 7, 1, "#5a3a78", 0.03); FX.ridge(c, 128, 5, 3, "#3f4a6a", 0.05);
  FX.trees(c, t, 140, 2, ["#244a34", "#2f6a40"], 14);
  band(c, 138, SH, ["#4a7a3a", "#427030", "#3a6428", "#325a22"]);
  for (let x = 0; x < SW; x += 22) { px(c, x, 142, 2, 12, "#6a4a2a"); } px(c, 0, 145, SW, 2, "#7a5a3a"); px(c, 0, 150, SW, 2, "#7a5a3a");      // a wooden fence
  px(c, 0, 158, SW, 22, "#a8864c"); px(c, 0, 158, SW, 2, "#c4a064"); px(c, 0, 178, SW, 2, "#7a5e34");
  for (let x = 0; x < SW; x += 9) px(c, x + hash(x, 1, 5) % 5, 162 + hash(x, 2, 5) % 14, 3, 1, "#c8a870");
  FX.grass(c, t, 180, 192, "#4a8a3a", "#6aaa4a");
  FX.birds(c, t, 28, 5, 14, 3);
  for (let i = 0; i < 4; i++) { const bx = (t * 14 + i * 90) % 340 - 10, by = 120 + Math.sin(t * 3 + i) * 6; px(c, Math.round(bx), Math.round(by), 2, 1, i % 2 ? "#ffd23f" : "#ffffff"); }      // butterflies
};

FX.city = (c, t, o) => {                         // a street at dusk (Tilted Towers, Retail Row)
  o = o || {};
  band(c, 0, 140, o.sky || ["#241048", "#3a1a62", "#6a2a78", "#a8386e", "#e0584e", "#f4864a"]);
  FX.clouds(c, t, 24, "200,120,150", 3, 3, 2);
  [[0, 96, 30, 60], [26, 80, 34, 76], [58, 104, 28, 52], [88, 86, 32, 70], [118, 100, 26, 56], [260, 90, 30, 66], [290, 74, 34, 82]].forEach(([x, y, w, h], i) => {   // far buildings
    px(c, x, y, w, h, "#3a2552"); px(c, x, y, w, 2, "#51396f");
    for (let wy = y + 6; wy < y + h - 4; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 8) px(c, wx, wy, 3, 4, hash(wx + wy, i, 6) % 5 === 0 ? "#ffe28a" : "#2a1f40");
  });
  px(c, 0, 144, SW, SH - 144, "#4a4558"); px(c, 0, 144, SW, 3, "#6a6578");
  for (let x = 8; x < SW; x += 44) px(c, x, 170, 24, 2, "#d8d4c4");
  px(c, 0, 144, SW, 1, "rgba(255,200,140,0.35)");
  FX.birds(c, t, 22, 4, 10, 4);
};

FX.snowland = (c, t, o) => {                     // snowy mountains (Polar Peak)
  o = o || {};
  band(c, 0, 124, o.sky || ["#9fb0d4", "#b4c4e2", "#c8d6ee", "#dce6f6", "#eef2fa"]);
  FX.clouds(c, t, 26, "255,255,255", 3, 3, 3);
  mountain(c, 70, 132, 78, 78, "#8d95b0", "#ffffff"); mountain(c, 220, 134, 96, 96, "#7a86a6", "#ffffff"); mountain(c, 300, 132, 56, 54, "#99a8c4", "#ffffff");
  FX.ridge(c, 132, 5, 2, "#dbe6f4", 0.04);
  for (let k = 0; k < 16; k++) pine(c, 6 + k * 21 + hash(k, 1, 7) % 8, 138 + hash(k, 2, 7) % 6, 10 + hash(k, 3, 7) % 4);
  band(c, 144, SH, ["#f4f9ff", "#e8f2fc", "#dce9f6", "#d0e0f0"]);
  for (let x = 0; x < SW; x += 26) ellipse(c, x + hash(x, 4, 9) % 12, 160 + hash(x, 5, 9) % 26, 16, 3, "#ffffff");
  px(c, 0, 144, SW, 2, "#c4d6ea");
};

// ---------- the camera: pushes in or follows, shakes on impacts, bars, vignette, fades ----------

function cinematic(def) {
  const off = document.createElement("canvas");
  off.width = SW; off.height = SH;
  const oc = off.getContext("2d");
  const scene = def.draw;
  return Object.assign({}, def, {
    draw(c, t) {
      oc.imageSmoothingEnabled = false;
      oc.clearRect(0, 0, SW, SH);
      scene(oc, t);
      const cam = def.cam || {};
      const from = cam.from || [1, 160, 96], to = cam.to || from, p = smooth(clamp01(t / def.dur));
      const z = lerp(from[0], to[0], p), fx = lerp(from[1], to[1], p), fy = lerp(from[2], to[2], p);
      let sx = Math.sin(t * 2.1) * 0.7, sy = Math.cos(t * 1.7) * 0.5;                                  // the camera is never perfectly still
      (cam.shake || []).forEach(([start, mag, len]) => {
        if (t >= start && t < start + len) { const k = 1 - (t - start) / len; sx += Math.sin(t * 83) * mag * k; sy += Math.cos(t * 67) * mag * k; }
      });
      const vw = SW / z, vh = SH / z;
      const x0 = Math.max(0, Math.min(SW - vw, fx - vw / 2 + sx)), y0 = Math.max(0, Math.min(SH - vh, fy - vh / 2 + sy));
      c.imageSmoothingEnabled = false;
      c.drawImage(off, Math.round(x0), Math.round(y0), Math.round(vw), Math.round(vh), 0, 0, SW, SH);
      if (def.grade) { c.fillStyle = def.grade; c.fillRect(0, 0, SW, SH); }
      const vg = c.createRadialGradient(SW / 2, SH / 2, 70, SW / 2, SH / 2, 215);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.62)");
      c.fillStyle = vg; c.fillRect(0, 0, SW, SH);
      for (let i = 0; i < 26; i++) px(c, hash(i, Math.floor(t * 24), 30) % SW, hash(i, Math.floor(t * 24), 31) % SH, 1, 1, i % 2 ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)");   // a little film grain
      const bar = Math.round(14 * smooth(clamp01(t / 0.5)));
      px(c, 0, 0, SW, bar, "#000"); px(c, 0, SH - bar, SW, bar, "#000");
      const fade = Math.max(1 - clamp01(t / 0.35), clamp01((t - (def.dur - 0.45)) / 0.45));
      if (fade > 0) { c.fillStyle = "rgba(0,0,0," + fade.toFixed(2) + ")"; c.fillRect(0, 0, SW, SH); }
    },
  });
}

// ---------- the 12 films ----------

const DEATH_FILMS = {
  // Pleasant Park - Tilted Towers: the hidden spike trap
  H1: { dur: 5.2, caption: "Sprint straight through? Bold. Pointy. Wrong.",
    cam: { from: [1.05, 110, 102], to: [1.55, 206, 124], shake: [[1.9, 6, 0.7]] }, grade: "rgba(255,120,40,0.07)",
    draw(c, t) {
      FX.meadow(c, t);
      const tx = 214, hit = 1.9;
      if (t < hit) {
        px(c, tx - 26, GROUND + 3, 52, 4, "#555a6a"); px(c, tx - 20, GROUND + 2, 14, 3, "#3f9a35"); px(c, tx + 4, GROUND + 2, 12, 3, "#3f9a35"); px(c, tx - 6, GROUND + 1, 8, 2, "#2c7a2c");   // leaves hide the trap
        if (Math.floor(t * 2) % 2 === 0) { px(c, tx + 10, GROUND + 2, 3, 1, "#fff"); }                              // a tiny glint of metal
        const x = lerp(-34, tx - 8, t / hit);
        FX.runDust(c, x, GROUND, t);
        FX.hero(c, x, GROUND, { dir: "right", step: Math.floor(t * 12) % 2, t });
        return;
      }
      const k = t - hit;
      FX.dust(c, tx, GROUND + 4, clamp01(k / 1.2), 7, "200,170,110", 40);
      FX.chunks(c, tx, GROUND, clamp01(k / 1.4), 16, ["#3f9a35", "#2c7a2c", "#a8864c", "#c8ccd8"], 1.4, 1.0, 1.6, 2);
      spikes(c, tx, GROUND + 6, clamp01(k / 0.1));
      FX.sparks(c, tx, GROUND - 18, clamp01(k / 0.7), 10, 1);
      flash(c, 0.7 - k * 2.5);
      const lift = smooth(clamp01(k / 0.45)) * 24, sag = clamp01((k - 1.3) / 1.2) * 9, swing = k > 0.7 ? Math.sin(t * 5) * (1 - clamp01((k - 1.4) / 2)) : 0;
      FX.hero(c, tx + swing * 3, GROUND + 4 - lift + sag, { pose: k < 0.7 ? "scared" : "ko", rot: swing * 0.09, t, noShadow: true });
      FX.shadow(c, tx, GROUND + 6, 20);
      if (k > 1.3) dizzy(c, tx, GROUND - 60 - lift + sag, t);
      for (let i = 0; i < 6; i++) {                                                                                // birds burst out of the trees
        const bx = 40 + i * 30 + k * (10 + i * 6), by = 90 - k * (26 + i * 5) + Math.sin(k * 9 + i) * 3;
        if (by > 10) { px(c, Math.round(bx), Math.round(by), 3, 1, "#2a1a3a"); px(c, Math.round(bx) + 3, Math.round(by) + (Math.floor(k * 14 + i) % 2), 3, 1, "#2a1a3a"); }
      }
    } },

  // Pleasant Park - Tilted Towers: the clock tower and its smoke grenades
  H5: { dur: 5.4, caption: "Charging a clock tower alone. The tower won.",
    cam: { from: [1.0, 150, 108], to: [1.25, 150, 106], shake: [[2.7, 5, 0.6]] }, grade: "rgba(120,40,120,0.1)",
    draw(c, t) {
      FX.city(c, t);
      clockTower(c, 226, 56);
      px(c, 230, 70, 10, 2, "#c0392b"); px(c, 237, 62, 1, 8, "#8a8f9c");                                           // a flag
      const mx = 250, my = 86;                                                                                      // the balcony of the tower and the team on it
      px(c, 232, 80, 36, 4, "#8f8062"); px(c, 232, 80, 36, 1, "#d4c6a6");
      [[238, "skull"], [260, "raven"]].forEach(([x, st]) => npcBig(c, x, 80, st, "idle", t, { scale: 1.2 }));
      const flick = Math.floor(t * 18) % 2 === 0;
      if (t > 1.0 && t < 2.8 && flick) { FX.muzzle(c, 232, 70, -1, 0.7); }
      for (let i = 0; i < 3; i++) {                                                                                // smoke grenades arc down from the tower
        const t0 = 0.5 + i * 0.35, p = clamp01((t - t0) / 0.9);
        if (p <= 0) continue;
        const gx = lerp(236, 120 + i * 34, p), gy = lerp(78, GROUND, p) - Math.sin(Math.PI * p) * 40;
        if (p < 1) { px(c, Math.round(gx), Math.round(gy), 4, 6, "#6a8a4a"); px(c, Math.round(gx), Math.round(gy), 4, 2, "#a8c27a"); }
        const s = clamp01((t - t0 - 0.9) / 1.6);
        if (s > 0) for (let j = 0; j < 7; j++) {
          const cx = 120 + i * 34 + (j - 3) * 9 * (0.4 + s), cy = GROUND - 6 - s * 22 - (j % 3) * 6;
          ellipse(c, Math.round(cx), Math.round(cy), Math.round(8 + s * 18), Math.round(6 + s * 11), "rgba(" + (j % 2 ? "206,210,226" : "176,180,200") + "," + (0.55 - s * 0.15).toFixed(2) + ")");
        }
      }
      const run = clamp01(t / 2.8), x = lerp(-30, 150, run);
      if (t < 3.0) {
        FX.runDust(c, x, GROUND, t);
        FX.hero(c, x, GROUND, { dir: "right", step: Math.floor(t * 12) % 2, pose: t > 1.7 ? "scared" : "walk", t });
      }
      if (t > 1.6 && t < 3.1) {                                                                                     // bullets tear through the smoke
        for (let i = 0; i < 7; i++) {
          const p = clamp01((t - 1.6 - i * 0.14) / 0.35);
          if (p > 0 && p < 1) { px(c, Math.round(lerp(236, x + 6, p)), Math.round(lerp(76, GROUND - 24, p)), 6, 2, "#ffe680"); }
        }
      }
      if (t >= 2.8) {
        const k = t - 2.8, d = smooth(clamp01(k / 0.5));
        FX.hero(c, x - 10 * d, GROUND + 6, { pose: "ko", rot: -1.5 * d, tint: "rgba(70,70,80,0.45)", t });
        FX.dust(c, x - 6, GROUND + 6, clamp01(k / 1.0), 6, "190,190,205", 34);
        if (k > 0.8) dizzy(c, x - 12, GROUND - 28, t);
      }
      for (let i = 0; i < 5; i++) { const sy = 84 + ((t * 40 + i * 23) % 70); px(c, 226 + i * 6, Math.round(sy), 2, 1, "#d9a63a"); }    // shell casings falling
    } },

  // Pleasant Park - Retail Row: the camping squad
  H2: { dur: 5.2, caption: "Walking past a camping squad in the open: confident, and very, very wrong.",
    cam: { from: [1.0, 120, 108], to: [1.5, 150, 118], shake: [[2.1, 5, 0.7]] }, grade: "rgba(255,110,40,0.08)",
    draw(c, t) {
      band(c, 0, 130, ["#1a1240", "#2c1a5a", "#5a2a72", "#a0386a", "#d8584e", "#f08a50"]);
      ellipse(c, 60, 52, 14, 14, "#f4f0d0"); ellipse(c, 56, 50, 11, 11, "#fffbe8");
      FX.ridge(c, 120, 6, 2, "#3a2a58", 0.03);
      for (let k = 0; k < 18; k++) pine(c, 4 + k * 18 + hash(k, 1, 7) % 8, 146 + hash(k, 2, 7) % 5, 12 + hash(k, 3, 7) % 5);
      band(c, 148, SH, ["#2f5a34", "#285030", "#22462a", "#1c3c24"]);
      px(c, 0, 160, SW, 22, "#8a6a3c"); px(c, 0, 160, SW, 2, "#a8864c");
      for (let x = 0; x < SW; x += 11) px(c, x + hash(x, 1, 5) % 5, 164 + hash(x, 2, 5) % 14, 3, 1, "#a8884e");
      // the camp: a tent, a fire and logs
      for (let y = 96; y <= 152; y++) { const half = Math.round((y - 96) * 38 / 56); px(c, 252 - half, y, half, 1, "#3f8a3a"); px(c, 252, y, half + 1, 1, "#2a5e2a"); }
      for (let y = 118; y <= 152; y++) { const half = Math.round((y - 118) * 13 / 34); px(c, 252 - half, y, half * 2 + 1, 1, "#0e0a08"); }
      px(c, 252, 96, 1, 56, "#1a3a1c"); px(c, 252, 88, 2, 10, "#8a5a2c"); px(c, 254, 88, 8 + Math.floor(t * 4) % 2, 5, "#e0463c");
      const fire = 0.35 + 0.1 * Math.sin(t * 9);
      FX.glow(c, 196, 150, 56, "255,150,40", fire);
      px(c, 184, 150, 24, 4, "#4a2f18"); px(c, 188, 147, 16, 3, "#6b4423");
      [[0, 16, 10], [-6, 11, 8], [6, 12, 9]].forEach(([dx, h, w], i) => {
        const fh = h + Math.round(Math.sin(t * 10 + i * 2) * 3);
        ellipse(c, 196 + dx, 148 - fh / 2, w / 2, fh / 2, i === 0 ? "#ffb347" : "#ff6a2a"); ellipse(c, 196 + dx, 149 - fh / 3, w / 4, fh / 3, "#ffe680");
      });
      FX.embers(c, 196, 140, t, 8);
      const rise = smooth(clamp01((t - 1.6) / 0.3));                                                                // the squad is sitting behind the logs; they jump up
      [[214, "skull"], [236, "raven"], [270, "renegade"]].forEach(([x, st], i) => {
        npcBig(c, x, GROUND - 4 + 22 * (1 - rise), st, "idle", t, { scale: 2 });
        px(c, x - 14, GROUND + 6, 28, 7, "#6b4423"); px(c, x - 14, GROUND + 6, 28, 2, "#8a5a2c");               // the log in front of each
      });
      if (t < 2.0) {
        const x = lerp(-30, 126, t / 2.0);
        FX.runDust(c, x, GROUND + 4, t);
        FX.hero(c, x, GROUND + 4, { dir: "right", step: Math.floor(t * 7) % 2, t });                              // strolling, not running: he is confident
      } else {
        const k = t - 2.0, f = smooth(clamp01((k - 0.15) / 0.9));
        [[214, 120], [236, 120], [270, 120]].forEach(([x, y], i) => {
          if (Math.floor(k * 16 + i) % 2 === 0 && k < 1.5) FX.muzzle(c, x - 18, y + 18, -1, 0.8);
        });
        for (let i = 0; i < 9; i++) {
          const p = clamp01((k - i * 0.09) / 0.3);
          if (p > 0 && p < 1) px(c, Math.round(lerp(200, 140, p)), Math.round(lerp(132 + (i % 3) * 8, 148, p)), 6, 2, "#ffe680");
        }
        flash(c, 0.45 - k * 1.2);
        FX.hero(c, 126 - 52 * f, GROUND + 4 - Math.sin(Math.PI * f) * 40, { pose: k < 0.7 ? "scared" : "ko", rot: -2.4 * f, t });
        FX.dust(c, 90, GROUND + 6, clamp01((k - 0.7) / 1.0), 5, "170,150,110", 28);
        if (k > 1.3) dizzy(c, 74, GROUND - 22, t);
      }
    } },

  // Pleasant Park - Retail Row: the sniper (first the wide shot, then through the scope)
  H4: { dur: 5.4, caption: "A sniper has a very good view of people checking their maps.",
    cam: { from: [1.0, 160, 100], to: [1.2, 130, 112], shake: [[3.0, 6, 0.6]] }, grade: "rgba(255,130,50,0.07)",
    draw(c, t) {
      const plaza = (ox, oy, zoom, withHero) => {                                                                  // the plaza, drawn again inside the scope
        c.save(); c.translate(ox, oy); c.scale(zoom, zoom);
        FX.city(c, t);
        clockTower(c, 160, 62);
        if (withHero) {
          FX.hero(c, 110, GROUND, { t, step: 0 });
          const sway = Math.sin(t * 4) * 1;
          px(c, 96, GROUND - 28 + sway, 28, 20, "#1b1030"); px(c, 97, GROUND - 27 + sway, 26, 18, "#f3e6c8");     // the unfolded map, held in front of his chest
          px(c, 102, GROUND - 22 + sway, 14, 1, "#7cc4ff"); px(c, 106, GROUND - 18 + sway, 9, 1, "#7cc4ff"); px(c, 112, GROUND - 17 + sway, 4, 1, "#e0463c"); px(c, 113, GROUND - 18 + sway, 1, 3, "#e0463c");
        }
        c.restore();
      };
      const shot = 3.0;
      if (t < 1.7) {
        plaza(0, 0, 1, true);
        px(c, 262, 70, 58, 8, "#6a6a7e"); px(c, 262, 70, 58, 2, "#8a8aa0");                                          // the rooftop where the sniper lies
        px(c, 282, 64, 26, 6, "#34502a"); px(c, 296, 64, 14, 2, "#2a2d38");                                           // a ghillie suit and a rifle
        if (Math.floor(t * 3) % 2 === 0) { px(c, 297, 61, 7, 1, "#fff"); px(c, 300, 58, 1, 7, "#fff"); }               // the glint of the scope
        return;
      }
      if (t < shot) {                                                                                              // through the scope
        const k = t - 1.7;
        c.fillStyle = "#050508"; c.fillRect(0, 0, SW, SH);
        c.save(); c.beginPath(); c.arc(160, 96, 86, 0, Math.PI * 2); c.clip();
        const zoom = 2.4 + k * 0.1, sw = Math.sin(t * 2.4) * 5 * (1 - clamp01(k / 1.2)), sh = Math.cos(t * 1.9) * 4 * (1 - clamp01(k / 1.2));
        plaza(160 - 110 * zoom + sw, 96 - (GROUND - 32) * zoom + sh, zoom, true);
        c.restore();
        const mark = (x, y, w, h) => { px(c, x + 1, y + 1, w, h, "rgba(0,0,0,0.6)"); px(c, x, y, w, h, "#f4f4d8"); };
        mark(76, 96, 76, 1); mark(168, 96, 76, 1); mark(160, 12, 1, 76); mark(160, 104, 1, 76);
        for (let q = 1; q < 8; q++) { mark(160 + q * 10, 93, 1, 7); mark(160 - q * 10, 93, 1, 7); mark(157, 96 + q * 10, 7, 1); mark(157, 96 - q * 10, 7, 1); }
        if (k > 0.7) { px(c, 155, 91, 11, 11, "rgba(255,40,40," + (0.3 + 0.35 * Math.sin(t * 14)).toFixed(2) + ")"); }  // the red dot settles
        FX.ring(c, 160, 96, 86, 86, "#0e0e14");
        return;
      }
      const k = t - shot;
      plaza(0, 0, 1, false);
      px(c, 262, 70, 58, 8, "#6a6a7e"); px(c, 282, 64, 26, 6, "#34502a"); px(c, 296, 64, 14, 2, "#2a2d38");
      FX.muzzle(c, 296, 62, -1, clamp01(1 - k * 5));
      flash(c, 0.85 - k * 2.6);
      const f = smooth(clamp01(k / 0.6));
      FX.dust(c, 110, GROUND + 4, clamp01((k - 0.2) / 1.2), 6, "190,180,170", 30);
      px(c, Math.round(96 + f * 130), Math.round(GROUND - 40 - f * 60 + (1 - f) * 0), 22, 14, "#f3e6c8");           // the map flutters away
      FX.hero(c, 110 - 14 * f, GROUND + 6, { pose: "ko", rot: -1.55 * f, t });
      if (k > 0.9) dizzy(c, 98, GROUND - 24, t);
    } },

  // Pleasant Park - Polar Peak: the icy cliff
  H7: { dur: 5.8, caption: "The edge was icy. The cliff was long. Gravity was keen.",
    cam: { from: [1.1, 120, 110], to: [1.15, 200, 120], shake: [[3.0, 4, 0.5]] },
    draw(c, t) {
      const slip = 2.2, drop = 2.9;
      if (t < drop) {
        FX.snowland(c, t);
        for (let y = 124; y < SH; y++) {                                                                            // the cliff edge: ice and a drop
          const edge = 214 + (y - 124) * 0.15;
          px(c, Math.round(edge), y, SW - Math.round(edge), 1, y % 9 < 2 ? "#5f9cc4" : "#7ab8dc");
          px(c, Math.round(edge), y, 3, 1, "#dff4ff");
        }
        for (let k = 0; k < 6; k++) px(c, 222 + k * 16, 132 + (k % 3) * 16, 10, 2, "#a8d8f0");
        px(c, 150, GROUND + 2, 70, 3, "#bfe0f4"); px(c, 168, GROUND + 4, 60, 1, "#ffffff");                       // a long sheet of ice with a shine
        for (let k = 0; k < 5; k++) px(c, 156 + k * 14 + (Math.floor(t * 6) % 3), GROUND + 3, 3, 1, "#ffffff");
        const x = t < slip ? lerp(-30, 192, t / slip) : lerp(192, 232, smooth(clamp01((t - slip) / 0.7)));
        if (t < slip) { FX.runDust(c, x, GROUND, t); FX.hero(c, x, GROUND, { dir: "right", step: Math.floor(t * 12) % 2, t }); }
        else {                                                                                                      // his feet go out from under him
          const y = x > 214 ? GROUND + (x - 214) * 1.5 : GROUND;
          FX.hero(c, x, y, { pose: "scared", rot: (t - slip) * 1.4, t, noShadow: x > 210 });
          for (let i = 0; i < 8; i++) px(c, Math.round(x - 6 - i * 4), Math.round(GROUND + 2 - i % 3), 2, 1, "#ffffff");   // a spray of snow
        }
        FX.snow(c, t, 40, 24);
        return;
      }
      const f = t - drop;                                                                                           // the fall: the camera drops with him
      band(c, 0, SH, ["#4a7fa8", "#5a90b8", "#6aa0c8", "#7ab0d6", "#8ac0e2", "#9ad0ee"]);
      const off = f * 240;
      for (let k = -1; k < 9; k++) {                                                                                // the two ice walls rush upwards
        const y = ((k * 30 + off) % 240) - 30, wl = 46 + (k * 13) % 14, wr = 52 + (k * 7) % 14;
        px(c, 0, y, wl, 28, k % 2 ? "#6aa6cc" : "#7ab8dc"); px(c, 0, y, wl, 3, "#dff4ff"); px(c, wl - 3, y, 3, 28, "#4f88b0"); px(c, 6 + (k * 9) % 20, y + 9, 12, 2, "#b4dcf0");
        px(c, SW - wr, y + 12, wr, 28, k % 2 ? "#7ab8dc" : "#6aa6cc"); px(c, SW - wr, y + 12, wr, 3, "#dff4ff"); px(c, SW - wr, y + 12, 3, 28, "#4f88b0"); px(c, SW - wr + 10 + (k * 5) % 20, y + 22, 12, 2, "#b4dcf0");
        for (let q = 0; q < 3; q++) { px(c, wl + q * 0, y + 28, 1, 0, "#fff"); px(c, 4 + q * 14, y + 28, 2, 5 + (k + q) % 4, "#dff4ff"); }   // icicles
      }
      FX.clouds(c, f * 40, 150 - (f * 60) % 150, "255,255,255", 2, 0, 9);
      for (let k = 0; k < 20; k++) px(c, 20 + (k * 47) % 280, ((k * 61 + off * 1.4) % 200) - 6, 2, 9, "rgba(255,255,255,0.8)");
      if (f < 1.5) {
        FX.hero(c, 160 + Math.sin(t * 5) * 14, 100, { pose: "fall", scale: 2, rot: Math.sin(t * 3) * 0.4, t, noShadow: true });
        FX.birds(c, t * 3, 10 + (f * 90) % 160, 2, 20, 11, "#ffffff");
      } else {
        const p = clamp01((f - 1.5) / 0.5), q = f - 2.0;
        band(c, 138, SH, ["#f4f9ff", "#e8f2fc", "#dce9f6"]);
        if (p < 1) FX.hero(c, 160, 100 + p * 38, { pose: "fall", scale: lerp(2, 1.4, p), t, noShadow: true });
        else {                                                                                                      // he sinks into the deep snow; only his hat is left
          ellipse(c, 160, 156, 50, 11, "#ffffff"); ellipse(c, 160, 150, 30, 13, "#f4f9ff");
          px(c, 158, 144, 4, 9, "#f2692d");
          for (let i = 0; i < 18; i++) { const a = hash(i, 1, 40) % 628 / 100, d = clamp01(q / 1.4) * (14 + hash(i, 2, 40) % 40); px(c, Math.round(160 + Math.cos(a) * d), Math.round(148 - Math.abs(Math.sin(a)) * d * 1.2 + q * q * 8), 3, 3, "#ffffff"); }
        }
      }
    } },

  // Pleasant Park - Polar Peak: the pump shotgun behind the wall
  H8: { dur: 4.8, caption: "Peeking at a pump shotgun is the express elevator to the elimination screen.",
    cam: { from: [1.0, 120, 108], to: [1.2, 110, 114], shake: [[2.3, 7, 0.7]] }, grade: "rgba(120,160,230,0.08)",
    draw(c, t) {
      FX.snowland(c, t, { sky: ["#7a8aae", "#8c9cc0", "#a0aed0", "#b4c0dc", "#cbd4ea"] });
      FX.bricks(c, 150, 60, 62, 102, "#8a5a4a", "#5e3a2e");                                                           // a wall in the snow
      px(c, 146, 56, 70, 6, "#e8f2fc"); px(c, 146, 56, 70, 2, "#ffffff");
      for (let i = 0; i < 6; i++) px(c, 152 + i * 10, 62 + hash(i, 1, 5) % 8, 8, 3, "#f4f9ff");
      px(c, 200, 60, 10, 102, "#a6705e"); px(c, 208, 60, 2, 102, "#5e3a2e");                                        // the corner
      px(c, 0, 162, SW, 30, "#e8f2fc"); px(c, 0, 162, SW, 2, "#c4d6ea");
      const peekT = smooth(clamp01((t - 0.9) / 0.8)), shotT = 2.3;
      npcBig(c, 242, GROUND, "skull", "idle", t, { scale: 2 });
      px(c, 214, GROUND - 38, 34, 5, "#2a2d38"); px(c, 214, GROUND - 38, 34, 1, "#6a6f7d"); px(c, 226, GROUND - 34, 8, 5, "#7a4a24");      // the shotgun, waiting
      FX.snow(c, t, 50, 18);
      if (t < shotT) {
        const x = lerp(-30, 168, smooth(clamp01(t / 1.4)));
        if (t < 1.4) FX.runDust(c, x, GROUND, t);
        FX.hero(c, x + peekT * 12, GROUND, { dir: "right", step: t < 1.4 ? Math.floor(t * 10) % 2 : 0, pose: peekT > 0.9 ? "scared" : "walk", t });
        return;
      }
      const k = t - shotT, f = smooth(clamp01(k / 1.0));
      FX.muzzle(c, 214, GROUND - 36, -1, clamp01(1 - k * 5));
      flash(c, 0.8 - k * 2.4);
      for (let i = 0; i < 9; i++) { const p = clamp01((k - 0.02) / 0.25); px(c, Math.round(lerp(212, 150 - i * 6, p)), Math.round(GROUND - 38 + (i - 4) * 5 * p), 2, 2, "#ffe680"); }   // the pellets spread out
      FX.dust(c, 180, GROUND + 4, clamp01(k / 1.0), 7, "240,248,255", 40);
      FX.hero(c, lerp(168, 50, f), GROUND - Math.sin(Math.PI * f) * 40, { pose: "ko", rot: -3.0 * f, tint: "rgba(50,40,40,0.35)", t });
      FX.plume(c, 212, GROUND - 36, clamp01(k / 1.6), 30, "190,190,205");
      if (k > 1.1) dizzy(c, 56, GROUND - 26, t);
    } },

  // Tilted Towers - Retail Row: the rocket while he stares at the shop sign
  H3: { dur: 5.4, caption: "Staring at a shop sign: 10% off, 100% rocket.",
    cam: { from: [1.0, 120, 108], to: [1.45, 78, 120], shake: [[2.7, 8, 0.8]] }, grade: "rgba(255,110,50,0.08)",
    draw(c, t) {
      FX.city(c, t);
      FX.lamp(c, 270, GROUND + 6, true, t);
      px(c, 24, 50, 96, 30, "#14101c"); px(c, 26, 52, 92, 26, "#ffd23f"); px(c, 26, 52, 92, 3, "#fff0a0");           // the big sale sign above the shop
      const neon = Math.floor(t * 9) % 11 !== 0;
      c.font = 'bold 14px "Courier New", Courier, monospace'; c.textAlign = "center"; c.fillStyle = neon ? "#c0392b" : "#7a2a22"; c.fillText("SALE -10%", 72, 72);
      px(c, 68, 80, 5, 70, "#4a4f5e"); px(c, 24, 80, 96, 3, "#3a3d4a");
      FX.glow(c, 72, 66, 56, "255,210,80", 0.35);
      const hit = 2.7, rx0 = 330;
      if (t < hit) FX.hero(c, 78, GROUND, { dir: "up", t });
      const p = clamp01((t - 0.9) / (hit - 0.9));
      if (t < hit) {
        if (t > 0.9) {                                                                                             // the rocket comes in low across the street
          const rx = lerp(rx0, 92, p), ry = lerp(46, GROUND - 26, p * p);
          px(c, Math.round(rx), Math.round(ry), 20, 5, "#e8e8f0"); px(c, Math.round(rx), Math.round(ry), 6, 5, "#e0463c"); px(c, Math.round(rx + 20), Math.round(ry) - 1, 5, 7, "#ffb347");
          for (let k = 0; k < 9; k++) ellipse(c, Math.round(rx + 26 + k * 10), Math.round(ry + 2 + (k % 2) - k * 0.7), 5 + k % 3, 3 + k % 2, "rgba(210,210,220," + (0.8 - k * 0.08).toFixed(2) + ")");
        }
        if (t > 0.4 && t < 1.0 && Math.floor(t * 20) % 2 === 0) FX.muzzle(c, 308, 48, -1, 0.9);                    // the rocketeer far away on a rooftop
        return;
      }
      const k = t - hit;
      FX.blast(c, 84, GROUND - 22, clamp01(k / 2.2), 1.6);
      flash(c, 0.95 - k * 2.2);
      FX.chunks(c, 84, GROUND - 20, clamp01(k / 1.6), 20, ["#ffd23f", "#c0392b", "#4a4f5e", "#14101c"], 1.8, 1.4, 1.8, 3);
      if (k < 0.5) { px(c, 24, 50, 96, 30, "#14101c"); }
      const f = smooth(clamp01(k / 1.4));
      FX.hero(c, lerp(78, 206, f), GROUND - Math.sin(Math.PI * f) * 62, { pose: "ko", rot: 6 * f, tint: "rgba(20,12,8,0.6)", t, noShadow: true });
      if (k > 1.5) { FX.plume(c, 206, GROUND - 26, clamp01((k - 1.5) / 1.8), 44, "50,46,54"); dizzy(c, 202, GROUND - 40, t); }
      FX.embers(c, 84, GROUND - 6, t, 10);
    } },

  // Tilted Towers - Retail Row: the suspiciously clean doorway
  H6: { dur: 5.2, caption: "A doorway that clean was never an invitation.",
    cam: { from: [1.05, 130, 112], to: [1.2, 110, 116], shake: [[2.9, 8, 0.8]] }, grade: "rgba(255,120,50,0.07)",
    draw(c, t) {
      FX.city(c, t);
      FX.bricks(c, 96, 56, 128, 100, "#a8553c", "#7d3c2a"); px(c, 96, 56, 128, 7, "#cfcabd");
      px(c, 104, 76, 24, 20, "#26183c"); px(c, 192, 76, 24, 20, "#26183c"); px(c, 106, 78, 20, 16, "#6fb8e8"); px(c, 194, 78, 20, 16, "#6fb8e8");
      px(c, 116, 78, 1, 16, "#26183c"); px(c, 204, 78, 1, 16, "#26183c");
      for (let i = 0; i < 6; i++) px(c, 100 + hash(i, 1, 9) % 112, 100 + hash(i, 2, 9) % 50, 6, 4, "rgba(0,0,0,0.18)");        // everything is grubby except the doorway
      const blow = 2.9;
      px(c, 144, 92, 32, 64, "#fffdf0"); px(c, 146, 94, 28, 62, "#dff4ff");                                         // the doorway is spotless
      px(c, 144, 150, 32, 6, "#2f9e4f"); px(c, 148, 152, 24, 2, "#6fd08a");
      if (t < blow) {
        if (Math.floor(t * 3) % 2 === 0) { px(c, 150, 102, 1, 5, "#fff"); px(c, 148, 104, 5, 1, "#fff"); }
        const arm = clamp01((t - 1.7) / 1.0);                                                                       // the tripwire glints and a red light blinks
        px(c, 144, 126, 32, 1, "rgba(255,255,255," + (0.15 + 0.5 * Math.floor(t * 4) % 2).toFixed(2) + ")");
        if (t > 1.8 && Math.floor(t * 5) % 2 === 0) { px(c, 138, 98, 3, 3, "#ff2020"); px(c, 179, 98, 3, 3, "#ff2020"); }
        const x = t < 1.7 ? lerp(-30, 158, smooth(t / 1.7)) : 158 + arm * 2;
        if (t < 1.7) FX.runDust(c, x, GROUND, t * 0.7);
        FX.hero(c, x, GROUND, { dir: "right", step: t < 1.7 ? Math.floor(t * 8) % 2 : 0, pose: t > 2.2 ? "scared" : "walk", t });
        return;
      }
      const k = t - blow, f = smooth(clamp01(k / 1.2));
      px(c, 144, 92, 32, 64, "#1a1410");
      FX.blast(c, 160, 122, clamp01(k / 2.2), 1.5);
      flash(c, 0.95 - k * 2.3);
      FX.chunks(c, 160, 120, clamp01(k / 1.6), 24, ["#a8553c", "#7d3c2a", "#cfcabd", "#fffdf0", "#6b4423"], 2.0, 1.2, 1.8, 4);
      const door = clamp01(k / 0.7);                                                                                // the door flies out
      px(c, Math.round(lerp(150, 60, door)), Math.round(lerp(100, 140, door * door)), 12, 40, "#6b4423");
      px(c, 106, 78, 20, 16, "rgba(255,230,140," + (0.8 - k * 0.5).toFixed(2) + ")");
      FX.hero(c, lerp(160, 40, f), GROUND + 2 - Math.sin(Math.PI * f) * 62, { pose: "ko", rot: -7 * f, tint: "rgba(20,12,8,0.6)", t, noShadow: true });
      if (k > 1.5) { FX.plume(c, 40, GROUND - 22, clamp01((k - 1.5) / 1.7), 40, "60,52,52"); dizzy(c, 36, GROUND - 40, t); }
      FX.embers(c, 160, 150, t, 12);
    } },

  // Tilted Towers - Polar Peak: the thin ice (then under the ice)
  H9: { dur: 5.6, caption: "Sliding on thin ice on your stomach. Chill. (Literally.)",
    cam: { from: [1.15, 110, 130], to: [1.0, 160, 96], shake: [[2.7, 5, 0.6]] },
    draw(c, t) {
      const breakT = 2.7;
      if (t < breakT) {
        band(c, 0, 90, ["#0e1a40", "#16285a", "#1e3a72", "#2a4e88", "#4a78a8"]);
        for (let k = 0; k < 3; k++) { const y = 22 + k * 12; for (let x = 0; x < SW; x += 2) px(c, x, y + Math.round(Math.sin(x * 0.04 + t * 0.8 + k) * 6), 2, 6, "rgba(" + (k % 2 ? "120,255,180" : "170,140,255") + ",0.2)"); }   // the northern lights
        for (let i = 0; i < 34; i++) if (Math.sin(t * 2 + i) > -0.3) px(c, hash(i, 1, 50) % SW, hash(i, 2, 50) % 70, 1, 1, "#e8f0ff");
        mountain(c, 70, 100, 56, 80, "#6a7a9c", "#ffffff"); mountain(c, 250, 102, 64, 90, "#5f6f92", "#ffffff");
        for (let k = 0; k < 14; k++) pine(c, 6 + k * 23 + hash(k, 1, 7) % 8, 108 + hash(k, 2, 7) % 5, 9 + hash(k, 3, 7) % 3);
        band(c, 110, SH, ["#bfe0f4", "#aed4ee", "#9ac8e6", "#86bade", "#74acd4"]);                                 // the frozen lake
        for (let x = 0; x < SW; x += 40) px(c, x + hash(x, 1, 5) % 20, 120 + hash(x, 2, 5) % 60, 28, 1, "rgba(255,255,255,0.45)");
        const x = lerp(-10, 176, clamp01(t / 2.5));
        const reach = clamp01((t - 0.8) / 1.8) * 90;
        for (let q = 0; q < 8; q++) {                                                                               // cracks race ahead of him
          const cx = x + 20 + q * 11 - reach * 0.2, cy = 160 + (q % 3) * 6;
          px(c, Math.round(cx), cy, 16, 1, "#3a6a9a"); px(c, Math.round(cx) + 15, cy, 1, 8 + q % 4, "#3a6a9a"); px(c, Math.round(cx) + 1, cy + 1, 14, 1, "rgba(200,240,255,0.6)");
        }
        for (let i = 0; i < 6; i++) px(c, Math.round(x - 6 - i * 5), 164 + (i % 2), 3, 1, "rgba(255,255,255,0.8)");   // snow he kicks up
        FX.hero(c, x, 164, { rot: -1.5708, scale: 2, pose: "scared", t, noShadow: true });
        return;
      }
      const k = t - breakT;
      if (k < 0.8) {                                                                                                // the ice gives way
        band(c, 0, 110, ["#0e1a40", "#16285a", "#2a4e88", "#4a78a8"]);
        band(c, 110, SH, ["#bfe0f4", "#aed4ee", "#9ac8e6", "#86bade", "#74acd4"]);
        ellipse(c, 176, 164, 20 + k * 40, 6 + k * 12, "#0a2a5a");
        for (let i = 0; i < 16; i++) { const a = hash(i, 5, 60) % 628 / 100; px(c, Math.round(176 + Math.cos(a) * k * 90), Math.round(160 - Math.abs(Math.sin(a)) * k * 80 + k * k * 40), 4, 3, i % 2 ? "#ffffff" : "#dff4ff"); }
        FX.hero(c, 176, 164 + smooth(k / 0.8) * 20, { pose: "scared", t, noShadow: true });
        flash(c, 0.5 - k * 2);
        return;
      }
      const u = k - 0.8;                                                                                            // under the ice: he sinks in the dark water
      band(c, 0, SH, ["#2a8ab8", "#2478a8", "#1c6498", "#16508a", "#10407a", "#0a2a5a", "#061c44"]);
      for (let i = 0; i < 6; i++) {                                                                                  // light shafts from the hole above
        c.fillStyle = "rgba(190,235,255," + (0.1 + 0.04 * Math.sin(t * 1.5 + i)).toFixed(2) + ")";
        c.beginPath(); c.moveTo(150 + i * 6, 0); c.lineTo(190 + i * 6, 0); c.lineTo(130 + i * 18 + Math.sin(t + i) * 6, SH); c.lineTo(60 + i * 30, SH); c.closePath(); c.fill();
      }
      px(c, 0, 0, SW, 16, "#dff4ff"); ellipse(c, 170, 14, 38, 8, "#bfe8ff");                                         // the ice ceiling with the hole
      for (let k2 = 0; k2 < 6; k2++) px(c, 20 + k2 * 56, 14, 3, 8 + k2 % 3 * 4, "#cfeaff");
      const sink = smooth(clamp01(u / 3.0));
      FX.hero(c, 170 + Math.sin(t * 2) * 6, 40 + sink * 110, { pose: u < 1.6 ? "scared" : "ko", rot: sink * 0.6, t, noShadow: true, tint: "rgba(40,120,200,0.45)" });
      for (let b2 = 0; b2 < 14; b2++) { const by = 150 - ((t * 36 + b2 * 21) % 140), bx = 160 + Math.sin(t * 3 + b2) * 14 + b2 % 5 * 3; FX.ring(c, bx, by, 2 + b2 % 3, 2 + b2 % 3, "rgba(220,245,255,0.8)"); }
      for (let f2 = 0; f2 < 4; f2++) { const fx = ((t * 16 + f2 * 80) % 360) - 20; px(c, Math.round(fx), 120 + f2 * 14, 7, 2, "rgba(10,30,70,0.6)"); px(c, Math.round(fx) + 7, 120 + f2 * 14 - 1, 2, 4, "rgba(10,30,70,0.6)"); }   // dark fish swim past
      px(c, 0, 176, SW, 16, "#061c44"); for (let r = 0; r < 12; r++) px(c, r * 28 + 4, 170 + hash(r, 1, 7) % 6, 8, 10, "#0a2a5a");
    } },

  // Tilted Towers - Polar Peak: the avalanche (it rolls over him; the quiet snow afterwards)
  H10: { dur: 5.6, caption: "Outrunning an avalanche in a straight line. The snow runs faster.",
    cam: { from: [1.0, 120, 108], to: [1.3, 180, 116], shake: [[2.4, 6, 1.4]] }, grade: "rgba(150,180,240,0.06)",
    draw(c, t) {
      FX.snowland(c, t, { sky: ["#8a9cc4", "#a0b0d4", "#b8c6e2", "#d0daee", "#e8eef8"] });
      const whiteout = 2.6;
      if (t < whiteout + 1.4) {
        const front = -80 + 74 * t + 34 * t * t;                                                                    // the front of the avalanche grows
        for (let y = 36; y < 176; y += 3) {
          const bump = Math.round(Math.sin(y * 0.3 + t * 8) * 7 + Math.sin(y * 0.11 + t * 3) * 10);
          px(c, 0, y, Math.max(0, Math.round(front) + bump), 3, y % 6 ? "#ffffff" : "#e6f2ff");
        }
        for (let q = 0; q < 14; q++) {                                                                              // the billowing cloud on top
          const bx = front + 10 - q * 6 + Math.sin(t * 3 + q) * 4, by = 52 + (q % 5) * 20 + Math.sin(t * 4 + q) * 4;
          ellipse(c, Math.round(bx), Math.round(by), 16 + q % 4 * 4, 12 + q % 3 * 3, "rgba(255,255,255,0.9)");
        }
        for (let k = 0; k < 8; k++) px(c, Math.round(front) - 6 - (k * 17) % 40, 50 + ((k * 41) % 110), 5 + k % 3, 4, "#6f7790");  // rocks in the snow
        pine(c, Math.round(front) + 20 - (t > 1.5 ? (t - 1.5) * 60 : 0), GROUND + 4, 16);
        if (t < whiteout) {
          const fx = lerp(40, 190, t / whiteout);
          FX.runDust(c, fx, GROUND, t);
          FX.hero(c, fx, GROUND, { dir: "right", step: Math.floor(t * 12) % 2, t });
          for (let i = 0; i < 40; i++) px(c, Math.round(front) - hash(i, 1, 70) % 90, hash(i, 2, 70) % SH, 2, 2, "rgba(255,255,255,0.9)");
        }
        if (t > whiteout - 0.5) { c.fillStyle = "rgba(255,255,255," + clamp01((t - (whiteout - 0.5)) / 0.8).toFixed(2) + ")"; c.fillRect(0, 0, SW, SH); }
        if (t < whiteout + 1.4) { if (t > whiteout + 0.6) { c.fillStyle = "rgba(255,255,255," + (1 - clamp01((t - whiteout - 0.6) / 0.8)).toFixed(2) + ")"; c.fillRect(0, 0, SW, SH); } }
        if (t < whiteout + 0.6) return;
      }
      const k = t - whiteout - 0.6;                                                                                  // silence: the snow settles and only a glove sticks out
      FX.snowland(c, t, { sky: ["#8a9cc4", "#a0b0d4", "#b8c6e2", "#d0daee", "#e8eef8"] });
      ellipse(c, 160, 168, 150, 40, "#dce9f6"); ellipse(c, 120, 160, 100, 32, "#eef6ff"); ellipse(c, 210, 158, 90, 28, "#f8fcff"); ellipse(c, 160, 176, 130, 22, "#c4d6ea");
      for (let q = 0; q < 18; q++) px(c, 40 + hash(q, 1, 80) % 240, 140 + hash(q, 2, 80) % 40, 10 + hash(q, 3, 80) % 18, 2, q % 2 ? "#c4d6ea" : "#ffffff");
      px(c, 150, 114, 7, 36, "#f2692d"); px(c, 150, 114, 2, 36, "#ff9a5a"); px(c, 155, 114, 2, 36, "#b84a14");
      px(c, 148, 108, 11, 8, "#f6c84c"); px(c, 148, 108, 11, 2, "#ffe680"); px(c, 152, 104, 3, 4, "#f6c84c");
      px(c, 188, 120, 2, 30, "#6b4423"); px(c, 180, 118, 18, 3, "#9aa2b6");
      for (let i = 0; i < 40; i++) {                                                                                 // snow dust still drifting down
        const sx = ((hash(i, 1, 90) % 340) + t * 8) % 340, sy = ((hash(i, 2, 90) % 200) + t * (14 + i % 4 * 5)) % 200;
        px(c, Math.round(sx), Math.round(sy), 2, 2, "rgba(255,255,255," + (0.9 - clamp01(k / 3) * 0.3).toFixed(2) + ")");
      }
      c.fillStyle = "rgba(255,255,255," + (0.5 * (1 - clamp01(k / 1.2))).toFixed(2) + ")"; c.fillRect(0, 0, SW, SH);
    } },

  // Retail Row - Polar Peak: the pickaxe duel against the squad
  H11: { dur: 5.2, caption: "A pickaxe duel against a squad. They brought guns. Rude.",
    cam: { from: [1.1, 130, 112], to: [1.3, 120, 120], shake: [[2.2, 6, 0.9]] }, grade: "rgba(200,120,150,0.08)",
    draw(c, t) {
      band(c, 0, 130, ["#5a3a82", "#7a4a8a", "#a8508a", "#d86a7a", "#f08a5a", "#f6b060"]);
      FX.glow(c, 250, 112, 60, "255,200,140", 0.4); ellipse(c, 250, 112, 14, 14, "#fff0c0");
      FX.clouds(c, t, 26, "255,180,170", 3, 3, 4);
      FX.ridge(c, 124, 6, 1, "#5a3a72", 0.03); FX.ridge(c, 134, 4, 3, "#3a5a48", 0.05);
      band(c, 146, SH, ["#4f8a3a", "#478034", "#3f742e", "#376828"]);
      px(c, 0, 160, SW, 22, "#8a6a3c"); px(c, 0, 160, SW, 2, "#a8864c");
      FX.grass(c, t, 182, 192, "#4a8a3a", "#6aaa4a");
      [[236, 150], [284, 154]].forEach(([x, y]) => {                                                                // the bushes the squad hides behind
        ellipse(c, x, y, 24, 12, "#1f5a2c"); ellipse(c, x - 7, y - 3, 14, 9, "#2b7a38"); ellipse(c, x + 5, y - 6, 12, 7, "#35893f");
      });
      const reveal = clamp01((t - 1.3) / 0.3), shoot = 2.0;
      const squad = [[238, "renegade"], [262, "skull"], [286, "peely"]];
      if (reveal > 0) squad.forEach(([x, st], i) => {                                                               // they burst out of the bushes
        const shake = t < 1.6 ? Math.sin(t * 40 + i) * 1 : 0;
        npcBig(c, x + shake, GROUND - 6 + 24 * (1 - smooth(reveal)), st, "idle", t, { scale: 2, flip: true });
        px(c, Math.round(x - 36), GROUND - 36, 34, 5, "#2a2d38"); px(c, Math.round(x - 36), GROUND - 36, 34, 1, "#6a6f7d"); px(c, Math.round(x - 24), GROUND - 32, 8, 5, "#7a4a24");   // their guns
      });
      for (let i = 0; i < 12; i++) { const lp = clamp01((t - 1.3 - i * 0.015) / 0.8); if (lp > 0 && lp < 1) px(c, 236 + hash(i, 1, 95) % 50 + Math.round(lp * (hash(i, 2, 95) % 30 - 15)), Math.round(GROUND - 20 - lp * 40 + lp * lp * 50), 3, 2, "#3f9a35"); }   // leaves fly
      const x = lerp(-30, 90, smooth(clamp01(t / 1.1)));
      const raise = smooth(clamp01((t - 1.2) / 0.3));
      if (t < shoot) {
        FX.hero(c, x, GROUND, { dir: "right", step: t < 1.1 ? Math.floor(t * 10) % 2 : 0, t });
        px(c, Math.round(x + 24), GROUND - 36 - raise * 8, 2, 22, "#6b4423"); px(c, Math.round(x + 18), GROUND - 40 - raise * 8, 14, 3, "#9aa2b6"); px(c, Math.round(x + 18), GROUND - 40 - raise * 8, 3, 7, "#9aa2b6");   // the pickaxe raised against guns
        if (t > 1.0) px(c, Math.round(x + 18), GROUND - 40 - raise * 8, 14, 1, "#eef2fa");
        return;
      }
      const k = t - shoot, f = smooth(clamp01((k - 0.2) / 1.0));
      squad.forEach(([sx], i) => { if (Math.floor(k * 18 + i) % 2 === 0 && k < 1.2) FX.muzzle(c, sx - 36, GROUND - 34, -1, 0.9); });
      for (let i = 0; i < 12; i++) { const p = clamp01((k - i * 0.07) / 0.3); if (p > 0 && p < 1) px(c, Math.round(lerp(210, x + 20, p)), Math.round(lerp(GROUND - 34 + (i % 3) * 3, GROUND - 30, p)), 6, 2, "#ffe680"); }
      if (k < 0.9) { FX.sparks(c, x + 24, GROUND - 38, clamp01(k / 0.9), 12, 7); }                                  // bullets spark off the pickaxe
      flash(c, 0.4 - k * 1.2);
      const broken = k > 0.5;
      FX.hero(c, x - 64 * f, GROUND - Math.sin(Math.PI * f) * 30, { pose: "ko", rot: -3 * f, t });
      if (broken) {                                                                                                  // the pickaxe snaps in two and spins away
        const q = clamp01((k - 0.5) / 0.9);
        px(c, Math.round(lerp(x + 24, 150, q)), Math.round(GROUND - 40 + q * q * 50), 2, 12, "#6b4423");
        px(c, Math.round(lerp(x + 18, 190, q)), Math.round(GROUND - 46 + q * q * 40 - Math.sin(q * Math.PI) * 26), 14, 3, "#9aa2b6");
      }
      FX.dust(c, x - 40, GROUND + 6, clamp01((k - 0.8) / 1.0), 6, "190,150,110", 30);
      if (k > 1.2) dizzy(c, x - 62, GROUND - 22, t);
    } },

  // Retail Row - Polar Peak: waving at the rocketeer
  H12: { dur: 5.4, caption: "He waved back. With a rocket.",
    cam: { from: [1.0, 150, 108], to: [1.3, 110, 118], shake: [[3.5, 8, 0.8]] }, grade: "rgba(255,110,60,0.07)",
    draw(c, t) {
      FX.city(c, t, { sky: ["#30185a", "#5a2a78", "#a03a78", "#d85a60", "#f48a4e", "#fbb858"] });
      FX.glow(c, 80, 130, 50, "255,200,120", 0.4);
      px(c, 0, 158, SW, SH - 158, "#5a566a"); px(c, 0, 154, SW, 5, "#7a768a"); px(c, 0, 158, SW, 2, "#3a364a");      // our rooftop and its edge
      px(c, 18, 138, 30, 18, "#8a8f9c"); px(c, 18, 138, 30, 3, "#b4b8c4"); px(c, 24, 142, 18, 8, "#4a4f5e");
      for (let i = 0; i < 4; i++) px(c, 26 + i * 4, 140, 1, 10, "#3a3d4a");
      px(c, 232, 84, 88, 74, "#4a3a62"); px(c, 232, 84, 88, 4, "#6a5a82");                                           // the rooftop across the street with the rocketeer on it
      px(c, 232, 84, 88, 1, "rgba(255,200,140,0.4)");
      const aim = smooth(clamp01((t - 1.6) / 0.5)), fireT = 2.3;
      npcBig(c, 276, 84, "renegade", "idle", t, { scale: 1.6, flip: true });
      const wave = t < 1.6 ? Math.floor(t * 4) % 2 : 0;
      if (t < 1.6) px(c, 262, 52 - wave * 4, 4, 14, "#c9743a");                                                         // he waves back with one arm
      px(c, Math.round(lerp(266, 244, aim)), Math.round(lerp(60, 52, aim)), 38, 8, "#3a3d4a"); px(c, Math.round(lerp(266, 244, aim)), Math.round(lerp(60, 52, aim)), 8, 8, "#c0392b");   // the rocket launcher goes up on his shoulder
      const x = 100;
      FX.hero(c, x, GROUND, { pose: "wave", t });
      if (t > fireT) FX.muzzle(c, 244, 54, -1, clamp01(1 - (t - fireT) * 5));
      if (t > fireT && t < 3.5) {                                                                                       // the rocket curves down to him
        const p = (t - fireT) / 1.2, rx = lerp(246, x + 8, p), ry = lerp(54, GROUND - 22, p * p);
        px(c, Math.round(rx), Math.round(ry), 18, 5, "#e8e8f0"); px(c, Math.round(rx), Math.round(ry), 5, 5, "#e0463c"); px(c, Math.round(rx + 18), Math.round(ry), 4, 5, "#ffb347");
        for (let q = 0; q < 12; q++) ellipse(c, Math.round(lerp(246, rx, 1) + 22 + q * 9 - q * 0.6), Math.round(lerp(54, ry, 1) - q * 1.2 + Math.sin(q + t * 6) * 2), 5 + q % 3, 3 + q % 2, "rgba(214,214,224," + (0.7 - q * 0.05).toFixed(2) + ")");
      }
      if (t < 3.5) return;
      const k = t - 3.5, f = smooth(clamp01(k / 1.4));
      FX.blast(c, x + 4, GROUND - 22, clamp01(k / 2.0), 1.4);
      flash(c, 0.95 - k * 2.4);
      FX.chunks(c, x + 4, GROUND - 20, clamp01(k / 1.6), 18, ["#7a768a", "#5a566a", "#4a4f5e", "#8a8f9c"], 1.6, 1.2, 1.8, 6);
      FX.hero(c, x + 20 * f, GROUND - Math.sin(Math.PI * f) * 30, { pose: "ko", rot: 2.4 * f, tint: "rgba(20,12,8,0.6)", t });
      if (k > 1.0) dizzy(c, x + 20, GROUND - 28, t);
    } },
};

// each film gets the camera, the bars and the fades
const DEATHS = {};
Object.keys(DEATH_FILMS).forEach((id) => { DEATHS[id] = cinematic(DEATH_FILMS[id]); });
