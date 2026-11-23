"use strict";

// Everything in the sky: the Battle Bus (a battered blue bus hanging from a big blue-and-white balloon), the glider
// (an umbrella-style Fortnite glider), the long dive out of the bus, the glider landings, the supply drop, the title
// picture, the disco of the default dance and the flight out of the Storm. All drawn in code in the game's pixel style,
// with layered scenery, a moving camera, shake, bars and fades (the same standard as the death films).
// Nothing in here decides game rules: it only draws what the page tells it to.

const SKY = {};

// ---------- the Battle Bus ----------

// The bus and its balloon are drawn once into small canvases (at 1x), then moved and swung around every frame.
SKY.parts = null;
SKY.makeParts = () => {
  const mk = (w, h) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return [cv, cv.getContext("2d")]; };
  // --- the balloon: 64 x 74, blue and white gores with a darker blue crown, a skirt and a few patches ---
  const [bal, g] = mk(64, 74);
  const rx = 30, ry = 34, cx = 32, cy = 35;
  for (let y = 0; y < 70; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - cy) * (y - cy)) / (ry * ry))));
    for (let x = cx - half; x <= cx + half; x++) {
      const u = (x - cx) / Math.max(1, half), gore = Math.floor((u + 1) * 3.2 * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)))) % 2;
      let col = y < 9 ? "#1f5fc0" : gore ? "#f4faff" : (y < 22 ? "#3a90e8" : "#2f80e0");
      if (x > cx + half * 0.45) col = gore ? "#b4cce8" : "#1f68c0";                 // the shaded side
      if (x < cx - half * 0.55 && y > 8 && y < 40) col = gore ? "#ffffff" : "#5ab0f8";   // the lit side
      px(g, x, y, 1, 1, col);
    }
  }
  for (let y = 4; y < 66; y += 6) { const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - cy) * (y - cy)) / (ry * ry)))); px(g, cx - half, y, half * 2 + 1, 1, "rgba(20,60,140,0.25)"); }   // seams between the panels
  [[22, 40, 7, 4], [38, 24, 6, 3], [36, 50, 8, 3]].forEach(([x, y, w, h]) => { px(g, x, y, w, h, "rgba(30,50,90,0.25)"); px(g, x + 1, y + 1, w - 2, 1, "rgba(255,255,255,0.3)"); });   // worn patches
  px(g, 18, 10, 6, 2, "rgba(255,255,255,0.6)"); px(g, 16, 14, 4, 2, "rgba(255,255,255,0.4)");                                           // a shine
  px(g, 24, 66, 16, 5, "#1f4f9a"); px(g, 22, 64, 20, 3, "#2f6ac0"); px(g, 26, 70, 12, 2, "#14284a");                                     // the skirt at the bottom
  // --- the bus: 76 x 42, facing left, with a driver in the windshield, a roof rack, wheels and worn paint ---
  const [bus, h] = mk(76, 42);
  px(h, 4, 14, 70, 20, "#2f5fb8"); px(h, 4, 14, 70, 3, "#4a82e0"); px(h, 4, 31, 70, 4, "#223f80");                                       // the body
  px(h, 2, 20, 8, 14, "#2f5fb8"); px(h, 2, 20, 8, 2, "#4a82e0"); px(h, 0, 28, 4, 6, "#223f80");                                           // the nose
  px(h, 6, 25, 66, 3, "#6ad0f0"); px(h, 6, 25, 66, 1, "#a8f0ff");                                                                          // the cyan stripe
  px(h, 8, 10, 62, 5, "#3f78d8"); px(h, 8, 10, 62, 1, "#7ab0f8");                                                                          // the roof
  for (let i = 0; i < 5; i++) { px(h, 22 + i * 10, 17, 9, 7, "#14284a"); px(h, 23 + i * 10, 18, 7, 5, "#bfe6ff"); px(h, 23 + i * 10, 18, 7, 1, "#ffffff"); }   // five windows
  px(h, 10, 16, 11, 11, "#14284a"); px(h, 11, 17, 9, 9, "#9fd8f4"); px(h, 11, 17, 9, 2, "#e8f8ff");                                        // the windshield
  px(h, 14, 19, 5, 6, "#2a2d38"); px(h, 15, 18, 3, 3, "#e8b88a"); px(h, 14, 17, 5, 2, "#e0463c");                                          // the driver with a red cap
  px(h, 62, 15, 8, 18, "#14284a"); px(h, 63, 16, 6, 16, "#4a82e0"); px(h, 66, 24, 1, 3, "#f4c542");                                         // the door
  px(h, 0, 30, 5, 3, "#ffe680"); px(h, 0, 30, 2, 3, "#ffffff"); px(h, 0, 33, 6, 2, "#8a92a6");                                             // the headlight and the bumper
  px(h, 72, 32, 4, 3, "#8a92a6"); px(h, 72, 28, 3, 3, "#e0463c");                                                                         // the back bumper and a taillight
  [[14, 36], [50, 36]].forEach(([wx, wy]) => { ellipse(h, wx, wy, 6, 6, "#14141c"); ellipse(h, wx, wy, 3, 3, "#aab0c0"); px(h, wx, wy, 1, 1, "#14141c"); });   // the wheels
  px(h, 12, 4, 54, 3, "#8a92a6"); px(h, 12, 4, 54, 1, "#d0d4de");                                                                          // the roof rack
  [[14, 8], [26, 6], [44, 7], [56, 8]].forEach(([x, y], i) => { px(h, x, y - 3, 10, 6, ["#d98a2b", "#8a4a14", "#5a7a42", "#aab0c0"][i]); px(h, x, y - 3, 10, 1, "rgba(255,255,255,0.35)"); });   // bags and crates on it
  for (let k = 0; k < 14; k++) px(h, 6 + (k * 17) % 64, 14 + (k * 7) % 18, 3, 2, k % 2 ? "rgba(255,255,255,0.25)" : "rgba(10,20,50,0.3)");  // scratches
  [[16, 12], [30, 12], [48, 12], [60, 12]].forEach(([x, y]) => px(h, x, y, 2, 2, "#f4f4f4"));                                              // rope anchors on the roof
  SKY.parts = { balloon: bal, bus };
};

