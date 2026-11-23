"use strict";

// The elimination cards: one pixel picture for every way of losing (the 12 deadly dangers and the Storm).
// They are drawn in code on the 320 x 192 pixel screen and move a little (flames, smoke, the loot beam).
// The picture is the background of the ending card; the ELIMINATED banner and the kill-feed line are
// drawn on top of every one of them. Nothing in here decides game rules.

const DUSK = ["#2a1458", "#4a1d6a", "#7a2a72", "#b4386a", "#e0594e", "#f4864a", "#f9b25a"];
const NIGHT = ["#0a0820", "#100c30", "#181046", "#221858", "#2c2068"];

// What the kill feed says (funny on purpose).
const KILL_FEED = {
  H1: "a very pointy spike trap",
  H5: "a very proud clock tower",
  H2: "a sleepy camper",
  H4: "a patient sniper (you checked your map)",
  H7: "gravity, with help from the ice",
  H8: "a pump shotgun around the corner",
  H3: "a rocket with 10% off",
  H6: "a suspiciously clean doorway",
  H9: "thin ice. Chill.",
  H10: "an angry snowball. The big kind.",
  H11: "a squad with actual guns",
  H12: "a very friendly rocketeer",
  B: "the Storm (it's not personal)",
};

const rnd = (i, s, m) => hash(i, s, 17) % m;

// ---------- shared drawing helpers ----------

function hills(c, y, col, seed, amp) {                 // a silhouette of hills; y is the average height
  for (let x = 0; x < SW; x++) {
    const h = Math.round(y + Math.sin(x * 0.035 + seed) * amp + Math.sin(x * 0.09 + seed * 2) * amp * 0.4);
    px(c, x, h, 1, SH - h, col);
  }
}

function twinkle(c, t, n, ymax) {
  for (let i = 0; i < n; i++) {
    if (Math.sin(t * 2 + i * 1.7) > -0.4) px(c, rnd(i, 1, SW), rnd(i, 2, ymax), 1, 1, i % 4 === 0 ? "#fff6c0" : "#cfd8ff");
  }
}

function ring(c, cx, cy, rx, ry, color) {
  for (let a = 0; a < 6.28; a += 0.22) px(c, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 2, 1, color);
}

function pickaxeAt(c, x, y, ang, len) {                // handle from (x, y), head at the far end
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let i = 0; i < len; i++) px(c, Math.round(x + dx * i), Math.round(y + dy * i), 2, 2, i % 6 === 0 ? "#5b3418" : "#7a4a24");
  const ex = x + dx * len, ey = y + dy * len, nx = -dy, ny = dx;
  for (let k = -8; k <= 8; k++) {
    const bend = k * k * 0.06;
    px(c, Math.round(ex + nx * k + dx * bend), Math.round(ey + ny * k + dy * bend), 2, 2, Math.abs(k) > 5 ? "#eef2fa" : "#9aa2b6");
  }
}

function bricks(c, x, y, w, h, base, mortar) {         // a brick wall
  px(c, x, y, w, h, base);
  for (let row = 0; row * 6 < h; row++) {
    px(c, x, y + row * 6, w, 1, mortar);
    for (let bx = (row % 2) * 8; bx < w; bx += 16) px(c, x + bx, y + row * 6, 1, 6, mortar);
  }
}

function skullIcon(c, x, y) {                          // the little skull of the kill feed
  px(c, x + 1, y, 5, 1, "#fff"); px(c, x, y + 1, 7, 4, "#fff"); px(c, x + 1, y + 5, 5, 2, "#fff");
  px(c, x + 1, y + 2, 2, 2, "#1b1030"); px(c, x + 4, y + 2, 2, 2, "#1b1030"); px(c, x + 3, y + 4, 1, 1, "#1b1030");
  px(c, x + 2, y + 6, 1, 1, "#1b1030"); px(c, x + 4, y + 6, 1, 1, "#1b1030");
}

// The dropped loot: a beam of light and a pile of Fortnite items. Draw the beam first, the hero, then the pile.
function lootBeam(c, x, y, t, rgb) {
  rgb = rgb || "255,196,40";
  const f = 0.62 + 0.12 * Math.sin(t * 5) + 0.08 * Math.sin(t * 11);
  [[30, 0.1], [18, 0.16], [9, 0.3], [3, 0.65]].forEach(([w, a]) => {
    for (let seg = 0; seg < 8; seg++) {
      const h = Math.ceil(y / 8) + 1;
      c.fillStyle = "rgba(" + rgb + "," + (a * f * (1 - seg / 9)).toFixed(2) + ")";
      c.fillRect(Math.round(x - w / 2), Math.round(y - (seg + 1) * y / 8), w, h);
    }
  });
  ellipse(c, x, y, 26, 5, "rgba(" + rgb + "," + (0.3 * f).toFixed(2) + ")");
  for (let k = 0; k < 9; k++) {                                                    // sparks floating up the beam
    const yy = y - ((t * 34 + k * 31) % 120), xx = x - 7 + rnd(k, 3, 15) + Math.round(Math.sin(t * 3 + k) * 2);
    px(c, xx, Math.round(yy), 2, 2, k % 2 ? "#fff6c0" : "#ffd23f");
  }
}

