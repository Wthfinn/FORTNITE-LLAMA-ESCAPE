"use strict";

// The pictures on the "Danger!" cards: one detailed pixel scene for each danger on the paths, showing the
// moment before the player has to choose. The fish hero is always in the picture, small, and the danger is
// built from Fortnite things (pump shotgun, heavy sniper, rocket launcher, spike trap, smoke grenades, skins).
// They are drawn once in code on the 320 x 192 pixel screen and do not move.
// Nothing in here decides game rules: it only draws what the page tells it to.

const HZ = {};

// ---------- Fortnite things ----------

// A weapon, facing right; dir -1 flips it. s is 1 or 2 (a whole number keeps the pixels sharp).
HZ.gun = (c, kind, x, y, dir, s, rarity) => {
  const glow = { gold: "255,196,40", purple: "190,140,255", blue: "90,170,255" }[rarity || "gold"];
  const edge = { gold: "#f4c542", purple: "#b673ff", blue: "#3a8ee6" }[rarity || "gold"];
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(dir * (s || 1), s || 1);
  if (kind === "pump") {
    FX.glow(c, 18, 3, 16, glow, 0.35);
    px(c, 0, 2, 8, 5, "#6b4423"); px(c, 0, 2, 8, 1, "#8a5a2c");                                                    // stock
    px(c, 8, 1, 10, 6, "#2a2d38"); px(c, 8, 1, 10, 1, edge); px(c, 9, 6, 8, 1, "#14141c");                           // receiver with its rarity stripe
    px(c, 18, 2, 18, 3, "#3a3d4a"); px(c, 18, 2, 18, 1, "#8a92a6"); px(c, 36, 1, 2, 5, "#14141c");                    // barrel and muzzle
    px(c, 20, 5, 9, 3, "#7a4a24"); px(c, 20, 5, 9, 1, "#a8703a");                                                   // the pump
    px(c, 11, 7, 2, 4, "#2a2d38");
  } else if (kind === "ar") {
    FX.glow(c, 16, 4, 16, glow, 0.3);
    px(c, 0, 2, 7, 5, "#2a2d38"); px(c, 7, 1, 15, 6, "#4a5060"); px(c, 7, 1, 15, 1, "#8a92a6"); px(c, 10, 2, 7, 1, edge);
    px(c, 12, 7, 4, 7, "#2a2d38"); px(c, 12, 7, 4, 1, "#4a5060");                                                    // magazine
    px(c, 22, 2, 14, 2, "#2a2d38"); px(c, 36, 1, 2, 4, "#14141c"); px(c, 10, -1, 7, 2, "#14141c"); px(c, 11, -2, 2, 1, "#ff4f5e");   // barrel, sight
    px(c, 3, 7, 2, 4, "#2a2d38");
  } else if (kind === "sniper") {
    FX.glow(c, 24, 3, 22, glow, 0.3);
    px(c, 0, 2, 10, 6, "#3a4a2a"); px(c, 0, 2, 10, 1, "#5a6a3a");
    px(c, 10, 2, 16, 4, "#2a2d38"); px(c, 10, 2, 16, 1, edge);
    px(c, 26, 3, 30, 2, "#14141c"); px(c, 26, 3, 30, 1, "#4a5060"); px(c, 56, 2, 3, 4, "#14141c");
    px(c, 12, -3, 16, 4, "#1a1c26"); px(c, 12, -3, 16, 1, "#4a5060"); px(c, 27, -2, 2, 2, "#8fd4ff");               // the big scope
    px(c, 38, 5, 1, 7, "#2a2d38"); px(c, 44, 5, 1, 7, "#2a2d38");
  } else if (kind === "launcher") {
    FX.glow(c, 16, 3, 22, glow, 0.3);
    px(c, 0, 0, 32, 8, "#4a5060"); px(c, 0, 0, 32, 2, "#8a92a6"); px(c, 0, 7, 32, 1, "#2a2d38");
    px(c, 7, 0, 3, 8, "#4f7a3a"); px(c, 20, 0, 2, 8, "#4f7a3a");
    px(c, -3, -1, 4, 10, "#2a2d38"); px(c, -2, 1, 2, 6, "#14141c"); px(c, 32, -1, 4, 10, "#2a2d38");
    px(c, 12, -3, 7, 3, "#2a2d38"); px(c, 13, -4, 4, 1, "#8fd4ff"); px(c, 13, 8, 3, 5, "#2a2d38");
  } else if (kind === "rocket") {
    px(c, 0, 0, 16, 5, "#e8e8f0"); px(c, 0, 0, 16, 1, "#ffffff"); px(c, 16, 0, 4, 5, "#e0463c"); px(c, 20, 1, 2, 3, "#e0463c");
    px(c, 0, -2, 4, 2, "#e0463c"); px(c, 0, 5, 4, 2, "#e0463c"); px(c, -4, 1, 4, 3, "#ffb347"); px(c, -6, 2, 2, 1, "#fff3a0");
  }
  c.restore();
};