// (x, y) = top left of the whole thing (about 76 x 134), s = scale, t = seconds
SKY.bus = (c, x, y, s, t, o) => {
  o = o || {};
  if (!SKY.parts) SKY.makeParts();
  const { balloon, bus } = SKY.parts;
  const sway = Math.sin(t * 1.1) * 2, bob = Math.sin(t * 1.7) * 1.5, swing = Math.sin(t * 1.1 + 0.6) * 0.045;
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(s, s); c.imageSmoothingEnabled = false;
  if (!o.noShadow) FX.glow(c, 38, 60, 54, "255,255,255", 0.12);
  c.drawImage(balloon, 6 + Math.round(sway), Math.round(bob));
  const bx = 38 + sway, by = 92 + bob;
  [[18, 12, 30], [32, 12, 36], [50, 12, 42], [62, 12, 46]].forEach(([ax, ay, tx], i) => {                          // the ropes
    const topX = tx + sway * 0.6, topY = 69 + bob, botX = bx - 38 + ax, botY = by + ay - 4;
    for (let q = 0; q <= 22; q++) px(c, Math.round(lerp(topX, botX, q / 22)), Math.round(lerp(topY, botY, q / 22)), 1, 1, i % 2 ? "#d8c9a0" : "#b8a880");
  });
  c.save(); c.translate(bx, by); c.rotate(swing); c.translate(-38, -4); c.drawImage(bus, 0, 0);
  if (!o.noExhaust) for (let k = 0; k < 4; k++) { const ph = (t * 1.6 + k / 4) % 1; ellipse(c, Math.round(78 + ph * 14), Math.round(30 - ph * 4), Math.round(2 + ph * 4), Math.round(2 + ph * 3), "rgba(220,230,245," + (0.4 * (1 - ph)).toFixed(2) + ")"); }   // exhaust
  c.restore(); c.restore();
};

// ---------- the glider: an umbrella with blue and white panels; open 0..1 ----------

SKY.glider = (c, x, y, open, t, o) => {                 // (x, y) = the anchor where the player hangs; the canopy is above
  o = o || {};
  const e = Math.max(0, open), W = Math.round((o.w || 30) * Math.min(1.08, e + 0.08 * Math.sin(Math.min(1, e) * Math.PI))), H = Math.round((o.h || 15) * Math.min(1.08, e)), L = Math.round(8 + (o.l || 28) * e);
  const tilt = o.tilt || 0, top = y - L - H;
  c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(tilt); c.translate(-Math.round(x), -Math.round(y));
  if (e < 0.15) {                                       // still folded: a stick on the back
    px(c, x - 1, y - 14, 3, 14, "#8a92a6"); px(c, x - 3, y - 15, 7, 2, "#3a90e8");
    c.restore(); return;
  }
  for (let i = -4; i <= 4; i++) {                       // the lines down to the player
    const ex = Math.round(x + (i / 4) * W * 0.92), ey = Math.round(top + H + 1);
    for (let q = 0; q <= 10; q++) px(c, Math.round(lerp(ex, x, q / 10)), Math.round(lerp(ey, y - 2, q / 10)), 1, 1, "rgba(235,235,245,0.9)");
  }
  for (let dx = -W; dx <= W; dx++) {                    // the canopy: a dome, panels alternate blue and white, a scalloped edge
    const u = dx / W, ty = Math.round(top + H - H * Math.sqrt(Math.max(0, 1 - u * u))), scallop = Math.round(Math.abs(Math.sin((dx + W) / W * 4 * Math.PI)) * 3);
    const panel = Math.floor((u + 1) * 3) % 2, col = panel ? "#f4faff" : "#3a90e8";
    px(c, Math.round(x) + dx, ty, 1, Math.round(top + H + 1 + scallop - ty), col);
    px(c, Math.round(x) + dx, ty, 1, 1, "#14284a");
    if (dx > W * 0.5) px(c, Math.round(x) + dx, ty + 1, 1, Math.round(top + H + scallop - ty), "rgba(10,30,90,0.25)");
  }
  px(c, Math.round(x) - W, Math.round(top + H) - 1, 1, 3, "#14284a"); px(c, Math.round(x) + W, Math.round(top + H) - 1, 1, 3, "#14284a");
  px(c, Math.round(x) - Math.round(W * 0.5), Math.round(top) + 2, Math.round(W * 0.6), 2, "rgba(255,255,255,0.5)");     // a shine on the dome
  px(c, Math.round(x) - 1, Math.round(top) - 1, 3, 2, "#ffd23f");                                                      // a gold knob on top
  c.restore();
};

