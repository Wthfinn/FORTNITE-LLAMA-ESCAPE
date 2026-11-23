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

// ---------- the places: the same bright daytime scenery the player walks through on the paths ----------
// A danger sits at the far end of its path, so what is around it depends on where the player is walking to.
// FX.where says which setting the film, picture or card must show: "meadow" (Pleasant Park), "tilted" (Tilted Towers),
// "retail" (Retail Row) or "snow" (Polar Peak). The page sets it before it shows anything.

FX.where = "city";
FX.settingOf = (town) => ({ pleasant_park: "meadow", tilted_towers: "tilted", retail_row: "retail", polar_peak: "snow" }[town] || "tilted");

FX.daySky = ["#5fb0ee", "#7cc2f4", "#98d2f8", "#b6e2fb", "#d4f0fd"];

FX.dayMeadow = (c, t) => {                       // Pleasant Park: grass, trees, a wooden fence and a dirt path
  band(c, 0, 132, FX.daySky);
  FX.glow(c, 262, 38, 50, "255,250,200", 0.4); ellipse(c, 262, 38, 12, 12, "#fff7c8"); ellipse(c, 262, 38, 8, 8, "#ffffff");
  FX.clouds(c, t, 22, "255,255,255", 4, 4, 1);
  FX.ridge(c, 112, 6, 1, "#9ab8d8", 0.03); FX.ridge(c, 124, 5, 3, "#78a89a", 0.05);
  FX.trees(c, t, 142, 2, ["#2f7a3c", "#46a04e"], 14);
  band(c, 138, SH, ["#6ab648", "#62ac40", "#5aa238", "#52982f"]);
  for (let i = 0; i < 70; i++) px(c, hash(i, 1, 60) % SW, 140 + hash(i, 2, 60) % 18, 2, 2, ["#ffe14a", "#ff8fc8", "#ffffff", "#ffb347"][i % 4]);        // flowers
  for (let x = 0; x < SW; x += 22) px(c, x, 142, 2, 12, "#8a6038");
  px(c, 0, 145, SW, 2, "#a8784a"); px(c, 0, 150, SW, 2, "#a8784a");
  px(c, 0, 158, SW, 24, "#c8a36a"); px(c, 0, 158, SW, 2, "#dcb87c"); px(c, 0, 180, SW, 2, "#9a7a44");
  for (let x = 0; x < SW; x += 9) px(c, x + hash(x, 1, 5) % 5, 162 + hash(x, 2, 5) % 14, 3, 1, "#a8884e");
  FX.grass(c, t, 150, 158, "#3f9a35", "#6ac04a"); FX.grass(c, t, 182, 192, "#4a8a3a", "#6aaa4a");
  FX.birds(c, t, 24, 5, 14, 3, "#3a3a4a");
  for (let i = 0; i < 4; i++) { const bx = (t * 14 + i * 90) % 340 - 10, by = 124 + Math.sin(t * 3 + i) * 6; px(c, Math.round(bx), Math.round(by), 2, 1, i % 2 ? "#ffd23f" : "#ffffff"); }
};

FX.dayCity = (c, t, where) => {                  // Tilted Towers (tall brick and glass) or Retail Row (low shops with awnings)
  band(c, 0, 140, FX.daySky);
  FX.glow(c, 262, 36, 46, "255,250,200", 0.35); ellipse(c, 262, 36, 11, 11, "#fff7c8");
  FX.clouds(c, t, 22, "255,255,255", 4, 3, 2);
  [[0, 90, 36], [30, 70, 34], [62, 98, 30], [92, 80, 36], [128, 96, 28], [262, 84, 30], [292, 68, 34]].forEach(([x, y, w], i) => {   // hazy buildings far away
    px(c, x, y + 8, w, 60, "#9aa8c4"); px(c, x, y + 8, w, 2, "#b4c0d8");
    for (let wy = y + 14; wy < y + 60; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 8) px(c, wx, wy, 3, 4, hash(wx + wy, i, 6) % 4 === 0 ? "#d8e4f4" : "#8896b4");
  });
  const retail = where === "retail";
  const row = retail ? [[0, 44, 52, "#d85a4a"], [52, 52, 46, "#2f9e4f"], [98, 40, 56, "#e0b030"], [210, 48, 52, "#3a6fe0"], [262, 56, 58, "#d85a4a"]]
    : [[0, 96, 46, "#a8553c"], [46, 112, 40, "#8c8f99"], [86, 90, 48, "#b09a78"], [212, 106, 44, "#8c8f99"], [256, 120, 64, "#a8553c"]];
  row.forEach(([x, h, w, col], i) => {                                                                       // the buildings along the street
    const top = 146 - h;
    px(c, x, top, w, h, col); px(c, x, top, w, 4, "rgba(255,255,255,0.35)"); px(c, x + w - 3, top, 3, h, "rgba(0,0,0,0.18)");
    if (retail) {
      for (let k = 0; k < w; k += 6) px(c, x + k, top + 18, 3, 8, k % 12 ? "#ffffff" : col);                    // a striped awning
      px(c, x + 4, top + 28, w - 8, h - 34, "#9fd8f4"); px(c, x + 4, top + 28, w - 8, 2, "#d8f0ff"); px(c, x + w / 2 - 1, top + 28, 2, h - 34, "#4a4f5e");
      px(c, x + 4, top + 8, w - 8, 8, "#14101c"); px(c, x + 6, top + 10, w - 12, 4, "#ffd23f");
    } else {
      for (let wy = top + 10; wy < 138; wy += 13) for (let wx = x + 5; wx < x + w - 6; wx += 10) {
        px(c, wx - 1, wy - 1, 8, 10, "#4a3a2e"); px(c, wx, wy, 6, 8, hash(wx + wy, i, 9) % 5 === 0 ? "#ffe28a" : "#8fd0f0"); px(c, wx + 3, wy, 1, 8, "#4a3a2e");
      }
    }
  });
  px(c, 0, 144, SW, 9, "#b8b4a8"); px(c, 0, 144, SW, 2, "#d8d4c8"); px(c, 0, 151, SW, 2, "#8a867a");           // the sidewalk and its kerb
  for (let x = 0; x < SW; x += 16) px(c, x, 146, 1, 6, "#a09c90");
  px(c, 0, 153, SW, 39, "#5a5f72"); px(c, 0, 153, SW, 1, "#7a7f92");                                         // the road
  for (let i = 0; i < 30; i++) px(c, hash(i, 1, 70) % SW, 158 + hash(i, 2, 70) % 30, 6 + hash(i, 3, 70) % 14, 1, "rgba(20,20,30,0.3)");   // cracks
  for (let x = 8; x < SW; x += 44) px(c, x, 176, 24, 2, "#d8d4c4");
  ellipse(c, 70, 184, 9, 3, "#3a3d4a"); ellipse(c, 70, 184, 6, 2, "#2a2d38");                                  // a manhole
  ellipse(c, 250, 168, 12, 3, "rgba(120,170,220,0.55)"); ellipse(c, 248, 168, 6, 1, "rgba(220,240,255,0.7)");  // a puddle
  [[24, "#3a6fe0"], [284, "#d85a4a"]].forEach(([x, col]) => { px(c, x, 134, 6, 10, col); px(c, x, 134, 6, 2, "#ffffff"); });                   // a mailbox and a bin
  for (let i = 0; i < 3; i++) { const bx = 120 + i * 9 + Math.round(Math.sin(t * 3 + i) * 1); px(c, bx, 140 + (Math.floor(t * 2 + i) % 2), 3, 3, "#c8c4d0"); px(c, bx + 3, 141, 2, 1, "#f2b25a"); }   // pigeons
  FX.birds(c, t, 22, 3, 10, 4, "#3a3a4a");
};