function lootPile(c, x, y, t, o) {
  o = o || {};
  const b = (i) => Math.round(Math.sin(t * 2.2 + i) * (o.float ? 2.5 : 0.7));
  ellipse(c, x, y + 3, 30, 4, "rgba(0,0,0,0.3)");
  ellipse(c, x, y + 2, 28, 4, "rgba(255,200,60,0.25)");
  // wood: two stacked planks
  px(c, x - 30, y - 3 + b(0), 16, 4, "#a66b2d"); px(c, x - 30, y - 3 + b(0), 16, 1, "#d0974a"); px(c, x - 30, y + b(0), 16, 1, "#6b4423");
  px(c, x - 28, y - 7 + b(0), 13, 4, "#b87a35"); px(c, x - 28, y - 7 + b(0), 13, 1, "#dca458"); px(c, x - 15, y - 7 + b(0), 1, 4, "#6b4423");
  // shield potion
  px(c, x - 11, y - 9 + b(1), 7, 8, "#14284a"); px(c, x - 10, y - 8 + b(1), 5, 6, "#3a8ee6"); px(c, x - 10, y - 4 + b(1), 5, 2, "#2a64b0");
  px(c, x - 9, y - 7 + b(1), 1, 3, "#bfe0ff"); px(c, x - 9, y - 12 + b(1), 3, 3, "#cfd8ff"); px(c, x - 10, y - 13 + b(1), 5, 1, "#b8863c");
  // medkit
  px(c, x + 1, y - 8 + b(2), 11, 8, "#8a8f9c"); px(c, x + 2, y - 7 + b(2), 9, 6, "#f4f4f4");
  px(c, x + 6, y - 7 + b(2), 1, 6, "#e0463c"); px(c, x + 4, y - 5 + b(2), 5, 2, "#e0463c"); px(c, x + 5, y - 11 + b(2), 3, 3, "#8a8f9c");
  // ammo box
  px(c, x + 15, y - 6 + b(3), 11, 7, "#8a4a14"); px(c, x + 16, y - 5 + b(3), 9, 5, "#d98a2b"); px(c, x + 16, y - 5 + b(3), 9, 1, "#f2b25a");
  [18, 20, 22].forEach((bx) => px(c, x + bx, y - 3 + b(3), 1, 3, "#f4d35e"));
  // gold coins
  ellipse(c, x + 31, y, 5, 2, "#a8801a"); ellipse(c, x + 31, y - 1, 5, 2, "#f4c542"); px(c, x + 29, y - 2, 2, 1, "#fff0a0");
  ellipse(c, x + 36, y + 1, 3, 1, "#f4c542");
  for (let k = 0; k < 4; k++) {                                                    // sparkles on the loot
    const sx = x - 28 + rnd(k, 8, 62), sy = y - 14 + rnd(k, 9, 12);
    if (Math.sin(t * 3 + k * 2) > 0.3) { px(c, sx - 2, sy, 5, 1, "#fff6c0"); px(c, sx, sy - 2, 1, 5, "#fff6c0"); }
  }
}

// The hero as a ghost: see-through, floating, with a halo.
function ghostFish(c, x, y, t, o) {
  o = o || {};
  const bob = Math.round(Math.sin(t * 2) * 3), a = o.alpha === undefined ? 0.82 : o.alpha;
  ellipse(c, x, y - 22 + bob, 24, 30, "rgba(190,235,255," + (0.14 * a / 0.82).toFixed(2) + ")");
  fishAt(c, x, y + bob, { pose: o.pose || "wave", t, tint: "rgba(200,235,255,0.5)", alpha: a, scale: 2 });
  for (let i = 0; i < 4; i++) ellipse(c, x + Math.round(Math.sin(t * 3 + i) * 3), y + bob + 5 + i * 4, 9 - i * 2, 2, "rgba(200,235,255," + (0.28 - i * 0.06).toFixed(2) + ")");
  ring(c, x, y + bob - 54, 9, 2, "rgba(255,243,160," + (a + 0.25).toFixed(2) + ")");
}

// The hero knocked out, lying on the ground.
function koFish(c, x, gy, t, o) {
  o = o || {};
  ellipse(c, x, gy + 1, 28, 4, "rgba(0,0,0,0.35)");
  fishAt(c, x, gy + 17, { pose: "ko", rot: o.rot === undefined ? 1.5 : o.rot, flip: o.flip, t, tint: o.tint, scale: 2 });
}

function skyDusk(c) { band(c, 0, SH, DUSK); }

// ---------- the 13 scenes ----------