// ---------- the sky behind everything ----------

SKY.skyBands = (c, k) => {                              // k = 0 low and bright, 1 high and deep blue
  const low = ["#4a90ea", "#5ca2f0", "#74b4f4", "#8cc6f8", "#a6d6fb", "#c4e6fd", "#dcf0fe"], high = ["#0e2f8a", "#1640a8", "#2056c4", "#2f6cd8", "#4a86e6", "#6aa4f0", "#8cc0f8"];
  const mix = (a, b, f) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const ch = (sh) => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, f)); return "rgb(" + ch(16) + "," + ch(8) + "," + ch(0) + ")"; };
  band(c, 0, SH, low.map((col, i) => mix(col, high[i], k)));
};

SKY.cloudRows = (c, t, speed, rows, rgb) => {           // layers of cloud puffs sliding past (rows of different size and speed)
  for (let r = 0; r < rows; r++) {
    const sc = 0.8 + r * 0.45, n = 5 + r;
    for (let i = 0; i < n; i++) {
      const x = (((hash(i, r, 120) % 420) + t * speed * (0.5 + r * 0.6)) % 440) - 60, y = 20 + (hash(i, r, 121) % 150);
      ellipse(c, Math.round(x), y, Math.round(22 * sc), Math.round(6 * sc), "rgba(" + rgb + ",0.82)");
      ellipse(c, Math.round(x + 14 * sc), y + 2, Math.round(15 * sc), Math.round(5 * sc), "rgba(" + rgb + ",0.82)");
      ellipse(c, Math.round(x - 14 * sc), y + 3, Math.round(13 * sc), Math.round(4 * sc), "rgba(220,235,255,0.82)");
    }
  }
};

SKY.diver = (c, x, y, t, i) => {                        // a tiny player far away, with a glider or falling
  const open = i % 2 === 0;
  if (open) { ellipse(c, Math.round(x), Math.round(y - 5), 6, 3, i % 4 ? "#ff8a3d" : "#3a90e8"); px(c, Math.round(x), Math.round(y - 3), 1, 4, "#ffffff"); }
  px(c, Math.round(x) - 1, Math.round(y + 1), 3, 3, ["#e0463c", "#f2c84c", "#7a4a9a", "#2f9e4f"][i % 4]); px(c, Math.round(x), Math.round(y + 4), 1, 2, "#2a2d38");
};