FX.daySnow = (c, t) => {                         // Polar Peak: mountains, pines and drifts
  band(c, 0, 124, FX.daySky.map((col, i) => ["#8fb0dc", "#a4c0e6", "#bcd2ee", "#d4e2f4", "#eaf2fa"][i]));
  FX.clouds(c, t, 24, "255,255,255", 3, 3, 3);
  mountain(c, 70, 132, 78, 78, "#8d95b0", "#ffffff"); mountain(c, 220, 134, 96, 96, "#7a86a6", "#ffffff"); mountain(c, 300, 132, 56, 54, "#99a8c4", "#ffffff");
  FX.ridge(c, 132, 5, 2, "#dbe6f4", 0.04);
  for (let k = 0; k < 16; k++) pine(c, 6 + k * 21 + hash(k, 1, 7) % 8, 138 + hash(k, 2, 7) % 6, 10 + hash(k, 3, 7) % 4);
  band(c, 144, SH, ["#f4f9ff", "#e8f2fc", "#dce9f6", "#d0e0f0"]);
  for (let x = 0; x < SW; x += 26) ellipse(c, x + hash(x, 4, 9) % 12, 160 + hash(x, 5, 9) % 26, 16, 3, "#ffffff");
  px(c, 0, 144, SW, 2, "#c4d6ea");
  for (let k = 0; k < 14; k++) px(c, hash(k, 1, 77) % SW, 150 + hash(k, 2, 77) % 40, 3, 1, "#b4c8e0");              // footprints
  for (let k = 0; k < 18; k++) if (Math.sin(t * 3 + k) > 0.5) px(c, hash(k, 3, 77) % SW, 148 + hash(k, 4, 77) % 40, 1, 1, "#ffffff");   // sparkles on the snow
  FX.snow(c, t, 24, 16);
};

FX.wall = (c, x, y, w, h) => {                   // a wall: stone in the meadow, brick in town, brick with a snow cap in the mountains
  if (FX.where === "meadow") {
    px(c, x, y, w, h, "#9aa0ae");
    for (let row = 0; row * 8 < h; row++) { px(c, x, y + row * 8, w, 1, "#6a6f7d"); for (let bx = (row % 2) * 10; bx < w; bx += 20) px(c, x + bx, y + row * 8, 1, 8, "#6a6f7d"); }
    for (let k = 0; k < 14; k++) px(c, x + hash(k, 1, 12) % w, y + hash(k, 2, 12) % h, 6, 3, "#5a8a4a");
    px(c, x - 3, y - 4, w + 6, 5, "#6ac04a");
  } else {
    FX.bricks(c, x, y, w, h, "#a8553c", "#7d3c2a");
    if (FX.where === "snow") { px(c, x - 4, y - 6, w + 8, 7, "#f4f9ff"); px(c, x - 4, y - 6, w + 8, 2, "#ffffff"); for (let i = 0; i < w / 10; i++) px(c, x + i * 10 + 2, y + hash(i, 1, 5) % 8, 8, 3, "#f4f9ff"); }
    else px(c, x - 3, y - 4, w + 6, 5, "#cfcabd");
  }
};