const ELIMINATIONS = {
  // Pleasant Park - Tilted Towers: the spike trap
  H1: { draw(c, t) {
    skyDusk(c);
    ellipse(c, 250, 112, 30, 30, "#ffe0a0"); ellipse(c, 250, 112, 22, 22, "#fff3c8");
    hills(c, 120, "#4a2a62", 1, 7); hills(c, 134, "#2d4a45", 3, 5);
    [[22, 130], [58, 136], [286, 132], [306, 140], [140, 128]].forEach(([x, y]) => { bgTree(c, x, y); px(c, x - 9, y - 12, 18, 22, "rgba(40,10,60,0.35)"); });
    band(c, 146, SH, ["#3f7a38", "#37702f", "#2f6428", "#285a22"]);
    px(c, 0, 158, SW, 24, "#8a6a3c"); px(c, 0, 158, SW, 2, "#a8864c"); px(c, 0, 180, SW, 2, "#6a4e2a");
    for (let x = 0; x < SW; x += 9) px(c, x + rnd(x, 1, 5), 162 + rnd(x, 2, 14), 3, 1, "#a8884e");
    spikes(c, 238, 172, 1); px(c, 232, 140, 3, 8, "#c8ccd8"); px(c, 242, 142, 3, 6, "#c8ccd8");
    lootBeam(c, 108, 174, t);
    lootPile(c, 108, 180, t);
    koFish(c, 108, 172, t);
    dizzy(c, 124, 128, t);
    pickaxeAt(c, 178, 176, -1.25, 24);
  } },

  // Pleasant Park - Tilted Towers: the clock tower and the smoke
  H5: { draw(c, t) {
    skyDusk(c);
    [[0, 90, 34, 70], [30, 70, 30, 90], [62, 100, 36, 60], [262, 80, 30, 80], [290, 96, 30, 64]].forEach(([x, y, w, h]) => {
      px(c, x, y, w, h, "#3a2552"); px(c, x, y, w, 2, "#4f3770");
      for (let wy = y + 8; wy < y + h - 6; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 9) px(c, wx, wy, 4, 5, rnd(wx + wy, 4, 5) === 0 ? "#ffe28a" : "#26183c");
    });
    px(c, 0, 150, SW, SH - 150, "#4a4558"); px(c, 0, 150, SW, 3, "#6a6578");
    for (let x = 6; x < SW; x += 40) px(c, x, 172, 22, 2, "#d8d4c4");
    clockTower(c, 196, 64);
    px(c, 224, 100, 4, 6, "#14101c"); px(c, 223, 104, 6, 6, "#14101c");                          // an enemy in the window
    px(c, 225, 102, 1, 1, "#ff4f5e"); px(c, 227, 102, 1, 1, "#ff4f5e");
    [[70, 166], [150, 170], [210, 164]].forEach(([x, y]) => { px(c, x, y - 7, 5, 8, "#5a7a42"); px(c, x, y - 7, 5, 2, "#a8c27a"); });   // smoke grenades
    lootBeam(c, 108, 170, t, "180,140,255");
    ghostFish(c, 108, 152, t);
    for (let i = 0; i < 12; i++) {                                                                  // the smoke
      const sx = (rnd(i, 1, 340) + t * 6 * (1 + i % 3)) % 340 - 10, sy = 134 + rnd(i, 2, 40) - Math.round(Math.sin(t + i) * 4);
      ellipse(c, Math.round(sx), sy, 24 + rnd(i, 3, 14), 9 + rnd(i, 4, 5), "rgba(206,210,226,0.34)");
    }
    lootPile(c, 108, 174, t);
  } },

  // Pleasant Park - Retail Row: the camper
  H2: { draw(c, t) {
    band(c, 0, SH, NIGHT); twinkle(c, t, 40, 90);
    ellipse(c, 70, 40, 14, 14, "#f4f0d0"); ellipse(c, 66, 38, 11, 11, "#fffbe8");
    hills(c, 112, "#16203a", 2, 6);
    for (let k = 0; k < 14; k++) pine(c, 8 + k * 24 + rnd(k, 1, 10), 140 + rnd(k, 2, 8), 9 + rnd(k, 3, 4));
    band(c, 146, SH, ["#1f4430", "#1a3a2a", "#163024", "#122a1e"]);
    // the tent
    for (let y = 76; y <= 170; y++) {
      const half = Math.round((y - 76) * 54 / 94);
      px(c, 240 - half, y, half, 1, "#3f8a3a"); px(c, 240, y, half + 1, 1, "#2a5e2a");
      if (y % 12 === 0 && half > 8) { px(c, 240 - half + 4, y, 8, 1, "#336e30"); px(c, 240 + half - 12, y, 8, 1, "#204c22"); }
    }
    px(c, 240, 76, 1, 94, "#1a3a1c");
    for (let y = 106; y <= 170; y++) { const half = Math.round((y - 106) * 20 / 64); px(c, 240 - half, y, half * 2 + 1, 1, "#0e0a08"); }
    px(c, 240, 68, 2, 10, "#8a5a2c"); px(c, 242, 68, 10 + Math.floor(t * 4) % 2, 6, "#e0463c");
    c.save(); c.translate(232, 140); c.scale(2, 2); peeker(c, 0, 0, Math.floor(t * 1.2) % 2 ? 1 : -1, "#e0463c", "#ff8a7a"); c.restore();   // the camper grins at you
    outlined(c, "Z", 270 + Math.round(Math.sin(t * 2) * 3), 116 - Math.floor(t * 8) % 12, "#cfd8ff", 12);
    outlined(c, "z", 280, 104 - Math.floor(t * 6) % 10, "#cfd8ff", 9);
    // the campfire
    const gl = 0.35 + 0.1 * Math.sin(t * 9);
    ellipse(c, 168, 168, 40, 14, "rgba(255,150,40," + gl.toFixed(2) + ")");
    px(c, 156, 166, 24, 4, "#4a2f18"); px(c, 160, 163, 16, 3, "#6b4423");
    [[0, 16, 10], [-6, 11, 8], [6, 12, 9]].forEach(([dx, h, w], i) => {
      const fh = h + Math.round(Math.sin(t * 10 + i * 2) * 3);
      ellipse(c, 168 + dx, 164 - fh / 2, w / 2, fh / 2, i === 0 ? "#ffb347" : "#ff6a2a"); ellipse(c, 168 + dx, 165 - fh / 3, w / 4, fh / 3, "#ffe680");
    });
    lootBeam(c, 82, 174, t);
    lootPile(c, 82, 180, t);
    koFish(c, 82, 172, t, { flip: true });
  } },

  // Pleasant Park - Retail Row: the sniper (the hero is not in the picture, only the loot in the scope)
  H4: { draw(c, t) {
    c.fillStyle = "#050508"; c.fillRect(0, 0, SW, SH);
    c.save(); c.beginPath(); c.arc(160, 96, 84, 0, Math.PI * 2); c.clip();
    band(c, 0, SH, ["#9fc3e6", "#b4d2ee", "#c9ddf2", "#dde9f6", "#efe6e8", "#f6dfd0"]);
    mountain(c, 60, 124, 54, 66, "#a9b4cc", "#ffffff"); mountain(c, 240, 130, 60, 76, "#8d95b0", "#ffffff");
    hills(c, 124, "#4f7f55", 1, 5); hills(c, 140, "#456f3f", 4, 4);
    band(c, 150, SH, ["#5d9248", "#558c43", "#4c7e3b", "#447034"]);
    px(c, 0, 158, SW, 18, "#8a6a3c");
    for (let k = 0; k < 8; k++) forestTree(c, 20 + k * 38, 144 + rnd(k, 1, 6), 6 + rnd(k, 2, 4));
    px(c, 252, 124, 26, 5, "#34502a"); px(c, 270, 124, 10, 2, "#2a2d38"); px(c, 278, 123, 1, 4, "#8fd4ff");     // a sniper in a ghillie suit, far away
    if (Math.floor(t * 2) % 3 === 0) { px(c, 275, 124, 7, 1, "#fff"); px(c, 278, 121, 1, 7, "#fff"); }
    lootBeam(c, 160, 168, t);
    lootPile(c, 160, 170, t);
    c.restore();
    c.fillStyle = "rgba(0,0,0,0.75)";
    [[160, 96, 83], [160, 96, 80]].forEach(([cx, cy, r]) => { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.lineWidth = 3; c.strokeStyle = "#0e0e14"; c.stroke(); });
    const mark = (x, y, w, h) => { px(c, x + 1, y + 1, w, h, "rgba(0,0,0,0.6)"); px(c, x, y, w, h, "#f4f4d8"); };
    mark(76, 96, 76, 1); mark(168, 96, 76, 1); mark(160, 12, 1, 76); mark(160, 104, 1, 76);                      // the crosshair
    for (let k = 1; k < 8; k++) { mark(160 + k * 10 - 1, 93, 1, 7); mark(160 - k * 10, 93, 1, 7); mark(157, 96 + k * 10, 7, 1); mark(157, 96 - k * 10, 7, 1); }
    px(c, 156, 92, 9, 9, "rgba(255,79,94," + (0.35 + 0.3 * Math.sin(t * 6)).toFixed(2) + ")");
    outlined(c, "RANGE 142m", 262, 60, "#f4f4d8", 8);
  } },

  // Pleasant Park - Polar Peak: the icy cliff
  H7: { draw(c, t) {
    band(c, 0, 120, ["#9fc3e6", "#b4d2ee", "#c9ddf2", "#dde9f6", "#efe6e8", "#f6dfd0"]);
    cloud(c, ((50 + t * 4) % 380) - 30, 40, 1); cloud(c, ((210 + t * 3) % 380) - 30, 64, 0.8);
    mountain(c, 250, 130, 70, 80, "#99a8c4", "#ffffff"); mountain(c, 170, 138, 40, 56, "#b3c0d8", "#ffffff");
    band(c, 150, SH, ["#dce9f5", "#cfe0f0", "#c2d6ea", "#b4cae2"]);                                     // the valley far below
    for (let k = 0; k < 10; k++) pine(c, 170 + k * 15, 160 + rnd(k, 1, 18), 6 + rnd(k, 2, 3));
    for (let y = 56; y < SH; y++) {                                                                      // the ice cliff
      const edge = 140 + Math.round(Math.sin(y * 0.18) * 4) + (y - 56) / 22;
      px(c, 0, y, Math.round(edge), 1, y % 14 < 2 ? "#7a9ec4" : (y % 6 < 3 ? "#a6c6e4" : "#94b6d8"));
      px(c, Math.round(edge) - 3, y, 3, 1, "#5f86b0");
    }
    px(c, 0, 52, 146, 8, "#f4f9ff"); px(c, 0, 58, 146, 2, "#cfe0f0");                                    // the snowy top with skid marks
    [[30, 54, 40, 1], [34, 56, 38, 1], [80, 54, 52, 1]].forEach(([x, y, w, h]) => px(c, x, y, w, h, "#8aa8c8"));
    px(c, 130, 50, 3, 6, "#8aa8c8"); px(c, 133, 52, 3, 4, "#b8d0e8");
    px(c, 136, 48, 6, 2, "#e8f2ff");                                                                       // a snowball he kicked off
    for (let k = 0; k < 8; k++) px(c, 8 + rnd(k, 3, 120), 80 + rnd(k, 4, 90), 12 + rnd(k, 5, 14), 2, "#d8ebf8");
    lootBeam(c, 250, 176, t);
    lootPile(c, 250, 180, t);
    ghostFish(c, 196, 130, t);
    for (let k = 0; k < 6; k++) px(c, 150 + Math.round((t * 12 + k * 17) % 40), 70 + k * 12, 2, 1, "rgba(255,255,255,0.8)");   // snow blowing off the edge
  } },

  // Pleasant Park - Polar Peak: the shotgun (the hero is not in the picture)
  H8: { draw(c, t) {
    skyDusk(c);
    hills(c, 120, "#4a2a62", 1, 7);
    px(c, 0, 160, SW, SH - 160, "#58586a"); px(c, 0, 160, SW, 3, "#7a7a8e");
    for (let x = 0; x < SW; x += 28) px(c, x + 6, 176, 14, 2, "#8a8a9e");
    bricks(c, 0, 34, 176, 128, "#8a4a3a", "#5e2e24");                                                       // the wall with the corner
    px(c, 0, 30, 180, 6, "#a8a8b8"); px(c, 0, 34, 180, 2, "#6a6a7e");
    px(c, 170, 36, 8, 126, "#a86a58"); px(c, 176, 36, 2, 126, "#5e2e24");
    for (let k = 0; k < 10; k++) px(c, 10 + rnd(k, 1, 150), 40 + rnd(k, 2, 110), 8, 2, "rgba(0,0,0,0.18)");
    px(c, 178, 96, 54, 7, "#2a2d38"); px(c, 178, 96, 54, 2, "#4a5060"); px(c, 228, 94, 6, 11, "#14141c");     // the pump shotgun
    px(c, 196, 101, 18, 5, "#7a4a24"); px(c, 196, 101, 18, 1, "#a8703a"); px(c, 214, 103, 4, 6, "#5b3418");
    if (Math.floor(t * 1.5) % 3 === 0) {                                                                    // a muzzle flash now and then
      ellipse(c, 238, 99, 9, 6, "#ffb347"); ellipse(c, 238, 99, 5, 3, "#fff3a0"); px(c, 244, 98, 12, 2, "#ffe680");
    }
    smoke(c, 236, 96, (t * 0.4) % 1, 1.1); smoke(c, 232, 96, (t * 0.4 + 0.5) % 1, 0.9);
    px(c, 194, 168, 14, 4, "#3a6fe0"); px(c, 192, 171, 18, 2, "#2a4fa8"); px(c, 200, 164, 4, 4, "#8fb4ff");   // a dropped cap
    lootBeam(c, 252, 172, t, "190,150,255");
    lootPile(c, 252, 176, t);
  } },

  // Tilted Towers - Retail Row: the rocket (the hero is not in the picture)
  H3: { draw(c, t) {
    skyDusk(c);
    [[0, 70, 60, 90], [250, 60, 70, 100]].forEach(([x, y, w, h]) => {
      px(c, x, y, w, h, "#4a3a5e"); px(c, x, y, w, 3, "#6a5a82");
      for (let wy = y + 12; wy < y + h - 10; wy += 14) for (let wx = x + 7; wx < x + w - 8; wx += 12) px(c, wx, wy, 6, 8, rnd(wx + wy, 5, 4) === 0 ? "#ffe28a" : "#2a1f40");
    });
    px(c, 0, 148, SW, SH - 148, "#4a4558"); px(c, 0, 148, SW, 3, "#6a6578");
    for (let x = 4; x < SW; x += 44) px(c, x, 176, 22, 2, "#d8d4c4");
    for (let i = 0; i < 16; i++) {                                                                          // the rocket's smoke trail across the sky
      const p = i / 15, sx = 6 + p * 160, sy = 20 + p * 130;
      ellipse(c, Math.round(sx), Math.round(sy + Math.sin(i + t * 2) * 2), 6 + (1 - p) * 5, 4 + (1 - p) * 4, "rgba(230,230,240," + (0.15 + 0.4 * p).toFixed(2) + ")");
    }
    px(c, 120, 44, 3, 14, "#8a8f9c");                                                                       // the sign hangs by one chain, bent
    c.save(); c.translate(121, 56); c.rotate(0.38 + Math.sin(t * 2) * 0.03);
    px(c, 0, 0, 2, 8, "#8a8f9c"); px(c, -2, 8, 74, 26, "#14101c"); px(c, 0, 10, 70, 22, "#e0463c"); px(c, 0, 10, 70, 3, "#ff7a6a");
    outlined(c, "10% OFF", 35, 27, "#ffffff", 11);
    c.restore();
    px(c, 120, 56, 3, 2, "#5a5f6e");
    ellipse(c, 196, 170, 62, 14, "rgba(20,14,16,0.7)"); ellipse(c, 196, 170, 44, 9, "rgba(8,6,8,0.8)");     // the crater
    for (let k = 0; k < 9; k++) px(c, 148 + rnd(k, 1, 96), 158 + rnd(k, 2, 24), 3, 2, k % 2 ? "#6a6f7d" : "#a66b2d");   // debris
    lootBeam(c, 196, 172, t);
    lootPile(c, 196, 178, t);
    for (let k = 0; k < 10; k++) {                                                                          // embers
      const ey = 170 - ((t * 24 + k * 19) % 90), ex = 150 + rnd(k, 3, 92) + Math.round(Math.sin(t * 2 + k) * 4);
      px(c, ex, Math.round(ey), 2, 2, k % 2 ? "#ffb347" : "#e0463c");
    }
    smoke(c, 160, 160, (t * 0.3) % 1, 1.5); smoke(c, 234, 160, (t * 0.3 + 0.5) % 1, 1.3);
  } },

  // Tilted Towers - Retail Row: the booby-trapped doorway
  H6: { draw(c, t) {
    skyDusk(c);
    bricks(c, 0, 24, SW, 146, "#8a4a3a", "#5e2e24");
    px(c, 0, 20, SW, 6, "#a8a8b8");
    [[16, 52, 38, 40], [250, 52, 38, 40]].forEach(([x, y, w, h]) => { px(c, x - 2, y - 2, w + 4, h + 4, "#d8d4c4"); px(c, x, y, w, h, "#26183c"); px(c, x + w / 2, y, 1, h, "#d8d4c4"); px(c, x, y + h / 2, w, 1, "#d8d4c4"); });
    ellipse(c, 160, 100, 78, 62, "rgba(10,6,6,0.42)"); ellipse(c, 160, 110, 52, 44, "rgba(10,6,6,0.4)");     // soot
    px(c, 122, 54, 76, 116, "#1a1410");                                                                       // the doorway, charred
    px(c, 128, 60, 64, 110, "#0e0a08");
    const gl = 0.5 + 0.2 * Math.sin(t * 8);
    ellipse(c, 160, 150, 26, 16, "rgba(255,120,30," + (gl * 0.5).toFixed(2) + ")");
    for (let i = 0; i < 5; i++) {                                                                             // small flames in the doorway
      const fh = 8 + rnd(i, 1, 6) + Math.round(Math.sin(t * 9 + i * 2) * 3);
      ellipse(c, 134 + i * 13, 168 - fh / 2, 4, fh / 2, "#ff6a2a"); ellipse(c, 134 + i * 13, 169 - fh / 3, 2, fh / 3, "#ffe680");
    }
    c.save(); c.translate(116, 56); c.rotate(-0.12);                                                          // the door, hanging from one hinge
    px(c, 0, 0, 12, 108, "#6b4423"); px(c, 1, 2, 10, 104, "#7a4a24"); px(c, 7, 50, 3, 3, "#e0b43a");
    for (let k = 0; k < 6; k++) px(c, 0, 8 + k * 18, 12, 2, "rgba(0,0,0,0.5)");
    c.restore();
    px(c, 0, 170, SW, SH - 170, "#58586a"); px(c, 0, 170, SW, 2, "#7a7a8e");
    for (let k = 0; k < 10; k++) px(c, 100 + rnd(k, 3, 120), 168 + rnd(k, 4, 10), 5, 3, k % 2 ? "#5e2e24" : "#3a2f2a");   // rubble
    lootBeam(c, 160, 172, t);
    lootPile(c, 160, 180, t);
    koFish(c, 160, 170, t, { tint: "rgba(24,16,12,0.55)" });
    smoke(c, 172, 140, (t * 0.35) % 1, 0.9); smoke(c, 148, 140, (t * 0.35 + 0.5) % 1, 0.8);                  // his hair is smoking
    dizzy(c, 176, 130, t);
  } },

  // Tilted Towers - Polar Peak: the thin ice (the hero is not in the picture)
  H9: { draw(c, t) {
    band(c, 0, 80, ["#0e1a40", "#16285a", "#1e3a72", "#2a4e88", "#4a78a8"]);
    for (let k = 0; k < 3; k++) {                                                                             // a little aurora
      const y = 22 + k * 12;
      for (let x = 0; x < SW; x += 2) px(c, x, y + Math.round(Math.sin(x * 0.04 + t * 0.8 + k) * 6), 2, 6, "rgba(" + (k % 2 ? "120,255,180" : "170,140,255") + ",0.22)");
    }
    twinkle(c, t, 30, 60);
    mountain(c, 70, 90, 50, 70, "#6a7a9c", "#ffffff"); mountain(c, 250, 92, 58, 80, "#5f6f92", "#ffffff");
    for (let k = 0; k < 12; k++) pine(c, 8 + k * 27 + rnd(k, 1, 8), 96 + rnd(k, 2, 5), 8 + rnd(k, 3, 3));
    px(c, 0, 94, SW, 8, "#e8f2ff");
    band(c, 102, SH, ["#bfe0f4", "#aed4ee", "#9ac8e6", "#86bade", "#74acd4"]);                                  // the frozen lake
    [[20, 120, 90], [200, 118, 100], [60, 150, 120], [180, 160, 110]].forEach(([x, y, w]) => px(c, x, y, w, 1, "rgba(255,255,255,0.4)"));
    const crack = (x0, y0, x1, y1) => { for (let i = 0; i <= 14; i++) px(c, Math.round(lerp(x0, x1, i / 14)) + (i % 2), Math.round(lerp(y0, y1, i / 14)), 2, 1, "#3a6a9a"); };
    [[160, 146, 40, 112], [160, 146, 290, 116], [160, 146, 30, 176], [160, 146, 300, 184], [160, 146, 160, 108], [160, 146, 110, 186], [100, 130, 70, 140]].forEach((a) => crack(...a));
    ellipse(c, 160, 146, 26, 11, "#04122e"); ellipse(c, 150, 146, 12, 8, "#04122e");                              // the hole is shaped like a fish
    px(c, 176, 140, 8, 3, "#04122e"); px(c, 180, 136, 6, 4, "#04122e"); px(c, 182, 152, 5, 4, "#04122e");
    px(c, 126, 138, 10, 3, "#04122e"); px(c, 124, 150, 12, 3, "#04122e"); px(c, 130, 142, 8, 9, "#04122e");
    ellipse(c, 160, 146, 22, 8, "#0a2a5a");
    px(c, 154, 143, 2, 2, "#fff");                                                                              // the eye of the hole
    for (let k = 0; k < 4; k++) ring(c, 160, 146, 10 + ((t * 8 + k * 6) % 22), 4 + ((t * 3 + k * 2) % 8), "rgba(180,220,255,0.35)");
    pickaxeAt(c, 214, 168, -1.1, 30);
    lootBeam(c, 160, 148, t, "120,200,255");
    lootPile(c, 160, 150, t, { float: true });
    px(c, 40 + Math.floor(t * 30) % 220, 110, 3, 1, "rgba(255,255,255,0.6)");
  } },

  // Tilted Towers - Polar Peak: the avalanche (the hero is not in the picture)
  H10: { draw(c, t) {
    band(c, 0, 100, ["#9fb0d4", "#b4c4e2", "#c8d6ee", "#dce6f6", "#eef2fa"]);
    mountain(c, 90, 128, 100, 100, "#7a86a6", "#ffffff"); mountain(c, 250, 130, 120, 110, "#6a7696", "#ffffff");
    for (let i = 0; i < 6; i++) px(c, 130 + i * 16, 60 + i * 12, 40, 6, "rgba(255,255,255,0.7)");               // the scar the avalanche left
    for (let k = 0; k < 14; k++) pine(c, 6 + k * 24 + rnd(k, 1, 8), 132 + rnd(k, 2, 8), 8 + rnd(k, 3, 3));
    px(c, 0, 132, SW, SH - 132, "#f4f9ff");
    ellipse(c, 160, 168, 150, 40, "#dce9f6"); ellipse(c, 120, 160, 100, 32, "#eef6ff"); ellipse(c, 210, 158, 90, 28, "#f8fcff");   // the huge pile of snow
    ellipse(c, 160, 176, 130, 22, "#c4d6ea");
    for (let k = 0; k < 18; k++) px(c, 40 + rnd(k, 1, 240), 140 + rnd(k, 2, 40), 10 + rnd(k, 3, 18), 2, k % 2 ? "#c4d6ea" : "#ffffff");
    px(c, 150, 114, 7, 36, "#f2692d"); px(c, 150, 114, 2, 36, "#ff9a5a"); px(c, 155, 114, 2, 36, "#b84a14");        // an arm sticks out of the snow
    px(c, 148, 108, 11, 8, "#f6c84c"); px(c, 148, 108, 11, 2, "#ffe680"); px(c, 152, 104, 3, 4, "#f6c84c");
    px(c, 158, 108, 5, 3, "#f6c84c");
    pickaxeAt(c, 188, 156, -1.0, 26);
    lootBeam(c, 164, 150, t, "255,196,40");
    lootPile(c, 210, 152, t);
    for (let i = 0; i < 28; i++) {                                                                              // drifting snow
      const sx = (rnd(i, 1, 340) + t * (14 + i % 5 * 4)) % 340 - 10, sy = (rnd(i, 2, 200) + t * (10 + i % 3 * 6)) % 200;
      px(c, Math.round(sx), Math.round(sy), 2, 2, "rgba(255,255,255,0.85)");
    }
  } },

  // Retail Row - Polar Peak: the pickaxe duel
  H11: { draw(c, t) {
    band(c, 0, SH, ["#7a4a8a", "#a8508a", "#d86a7a", "#f08a5a", "#f6b060", "#f9cc80"]);
    hills(c, 124, "#5a3a72", 1, 6); hills(c, 136, "#3a5a48", 3, 4);
    band(c, 148, SH, ["#4f8a3a", "#478034", "#3f742e", "#376828"]);
    px(c, 0, 162, SW, 22, "#8a6a3c"); px(c, 0, 162, SW, 2, "#a8864c"); px(c, 0, 182, SW, 2, "#6a4e2a");
    [[24, 150], [50, 156]].forEach(([x, y]) => { ellipse(c, x, y, 20, 10, "#1f5a2c"); ellipse(c, x - 6, y - 2, 12, 8, "#2b7a38"); ellipse(c, x + 4, y - 5, 10, 6, "#35893f"); });
    px(c, 24, 146, 2, 2, "#e0463c"); px(c, 50, 150, 2, 2, "#e0463c");
    const walk = Math.floor(t * 3) % 2;
    [[222, "renegade", "run"], [258, "skull", "run"]].forEach(([x, style, pose]) => {                           // the squad walks off with guns on their shoulders
      npcBig(c, x, 160 - walk, style, pose, t, { scale: 1.6, flip: false });
      px(c, x - 6, 118 - walk, 26, 3, "#2a2d38"); px(c, x + 14, 116 - walk, 5, 6, "#5b3418");
    });
    npcBig(c, 296, 160, "peely", "dance", t, { scale: 1.6 });                                                  // and one dances the default dance
    outlined(c, "GG", 296, 104 + Math.round(Math.sin(t * 6) * 3), "#ffd23f", 11);
    lootBeam(c, 108, 176, t);
    lootPile(c, 108, 182, t);
    koFish(c, 108, 174, t, { rot: -1.5 });
    px(c, 150, 170, 20, 3, "#7a4a24"); px(c, 168, 168, 12, 5, "#9aa2b6"); px(c, 176, 166, 5, 3, "#eef2fa");          // the broken pickaxe
    px(c, 142, 176, 8, 3, "#5b3418");
    dizzy(c, 90, 132, t);
  } },

  // Retail Row - Polar Peak: wave at the rocketeer
  H12: { draw(c, t) {
    skyDusk(c);
    ellipse(c, 70, 124, 34, 34, "#ffe0a0"); ellipse(c, 70, 124, 25, 25, "#fff3c8");
    for (let k = 0; k < 7; k++) {                                                                               // far skyline
      const x = k * 48 - 8, h = 40 + rnd(k, 1, 50);
      px(c, x, 150 - h, 40, h, "#3a2552"); px(c, x, 150 - h, 40, 2, "#4f3770");
      for (let wy = 150 - h + 8; wy < 142; wy += 10) for (let wx = x + 5; wx < x + 36; wx += 9) if (rnd(wx + wy, 6, 3) === 0) px(c, wx, wy, 4, 5, "#ffe28a");
    }
    px(c, 252, 92, 68, 78, "#4a3a62"); px(c, 252, 92, 68, 3, "#6a5a82");                                        // the rooftop with the rocketeer
    px(c, 270, 78, 10, 14, "#14101c"); px(c, 272, 74, 6, 6, "#14101c"); px(c, 252 + 10, 82, 20, 4, "#2a2d38");
    px(c, 282, 70 + Math.floor(t * 4) % 2 * 3, 3, 12, "#14101c");                                               // he waves back
    for (let i = 0; i < 14; i++) {                                                                              // the rocket's trail
      const p = i / 13;
      ellipse(c, Math.round(lerp(266, 120, p)), Math.round(lerp(82, 40, p) + Math.sin(p * 8) * 6 + Math.sin(i + t * 2) * 2), 6 + p * 3, 4 + p * 2, "rgba(230,230,240," + (0.5 - 0.3 * p).toFixed(2) + ")");
    }
    px(c, 0, 158, SW, SH - 158, "#5a566a"); px(c, 0, 154, SW, 5, "#7a768a"); px(c, 0, 158, SW, 2, "#3a364a");   // our rooftop with its edge
    px(c, 20, 136, 30, 18, "#8a8f9c"); px(c, 20, 136, 30, 3, "#b4b8c4"); px(c, 26, 140, 18, 8, "#4a4f5e");        // an air-conditioning box
    px(c, 296, 120, 2, 36, "#8a8f9c"); px(c, 288, 126, 18, 2, "#8a8f9c"); px(c, 290, 134, 14, 2, "#8a8f9c");      // antenna
    lootBeam(c, 150, 176, t);
    ghostFish(c, 150, 160, t);
    lootPile(c, 150, 180, t);
    boom(c, 120, 44, (t * 0.6) % 1, 0.5);
  } },

  // The Storm: the health ran out (the hero fades away, the llama walks on)
  B: { draw(c, t) {
    band(c, 0, SH, ["#1d0f40", "#2a1458", "#3a1f78", "#5a2fa0", "#7a45c8", "#9a5de0"]);
    for (let k = 0; k < 18; k++) {
      const cx = (rnd(k, 1, 380) + t * 6) % 360 - 20, cy = 14 + rnd(k, 2, 120);
      ellipse(c, Math.round(cx), Math.round(cy + Math.sin(t * 0.6 + k) * 4), 22 + rnd(k, 3, 24), 7 + rnd(k, 4, 8), k % 2 ? "#5a2fa0" : "#7a45c8");
    }
    if (Math.floor(t * 2.4) % 5 === 0 && (t * 2.4) % 1 < 0.2) {                                                 // lightning
      [[220, 0], [214, 26], [226, 52], [216, 80], [224, 108]].forEach(([x, y], i, a) => px(c, x, y, 2, (a[i + 1] ? a[i + 1][1] : 130) - y, "#fff7b0"));
      px(c, 0, 0, SW, SH, "rgba(210,180,255,0.14)");
    }
    px(c, 0, 150, 128, SH - 150, "#4a3a6a"); px(c, 0, 150, 128, 4, "#7a6aa0"); px(c, 200, 150, 120, SH - 150, "#4a3a6a"); px(c, 200, 150, 120, 4, "#7a6aa0");   // the two sides of the valley
    for (let k = 0; k < 8; k++) px(c, 4 + rnd(k, 1, 112), 158 + rnd(k, 2, 28), 12, 2, "#3a2c58");
    [[128, 150, 5], [136, 150, 4], [190, 150, 6], [182, 152, 3]].forEach(([x, y, h]) => px(c, x, y, 7, h * 2, "#6b4423"));   // the broken bridge
    px(c, 120, 150, 10, 3, "#8a5a2c"); px(c, 192, 150, 10, 3, "#8a5a2c");
    ellipse(c, 164, 190, 80, 24, "rgba(122,69,200,0.5)");                                                       // fog in the valley
    lootBeam(c, 100, 152, t, "190,150,255");
    ghostFish(c, 100, 140, t, { alpha: 0.4 + 0.1 * Math.sin(t * 1.5) });
    lootPile(c, 100, 156, t);
    const llama = window.__eliminationSprites && window.__eliminationSprites.llama;                              // the llama walks away into the fog
    const lx = 250 + (t % 10) * 5, fade = 1 - clamp01(((t % 10) - 5) / 4);
    c.save(); c.globalAlpha = fade;
    if (llama && llama.complete && llama.naturalWidth) { c.imageSmoothingEnabled = false; c.drawImage(llama, Math.round(lx - 9), 150 - 32 - Math.round(Math.abs(Math.sin(t * 6))), 18, 32); }
    else { px(c, Math.round(lx - 5), 138, 10, 8, "#ffb3e6"); px(c, Math.round(lx + 2), 130, 4, 9, "#ffb3e6"); }
    c.restore();
  } },
};