// A patch of the island seen from above: grid cells with houses, trees, roofs, roads or snow (z = how close we are).
SKY.aerial = (c, zone, cx, cy, z, t) => {
  const cell = Math.max(5, Math.round(14 * z)), cols = Math.ceil(SW / cell) + 2, rows = Math.ceil(SH / cell) + 2;
  const base = { pleasant_park: ["#58bd45", "#62c24d", "#4fae3d"], tilted_towers: ["#8c8f99", "#9a9ea8", "#7c808a"], retail_row: ["#7a7f92", "#8a8fa2", "#6a6f82"], polar_peak: ["#eef6ff", "#dce9f6", "#f8fcff"] }[zone] || ["#58bd45", "#62c24d", "#4fae3d"];
  const ox = Math.round(SW / 2 - cx * z), oy = Math.round(SH / 2 - cy * z);
  for (let gy = -1; gy < rows; gy++) for (let gx = -1; gx < cols; gx++) {
    const wx = gx - Math.floor(ox / cell), wy = gy - Math.floor(oy / cell), r = hash(wx, wy, 130);
    const X = gx * cell + (ox % cell), Y = gy * cell + (oy % cell);
    px(c, X, Y, cell + 1, cell + 1, base[r % 3]);
    if (zone === "pleasant_park") {
      if (r % 7 === 0) { ellipse(c, X + cell / 2, Y + cell / 2, Math.max(2, cell * 0.35), Math.max(2, cell * 0.35), "#2f7a3c"); }
      if (r % 17 === 1) { px(c, X + 2, Y + 2, cell - 3, cell - 3, "#e0463c"); px(c, X + 2, Y + 2, cell - 3, Math.max(1, cell / 5), "#ff8a7a"); }
      if (r % 23 === 2) { px(c, X, Y, cell, cell, "#4caf3a"); px(c, X, Y + cell / 2, cell, 1, "#ffffff"); }
    } else if (zone === "tilted_towers" || zone === "retail_row") {
      if (wx % 3 === 0 || wy % 3 === 0) px(c, X, Y, cell + 1, cell + 1, "#575c6d");
      else { const col = zone === "retail_row" ? ["#d85a4a", "#2f9e4f", "#e0b030", "#3a6fe0"][r % 4] : ["#a8553c", "#8c8f99", "#b09a78"][r % 3]; px(c, X + 1, Y + 1, cell - 2, cell - 2, col); px(c, X + 1, Y + 1, cell - 2, Math.max(1, cell / 6), "rgba(255,255,255,0.4)"); px(c, X + cell - 3, Y + 1, 2, cell - 2, "rgba(0,0,0,0.25)"); }
    } else {
      if (r % 6 === 0) { px(c, X + cell * 0.3, Y + cell * 0.3, Math.max(2, cell * 0.3), Math.max(2, cell * 0.4), "#2c7a4a"); }
      if (r % 11 === 3) ellipse(c, X + cell / 2, Y + cell / 2, cell * 0.4, cell * 0.3, "#b4d4ee");
    }
  }
};

// ---------- the Battle Bus screen at the start (the bus flies, the camera floats) ----------

SKY.busIntro = (c, t) => {
  SKY.skyBands(c, 0.3);
  FX.glow(c, 260, 30, 70, "255,250,210", 0.4); ellipse(c, 260, 30, 12, 12, "#fff7c8");
  FX.rays(c, 260, 30, t, "255,250,210", 6);
  SKY.cloudRows(c, t, 5, 2, "255,255,255");
  // the island far below, slowly sliding by
  for (let i = 0; i < 70; i++) {
    const x = ((hash(i, 1, 140) % 420) + t * 10) % 420 - 50, y = 150 + hash(i, 2, 140) % 50;
    ellipse(c, Math.round(x), y, 14 + hash(i, 3, 140) % 18, 4 + hash(i, 4, 140) % 5, i % 3 ? "rgba(50,150,70,0.8)" : "rgba(70,170,90,0.8)");
  }
  band(c, 176, SH, ["#3a8ee6", "#2f7fe0", "#2670d4"]);
  for (let i = 0; i < 12; i++) px(c, ((hash(i, 1, 141) % 340) + t * 8) % 340, 180 + hash(i, 2, 141) % 12, 8, 1, "rgba(255,255,255,0.5)");
  SKY.cloudRows(c, t, 9, 1, "255,255,255");
  [[250, 70], [60, 96], [290, 120]].forEach(([x, y], i) => SKY.diver(c, ((x + t * 5) % 340) - 10, y + Math.sin(t * 1.5 + i) * 3, t, i));    // other players, far away
  SKY.bus(c, 160 - 34, 2, 0.9, t);                                    // smaller and high up: the dialogue box covers the lower part of the screen
  FX.birds(c, t, 30, 4, 18, 8, "#3a3a4a");
};

// ---------- jumping out of the Battle Bus: the door, the dive, the glider (6 seconds) ----------