FX.perch = (c, x, y, w, h) => {                  // where the sniper lies: a rooftop in town, a rocky outcrop in the meadow or the mountains
  if (FX.where === "meadow" || FX.where === "snow") {
    const snow = FX.where === "snow";
    ellipse(c, x + w / 2, y + h / 2, w / 2 + 4, h / 2 + 6, snow ? "#7a86a6" : "#8a8f9c");
    ellipse(c, x + w / 2 - 6, y + h / 2 + 4, w / 3, h / 3, snow ? "#6a7696" : "#6a6f7d");
    ellipse(c, x + w / 2, y + 3, w / 2, 6, snow ? "#f4f9ff" : "#5aa238"); ellipse(c, x + w / 2 + 6, y + 1, w / 3, 4, snow ? "#ffffff" : "#6ac04a");
  } else {
    px(c, x, y, w, 8, "#8a8f9c"); px(c, x, y, w, 2, "#b5b1a5"); px(c, x + 8, y + 8, w - 8, h - 8, FX.where === "retail" ? "#d85a4a" : "#a8553c");
    for (let wy = y + 16; wy < y + h - 6; wy += 14) for (let wx = x + 16; wx < x + w - 6; wx += 14) px(c, wx, wy, 6, 8, hash(wx + wy, 1, 3) % 4 === 0 ? "#ffe28a" : "#8fd0f0");
  }
};

// ---------- the sniper in the brush: a patch of undergrowth and a sniper in a ghillie suit lying in it ----------
// (x, y) = middle of the patch at ground level, w = its width. The brush is drawn in two parts so the sniper can lie between them:
// FX.brushBack first, then FX.ghillie, then FX.brushFront over the rifle. In town the patch is a weedy, overgrown strip by the kerb.

FX.brushBack = (c, x, y, w, t, o) => {
  o = o || {};
  const town = FX.where === "retail" || FX.where === "tilted";
  const dark = town ? ["#2a4a2a", "#34562e", "#2a4224"] : ["#1f4a28", "#2a5e32", "#245028"];
  const mid = town ? ["#4a7a3a", "#58883f", "#628f44"] : ["#2f7a3c", "#3a8a44", "#46a04e"];
  const sway = (i) => Math.round(Math.sin(t * 1.5 + i * 0.9) * 1);
  ellipse(c, x, y + 4, Math.round(w / 2 + 8), 5, "rgba(0,0,0,0.3)");
  if (town) {                                                                              // an overgrown strip along the kerb
    px(c, x - w / 2 - 4, y - 1, w + 8, 9, "#8a867a"); px(c, x - w / 2 - 4, y - 1, w + 8, 2, "#b8b4a8"); px(c, x - w / 2 - 4, y + 6, w + 8, 2, "#5a574e");
    for (let i = 0; i < 8; i++) px(c, x - w / 2 + hash(i, 1, 210) % w, y + 1 + hash(i, 2, 210) % 5, 5, 1, "rgba(0,0,0,0.25)");
  }
  for (let i = 0; i < 16; i++) {                                                           // the dark back of the bush
    const bx = x - w / 2 + 6 + i * (w - 12) / 15, by = y - 8 - hash(i, 3, 210) % 12;
    ellipse(c, Math.round(bx) + sway(i), by, 13 + hash(i, 4, 210) % 8, 10 + hash(i, 5, 210) % 7, dark[i % 3]);
  }
  for (let i = 0; i < 12; i++) {                                                           // lighter leaves higher up
    const bx = x - w / 2 + 10 + i * (w - 20) / 11, by = y - 20 - hash(i, 6, 210) % 12;
    ellipse(c, Math.round(bx) + sway(i + 3), by, 11 + hash(i, 7, 210) % 6, 8 + hash(i, 8, 210) % 5, mid[i % 3]);
    ellipse(c, Math.round(bx) - 3 + sway(i + 3), by - 3, 6, 3, o.light || "#7ac860");
  }
  if (o.hollowAt !== undefined) { ellipse(c, o.hollowAt, y - 7, 40, 14, "#10281a"); ellipse(c, o.hollowAt - 4, y - 5, 32, 9, "#0b1d0f"); }     // a hollow in the bush where the sniper lies
  for (let i = 0; i < 9; i++) {                                                            // twigs and branches poking out
    const bx = x - w / 2 + 8 + hash(i, 9, 210) % (w - 16), len = 8 + hash(i, 10, 210) % 10, dir = hash(i, 11, 210) % 2 ? 1 : -1;
    for (let q = 0; q < len; q++) px(c, bx + dir * q, y - 30 - q + hash(i, 12, 210) % 8, 1, 1, "#5a4020");
  }
};