HZ.pickaxe = (c, x, y, ang, len) => {                  // the Fortnite pickaxe: wooden handle, curved steel head
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let i = 0; i < len; i++) px(c, Math.round(x + dx * i), Math.round(y + dy * i), 2, 2, i % 6 === 0 ? "#5b3418" : "#7a4a24");
  const ex = x + dx * len, ey = y + dy * len, nx = -dy, ny = dx;
  for (let k = -8; k <= 8; k++) { const bend = k * k * 0.06; px(c, Math.round(ex + nx * k + dx * bend), Math.round(ey + ny * k + dy * bend), 2, 2, Math.abs(k) > 5 ? "#eef2fa" : "#9aa2b6"); }
};

HZ.grenade = (c, x, y, kind) => {
  if (kind === "smoke") { px(c, x, y, 6, 8, "#3f5a2e"); px(c, x, y, 6, 2, "#a8c27a"); px(c, x + 1, y + 3, 4, 2, "#6a8a4a"); px(c, x + 2, y - 2, 2, 2, "#8a8f9c"); }
  else { px(c, x, y, 6, 8, "#2a6ab8"); px(c, x, y, 6, 2, "#bfe0ff"); px(c, x + 2, y + 2, 2, 4, "#ffffff"); px(c, x + 1, y + 3, 4, 2, "#ffffff"); px(c, x + 2, y - 2, 2, 2, "#8a8f9c"); }
};

HZ.llama = (c, x, y, sprites) => {                    // a loot llama
  const img = sprites && sprites.llama;
  if (img && img.complete && img.naturalWidth) { c.imageSmoothingEnabled = false; c.drawImage(img, Math.round(x - 9), Math.round(y - 32), 18, 32); }
};

HZ.balloon = (c, x, y) => {                           // a supply drop floating down
  ellipse(c, x, y, 11, 9, "#3a8ee6"); ellipse(c, x - 3, y - 2, 6, 5, "#8fc8ff"); px(c, x - 1, y - 9, 2, 18, "#e8e8f0");
  for (let k = -9; k <= 9; k += 6) px(c, x + k, y + 6, 1, 10, "#cfd8ff");
  px(c, x - 6, y + 16, 12, 8, "#d9a63a"); px(c, x - 6, y + 16, 12, 2, "#ffe680"); px(c, x - 1, y + 16, 2, 8, "#7a4a24");
};

HZ.shadowHero = (c, x, y, o) => {                     // the hero with a long shadow
  o = o || {};
  ellipse(c, Math.round(x + (o.shadowX || 14)), Math.round(y + 1), 26, 4, "rgba(0,0,0,0.3)");
  fishAt(c, x, y, o);
};

// the red-tinted dark corners every danger picture gets
HZ.finish = (c) => {
  const vg = c.createRadialGradient(SW / 2, SH / 2, 80, SW / 2, SH / 2, 220);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(60,0,20,0.55)");
  c.fillStyle = vg; c.fillRect(0, 0, SW, SH);
};

// ---------- the 12 scenes ----------