const BUS_FILM = cinematic({
  dur: 6.0,
  cam: { from: [1.1, 130, 100], to: [1.0, 160, 96], shake: [[1.35, 6, 0.5], [4.3, 8, 0.7]] },
  draw(c, t) {
    const zone = (typeof bus !== "undefined" && BUS_ZONES[bus.sel]) ? BUS_ZONES[bus.sel].id : "pleasant_park";
    const jump = 1.3, openT = 4.3;
    if (t < jump + 0.2) {                                                                                         // at the open door
      SKY.skyBands(c, 0.25);
      FX.glow(c, 250, 30, 70, "255,250,210", 0.4); ellipse(c, 250, 30, 12, 12, "#fff7c8");
      SKY.cloudRows(c, t, 40, 2, "255,255,255");
      band(c, 170, SH, ["#3a8ee6", "#2f7fe0", "#2670d4"]);
      SKY.bus(c, 40 - t * 6, -14, 1.5, t);
      const wave = Math.floor(t * 5) % 2;
      const door = 138 - t * 6, lp = smooth(clamp01((t - jump) / 0.2));                                          // he stands in the door, then leaps out
      FX.hero(c, lerp(door, 160, lp), lerp(152, 124, lp) - Math.sin(lp * Math.PI) * 10, { pose: t > jump - 0.4 ? "scared" : "walk", dir: "down", step: Math.floor(t * 6) % 2, t, noShadow: true });
      for (let i = 0; i < 20; i++) px(c, ((i * 53 + t * 340) % 380) - 20, 40 + (i * 29) % 130, 14 + i % 3 * 8, 1, "rgba(255,255,255,0.5)");
      return;
    }
    const f = t - (jump + 0.2);                                                                                   // the dive
    const k = clamp01(f / 3.2), alt = 1 - k * 0.9;
    SKY.skyBands(c, 0.55 * (1 - k) + 0.1);
    SKY.aerial(c, zone, 0, 0, lerp(0.5, 3.0, smooth(clamp01(f / 3.6))), t);                                       // the island below grows and grows
    const veil = 1 - clamp01(f / 2.6);                                                                            // clouds between us and the island
    if (veil > 0) { c.globalAlpha = veil; SKY.cloudRows(c, t * (3 + f), 120, 3, "255,255,255"); c.globalAlpha = 1; }
    for (let i = 0; i < 4; i++) SKY.diver(c, 40 + i * 78 + Math.sin(t + i) * 6, 60 + ((f * 90 + i * 70) % 170), t, i + 1);     // other players dive too
    const bp = clamp01(f / 1.4);                                                                                   // the bus shrinks up and away
    if (bp < 1) SKY.bus(c, lerp(130, 250, smooth(bp)), lerp(-20, -90, smooth(bp)), lerp(0.7, 0.2, smooth(bp)), t, { noShadow: true });
    const glide = t >= openT, wob = Math.sin(t * 3.2) * 0.28;
    const hx = 160 + (glide ? Math.sin(t * 1.7) * 6 : Math.sin(t * 2.1) * 14);
    if (!glide) {
      const hy = 96 + Math.sin(t * 4) * 3;
      FX.hero(c, hx, hy + 24, { pose: t < 3.5 ? "fall" : "scared", rot: t < 3.5 ? wob : Math.sin(t * 12) * 0.12, scale: 2, t, noShadow: true });
      if (t >= 3.5) {                                                                                             // he pats his back: where is the glider?
        const pat = Math.floor(t * 8) % 2;
        px(c, Math.round(hx + 10), Math.round(hy - 2 + pat * 3), 5, 3, "#f2692d");
        for (let d = 0; d < 3; d++) px(c, Math.round(hx + 18 + d * 3), Math.round(hy - 30 + ((t * 40 + d * 7) % 20)), 2, 3, "#7cc4ff");
      }
      for (let i = 0; i < 24; i++) px(c, 30 + (i * 37) % 260, Math.round(((i * 53 + f * 330) % 220) - 20), 1, 10 + i % 3 * 4, "rgba(255,255,255,0.55)");     // the wind
    } else {
      const open = smooth(clamp01((t - openT) / 0.5));
      SKY.glider(c, hx, 92, open, t, { tilt: Math.sin(t * 1.7) * 0.06, w: 42, h: 20, l: 30 });
      FX.hero(c, hx, 112, { pose: "walk", step: 0, scale: 2, rot: Math.sin(t * 1.7) * 0.05, t, noShadow: true });
      if (t < openT + 0.5) flash(c, 0.6 - (t - openT) * 1.4);
    }
  },
});

function drawBusJump(c, t) { BUS_FILM.draw(c, t); }

// ---------- gliding down onto the island, in the world (a glider over the player, a shadow on the ground) ----------

SKY.landing = (c, tx, ty, p, t) => {              // p goes 0 -> 1; (tx, ty) = where the player lands (top left of the tile)
  const lift = (1 - p) * (ty + 60), cy = Math.round(ty - lift);
  const open = smooth(clamp01(p * 6));
  const sh = 1 - (1 - p) * 0.55;
  pixelShadow(c, tx + 8, ty + 14, Math.round(6 + 8 * sh), Math.round(2 + 3 * sh), 0.12 + 0.2 * p);
  if (p < 0.94) SKY.glider(c, tx + 8, cy + 3, open * 0.9, t, { tilt: Math.sin(t * 3) * 0.08 * (1 - p), w: 17, h: 8, l: 14 });
};
function pixelShadow(c, x, y, rx, ry, a) { ellipse(c, Math.round(x), Math.round(y), rx, ry, "rgba(0,0,0," + a.toFixed(2) + ")"); }

// ---------- the supply drop: a crate under its own striped balloon with a trail of smoke ----------