FX.brushFront = (c, x, y, w, t, o) => {
  o = o || {};
  const town = FX.where === "retail" || FX.where === "tilted";
  const sway = (i) => Math.round(Math.sin(t * 1.8 + i * 1.1) * 1);
  const dark = town ? "#34562e" : "#245028", mid = town ? "#628f44" : "#46a04e", light = "#86d460";
  for (let i = 0; i < 26; i++) {                                                           // tall grass and ferns in front
    if (o.sparse && i % 2) continue;                                                       // fewer blades, so the sniper can be seen between them
    const bx = x - w / 2 + 2 + i * (w - 4) / 25, h = (o.sparse ? 5 : 8) + hash(i, 13, 210) % (o.sparse ? 7 : 12), s = sway(i);
    px(c, bx + s, y + 2 - h, 1, h, i % 3 ? mid : dark); px(c, bx + 2 + s, y + 3 - h + 2, 1, h - 2, i % 2 ? light : mid); px(c, bx - 1 + s * 2, y + 2 - h - 1, 1, 2, light);
  }
  for (let i = 0; i < 7; i++) {                                                            // fern fronds fanning out
    const fx = x - w / 2 + 10 + i * (w - 20) / 6, fy = y + 1;
    for (let q = 1; q < 9; q++) { px(c, fx - q, fy - q * 0.8 - (i % 2) * 2, 2, 1, q % 2 ? mid : light); px(c, fx + q, fy - q * 0.8 - (i % 2) * 2, 2, 1, q % 2 ? light : mid); }
  }
  for (let i = 0; i < 10; i++) {                                                           // flowers in the meadow, dandelions in town
    const fx = x - w / 2 + hash(i, 14, 210) % w, fy = y - hash(i, 15, 210) % 8;
    px(c, fx, fy, 2, 2, town ? "#ffe14a" : ["#ff8fc8", "#ffffff", "#ffe14a"][i % 3]); px(c, fx, fy + 2, 1, 3, dark);
  }
  for (let i = 0; i < 6; i++) px(c, x - w / 2 + hash(i, 16, 210) % w, y - 10 - hash(i, 17, 210) % 14 + Math.round(Math.sin(t * 2 + i) * 2), 2, 1, light);     // a few loose leaves
};

// The sniper lies on the ground facing left (towards the player). o: glint (scope flash), rise (head lifts 0..1), flash (muzzle flash 0..1).
FX.ghillie = (c, x, y, t, o) => {                         // o.scale draws him bigger so he can be seen
  o = o || {};
  if (o.scale && o.scale !== 1) {
    c.save(); c.translate(x, y); c.scale(o.scale, o.scale);
    FX.ghillie(c, 0, 0, t, Object.assign({}, o, { scale: 1 }));
    c.restore();
    return;
  }
  const rise = o.rise || 0, strands = ["#5a6a2a", "#7a6a3a", "#4a5a22", "#8a7a45", "#3a4a22"];
  ellipse(c, x + 12, y + 2, 30, 4, "rgba(0,0,0,0.3)");
  ellipse(c, x + 14, y - 6, 26, 8, "#34502a"); ellipse(c, x + 6, y - 9, 16, 6, "#3f5a2a");                                  // the long body
  ellipse(c, x - 12, y - 8 - rise * 3, 10, 8 + rise, "#34502a"); ellipse(c, x - 14, y - 10 - rise * 3, 7, 5, "#4a6a30");     // the hood
  for (let k = 0; k < 54; k++) {                                                                                          // strands of burlap and grass hanging all over the suit
    const sx = x - 22 + (k * 71) % 62, sy = y - 12 + (k * 13) % 10 - (sx < x - 6 ? rise * 3 : 0), len = 3 + (k * 7) % 5, sw = Math.round(Math.sin(t * 1.4 + k) * 1);
    px(c, sx + sw, sy, 1, len, strands[k % 5]); px(c, sx + 1 + sw, sy + 1, 1, Math.max(1, len - 2), strands[(k + 2) % 5]);
  }
  [[x + 6, y - 11, 8, 3, "#7a6a3a"], [x + 22, y - 9, 7, 3, "#5a6a2a"], [x - 4, y - 13 - rise * 3, 6, 2, "#8a7a45"]].forEach(([bx, by, bw, bh, col]) => px(c, bx, by, bw, bh, col));   // patches of cloth
  px(c, x - 19, y - 10 - rise * 3, 5, 3, "#14110a");                                                                       // the face in shadow
  const blink = Math.floor(t * 0.8) % 5 === 0 && (t * 0.8) % 1 < 0.2;
  if (!blink) { px(c, x - 18, y - 9 - rise * 3, 2, 1, "#fff6c0"); px(c, x - 16, y - 9 - rise * 3, 1, 1, "#fff6c0"); }       // one watchful eye
  px(c, x - 62, y - 6, 46, 2, "#2a2d38"); px(c, x - 62, y - 6, 46, 1, "#6a7288"); px(c, x - 64, y - 7, 3, 4, "#14141c");       // the long barrel of the heavy sniper
  px(c, x - 28, y - 7, 12, 3, "#8a6a1a"); px(c, x - 52, y - 6, 14, 1, "#f4c542");                                           // gold parts
  px(c, x - 38, y - 12, 16, 5, "#1a1c26"); px(c, x - 38, y - 12, 16, 1, "#4a5060"); px(c, x - 39, y - 11, 2, 3, "#8fd4ff");  // the scope
  px(c, x - 52, y - 4, 1, 7, "#2a2d38"); px(c, x - 46, y - 4, 1, 7, "#2a2d38");                                             // the little legs of the rifle
  for (let k = 0; k < 5; k++) px(c, x - 56 + k * 9, y - 8 - (k % 2) * 1, 1, 3 + k % 3, strands[(k + 1) % 5]);                  // strands draped over the barrel
  if (o.glint) { px(c, x - 46, y - 11, 9, 1, "#fff"); px(c, x - 42, y - 15, 1, 9, "#fff"); px(c, x - 44, y - 13, 5, 5, "rgba(255,255,255,0.45)"); }
  if (o.flash) FX.muzzle(c, x - 66, y - 5, -1, o.flash);
};