const HAZARD_PICS = {
  // Pleasant Park - Tilted Towers: a spike trap hidden in the path
  H1(c) {
    FX.meadow(c, 3);
    FX.glow(c, 284, 150, 40, "255,196,40", 0.5);                                                               // a golden chest as bait
    for (let k = 0; k < 8; k++) px(c, 283 + (k - 4) * 2, 100 + k * 5, 2, 8, "rgba(255,226,120,0.22)");
    px(c, 270, 142, 26, 18, "#4a2f18"); px(c, 271, 143, 24, 16, "#6b4423"); px(c, 270, 142, 26, 7, "#8a5a2c"); px(c, 270, 142, 26, 1, "#b8863c");
    px(c, 276, 142, 3, 18, "#f4c542"); px(c, 288, 142, 3, 18, "#f4c542"); px(c, 281, 148, 5, 5, "#ffe680"); px(c, 283, 150, 1, 2, "#7a5a10");
    for (let k = 0; k < 5; k++) { const sx = 262 + k * 9, sy = 130 + (k * 7) % 14; px(c, sx - 2, sy, 5, 1, "#fff6c0"); px(c, sx, sy - 2, 1, 5, "#fff6c0"); }
    const tx = 196;
    ellipse(c, tx, 168, 38, 7, "rgba(0,0,0,0.3)");                                                              // the trap
    px(c, tx - 32, 160, 64, 10, "#3a3d4a"); px(c, tx - 32, 160, 64, 2, "#8a92a6"); px(c, tx - 32, 168, 64, 2, "#14141c");
    for (let i = 0; i < 6; i++) { px(c, tx - 26 + i * 10, 163, 4, 5, "#14141c"); px(c, tx - 25 + i * 10, 163, 1, 5, "#5a5f6e"); }
    [[tx - 30, 162], [tx + 28, 162], [tx - 30, 167], [tx + 28, 167]].forEach(([rx, ry]) => px(c, rx, ry, 2, 2, "#c4c8d4"));
    px(c, tx - 26, 158, 18, 4, "#3f9a35"); px(c, tx - 20, 156, 14, 4, "#2c7a2c"); px(c, tx - 8, 159, 10, 3, "#5aaa4a"); px(c, tx - 30, 160, 8, 3, "#8a6a3c"); px(c, tx + 10, 158, 12, 3, "#3f9a35");   // leaves half hide it
    px(c, tx + 14, 150, 2, 10, "#c8ccd8"); px(c, tx + 14, 150, 2, 2, "#ffffff"); px(c, tx + 24, 153, 2, 7, "#c8ccd8");   // two spike tips poke out
    px(c, tx + 12, 146, 7, 1, "#fff"); px(c, tx + 15, 143, 1, 7, "#fff");
    for (let k = 0; k < 7; k++) px(c, 30 + k * 18, 172 + (k % 2) * 2, 4, 2, "rgba(60,40,20,0.35)");               // footprints that lead right
    HZ.shadowHero(c, 92, 168, { dir: "right", step: 1, t: 3, shadowX: 26 });
  },

  // Pleasant Park - Tilted Towers: smoke from the clock tower
  H5(c) {
    FX.city(c, 3);
    clockTower(c, 226, 56);
    px(c, 230, 70, 10, 2, "#c0392b"); px(c, 237, 62, 1, 8, "#8a8f9c");
    px(c, 224, 82, 50, 5, "#8f8062"); px(c, 224, 82, 50, 1, "#d4c6a6"); for (let k = 0; k < 8; k++) px(c, 226 + k * 6, 87, 2, 6, "#6a5a42");   // the balcony
    npcBig(c, 238, 82, "skull", "idle", 3, { scale: 1.3 }); npcBig(c, 262, 82, "raven", "idle", 3, { scale: 1.3 });
    c.save(); c.translate(236, 70); c.rotate(0.5); HZ.gun(c, "ar", 0, 0, -1, 1, "purple"); c.restore();
    c.save(); c.translate(260, 70); c.rotate(0.45); HZ.gun(c, "pump", 0, 0, -1, 1, "gold"); c.restore();
    FX.muzzle(c, 214, 82, -1, 0.8);
    [[190, 96, 150, 112], [160, 124, 118, 150]].forEach(([x0, y0, x1, y1], i) => {                                  // smoke grenades in the air
      for (let k = 1; k <= 6; k++) px(c, Math.round(lerp(x0 + 44, x0, k / 6)), Math.round(lerp(y0 - 10, y0, k / 6) + 6), 2, 2, "rgba(230,230,240," + (0.7 - k * 0.1).toFixed(2) + ")");
      HZ.grenade(c, x0, y0, "smoke");
    });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) {                                                         // smoke clouds on the street
      const cx = 96 + i * 38 + (j - 3) * 9, cy = 150 - (j % 3) * 7 - i * 3;
      ellipse(c, cx, cy, 15 + j % 3 * 4, 11 + j % 2 * 3, "rgba(" + (j % 2 ? "206,210,226" : "176,180,200") + ",0.7)");
    }
    for (let k = 0; k < 6; k++) px(c, 210 + k * 5, 100 + k * 9, 2, 1, "#d9a63a");                                    // shell casings falling
    px(c, 20, 150, 14, 12, "#6b4423"); px(c, 20, 150, 14, 2, "#8a5a2c"); px(c, 26, 150, 2, 12, "#3a2418");          // a crate
    HZ.shadowHero(c, 62, 158, { dir: "right", step: 0, t: 3, shadowX: 20 });
  },

  // Pleasant Park - Retail Row: a squad camping ahead
  H2(c, sprites) {
    FX.scenery(c, 3);
    for (let y = 92; y <= 152; y++) { const half = Math.round((y - 92) * 40 / 60); px(c, 262 - half, y, half, 1, "#3f8a3a"); px(c, 262, y, half + 1, 1, "#2a5e2a"); }
    for (let y = 116; y <= 152; y++) { const half = Math.round((y - 116) * 14 / 36); px(c, 262 - half, y, half * 2 + 1, 1, "#0e0a08"); }
    px(c, 262, 92, 1, 60, "#1a3a1c"); px(c, 262, 84, 2, 10, "#8a5a2c"); px(c, 264, 84, 9, 5, "#e0463c");
    FX.glow(c, 196, 150, 60, "255,150,40", 0.4);                                                                  // the campfire
    px(c, 184, 150, 24, 4, "#4a2f18"); px(c, 188, 147, 16, 3, "#6b4423");
    [[0, 16, 10], [-6, 11, 8], [6, 12, 9]].forEach(([dx, h, w], i) => { ellipse(c, 196 + dx, 148 - h / 2, w / 2, h / 2, i === 0 ? "#ffb347" : "#ff6a2a"); ellipse(c, 196 + dx, 149 - h / 3, w / 4, h / 3, "#ffe680"); });
    FX.embers(c, 196, 140, 3, 8);
    HZ.llama(c, 300, 152, sprites);                                                                               // a loot llama
    [[214, "skull", "pump", "gold"], [240, "raven", "ar", "purple"], [286, "bear", "sniper", "blue"]].forEach(([x, st, gun, rar], i) => {
      npcBig(c, x, GROUND - 2, st, "idle", 3, { scale: 2 });
      c.save(); c.translate(x - 16, 140); c.rotate(-1.15); HZ.gun(c, gun, 0, 0, 1, 1, rar); c.restore();             // the weapons lean on the logs
      px(c, x - 16, GROUND + 6, 32, 8, "#6b4423"); px(c, x - 16, GROUND + 6, 32, 2, "#8a5a2c"); px(c, x - 16, GROUND + 12, 32, 2, "#3a2418");
    });
    px(c, 228, 160, 6, 8, "#3a8ee6"); px(c, 228, 160, 6, 2, "#cfd8ff");                                          // a shield potion by the fire
    HZ.shadowHero(c, 80, 164, { dir: "right", step: 1, t: 3, shadowX: 22 });
  },

  // Pleasant Park - Retail Row: a sniper glints on a rooftop
  H4(c) {
    FX.scenery(c, 3);
    SKY.supplyDrop(c, 54, 170, 0.34, 3);                                                                             // a supply drop drifts down in the distance
    FX.brushBack(c, 252, 164, 128, 3, { hollowAt: 244 });                                                           // the sniper lies in the brush
    FX.ghillie(c, 272, 160, 3, { glint: true, scale: 1.5 });
    for (let k = 0; k < 26; k++) px(c, Math.round(lerp(168, 118, k / 26)), Math.round(lerp(146, 140, k / 26)), 2, 1, "rgba(255,40,40," + (0.25 + 0.4 * k / 26).toFixed(2) + ")");   // the red laser to the fish
    px(c, 116, 138, 5, 5, "#ff2020"); FX.glow(c, 118, 140, 12, "255,40,40", 0.5);
    HZ.shadowHero(c, 112, 164, { t: 3, step: 0, dir: "down", shadowX: 14 });
    px(c, 98, 134, 28, 22, "#1b1030"); px(c, 99, 135, 26, 20, "#f3e6c8");                                            // he is checking the map
    px(c, 104, 141, 14, 1, "#7cc4ff"); px(c, 108, 145, 9, 1, "#7cc4ff"); px(c, 114, 146, 4, 1, "#e0463c"); px(c, 115, 145, 1, 3, "#e0463c");
    FX.brushFront(c, 252, 164, 128, 3, { sparse: true });
  },

  // Pleasant Park - Polar Peak: the icy path along a cliff edge
  H7(c) {
    band(c, 0, 110, ["#7a9ac8", "#9ab4da", "#b4c8e6", "#cddcf0", "#e4ecf8"]);
    FX.clouds(c, 3, 20, "255,255,255", 3, 3, 3);
    mountain(c, 60, 106, 70, 84, "#8d95b0", "#ffffff"); mountain(c, 250, 108, 84, 100, "#7a86a6", "#ffffff");
    HZ.balloon(c, 140, 36);                                                                                         // a supply drop drifts past
    band(c, 106, SH, ["#b8c8e4", "#a4b8da", "#90a8d0", "#7c98c4", "#6a88b8"]);                                       // far below: the valley in the haze
    for (let k = 0; k < 12; k++) pine(c, 6 + k * 14 + hash(k, 1, 7) % 6, 128 + (k % 3) * 8, 6 + k % 3);
    FX.clouds(c, 5, 112, "255,255,255", 3, 2, 4);
    c.fillStyle = "#c8dcec";                                                                                        // the ice wall on the right
    c.beginPath(); c.moveTo(212, 84); c.lineTo(320, 20); c.lineTo(320, 192); c.lineTo(170, 192); c.closePath(); c.fill();
    c.fillStyle = "#a8c4e0"; c.beginPath(); c.moveTo(212, 84); c.lineTo(250, 30); c.lineTo(320, 20); c.lineTo(212, 84); c.fill();
    for (let k = 0; k < 14; k++) px(c, 222 + (k * 9) % 90, 60 + (k * 23) % 110, 14 + k % 4 * 4, 2, k % 2 ? "#8ab0d0" : "#e8f4ff");
    for (let k = 0; k < 9; k++) { const ix = 232 + k * 10, iy = 34 + Math.round((ix - 232) * -0.1) + 8; px(c, ix, iy, 3, 8 + (k % 3) * 5, "#e8f6ff"); px(c, ix, iy, 1, 8 + (k % 3) * 5, "#ffffff"); }   // icicles
    c.fillStyle = "#e8f2fc";                                                                                        // the icy path narrowing into the distance
    c.beginPath(); c.moveTo(50, 192); c.lineTo(170, 192); c.lineTo(212, 84); c.lineTo(196, 84); c.closePath(); c.fill();
    c.fillStyle = "#cfe4f6"; c.beginPath(); c.moveTo(50, 192); c.lineTo(90, 192); c.lineTo(200, 84); c.lineTo(196, 84); c.closePath(); c.fill();
    for (let k = 0; k < 7; k++) px(c, 70 + k * 12 - k * 6, 186 - k * 14, 30 - k * 3, 2, "rgba(255,255,255,0.8)");   // shiny ice
    for (let y = 100; y < 192; y += 18) { const rx = 196 + (192 - y) * 0.0 + 0; const edge = 212 - (y - 84) * 0.4; px(c, Math.round(edge) - 2, y - 24, 2, 28, "#7a4a24"); }   // posts of the rope rail
    for (let y = 100; y < 168; y += 18) { const e1 = 212 - (y - 84) * 0.4, e2 = 212 - (y + 18 - 84) * 0.4; for (let s = 0; s < 6; s++) px(c, Math.round(lerp(e1, e2, s / 6)) - 2, Math.round(lerp(y - 22, y - 4, s / 6)) + 2, 2, 1, "#c8a870"); }
    for (let k = 0; k < 6; k++) px(c, 200 - k * 18 + (k % 2) * 4, 100 + k * 14, 1, 7, "#fff");
    FX.snow(c, 3, 50, 30);
    HZ.shadowHero(c, 138, 158, { dir: "up", step: 1, t: 3, shadowX: 0, scale: 1 });
  },

  // Pleasant Park - Polar Peak: a pump shotgun waits behind the wall
  H8(c) {
    FX.scenery(c, 3);
    FX.wall(c, 0, 52, 152, 112);
    px(c, 140, 52, 12, 112, "#a6705e"); px(c, 150, 52, 2, 112, "#5e3a2e"); px(c, 152, 52, 8, 112, "#5e3a2e");            // the corner
    if (FX.where === "snow") { px(c, 0, 164, SW, 28, "#e8f2fc"); px(c, 0, 164, SW, 2, "#c4d6ea"); }
    for (let k = 0; k < 9; k++) { px(c, 30 + k * 12, 172 + (k % 2) * 3, 5, 3, "#b4c8e0"); }                          // footprints in the snow leading to the corner
    HZ.gun(c, "pump", 156, 96, 1, 2, "gold");                                                                       // only the barrel shows past the corner
    for (let k = 0; k < 3; k++) ellipse(c, 238 + k * 10, 90 - k * 5, 6 + k * 2, 4 + k, "rgba(255,255,255," + (0.5 - k * 0.12).toFixed(2) + ")");   // breath mist
    px(c, 162, 156, 10, 8, "#2b2d3a"); px(c, 160, 162, 14, 3, "#14141c"); px(c, 166, 150, 6, 7, "#f2f2f2");           // the toe of a Skull Trooper boot
    px(c, 168, 152, 2, 2, "#14141c");
    for (let i = 0; i < 6; i++) px(c, 200 + i * 12, 164 + (i % 2) * 4, 8, 2, "#f4f9ff");
    FX.snow(c, 3, 60, 18);
    HZ.shadowHero(c, 104, 170, { dir: "right", step: 1, t: 3, shadowX: 22 });
  },

  // Tilted Towers - Retail Row: a rocket flying straight at the player
  H3(c) {
    FX.city(c, 3);
    FX.lamp(c, 286, GROUND + 6, true, 3);
    px(c, 26, 46, 112, 34, "#14101c"); px(c, 28, 48, 108, 30, "#ffd23f"); px(c, 28, 48, 108, 4, "#fff0a0");           // the big neon sale sign
    c.font = 'bold 16px "Courier New", Courier, monospace'; c.textAlign = "center"; c.fillStyle = "#c0392b"; c.fillText("SALE -10%", 82, 71);
    FX.glow(c, 82, 64, 64, "255,210,80", 0.4);
    px(c, 78, 80, 6, 72, "#4a4f5e"); px(c, 26, 80, 112, 3, "#3a3d4a");
    px(c, 232, 96, 88, 8, "#8c8f99"); px(c, 244, 104, 76, 60, "#a8553c"); px(c, 232, 96, 88, 2, "#b5b1a5");           // the rooftop on the right with the rocketeer
    npcBig(c, 284, 96, "raven", "idle", 3, { scale: 1.6, flip: true });
    HZ.gun(c, "launcher", 262, 74, -1, 1, "purple");
    FX.muzzle(c, 226, 78, -1, 1);
    for (let k = 0; k < 13; k++) ellipse(c, Math.round(lerp(220, 144, k / 12)), Math.round(lerp(76, 118, k / 12) + Math.sin(k) * 2), 7 - k * 0.3, 5 - k * 0.2, "rgba(220,220,230," + (0.85 - k * 0.05).toFixed(2) + ")");   // the smoke trail
    HZ.gun(c, "rocket", 142, 118, 1, 1);
    c.save(); c.globalAlpha = 0.5; px(c, 120, 118, 22, 3, "#ffe680"); c.restore();
    [[188, 158, "#c0392b"], [218, 160, "#3a6fe0"]].forEach(([x, y, col]) => { px(c, x, y - 12, 26, 12, col); px(c, x + 5, y - 17, 15, 6, col); px(c, x + 7, y - 16, 5, 4, "#bfe6ff"); px(c, x + 13, y - 16, 5, 4, "#bfe6ff"); px(c, x + 3, y, 6, 4, "#14141c"); px(c, x + 17, y, 6, 4, "#14141c"); });   // parked cars
    HZ.shadowHero(c, 84, 160, { dir: "up", t: 3, shadowX: 18 });
  },

  // Tilted Towers - Retail Row: a Launch Pad in the middle of the road
  H6(c) {
    FX.city(c, 3, { sky: ["#241048", "#2e1a5a", "#5a2a78", "#a03a78", "#e0584e", "#f4864a"] });
    clockTower(c, 238, 52);
    FX.glow(c, 150, 130, 80, "56,224,204", 0.25);
    for (let k = 0; k < 7; k++) { c.fillStyle = "rgba(122,240,224," + (0.1 + 0.02 * k).toFixed(2) + ")"; c.fillRect(124 + k, 0, 54 - k * 2, 124); }       // a tall column of light into the sky
    for (let k = 0; k < 12; k++) px(c, 128 + hash(k, 1, 40) % 44, 10 + hash(k, 2, 40) % 110, 2, 3, k % 2 ? "#fff" : "#7af0e0");
    for (let k = 0; k < 6; k++) { const ax = 96 - k * 18, ay = 176 - k * 3; c.globalAlpha = 0.25 + 0.1 * k; for (let q = 0; q < 5; q++) { px(c, ax - q, ay + q, 2, 1, "#7af0e0"); px(c, ax + 1 + q, ay + q, 2, 1, "#7af0e0"); } c.globalAlpha = 1; }   // arrows painted on the road
    c.save(); c.translate(102, 78); c.scale(3, 3); drawLaunchPad(c, 0, 0, 3, { noBeam: true }); c.restore();                                       // the pad, big
    [[60, 166], [252, 172]].forEach(([x, y]) => { px(c, x, y - 12, 8, 14, "#f2692d"); px(c, x + 1, y - 8, 6, 2, "#ffffff"); px(c, x - 2, y + 2, 12, 3, "#2a2d38"); px(c, x + 2, y - 15, 4, 3, "#f2692d"); });   // traffic cones
    px(c, 266, 112, 36, 3, "#8a8f9c"); px(c, 270, 115, 2, 40, "#8a8f9c");                                                                          // a street sign pole
    px(c, 260, 96, 48, 18, "#2a6ab8"); px(c, 260, 96, 48, 2, "#8fc8ff"); for (let q = 0; q < 5; q++) { px(c, 280 - q, 100 + q * 2, 2, 1, "#fff"); px(c, 283 + q, 100 + q * 2, 2, 1, "#fff"); }   // a blue arrow sign
    FX.birds(c, 3, 24, 4, 10, 6);
    HZ.shadowHero(c, 64, 160, { dir: "right", step: 1, t: 3, shadowX: 22 });
  },

  // Tilted Towers - Polar Peak: thin cracking ice
  H9(c) {
    band(c, 0, 90, ["#8fb0dc", "#a4c0e6", "#bcd2ee", "#d4e2f4", "#eaf2fa"]);
    FX.clouds(c, 3, 20, "255,255,255", 3, 3, 3);
    mountain(c, 70, 100, 56, 80, "#8d95b0", "#ffffff"); mountain(c, 250, 102, 64, 90, "#7a86a6", "#ffffff");
    for (let k = 0; k < 14; k++) pine(c, 6 + k * 23 + hash(k, 1, 7) % 8, 108 + hash(k, 2, 7) % 5, 9 + hash(k, 3, 7) % 3);
    band(c, 110, SH, ["#bfe0f4", "#aed4ee", "#9ac8e6", "#86bade", "#74acd4"]);
    for (let x = 0; x < SW; x += 40) px(c, x + hash(x, 1, 5) % 20, 120 + hash(x, 2, 5) % 60, 28, 1, "rgba(255,255,255,0.45)");
    const hx = 120, hy = 164;                                                                                       // spiderweb cracks around the fish
    [[0, -1], [1, -0.6], [1, 0], [0.8, 0.5], [-1, -0.5], [-1, 0.1], [-0.8, 0.6], [0.2, 0.7], [-0.3, -1]].forEach(([dx, dy], i) => {
      let x = hx, y = hy; const len = 70 + (i * 17) % 40;
      for (let s = 0; s < len; s += 3) { x += dx * 3 + ((hash(i, s, 4) % 3) - 1); y += dy * 1.6 + ((hash(i, s, 5) % 3) - 1) * 0.5; px(c, Math.round(x), Math.round(y), 2, 1, "#2a5a8a"); px(c, Math.round(x), Math.round(y) + 1, 2, 1, "rgba(200,240,255,0.5)"); }
    });
    ellipse(c, 214, 152, 26, 8, "#0a2a5a"); ellipse(c, 214, 150, 20, 6, "#04122e"); [[198, 148], [230, 156], [212, 142]].forEach(([x, y]) => { px(c, x, y, 6, 3, "#dff4ff"); px(c, x, y, 6, 1, "#ffffff"); });   // water through a hole
    HZ.grenade(c, 252, 156, "chiller"); FX.glow(c, 255, 160, 14, "120,200,255", 0.4);                                // a chiller grenade lying on the ice
    px(c, 280, 130, 2, 24, "#7a4a24"); px(c, 276, 128, 14, 2, "#7a4a24"); px(c, 288, 130, 1, 14, "#e8e8f0"); ellipse(c, 289, 146, 3, 3, "#e0463c");   // an ice fishing rod
    ellipse(c, 285, 156, 12, 4, "#04122e");
    HZ.shadowHero(c, 120, 170, { dir: "right", step: 0, t: 3, shadowX: 20 });
  },

  // Tilted Towers - Polar Peak: an avalanche
  H10(c) {
    band(c, 0, 130, ["#6a7aa0", "#8090b4", "#98a8c8", "#b4c0da", "#d0d8ec"]);
    mountain(c, 60, 134, 96, 90, "#7a86a6", "#ffffff");
    mountain(c, 230, 140, 140, 150, "#6a7696", "#ffffff");                                                          // the big mountain where it starts
    c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(214, 34); c.lineTo(300, 120); c.lineTo(150, 150); c.lineTo(200, 90); c.closePath(); c.fill();
    for (let k = 0; k < 16; k++) pine(c, 6 + k * 20 + hash(k, 1, 7) % 8, 142 + hash(k, 2, 7) % 5, 12 + hash(k, 3, 7) % 4);
    px(c, 20, 118, 26, 16, "#6b4423"); px(c, 18, 112, 30, 8, "#a8553c"); px(c, 22, 122, 5, 6, "#ffe28a");               // a little chalet that is about to be buried
    band(c, 146, SH, ["#f4f9ff", "#e8f2fc", "#dce9f6", "#d0e0f0"]);
    for (let q = 0; q < 26; q++) {                                                                                  // the wave of snow rolling down the slope
      const px_ = 300 - q * 7.5 + (hash(q, 1, 9) % 12), py_ = 54 + q * 3.3 + (hash(q, 2, 9) % 10);
      ellipse(c, Math.round(px_), Math.round(py_), 22 + hash(q, 3, 9) % 14, 14 + hash(q, 4, 9) % 8, q % 3 ? "#ffffff" : "#e6f0fa");
      ellipse(c, Math.round(px_ - 6), Math.round(py_ + 4), 14, 9, "#cfdcec");
    }
    for (let q = 0; q < 8; q++) ellipse(c, 70 + q * 12, 166 - q * 2, 36 - q * 3, 12, "rgba(255,255,255,0.9)");        // it reaches the valley floor
    [[120, 128], [96, 142], [150, 118], [70, 150]].forEach(([x, y], i) => { px(c, x, y, 6 + i % 2 * 3, 5, "#6f7790"); px(c, x, y, 6, 1, "#9aa2b6"); });   // rocks tumbling in it
    pine(c, 110, 146, 14); pine(c, 130, 140, 12);
    FX.snow(c, 3, 80, 40);
    HZ.shadowHero(c, 200, 174, { dir: "up", step: 0, t: 3, shadowX: 12 });
  },

  // Retail Row - Polar Peak: another squad bursts out of the bushes
  H11(c) {
    FX.scenery(c, 3);
    const squad = [[200, "skull", "pump", "gold"], [244, "raven", "ar", "purple"], [288, "peely", null, null]];
    squad.forEach(([x, st, gun, rar], i) => {
      ellipse(c, x, 156, 26, 12, "#1f5a2c"); ellipse(c, x - 8, 152, 15, 9, "#2b7a38"); ellipse(c, x + 6, 148, 13, 8, "#35893f");   // the bush they burst out of
      npcBig(c, x, GROUND - 14, st, "run", 3, { scale: 2, flip: true });
      if (gun) HZ.gun(c, gun, x - 40, GROUND - 38, 1, 1, rar);
      else HZ.pickaxe(c, x - 30, GROUND - 28, -2.2, 26);                                                            // Peely brings a pickaxe
      ellipse(c, x, 160, 26, 5, "#1f5a2c");
    });
    for (let i = 0; i < 26; i++) px(c, 180 + hash(i, 1, 95) % 120, 104 + hash(i, 2, 95) % 54, 3 + i % 2, 2, ["#3f9a35", "#2c7a2c", "#6ac04a"][i % 3]);   // leaves flying
    px(c, 52, 138, 2, 22, "#6b4423"); HZ.pickaxe(c, 53, 138, -1.5, 14);                                             // the hero has a pickaxe on his back
    HZ.shadowHero(c, 60, 166, { dir: "right", step: 1, t: 3, shadowX: 22 });
  },

  // Retail Row - Polar Peak: a rocket whistles past from a rooftop
  H12(c) {
    FX.scenery(c, 3);
    px(c, 0, 158, SW, SH - 158, "#6f7384"); px(c, 0, 154, SW, 5, "#a0a4b4"); px(c, 0, 158, SW, 2, "#505468");        // our rooftop
    px(c, 14, 136, 32, 20, "#8a8f9c"); px(c, 14, 136, 32, 3, "#b4b8c4"); px(c, 20, 140, 20, 9, "#4a4f5e");
    px(c, 236, 84, 84, 74, "#8c8f99"); px(c, 236, 84, 84, 4, "#b5b1a5"); px(c, 236, 84, 84, 1, "rgba(255,200,140,0.4)");  // the rooftop across the street
    for (let wy = 96; wy < 150; wy += 14) for (let wx = 244; wx < 312; wx += 14) px(c, wx, wy, 6, 8, hash(wx + wy, 2, 3) % 4 === 0 ? "#ffe28a" : "#6a7a9a");
    npcBig(c, 282, 84, "raven", "idle", 3, { scale: 1.8, flip: true });
    HZ.gun(c, "launcher", 262, 50, -1, 1, "gold");                                                                  // the launcher on the shoulder
    FX.muzzle(c, 226, 54, -1, 1);
    for (let k = 0; k < 16; k++) ellipse(c, Math.round(lerp(224, 116, k / 15)), Math.round(lerp(56, 110, k / 15) + Math.sin(k * 0.8) * 3), 6 + (1 - k / 15) * 2, 4, "rgba(220,220,230," + (0.7 - k * 0.035).toFixed(2) + ")");
    HZ.gun(c, "rocket", 100, 112, 1, 1);                                                                             // the rocket whistles past his head
    for (let k = 0; k < 5; k++) px(c, 70 - k * 8, 114 + (k % 2) * 3, 10, 1, "rgba(255,255,255,0.7)");
    FX.sparks(c, 112, 114, 0.6, 10, 8);
    HZ.shadowHero(c, 96, 158, { pose: "scared", t: 3, shadowX: 14 });
  },
};

// the picture for a danger card: drawn once into a canvas (null if this danger has no new picture yet)
function hazardPicture(id, sprites) {
  const make = HAZARD_PICS[id];
  if (!make) return null;
  const card = document.createElement("canvas");
  card.width = SW; card.height = SH;
  card.className = "pixel hazard-pic";
  card.setAttribute("aria-label", "Picture of the danger");
  const c = card.getContext("2d");
  c.imageSmoothingEnabled = false;
  make(c, sprites);
  HZ.finish(c);
  return card;
}