SKY.supplyDrop = (c, x, y, p, t) => {             // (x, y) = where the crate lands (centre of the tile); p goes 0 -> 1
  const cy = Math.round(y - (1 - p) * 150);
  pixelShadow(c, x, y + 4, Math.round(5 + 8 * p), Math.round(2 + 3 * p), 0.1 + 0.2 * p);
  const fade = 1 - clamp01((p - 0.82) / 0.16), sink = (1 - fade) * 16;          // the balloon softly deflates and fades as the crate lands
  if (fade > 0) {
    c.globalAlpha = fade;
    const sway = Math.round(Math.sin(t * 2.2) * 2 * (1 - p)), by = cy - 34 + sink;
    ellipse(c, x + sway, by, 13, Math.round(11 * (1 - (1 - fade) * 0.5)), "#2f80e0"); ellipse(c, x + sway - 4, by - 3, 6, 5, "#8fc8ff");
    for (let k = -8; k <= 8; k += 4) px(c, x + sway + k, Math.round(by - 10 + Math.abs(k) / 3), 2, Math.round(21 - Math.abs(k) / 2 - sink / 2), k % 8 ? "#f4faff" : "#2f80e0");     // stripes on the balloon
    px(c, x + sway - 5, Math.round(by + 10), 10, 3, "#14284a");
    for (let q = -1; q <= 1; q++) for (let s = 0; s <= 9; s++) px(c, Math.round(lerp(x + sway + q * 4, x + q * 4, s / 9)), Math.round(by + 12 + s * (22 - sink) / 9), 1, 1, "#d8c9a0");   // ropes
    for (let k = 0; k < 7; k++) { const sy = cy - 4 + k * 8, a = (0.5 - k * 0.06) * fade; ellipse(c, x + Math.round(Math.sin(t * 3 + k) * 3), sy, 3 + k, 3 + k * 0.6, "rgba(255,210,80," + Math.max(0, a).toFixed(2) + ")"); }   // a bright smoke trail
    c.globalAlpha = 1;
  }
  px(c, x - 8, cy - 8, 16, 12, "#d9a63a"); px(c, x - 8, cy - 8, 16, 2, "#ffe680"); px(c, x - 8, cy + 2, 16, 2, "#8a6a1a"); px(c, x - 1, cy - 8, 2, 12, "#2f80e0"); px(c, x - 8, cy - 3, 16, 2, "#2f80e0");   // the crate
  px(c, x - 3, cy - 11, 6, 3, "#3a3d4a"); px(c, x - 2, cy - 10, 4, 1, "#ff4f5e"); px(c, x - 8, cy - 8, 1, 12, "rgba(255,255,255,0.3)");
};

// ---------- the default dance: disco lights, a flashing floor and confetti (drawn over the dance spot) ----------

SKY.disco = (c, t, x, y, strength) => {          // (x, y) = middle of the dance spot in pixels
  const cols = ["#ff4f5e", "#ffd23f", "#3ad6c0", "#b673ff", "#3a90e8", "#ff8fc8"];
  for (let i = 0; i < 9; i++) {                                                                                         // the floor flashes
    const gx = x - 36 + (i % 3) * 24, gy = y - 20 + Math.floor(i / 3) * 16, col = cols[(Math.floor(t * 4) + i) % cols.length];
    c.fillStyle = col; c.globalAlpha = 0.32 * strength; c.fillRect(gx, gy, 22, 14); c.globalAlpha = 1;
  }
  for (let i = 0; i < 4; i++) {                                                                                         // spotlights sweep
    const a = t * 1.8 + i * 1.57, sx = x + Math.cos(a) * 46, sy = y + Math.sin(a * 1.3) * 22;
    FX.glow(c, sx, sy, 22, ["255,79,94", "255,210,63", "58,214,192", "182,115,255"][i], 0.4 * strength);
  }
  for (let i = 0; i < 26; i++) {                                                                                         // confetti falls
    const cx = x - 60 + ((hash(i, 1, 150) % 120) + Math.sin(t * 2 + i) * 6), cy = y - 70 + ((hash(i, 2, 150) % 100) + t * (30 + i % 4 * 10)) % 120;
    px(c, Math.round(cx), Math.round(cy), 2, 3, cols[i % cols.length]);
  }
  for (let i = 0; i < 12; i++) { const a = i * 0.52 + t, d = 18 + (Math.floor(t * 6) + i) % 3 * 3; px(c, Math.round(x + Math.cos(a) * d), Math.round(y - 10 + Math.sin(a) * d * 0.5), 2, 2, i % 2 ? "#ffffff" : "#ffd23f"); }   // sparkles around the fish
};

// ---------- the title picture (it moves a little all the time) ----------