FX.scenery = (c, t) => {                         // whatever setting FX.where says
  const w = FX.where;
  if (w === "meadow") FX.dayMeadow(c, t);
  else if (w === "snow") FX.daySnow(c, t);
  else FX.dayCity(c, t, w === "retail" ? "retail" : "tilted");
};
FX.meadow = FX.city = FX.snowland = (c, t) => FX.scenery(c, t);    // older calls all show the current setting

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
    cam: { from: [1.05, 110, 102], to: [1.55, 206, 124], shake: [[1.9, 6, 0.7]] },
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
    cam: { from: [1.0, 150, 108], to: [1.25, 150, 106], shake: [[2.7, 5, 0.6]] },
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
    cam: { from: [1.0, 120, 108], to: [1.5, 150, 118], shake: [[2.1, 5, 0.7]] },
    draw(c, t) {
      FX.scenery(c, t);
      // the camp: a tent, a fire and logs
      for (let y = 96; y <= 152; y++) { const half = Math.round((y - 96) * 38 / 56); px(c, 252 - half, y, half, 1, "#3f8a3a"); px(c, 252, y, half + 1, 1, "#2a5e2a"); }
      for (let y = 118; y <= 152; y++) { const half = Math.round((y - 118) * 13 / 34); px(c, 252 - half, y, half * 2 + 1, 1, "#0e0a08"); }
      px(c, 252, 96, 1, 56, "#1a3a1c"); px(c, 252, 88, 2, 10, "#8a5a2c"); px(c, 254, 88, 8 + Math.floor(t * 4) % 2, 5, "#e0463c");
      const fire = 0.35 + 0.1 * Math.sin(t * 9);
      FX.glow(c, 196, 150, 40, "255,150,40", fire * 0.6);
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

  // Pleasant Park - Retail Row: the sniper lying in the brush (first the wide shot, then through the scope)
  H4: { dur: 5.6, caption: "A sniper has a very good view of people checking their maps.",
    cam: { from: [1.0, 170, 104], to: [1.18, 140, 112], shake: [[3.1, 7, 0.7]] },
    draw(c, t) {
      const shot = 3.1, hx = 96, bx = 250, sx = 262;
      const map = (m) => {                                                                                         // the unfolded map in front of his chest
        const sway = Math.round(Math.sin(t * 4)), my = GROUND - 28 + sway;
        px(c, hx - 14, my, 28, 20, "#1b1030"); px(c, hx - 13, my + 1, 26, 18, "#f3e6c8");
        px(c, hx - 8, my + 6, 14, 1, "#7cc4ff"); px(c, hx - 4, my + 10, 9, 1, "#7cc4ff"); px(c, hx + 2, my + 11, 4, 1, "#e0463c"); px(c, hx + 3, my + 10, 1, 3, "#e0463c");
      };
      const place = (o) => {                                                                                       // the brush with the sniper in it
        FX.brushBack(c, bx, GROUND + 2, 124, t, { hollowAt: sx - 6 });
        FX.ghillie(c, sx + 6, GROUND - 2, t, Object.assign({ scale: 1.5 }, o));
        FX.brushFront(c, bx, GROUND + 2, 124, t, { sparse: true });
      };
      if (t < 1.7) {                                                                                               // wide: he stops and opens his map; the scope glints in the leaves
        FX.scenery(c, t);
        const x = lerp(-30, hx, smooth(clamp01(t / 1.0)));
        if (t < 1.0) FX.runDust(c, x, GROUND, t * 0.6);
        FX.hero(c, x, GROUND, { dir: t < 1.0 ? "right" : "down", step: t < 1.0 ? Math.floor(t * 8) % 2 : 0, t });
        if (t > 1.0) map();
        place({ glint: t > 1.15 && Math.floor(t * 6) % 3 === 0 });
        return;
      }
      if (t < shot) {                                                                                              // through the scope, between the leaves
        const k = t - 1.7;
        c.fillStyle = "#050508"; c.fillRect(0, 0, SW, SH);
        c.save(); c.beginPath(); c.arc(160, 96, 86, 0, Math.PI * 2); c.clip();
        const zoom = 2.4 + k * 0.08, sw = Math.sin(t * 2.4) * 5 * (1 - clamp01(k / 1.2)), sh = Math.cos(t * 1.9) * 4 * (1 - clamp01(k / 1.2));
        c.save(); c.translate(160 - hx * zoom + sw, 96 - (GROUND - 32) * zoom + sh); c.scale(zoom, zoom);
        FX.scenery(c, t); FX.hero(c, hx, GROUND, { t, step: 0 }); map();
        c.restore();
        for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + 0.2; ellipse(c, Math.round(160 + Math.cos(a) * 92), Math.round(96 + Math.sin(a) * 92), 16 + i % 3 * 4, 9 + i % 2 * 3, i % 3 ? "#1f4a28" : "#2a5e32"); }   // leaves at the edge of the view
        c.restore();
        const mark = (x, y, w, h) => { px(c, x + 1, y + 1, w, h, "rgba(0,0,0,0.6)"); px(c, x, y, w, h, "#f4f4d8"); };
        mark(76, 96, 76, 1); mark(168, 96, 76, 1); mark(160, 12, 1, 76); mark(160, 104, 1, 76);
        for (let q = 1; q < 8; q++) { mark(160 + q * 10 - 1, 93, 1, 7); mark(160 - q * 10, 93, 1, 7); mark(157, 96 + q * 10, 7, 1); mark(157, 96 - q * 10, 7, 1); }
        if (k > 0.7) px(c, 155, 91, 11, 11, "rgba(255,40,40," + (0.3 + 0.35 * Math.sin(t * 14)).toFixed(2) + ")");
        FX.ring(c, 160, 96, 86, 86, "#0e0e14");
        return;
      }
      const k = t - shot;                                                                                          // the shot from the brush
      FX.scenery(c, t);
      place({ flash: clamp01(1 - k * 5), rise: clamp01(k * 3) * (1 - clamp01((k - 0.8) / 0.6)) });
      FX.chunks(c, 166, GROUND - 6, clamp01(k / 1.2), 18, ["#3f9a35", "#2c7a2c", "#6ac04a", "#5a4020"], 1.6, 1.0, 1.6, 8);       // the muzzle blast throws leaves
      FX.dust(c, 190, GROUND + 4, clamp01(k / 1.2), 6, "170,150,110", 34);
      FX.plume(c, 166, GROUND - 8, clamp01(k / 2.0), 26, "200,200,210");
      px(c, 214 + Math.round(k * 40), GROUND - 18 + Math.round(k * k * 40), 2, 1, "#d9a63a");                          // a shell casing flies out
      flash(c, 0.85 - k * 2.6);
      for (let i = 0; i < 5; i++) { const bxp = 230 + i * 18 + k * (30 + i * 10), byp = GROUND - 60 - k * (40 + i * 8); if (byp > 14) { px(c, Math.round(bxp), Math.round(byp), 3, 1, "#2a1a3a"); px(c, Math.round(bxp) + 3, Math.round(byp) + (Math.floor(k * 14 + i) % 2), 3, 1, "#2a1a3a"); } }   // birds burst out of the trees
      const f = smooth(clamp01(k / 0.6));
      px(c, Math.round(hx - 14 + f * 130), Math.round(GROUND - 28 - f * 60), 22, 14, "#f3e6c8");                          // the map flutters away
      FX.dust(c, hx, GROUND + 4, clamp01((k - 0.2) / 1.2), 6, "190,180,170", 30);
      FX.hero(c, hx - 14 * f, GROUND + 6, { pose: "ko", rot: -1.55 * f, t });
      if (k > 0.9) dizzy(c, hx - 2, GROUND - 24, t);
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
    cam: { from: [1.0, 120, 108], to: [1.2, 110, 114], shake: [[2.3, 7, 0.7]] },
    draw(c, t) {
      FX.snowland(c, t, { sky: ["#7a8aae", "#8c9cc0", "#a0aed0", "#b4c0dc", "#cbd4ea"] });
      FX.wall(c, 150, 60, 62, 102);
px(c, 200, 60, 10, 102, "#a6705e"); px(c, 208, 60, 2, 102, "#5e3a2e");                                        // the corner
      if (FX.where === "snow") { px(c, 0, 162, SW, 30, "#e8f2fc"); px(c, 0, 162, SW, 2, "#c4d6ea"); }
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
    cam: { from: [1.0, 120, 108], to: [1.45, 78, 120], shake: [[2.7, 8, 0.8]] },
    draw(c, t) {
      FX.city(c, t);
      FX.lamp(c, 270, GROUND + 6, false, t);
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

  // Tilted Towers - Retail Row: the Launch Pad (he flies up, forgets he has no glider, and falls)
  H6: { dur: 6.0, caption: "He forgot the glider. Gravity did not forget him.",
    cam: { from: [1.0, 160, 96], to: [1.0, 160, 96], shake: [[1.75, 4, 0.5], [4.9, 10, 0.9]] },
    draw(c, t) {
      const launch = 1.7, apex = 3.5, hover = 4.0, land = 4.9, padX = 184;
      let h = 0;                                                                                                    // how high he is above the street (in pixels)
      if (t >= launch && t < apex) { const p = (t - launch) / (apex - launch); h = 420 * (1 - (1 - p) * (1 - p)); }
      else if (t >= apex && t < hover) h = 420 + Math.sin((t - apex) * 6) * 4;
      else if (t >= hover && t < land) { const q = (t - hover) / (land - hover); h = 420 * (1 - q * q); }
      const camAlt = Math.max(0, h - 70), sy = (alt) => GROUND - (alt - camAlt), k = clamp01(camAlt / 340);
      const mix = (a, b, f) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = (sh) => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, f)); return "rgb(" + ch(16) + "," + ch(8) + "," + ch(0) + ")"; };
      const low = ["#5fb0ee", "#7cc2f4", "#98d2f8", "#b6e2fb", "#d4f0fd", "#e8f6fe"], high = ["#06061e", "#0c0c34", "#141450", "#1e1e78", "#3636a0", "#6a60c8"];
      band(c, 0, SH, low.map((col, i) => mix(col, high[i], k)));                                                   // the sky gets darker the higher he goes
      if (k > 0.2) for (let i = 0; i < 40; i++) px(c, hash(i, 1, 51) % SW, hash(i, 2, 51) % 120, 1, 1, "rgba(255,255,255," + ((k - 0.2) * Math.abs(Math.sin(t * 2 + i))).toFixed(2) + ")");
            [[0, 30, 40], [34, 50, 32], [70, 36, 36], [110, 56, 30], [262, 44, 30], [292, 62, 34]].forEach(([x, hh, w], i) => {   // far buildings (they move slowly)
        const base = GROUND - (0 - camAlt * 0.6);
        px(c, x, base - hh, w, hh + 60, "#9aa8c4"); px(c, x, base - hh, w, 2, "#b4c0d8");
        for (let wy = base - hh + 6; wy < base - 2; wy += 8) for (let wx = x + 4; wx < x + w - 4; wx += 8) px(c, wx, wy, 3, 4, hash(wx + wy, i, 6) % 5 === 0 ? "#ffe28a" : "#8896b4");
      });
      clockTower(c, 52, sy(0) - 80);                                                                                // the clock tower he flies past
      [[96, 70, 44], [150, 54, 40], [232, 76, 46], [284, 60, 36]].forEach(([x, hh, w], i) => {                      // near buildings
        px(c, x, sy(0) - hh, w, hh + 12, "#a8553c"); px(c, x, sy(0) - hh, w, 3, "#c8785c");
        for (let wy = sy(0) - hh + 8; wy < sy(0) - 4; wy += 10) for (let wx = x + 5; wx < x + w - 5; wx += 9) px(c, wx, wy, 4, 5, hash(wx + wy, i, 8) % 4 === 0 ? "#ffe28a" : "#8896b4");
      });
      const gy = sy(0);
      if (gy < SH) {                                                                                                // the street
        px(c, 0, gy, SW, SH - gy + 20, "#5a5f72"); px(c, 0, gy, SW, 3, "#7a7f92"); px(c, 0, gy, SW, 1, "rgba(255,255,255,0.3)");
        for (let x = 8; x < SW; x += 44) px(c, x, gy + 26, 24, 2, "#d8d4c4");
        FX.lamp(c, 30, gy + 6, false, t); FX.lamp(c, 296, gy + 6, false, t);
        drawLaunchPad(c, padX, gy - 20, t, { noBeam: t >= launch });
      }
      for (let i = 0; i < 9; i++) {                                                                                 // clouds he flies through
        const cx = ((hash(i, 1, 61) % 380) + t * 6 * (1 + i % 3)) % 380 - 30, cy = sy(250 + (i % 4) * 26);
        ellipse(c, Math.round(cx), Math.round(cy), 30 + i % 3 * 8, 8 + i % 2 * 3, "rgba(255,200,190," + (0.45 + 0.2 * (1 - k)).toFixed(2) + ")");
        ellipse(c, Math.round(cx + 14), Math.round(cy + 3), 22, 6, "rgba(255,225,220,0.4)");
      }
      if (t >= launch && t < apex) {                                                                                // the pad's beam follows him up
        const a = 0.25 * (1 - (t - launch) / (apex - launch));
        c.fillStyle = "rgba(122,240,224," + a.toFixed(2) + ")"; c.fillRect(padX + 9, 0, 14, Math.max(0, sy(0) - 4));
      }
      const walk = clamp01(t / 1.4), hopT = clamp01((t - 1.4) / 0.3);
      const heroX = t < launch ? lerp(-30, padX + 14, smooth(walk)) : lerp(padX + 14, 150, smooth(clamp01((t - launch) / (land - launch))));
      const heroY = t < launch ? GROUND - 6 * Math.sin(Math.PI * hopT) : GROUND - Math.min(h, 70);
      if (t < land) {
        if (t < launch) { FX.runDust(c, heroX, GROUND, t * 0.7); FX.hero(c, heroX, heroY, { dir: "right", step: walk < 1 ? Math.floor(t * 8) % 2 : 0, pose: "walk", t }); }
        else {
          const asc = t < apex, hov = t >= apex && t < hover, pan = t >= hover - 0.05 && t < land;
          const flail = hov ? Math.floor(t * 10) % 2 : 0;
          FX.hero(c, heroX + (hov ? Math.sin(t * 14) * 2 : 0), heroY, { pose: asc ? "scared" : hov ? (flail ? "fall" : "scared") : "fall", rot: pan ? Math.sin(t * 9) * 0.5 : hov ? Math.sin(t * 8) * 0.25 : 0, t, noShadow: true });
          if (asc) for (let i = 0; i < 12; i++) px(c, Math.round(heroX - 18 + (i * 7) % 40), Math.round(heroY - 70 + ((t * 300 + i * 41) % 160)), 1, 10, "rgba(255,255,255,0.45)");   // wind streaks
          if (pan) for (let i = 0; i < 16; i++) px(c, Math.round(heroX - 24 + (i * 9) % 54), Math.round(heroY + 70 - ((t * 360 + i * 37) % 170)), 1, 12, "rgba(255,255,255,0.5)");
          if (hov) for (let d = 0; d < 4; d++) { const dy = (t * 40 + d * 9) % 24; px(c, Math.round(heroX + 20 + d * 3), Math.round(heroY - 54 + dy), 2, 3, "#7cc4ff"); }   // sweat drops
        }
      }
      if (t >= 3.4 && t < 4.6) {                                                                                    // the "no glider to redeploy" icon
        const on = Math.floor(t * 8) % 2 === 0 || t > 4.3;
        px(c, 236, 24, 64, 30, "rgba(10,6,24,0.8)"); px(c, 236, 24, 64, 1, "#fff"); px(c, 236, 53, 64, 1, "#fff"); px(c, 236, 24, 1, 30, "#fff"); px(c, 299, 24, 1, 30, "#fff");
        for (let q = 0; q < 14; q++) px(c, 250 + q * 2, 32 + Math.round(7 - Math.sqrt(Math.max(0, 49 - (q - 7) * (q - 7)))), 2, 3, q % 3 ? "#ffffff" : "#6fb8ff");      // the glider: a curved wing
        [[254, 38], [276, 38]].forEach(([lx, ly]) => px(c, lx, ly, 1, 8, "#cfd8ff")); px(c, 262, 46, 8, 4, "#f2692d");
        if (on) for (let q = 0; q < 24; q++) { px(c, 272 + q, 27 + Math.round(q * 0.9), 3, 3, "#ff2a3a"); px(c, 295 - q, 27 + Math.round(q * 0.9), 3, 3, "#ff2a3a"); }   // a big red cross
      }
      if (t >= land) {                                                                                              // he hits the street
        const k2 = t - land, sx = 150;
        flash(c, 0.95 - k2 * 2.6);
        FX.dust(c, sx, GROUND + 8, clamp01(k2 / 1.2), 9, "190,175,160", 60);
        if (k2 < 0.5) shockRing(c, sx, GROUND + 10, k2 * 2);
        ellipse(c, sx, GROUND + 8, 36, 8, "#1a1420"); ellipse(c, sx, GROUND + 7, 28, 6, "#0e0a14");
        for (let r = 0; r < 9; r++) { const ang = r * 0.7, len = 34 + hash(r, 1, 33) % 26; for (let q = 0; q < len; q += 3) px(c, Math.round(sx + Math.cos(ang) * (22 + q) * 1.2), Math.round(GROUND + 9 + Math.sin(ang) * (6 + q * 0.3)), 2, 1, "#14101c"); }   // cracks in the road
        FX.chunks(c, sx, GROUND + 6, clamp01(k2 / 1.4), 18, ["#5a5f72", "#7a7f92", "#2a2538"], 1.8, 1.4, 1.8, 6);
        c.save(); c.translate(sx, GROUND + 10); c.scale(1.5, 0.32); c.translate(-sx, -(GROUND + 10));                  // he is flat as a pancake
        fishAt(c, sx, GROUND + 10, { pose: "ko", rot: 1.5, t });
        c.restore();
        const hat = Math.abs(Math.sin(Math.min(k2, 1.2) * 5)) * 30 * (1 - clamp01(k2 / 1.2));                          // his hat bounces away
        px(c, sx + 16, Math.round(GROUND - 4 - hat), 7, 3, "#a88b5a"); px(c, sx + 18, Math.round(GROUND - 7 - hat), 4, 3, "#a88b5a");
        if (k2 > 0.6) dizzy(c, sx, GROUND - 6, t);
        if (k2 > 0.2 && Math.floor(t * 9) % 3 === 0) FX.sparks(c, padX + 16, GROUND - 6, 0.5, 8, 4);                  // the pad flickers out from the shock
        FX.plume(c, sx + 4, GROUND - 4, clamp01(k2 / 1.8), 30, "170,160,150");
      }
    } },

  // Tilted Towers - Polar Peak: the thin ice (then under the ice)
  H9: { dur: 5.6, caption: "Sliding on thin ice on your stomach. Chill. (Literally.)",
    cam: { from: [1.15, 110, 130], to: [1.0, 160, 96], shake: [[2.7, 5, 0.6]] },
    draw(c, t) {
      const breakT = 2.7;
      if (t < breakT) {
        band(c, 0, 90, ["#8fb0dc", "#a4c0e6", "#bcd2ee", "#d4e2f4", "#eaf2fa"]);
        FX.clouds(c, t, 20, "255,255,255", 3, 3, 3);
        mountain(c, 70, 100, 56, 80, "#8d95b0", "#ffffff"); mountain(c, 250, 102, 64, 90, "#7a86a6", "#ffffff");
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
        band(c, 0, 110, ["#8fb0dc", "#a4c0e6", "#bcd2ee", "#d4e2f4"]);
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
    cam: { from: [1.0, 120, 108], to: [1.3, 180, 116], shake: [[2.4, 6, 1.4]] },
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
    cam: { from: [1.1, 130, 112], to: [1.3, 120, 120], shake: [[2.2, 6, 0.9]] },
    draw(c, t) {
      FX.scenery(c, t);
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
    cam: { from: [1.0, 150, 108], to: [1.3, 110, 118], shake: [[3.5, 8, 0.8]] },
    draw(c, t) {
      FX.scenery(c, t);
      px(c, 0, 158, SW, SH - 158, "#6f7384"); px(c, 0, 154, SW, 5, "#a0a4b4"); px(c, 0, 158, SW, 2, "#505468");      // our rooftop and its edge
      px(c, 18, 138, 30, 18, "#8a8f9c"); px(c, 18, 138, 30, 3, "#b4b8c4"); px(c, 24, 142, 18, 8, "#4a4f5e");
      for (let i = 0; i < 4; i++) px(c, 26 + i * 4, 140, 1, 10, "#3a3d4a");
      px(c, 232, 84, 88, 74, "#8c8f99"); px(c, 232, 84, 88, 4, "#b5b1a5");                                           // the rooftop across the street with the rocketeer on it
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
      FX.chunks(c, x + 4, GROUND - 20, clamp01(k / 1.6), 18, ["#a0a4b4", "#6f7384", "#4a4f5e", "#8a8f9c"], 1.6, 1.2, 1.8, 6);
      FX.hero(c, x + 20 * f, GROUND - Math.sin(Math.PI * f) * 30, { pose: "ko", rot: 2.4 * f, tint: "rgba(20,12,8,0.6)", t });
      if (k > 1.0) dizzy(c, x + 20, GROUND - 28, t);
    } },
};

// each film gets the camera, the bars and the fades
const DEATHS = {};
Object.keys(DEATH_FILMS).forEach((id) => { DEATHS[id] = cinematic(DEATH_FILMS[id]); });