// ---------- the parts every card shares ----------

function eliminationOverlay(c, t, id) {
  c.fillStyle = "rgba(120,0,30,0.16)"; c.fillRect(0, 0, SW, SH);                                                // a reddish mood over everything
  for (let y = 0; y < 44; y++) { c.fillStyle = "rgba(10,0,10," + (0.5 * (1 - y / 44)).toFixed(2) + ")"; c.fillRect(0, y, SW, 1); }
  for (let y = 0; y < 30; y++) { c.fillStyle = "rgba(10,0,10," + (0.5 * (1 - y / 30)).toFixed(2) + ")"; c.fillRect(0, SH - 1 - y, SW, 1); }
  const pop = smooth(clamp01(t / 0.45)), by = Math.round(-34 + 34 * pop);                                        // the banner slides in
  px(c, 0, by + 8, SW, 26, "rgba(20,0,12,0.78)"); px(c, 0, by + 8, SW, 2, "#ff4f5e"); px(c, 0, by + 32, SW, 2, "#ff4f5e");
  for (let x = 0; x < SW; x += 12) px(c, x, by + 10, 6, 1, "rgba(255,79,94,0.35)");
  outlined(c, "ELIMINATED", 162, by + 29, "#ff4f5e", 21);
  outlined(c, "ELIMINATED", 160, by + 27, "#ffffff", 21);
  const feed = KILL_FEED[id];
  if (feed) {                                                                                                     // the kill feed
    const fy = SH - 22;
    px(c, 0, fy, SW, 16, "rgba(10,5,20,0.86)"); px(c, 0, fy, 3, 16, "#ffd23f"); px(c, 0, fy, SW, 1, "rgba(255,255,255,0.18)");
    skullIcon(c, 10, fy + 4);
    c.font = 'bold 9px "Courier New", Courier, monospace'; c.textAlign = "left";
    const lead = "Eliminated by: ", w = Math.round(c.measureText(lead).width);
    c.fillStyle = "#aab0cc"; c.fillText(lead, 22, fy + 11);
    c.fillStyle = "#ffd23f"; c.fillText(feed, 22 + w, fy + 11);
  }
}

function drawElimination(c, id, t, sprites) {
  const scene = ELIMINATIONS[id];
  if (!scene) return false;
  window.__eliminationSprites = sprites;
  c.imageSmoothingEnabled = false;
  c.save();
  c.translate(0, -16);                                                // the scenes sit a little higher: the kill feed covers the bottom
  scene.draw(c, t, sprites);
  c.restore();
  c.drawImage(c.canvas, 0, SH - 17, SW, 1, 0, SH - 16, SW, 16);        // the last row of the picture fills the gap
  eliminationOverlay(c, t, id);
  return true;
}