function drawTitleScene(c, t, sprites) {
  band(c, 0, 124, ["#1a1560", "#2c2078", "#4a2c98", "#7a3ab0", "#b84aa8", "#ee6e9a", "#ff9a86", "#ffc890"]);
  for (let i = 0; i < 30; i++) if (Math.sin(t * 2 + i) > 0.2) px(c, (i * 97) % SW, 8 + (i * 31) % 44, 1, 1, i % 4 ? "#ffffff" : "#ffe9a8");
  FX.glow(c, 232, 108, 64, "255,225,160", 0.4); ellipse(c, 232, 108, 24, 24, "#fff2b0"); ellipse(c, 232, 108, 17, 17, "#ffffd0");     // the sun
  FX.rays(c, 232, 108, t, "255,225,160", 7);
  for (let i = 0; i < 7; i++) {                                                   // slow pink clouds in layers
    const x = ((i * 71 + t * (3 + i * 1.2)) % (SW + 120)) - 60, y = 28 + i * 11;
    ellipse(c, Math.round(x), y, 28, 5, "rgba(255,170,210,0.85)"); ellipse(c, Math.round(x + 17), y + 3, 18, 4, "rgba(255,215,235,0.85)");
  }
  mountain(c, 60, 134, 66, 66, "#7a6ab0", "#ffffff"); mountain(c, 132, 134, 46, 48, "#8a7ab8", "#f4eaff"); mountain(c, 190, 134, 36, 40, "#9a8ac0", "#f4eaff");
  // the Storm on the horizon: a swirling purple wall with lightning
  for (let k = 0; k < 9; k++) {
    const sx = 276 + Math.sin(t * 0.6 + k) * 5 + (k % 3) * 14, sy = 70 + k * 7;
    ellipse(c, Math.round(sx), sy, 34 + k % 3 * 8, 10 + k % 2 * 3, k % 2 ? "#6a2fb0" : "#8a45d8");
  }
  ellipse(c, 300, 124, 52, 24, "#5a2090");
  if (Math.floor(t * 1.4) % 4 === 0 && (t * 10) % 14 < 3) { px(c, 282, 60, 2, 14, "#ffffff"); px(c, 279, 72, 2, 14, "#ffffff"); px(c, 282, 84, 2, 12, "#ffe6ff"); px(c, 276, 94, 2, 12, "#ffffff"); px(c, 0, 0, SW, SH, "rgba(230,200,255,0.08)"); }
  // Tilted Towers in the distance with a clock tower and lit windows
  [[104, 106, 9, 24, "#a8553c"], [115, 96, 9, 34, "#8c8f99"], [126, 108, 11, 22, "#b09a78"], [140, 100, 8, 30, "#a8553c"], [176, 104, 10, 26, "#8c8f99"]].forEach(([x, y, w, h, col], i) => {
    px(c, x, y, w, h, col); px(c, x, y, w, 2, "#cfcabd"); px(c, x + w - 2, y, 2, h, "rgba(0,0,0,0.2)");
    for (let wy = y + 5; wy < y + h - 3; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) px(c, wx, wy, 2, 2, (wx + wy + i) % 3 === 0 ? "#ffe28a" : "#6fb8e8");
  });
  px(c, 152, 86, 6, 42, "#b7a888"); px(c, 151, 80, 8, 8, "#565a70"); px(c, 154, 90, 2, 2, "#ffffff");
  ellipse(c, 80, 160, 130, 34, "#58bd45"); ellipse(c, 260, 166, 120, 32, "#4fae3d");
  [[20, 142], [44, 146], [96, 144], [210, 148], [250, 144], [296, 150]].forEach(([x, y], i) => { pine(c, x + Math.round(Math.sin(t * 1.3 + i) * 1), y, 9); });
  [[70, 148], [180, 152]].forEach(([x, y]) => { bgTree(c, x, y); px(c, x - 3, y - 4, 2, 2, "#e0243a"); px(c, x + 2, y - 7, 2, 2, "#e0243a"); });
  px(c, 0, 154, SW, 60, "#62c24d");
  for (let x = 0; x < SW; x += 6) { const sw = Math.round(Math.sin(t * 2 + x * 0.3)); px(c, x + sw + (x % 3), 156 + (x % 5) * 6, 1, 4, "#7fd866"); px(c, x + 2 + sw, 157 + (x % 4) * 6, 1, 3, "#4fae3d"); }
  [[30, 172], [70, 180], [210, 174], [260, 178], [300, 170], [120, 182], [160, 176]].forEach(([x, y], i) => { px(c, x, y, 3, 3, ["#ff5a6e", "#ffd23f", "#ffffff", "#6aa8ff"][i % 4]); px(c, x + 1, y + 3, 1, 3, "#3f9a35"); });
  for (let i = 0; i < 6; i++) { const bx = (t * 10 + i * 60) % 340 - 10, by = 120 + Math.sin(t * 3 + i) * 8; px(c, Math.round(bx), Math.round(by), 2, 1, i % 2 ? "#ffd23f" : "#ffffff"); }
  // the Battle Bus crosses the sky, with a supply drop sinking behind it
  const bx = 340 - ((t * 12) % 440);
  SKY.bus(c, bx, 6 + Math.sin(t) * 3, 0.9, t);
  const dp = ((t * 0.06) % 1);
  SKY.supplyDrop(c, 40, 120, dp * 0.9, t);
  FX.birds(c, t, 26, 5, 14, 9, "#3a2a5a");
  // our hero and the runaway llama
  fishAt(c, 98, 176, { pose: "wave", scale: 3, t });
  const llama = sprites && sprites.llama;
  if (llama && llama.complete && llama.naturalWidth) {
    const bob = Math.round(Math.abs(Math.sin(t * 3)) * 4);
    c.save(); c.imageSmoothingEnabled = false;
    ellipse(c, 214, 178, 20, 4, "rgba(0,0,0,0.25)");
    c.drawImage(llama, 214 - 20, 176 - 72 - bob, 40, 72);
    c.restore();
  }
  px(c, 0, 0, SW, 11, "#000000"); px(c, 0, SH - 11, SW, 11, "#000000");
  const vg = c.createRadialGradient(SW / 2, SH / 2, 90, SW / 2, SH / 2, 220); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(20,0,40,0.4)"); c.fillStyle = vg; c.fillRect(0, 0, SW, SH);
  outlined(c, "FORTNITE", 160, 36, "#ffd23f", 24);
  outlined(c, "LLAMA ESCAPE", 160, 54, "#ffffff", 17);
}

// ---------- the flight out of the Storm: a blast up through the purple wall, into the blue, the glider opens ----------

const STORM_ESCAPE_FILM = cinematic({
  dur: 4.6,
  cam: { from: [1.15, 160, 150], to: [1.0, 160, 96], shake: [[0.2, 8, 0.8], [2.7, 5, 0.5]] },
  draw(c, t) {
    const up = smooth(clamp01((t - 0.2) / 2.5)), a = clamp01((t - 0.9) / 1.4);
    SKY.skyBands(c, 0.1 + 0.4 * (1 - a));
    c.globalAlpha = 1 - a; band(c, 0, SH, ["#1d0f40", "#2a1458", "#3a1f78", "#5a2fa0", "#7a45c8", "#9a5de0", "#b673ff", "#d29bff"]); c.globalAlpha = 1;      // the purple storm falls away
    for (let i = 0; i < 14; i++) {
      const y = SH + 30 - ((i * 53 + t * (200 + i * 6)) % (SH + 80));
      ellipse(c, 20 + (i * 83) % 290, Math.round(y), 30 + i % 3 * 10, 9, i % 2 ? "rgba(122,69,200," + (1 - a).toFixed(2) + ")" : "rgba(255,255,255," + a.toFixed(2) + ")");
    }
    if (a < 1 && Math.floor(t * 6) % 3 === 0) { px(c, 70, 0, 2, 70, "rgba(255,240,170," + (1 - a).toFixed(2) + ")"); px(c, 250, 20, 2, 60, "rgba(255,240,170," + (1 - a).toFixed(2) + ")"); }    // lightning in the wall
    const x = lerp(150, 168, up), y = lerp(176, 92, up);
    if (t < 0.7) shockRing(c, 150, 176, t / 0.7);
    for (let i = 0; i < 9; i++) ellipse(c, Math.round(x - 8 - Math.sin(i) * 3), Math.round(y + 24 + i * 6), 6 - i * 0.5, 3, "rgba(190,150,255," + (0.5 - i * 0.05).toFixed(2) + ")");   // a purple trail
    const llama = window.__skySprites && window.__skySprites.llama;
    const glide = t > 3.0, open = smooth(clamp01((t - 3.0) / 0.5));
    if (glide) SKY.glider(c, x, y - 4, open, t, { tilt: Math.sin(t * 2) * 0.05 });
    if (llama && llama.complete && llama.naturalWidth) { c.save(); c.imageSmoothingEnabled = false; c.translate(Math.round(x + 22), Math.round(y - 22)); c.rotate(Math.sin(t * 5) * 0.2 * (1 - open)); c.drawImage(llama, -17, -30, 34, 60); c.restore(); }
    FX.hero(c, x, y + 20, { pose: glide ? "walk" : "fall", step: 0, scale: 2, rot: glide ? 0 : Math.sin(t * 4) * 0.25, t, noShadow: true });
    if (t > 3.4) { FX.glow(c, 262, 36, 70, "255,250,210", 0.5 * clamp01((t - 3.4) / 0.8)); ellipse(c, 262, 36, 12, 12, "#fff7c8"); }
    if (t > 0.5 && t < 2.5) for (let i = 0; i < 20; i++) px(c, 40 + (i * 41) % 250, Math.round(((i * 59 + t * 300) % 210) - 10), 1, 10 + i % 3 * 4, "rgba(255,255,255,0.5)");
  },
});

function drawStormEscape(c, t, sprites) { window.__skySprites = sprites; STORM_ESCAPE_FILM.draw(c, t); }
