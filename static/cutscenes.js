"use strict";

// Little films, all drawn in code on the 320 x 192 pixel screen: the title picture, the jump
// out of the Battle Bus, one elimination scene for each deadly danger, the jump over the
// valley in the Storm and the item that flies into the backpack.
// Nothing in here decides game rules: it only draws what the page tells it to.

const SW = 320, SH = 192, GROUND = 156;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, p) => a + (b - a) * p;
const smooth = (p) => p * p * (3 - 2 * p);

// ---------- small drawing helpers ----------

function band(c, y0, y1, colors) {
  const h = (y1 - y0) / colors.length;
  colors.forEach((col, i) => px(c, 0, Math.round(y0 + i * h), SW, Math.ceil(h) + 1, col));
}

function cloud(c, x, y, s) {
  ellipse(c, x, y, Math.round(14 * s), Math.round(5 * s), "#ffffff");
  ellipse(c, x + 10 * s, y + 2 * s, Math.round(10 * s), Math.round(4 * s), "#ffffff");
  ellipse(c, x - 10 * s, y + 2 * s, Math.round(9 * s), Math.round(4 * s), "#e6f2ff");
}

function outlined(c, text, x, y, color, size, align) {
  c.font = "bold " + size + 'px "Courier New", Courier, monospace';
  c.textAlign = align || "center";
  c.lineWidth = 3; c.strokeStyle = "#1b1030"; c.lineJoin = "round";
  c.strokeText(text, x, y);
  c.fillStyle = color;
  c.fillText(text, x, y);
}

function bubble(c, text, x, y) {                // a speech bubble; (x, y) = where the tail points
  c.font = 'bold 9px "Courier New", Courier, monospace';
  const w = Math.round(c.measureText(text).width) + 10;
  const bx = Math.max(2, Math.min(SW - w - 2, Math.round(x - w / 2))), by = y - 22;
  px(c, bx - 1, by - 1, w + 2, 16, "#1b1030");
  px(c, bx, by, w, 14, "#ffffff");
  px(c, Math.max(bx + 3, Math.min(bx + w - 7, x - 2)), by + 14, 4, 4, "#ffffff");
  px(c, Math.max(bx + 3, Math.min(bx + w - 7, x - 2)) + 1, by + 14, 2, 5, "#1b1030");
  c.fillStyle = "#1b1030"; c.textAlign = "left";
  c.fillText(text, bx + 5, by + 10);
}

function boom(c, x, y, p, size) {               // an explosion, p goes 0 -> 1
  size = size || 1;
  const r = Math.round((6 + 34 * Math.sqrt(p)) * size), a = (1 - p).toFixed(2);
  ellipse(c, x, y, r, Math.round(r * 0.9), "rgba(255,110,30," + (a * 0.9).toFixed(2) + ")");
  ellipse(c, x, y, Math.round(r * 0.7), Math.round(r * 0.62), "rgba(255,210,60," + a + ")");
  ellipse(c, x, y, Math.round(r * 0.36), Math.round(r * 0.3), "rgba(255,255,230," + a + ")");
  for (let i = 0; i < 12; i++) {
    const ang = i * 0.55, dist = r * (0.9 + p * 0.8);
    px(c, Math.round(x + Math.cos(ang) * dist), Math.round(y + Math.sin(ang) * dist * 0.8), 3, 3, i % 2 ? "#444" : "#ffb347");
  }
}

function dizzy(c, x, y, t) {                    // stars circling over a head
  for (let i = 0; i < 4; i++) {
    const a = t * 6 + i * 1.57;
    px(c, Math.round(x + Math.cos(a) * 15), Math.round(y + Math.sin(a) * 4), 3, 3, "#ffd23f");
    px(c, Math.round(x + Math.cos(a) * 15) + 1, Math.round(y + Math.sin(a) * 4) - 1, 1, 5, "#fff6c0");
  }
}

function smoke(c, x, y, p, size) {
  for (let i = 0; i < 5; i++) {
    const a = (1 - p) * 0.5;
    ellipse(c, Math.round(x + Math.sin(i * 2 + p * 3) * 10 * size), Math.round(y - p * 26 * size - i * 6), Math.round((6 + i * 1.5) * size), Math.round((5 + i) * size), "rgba(70,70,80," + a.toFixed(2) + ")");
  }
}

// A big picture of a character: draws with `draw(ctx)` on a small canvas, then scales it up.
const bigCanvas = document.createElement("canvas");
bigCanvas.width = 40; bigCanvas.height = 44;
const bigCtx = bigCanvas.getContext("2d");

// (x, y) = the middle of the feet. o: scale, rot (turn around the middle of the body), tint, flip
function bigSprite(c, x, y, o, draw) {
  bigCtx.clearRect(0, 0, 40, 44);
  draw(bigCtx);
  if (o.tint) {
    bigCtx.globalCompositeOperation = "source-atop";
    bigCtx.fillStyle = o.tint;
    bigCtx.fillRect(0, 0, 40, 44);
    bigCtx.globalCompositeOperation = "source-over";
  }
  const sc = o.scale || 2;
  c.save();
  c.translate(Math.round(x), Math.round(y - 14 * sc));
  if (o.rot) c.rotate(o.rot);
  if (o.flip) c.scale(-1, 1);
  c.imageSmoothingEnabled = false;
  c.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
  c.drawImage(bigCanvas, -20 * sc, -14 * sc - 0, 40 * sc, 44 * sc);   // sprite feet are at canvas y = 28
  c.restore();
}

// the fish player; the sprite stands on canvas row 28 and is centred at column 20
function fishAt(c, x, y, o) {
  o = o || {};
  bigSprite(c, x, y, o, (g) => drawPlayer(g, 12, 12, o.dir || "down", o.step || 0, o.pose || "walk", (o.t || 0) * 1000));
}

function npcBig(c, x, y, style, pose, t, o) {
  o = o || {};
  bigSprite(c, x, y, o, (g) => drawNPC(g, 12, 12, style, pose || "idle", t * 1000));
}

// ---------- backgrounds ----------

function bgTree(c, x, y) {
  px(c, x - 1, y, 3, 10, "#7a4a24");
  ellipse(c, x, y - 2, 8, 9, "#2c8a3a");
  ellipse(c, x - 2, y - 5, 4, 4, "#46b24c");
}

function bgGrass(c, t) {
  band(c, 0, 110, ["#7cc8ff", "#8fd2ff", "#a4dcff", "#b9e6ff", "#cdefff"]);
  ellipse(c, 270, 28, 11, 11, "#fff3a0");
  cloud(c, ((60 + t * 4) % 380) - 30, 30, 1); cloud(c, ((200 + t * 3) % 380) - 30, 52, 0.8);
  ellipse(c, 50, 118, 110, 30, "#4fae3d"); ellipse(c, 250, 120, 120, 26, "#58bd45");
  [[20, 104], [60, 112], [250, 108], [290, 104], [130, 116]].forEach(([x, y]) => bgTree(c, x, y));
  px(c, 0, 122, SW, SH - 122, "#62c24d");
  px(c, 0, 138, SW, 38, "#dcbc7d");
  px(c, 0, 138, SW, 2, "#c8a35e"); px(c, 0, 174, SW, 2, "#c8a35e");
  for (let x = 0; x < SW; x += 24) px(c, x + 5, 146 + (x % 3) * 8, 3, 1, "#c8a35e");
  for (let x = 4; x < SW; x += 20) px(c, x, 180 + (x % 7), 2, 3, "#3f9a35");
}

function bgCity(c, t) {
  band(c, 0, 120, ["#8ec9f0", "#a0d4f4", "#b4def6", "#c8e8f8"]);
  cloud(c, ((100 + t * 4) % 380) - 30, 24, 1);
  [[0, 70, 40, 70, "#8c8f99"], [34, 46, 34, 94, "#a8553c"], [66, 82, 40, 58, "#b09a78"], [104, 60, 30, 80, "#8c8f99"],
    [150, 92, 48, 48, "#a8553c"], [200, 54, 36, 86, "#b09a78"], [240, 76, 40, 64, "#8c8f99"], [280, 44, 40, 96, "#a8553c"]].forEach(([x, y, w, h, col]) => {
    px(c, x, y, w, h, col); px(c, x, y, w, 4, "#cfcabd");
    for (let wy = y + 9; wy < y + h - 4; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 9) px(c, wx, wy, 5, 6, hash(wx, wy, 3) % 5 === 0 ? "#ffe28a" : "#6fb8e8");
  });
  px(c, 0, 138, SW, SH - 138, "#575c6d");
  px(c, 0, 134, SW, 6, "#cfcbc0"); px(c, 0, 139, SW, 1, "#b5b1a5");
  for (let x = 0; x < SW; x += 32) px(c, x + 4, 172, 16, 2, "#f4f4f4");
}

function mountain(c, cx, base, h, hw, col, cap) {
  for (let i = 0; i < h; i++) {
    const half = Math.round(hw * (i / h));
    px(c, cx - half, base - h + i, half * 2, 1, i < h * 0.28 ? cap : col);
  }
}

function bgSnow(c, t) {
  band(c, 0, 118, ["#bcd9ee", "#cde4f4", "#dcecf8", "#eaf4fb"]);
  mountain(c, 70, 124, 70, 60, "#8d95a8", "#ffffff"); mountain(c, 200, 124, 90, 74, "#7a839a", "#ffffff"); mountain(c, 290, 124, 50, 46, "#99a1b4", "#ffffff");
  px(c, 0, 124, SW, SH - 124, "#eef6ff");
  px(c, 0, 124, SW, 3, "#d6e8f6");
  for (let x = 0; x < SW; x += 18) px(c, x + (x % 5), 150 + (x % 4) * 9, 9, 2, "#d6e8f6");
  [[24, 128], [290, 130], [150, 126]].forEach(([x, y]) => pine(c, x, y, 9));
}

// (The 12 elimination films, one for each danger, are in films.js.)

function speedLines(c, x, y, t) {
  for (let i = 0; i < 3; i++) px(c, Math.round(x - 40 - ((t * 200 + i * 23) % 24)), y - 20 + i * 14, 14, 1, "rgba(255,255,255,0.7)");
}

function spikes(c, x, y, up) {                  // the spike trap
  px(c, x - 26, y - 3, 52, 6, "#555a6a"); px(c, x - 26, y - 3, 52, 1, "#8a8f9c");
  const h = Math.round(24 * up);
  for (let k = -2; k <= 2; k++) {
    for (let i = 0; i < h; i++) {
      const half = Math.max(0, Math.round((h - i) * 0.2));
      px(c, x + k * 10 - half, y - 3 - i, half * 2 + 1, 1, i > h - 4 ? "#ffffff" : "#c8ccd8");
    }
  }
}

function bullets(c, fromX, fromY, toX, toY, start, t, count) {
  for (let i = 0; i < count; i++) {
    const p = (t - start - i * 0.16) / 0.3;
    if (p < 0 || p > 1) continue;
    px(c, Math.round(lerp(fromX, toX, p)), Math.round(lerp(fromY, toY, p)), 5, 2, "#ffe680");
  }
}

function flash(c, a) { if (a > 0) px(c, 0, 0, SW, SH, "rgba(255,255,255," + Math.min(1, a).toFixed(2) + ")"); }

// ---------- jumping out of the Battle Bus (about 5 seconds) ----------

const BUS_JUMP_SECONDS = 5.4;

function drawBusJump(c, t, busSprite) {
  band(c, 0, SH, ["#2a6fd8", "#3a80e2", "#4a90ea", "#5ca2f0", "#74b4f4", "#8cc6f8", "#a6d6fb", "#c4e6fd"]);
  const speed = 60 + Math.min(260, t * 90);                                      // the clouds rush past faster and faster
  for (let i = 0; i < 9; i++) {
    const y = SH + 30 - ((i * 47 + t * speed) % (SH + 70));
    cloud(c, 30 + (i * 83) % 270, y, 1.1 + (i % 3) * 0.3);
  }
  // the bus leaves up and to the right, shrinking, and disappears into the clouds
  const bp = clamp01((t - 0.3) / 2.9);
  if (busSprite && busSprite.complete && busSprite.naturalWidth && bp < 1) {
    const sc = lerp(0.8, 0.12, smooth(bp));
    const bx = lerp(130, 300, smooth(bp)), by = lerp(0, -30, smooth(bp));
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(busSprite, Math.round(bx - busSprite.naturalWidth * sc / 2), Math.round(by), Math.round(busSprite.naturalWidth * sc), Math.round(busSprite.naturalHeight * sc));
    c.restore();
    if (t > 0.8 && t < 2.2) bubble(c, "Don't forget to tip!", Math.round(bx + 4), Math.round(by + 54 * sc + 22));
    if (bp > 0.75) { cloud(c, bx, by + 40 * sc + 4, 2.4 - bp); }
  }
  // the fish falls
  const wob = Math.sin(t * 3.2) * 0.28, sway = Math.sin(t * 2.1) * 16;
  const chute = t > 4.1;
  const fy = chute ? lerp(100, 92, smooth(clamp01((t - 4.1) / 0.4))) : 104 + Math.sin(t * 4) * 3;
  if (chute) {                                                                   // the parachute pops open
    const open = smooth(clamp01((t - 4.1) / 0.35));
    ellipse(c, 160, Math.round(fy - 60 - 12 * open), Math.round(8 + 28 * open), Math.round(4 + 14 * open), "#ff5fa8");
    ellipse(c, 160, Math.round(fy - 62 - 12 * open), Math.round(6 + 20 * open), Math.round(3 + 8 * open), "#ff8fc8");
    px(c, 160 - Math.round(24 * open), Math.round(fy - 50), 1, Math.round(26 * open), "#f4f4f4"); px(c, 160 + Math.round(24 * open), Math.round(fy - 50), 1, Math.round(26 * open), "#f4f4f4");
  }
  if (t > 0.7) {
    fishAt(c, 160 + (chute ? 0 : sway), fy + 24, { pose: t < 3.7 ? "fall" : "scared", rot: chute ? 0 : wob, scale: 2, t });
  } else {
    fishAt(c, lerp(138, 160, t / 0.7), lerp(70, 128, smooth(t / 0.7)) + 24, { pose: "scared", scale: 2, t });
  }
  if (t > 0.9 && t < 2.3) outlined(c, "WOOOOHOOO!", 160, 176, "#ffd23f", 16);
  if (t > 2.5 && t < 3.7) bubble(c, "...did I forget something?", 160 + Math.round(Math.sin(t * 2.1) * 16), 70);
  if (t > 3.7 && t < 4.4) outlined(c, "PARACHUTE!!", 160, 36, "#ff4f5e", 16);
  if (t > 1.3 && t < 2.3) {                                                      // a surprised bird
    const bx = lerp(340, -40, (t - 1.3) / 1.0);
    px(c, Math.round(bx), 120, 10, 3, "#6a6f7d"); px(c, Math.round(bx) + 2, 117, 3, 3, "#6a6f7d"); px(c, Math.round(bx) - 3, 121, 3, 1, "#f2b43a");
  }
  if (t > 4.9) px(c, 0, 0, SW, SH, "rgba(255,255,255," + clamp01((t - 4.9) * 2).toFixed(2) + ")");
}

// ---------- the title picture ----------

function drawTitleScene(c, t, sprites) {
  band(c, 0, 118, ["#241a6a", "#3a2a8a", "#5a3aa8", "#8a4ab8", "#c45ab0", "#ef7aa0", "#ffa18a", "#ffcf94"]);
  for (let i = 0; i < 26; i++) {                                                  // stars in the dark top
    const tw = Math.sin(t * 2 + i) > 0.3;
    if (tw) px(c, (i * 97) % SW, 8 + (i * 31) % 40, 1, 1, "#ffffff");
  }
  ellipse(c, 232, 104, 30, 30, "rgba(255,240,180,0.35)"); ellipse(c, 232, 104, 22, 22, "#fff2b0"); ellipse(c, 232, 104, 15, 15, "#ffffd0");   // the sun
  for (let i = 0; i < 6; i++) {
    const x = ((i * 71 + t * (4 + i)) % (SW + 100)) - 50;
    ellipse(c, Math.round(x), 30 + i * 11, 26, 5, "rgba(255,190,220,0.85)"); ellipse(c, Math.round(x + 16), 33 + i * 11, 16, 4, "rgba(255,225,240,0.85)");
  }
  mountain(c, 60, 130, 62, 62, "#7a6ab0", "#ffffff"); mountain(c, 130, 130, 44, 46, "#8a7ab8", "#f4eaff"); mountain(c, 190, 130, 34, 38, "#9a8ac0", "#f4eaff");   // far peaks
  // the Storm on the horizon, with lightning
  ellipse(c, 300, 120, 56, 30, "#6a2fb0"); ellipse(c, 290, 100, 40, 22, "#8a45d8"); ellipse(c, 270, 114, 34, 18, "#b673ff");
  if (Math.floor(t * 1.4) % 4 === 0 && (t * 10) % 14 < 3) { px(c, 282, 84, 2, 14, "#ffffff"); px(c, 279, 96, 2, 12, "#ffffff"); px(c, 276, 106, 2, 10, "#ffe6ff"); }
  // Tilted Towers in the distance
  [[112, 104, 8, 22, "#a8553c"], [122, 96, 8, 30, "#8c8f99"], [132, 106, 10, 20, "#b09a78"], [144, 100, 7, 26, "#a8553c"]].forEach(([x, y, w, h, col]) => { px(c, x, y, w, h, col); px(c, x, y, w, 2, "#cfcabd"); });
  px(c, 150, 90, 5, 36, "#b7a888"); px(c, 149, 84, 7, 7, "#565a70");
  // green hills with pines and fruit trees
  ellipse(c, 80, 156, 130, 34, "#58bd45"); ellipse(c, 260, 162, 120, 32, "#4fae3d");
  [[20, 138], [44, 142], [96, 140], [210, 144], [250, 140], [296, 146]].forEach(([x, y]) => pine(c, x, y, 9));
  [[70, 144], [180, 148]].forEach(([x, y]) => { bgTree(c, x, y); px(c, x - 3, y - 4, 2, 2, "#e0243a"); px(c, x + 2, y - 7, 2, 2, "#e0243a"); });
  px(c, 0, 150, SW, 60, "#62c24d");
  for (let x = 0; x < SW; x += 7) px(c, x + (x % 3), 152 + (x % 5) * 6, 1, 3, "#7fd866");
  [[30, 170], [70, 178], [210, 172], [260, 176], [300, 168], [120, 180]].forEach(([x, y], i) => { px(c, x, y, 3, 3, ["#ff5a6e", "#ffd23f", "#ffffff", "#6aa8ff"][i % 4]); px(c, x + 1, y + 3, 1, 3, "#3f9a35"); });
  // the Battle Bus crosses the sky
  const bus = sprites && sprites.bus;
  if (bus && bus.complete && bus.naturalWidth) {
    const bx = 330 - ((t * 14) % 420);
    c.imageSmoothingEnabled = false;
    c.drawImage(bus, Math.round(bx), 14 + Math.round(Math.sin(t) * 3), 50, 75);
  }
  // our hero and the runaway llama
  fishAt(c, 98, 172, { pose: "wave", scale: 3, t });
  const llama = sprites && sprites.llama;
  if (llama && llama.complete && llama.naturalWidth) {
    const bob = Math.round(Math.abs(Math.sin(t * 3)) * 4);
    c.save();
    c.imageSmoothingEnabled = false;
    ellipse(c, 214, 174, 20, 4, "rgba(0,0,0,0.25)");
    c.drawImage(llama, 214 - 20, 172 - 72 - bob, 40, 72);
    c.restore();
  }
  if (Math.floor(t * 1.5) % 2 === 0) outlined(c, "?", 236, 92, "#ffffff", 16);        // "why did you run off?"
  // cinema bars
  px(c, 0, 0, SW, 11, "#000000"); px(c, 0, SH - 11, SW, 11, "#000000");
  outlined(c, "FORTNITE", 160, 36, "#ffd23f", 24);
  outlined(c, "LLAMA ESCAPE", 160, 54, "#ffffff", 17);
}

// ---------- the Storm: jump over the valley, and the escape ----------

// A purple shock ring where an Impulse Grenade goes off.
function shockRing(c, x, y, p) {
  const r = Math.round(4 + 30 * p), a = (1 - p).toFixed(2);
  for (let k = 0; k < 3; k++) {
    const rr = r - k * 5;
    if (rr > 0) { ellipse(c, x, y, rr, Math.round(rr * 0.5), "rgba(" + (k % 2 ? "120,220,255" : "190,120,255") + "," + (a * 0.55).toFixed(2) + ")"); }
  }
  ellipse(c, x, y, Math.max(1, Math.round(r * 0.3)), Math.max(1, Math.round(r * 0.15)), "rgba(255,255,255," + a + ")");
}

// Both jump out of the Storm into a sunny sky. t in seconds.
function drawStormEscape(c, t, sprites) {
  const a = clamp01((t - 0.5) / 1.2);
  band(c, 0, SH, ["#2f7fe0", "#3a8ae6", "#4a96ea", "#5ca4ee", "#74b4f2", "#8cc4f6", "#a6d4fa", "#c4e4fc"]);
  c.globalAlpha = 1 - a;                                                          // the purple storm fades away
  band(c, 0, SH, ["#1d0f40", "#2a1458", "#3a1f78", "#5a2fa0", "#7a45c8", "#9a5de0", "#b673ff", "#d29bff"]);
  c.globalAlpha = 1;
  for (let i = 0; i < 7; i++) {
    const y = SH + 20 - ((i * 53 + t * 160) % (SH + 60));
    c.globalAlpha = a; cloud(c, 40 + (i * 79) % 260, y, 1.2 + (i % 3) * 0.3); c.globalAlpha = 1;
  }
  const p = clamp01((t - 0.3) / 2.3);
  const x = lerp(110, 190, smooth(p)), y = lerp(176, 84, smooth(p));
  if (t < 0.6) shockRing(c, 110, 176, t / 0.6);
  const llama = sprites && sprites.llama;
  if (llama && llama.complete && llama.naturalWidth) {
    c.save(); c.imageSmoothingEnabled = false;
    c.translate(Math.round(x + 30), Math.round(y - 20));
    c.rotate(Math.sin(t * 5) * 0.3);
    c.drawImage(llama, -17, -30, 34, 60);
    c.restore();
  }
  fishAt(c, x, y + 20, { pose: "fall", rot: Math.sin(t * 4) * 0.25, scale: 2, t });
  if (t > 2.3) {                                                                  // the parachute
    const o = smooth(clamp01((t - 2.3) / 0.4));
    ellipse(c, Math.round(x + 14), Math.round(y - 40 - 10 * o), Math.round(8 + 32 * o), Math.round(4 + 15 * o), "#ff5fa8");
    ellipse(c, Math.round(x + 14), Math.round(y - 42 - 10 * o), Math.round(6 + 22 * o), Math.round(3 + 8 * o), "#ff8fc8");
  }
  if (t > 0.9 && t < 2.8) outlined(c, "WHEEEEEE!", 160, 34, "#ffd23f", 16);
  if (t > 3.0) px(c, 0, 0, SW, SH, "rgba(255,255,255," + clamp01((t - 3.0) * 1.5).toFixed(2) + ")");
}

// ---------- an item flies into the backpack ----------

// p goes 0 -> 1. from / to are the item's start and the player's back, in screen pixels.
function drawItemFly(c, p, from, to, sprite) {
  const rise = clamp01(p / 0.3), fly = clamp01((p - 0.3) / 0.5), tuck = clamp01((p - 0.8) / 0.2);
  // the little backpack on the player's back
  const bx = to.x - 10, by = to.y + 8;
  const open = p > 0.65 && p < 0.95;
  px(c, bx, by, 8, 11, "#6b4423"); px(c, bx, by, 8, 2, "#8a5a2c"); px(c, bx + 1, by + 6, 6, 4, "#8a5a2c"); px(c, bx + 1, by + 7, 6, 1, "#3b220f");
  px(c, bx + 3, by - 1, 2, 1, "#3b220f");
  if (open) px(c, bx - 1, by - 3, 10, 3, "#a8743a");                           // the flap is open
  if (!sprite || !sprite.complete || !sprite.naturalWidth) return;
  let x, y, s;
  if (p < 0.3) {                                                               // pops up, with a hop
    x = from.x; y = from.y - 22 * smooth(rise) - Math.sin(Math.PI * rise) * 6; s = 1.2 + 0.3 * rise;
  } else {                                                                     // flies in an arc to the backpack
    x = lerp(from.x, bx + 4, smooth(fly)); y = lerp(from.y - 22, by - 2, smooth(fly)) - Math.sin(Math.PI * fly) * 14; s = lerp(1.5, 0.5, smooth(fly));
  }
  s *= 1 - tuck * 0.9;
  const w = Math.round(sprite.naturalWidth * s), h = Math.round(sprite.naturalHeight * s);
  c.save(); c.imageSmoothingEnabled = false;
  if (p < 0.3) { ellipse(c, Math.round(x), Math.round(y + h / 2), Math.round(w * 0.9), Math.round(h * 0.9), "rgba(255,230,120," + (0.35 * (1 - rise)).toFixed(2) + ")"); }
  c.drawImage(sprite, Math.round(x - w / 2), Math.round(y - h / 2), Math.max(1, w), Math.max(1, h));
  c.restore();
  for (let k = 0; k < 4; k++) {                                                // sparkles on the way
    if (p > 0.15 && p < 0.9) px(c, Math.round(x - 8 + ((p * 90 + k * 7) % 16)), Math.round(y - 6 + ((k * 5 + p * 40) % 12)), 2, 2, k % 2 ? "#fff6c0" : "#ffd23f");
  }
  if (tuck > 0.3) px(c, bx + 1, by - 3 - Math.round(tuck * 4), 2, 2, "#fff6c0");
}

// ---------- the summit: the fish climbs up, looks through binoculars and spots the llama ----------

const SUMMIT_SECONDS = 12.0;
const SUMMIT_WALK = 1.4;      // the fish has reached the top
const SUMMIT_END = 3.0;       // the climb scene is over, the binocular view opens
const SUMMIT_LENS = 3.7;      // the binocular view is fully open
const SUMMIT_PAN_FROM = 4.0, SUMMIT_PAN_TO = 8.2;
const LLAMA_EDGE = 520;       // where the Storm begins, in panorama pixels
const LENS_R = 84, LENS_Y = 96, LENS_X = [96, 224];

function binoculars(c, x, y) {                  // (x, y) = top-left of the pair, 14 x 11 pixels
  px(c, x - 1, y - 1, 7, 11, "#14141c"); px(c, x + 8, y - 1, 7, 11, "#14141c");
  px(c, x, y, 5, 9, "#3a3d4d"); px(c, x + 9, y, 5, 9, "#3a3d4d");
  px(c, x + 5, y + 3, 4, 3, "#14141c");
  px(c, x + 1, y + 1, 2, 3, "#8fd4ff"); px(c, x + 10, y + 1, 2, 3, "#8fd4ff");     // the lenses glint
}

function forestTree(c, x, y, h) {               // a small pine for the far forests
  px(c, x, y - 2, 1, 3, "#4a2f18");
  for (let r = 0; r < h; r++) {
    const half = 1 + Math.floor(r * 0.45);
    px(c, x - half, y - 2 - h + r + 1, half * 2 + 1, 1, r % 2 ? "#2c6e44" : "#245a38");
  }
}

// The climb: the fish walks up the last slope, stands on the summit and raises the binoculars.
function summitScene(c, t) {
  band(c, 0, SH, ["#9fc3e6", "#b4d2ee", "#c9ddf2", "#dde9f6", "#efe6e8", "#f6dfd0"]);
  cloud(c, ((40 + t * 5) % 380) - 30, 28, 1); cloud(c, ((210 + t * 4) % 380) - 30, 50, 0.8);
  mountain(c, 50, 132, 56, 64, "#9aa6c0", "#ffffff"); mountain(c, 120, 140, 40, 50, "#a9b4cc", "#ffffff");
  ellipse(c, 292, 134, 96, 38, "#3a1f78"); ellipse(c, 282, 126, 74, 28, "#5a2fa0"); ellipse(c, 304, 112, 40, 16, "#7a45c8");   // the Storm, far away
  mountain(c, 240, 150, 46, 56, "#8d95b0", "#ffffff");
  for (let y = 112; y < SH; y++) {              // the snowy summit
    const half = y < 118 ? 14 + (y - 112) : 22 + Math.round((y - 118) * 1.7);
    px(c, 160 - half, y, half * 2, 1, y < 132 ? "#ffffff" : "#e6eef8");
    px(c, 160 + Math.round(half * 0.2), y, Math.ceil(half * 0.8), 1, y < 132 ? "#dfe9f6" : "#c3d3e6");
  }
  for (let k = 0; k < 9; k++) px(c, 96 + hash(k, 3, 9) % 130, 140 + hash(k, 4, 9) % 46, 6 + (k % 3) * 3, 2, k % 2 ? "#aebfd6" : "#9fb0c8");
  const walk = clamp01(t / SUMMIT_WALK);
  const x = lerp(26, 150, smooth(walk));
  const y = x >= 138 ? 120 : 118 + (138 - x) / 1.7;
  const moving = t < SUMMIT_WALK;
  fishAt(c, x, y, { dir: "right", step: moving ? Math.floor(t * 8) % 2 : 0, pose: "walk", t });
  if (t > 0.8 && t < 2.2) outlined(c, "THE SUMMIT!", 160, 30, "#ffd23f", 16);
  if (t > 1.8) {                                // the binoculars come out and go up to the eyes
    const up = smooth(clamp01((t - 2.3) / 0.6));
    binoculars(c, Math.round(x + lerp(9, 7, up)), Math.round(y - lerp(24, 37, up)));
  }
  for (let i = 0; i < 14; i++) px(c, (i * 47 + t * 60) % SW, (i * 31 + t * 18) % SH, 1, 1, "rgba(255,255,255,0.8)");   // blowing snow
}

// The whole view is one wide picture (760 pixels) that the camera slides across. Far things move slower.
function summitPanorama(c, camX, t, sprites, llamaX) {
  const X = (x, f) => Math.round(x - camX * f);
  band(c, 0, 128, ["#b6cbe8", "#c6d6ec", "#d8e2f0", "#ecebf0", "#f4e6dc"]);
  [[60, 30], [230, 52], [420, 24]].forEach(([x, y], i) => cloud(c, X(x + t * 2, 0.3), y, 1 + (i % 2) * 0.3));
  [[30, 50], [130, 72], [250, 56], [360, 82], [470, 60], [590, 68]].forEach(([x, h]) => mountain(c, X(x, 0.55), 130, h, h + 14, "#a9b4cc", "#ffffff"));
  [[10, 44], [110, 58], [220, 40], [330, 60], [440, 46], [560, 54]].forEach(([x, h]) => mountain(c, X(x, 0.8), 134, h, h + 18, "#7e8aa6", "#f4f9ff"));
  for (let k = 0; k < 44; k++) forestTree(c, X(6 + k * 15, 0.8), 136 + (k % 3) * 2, 5 + hash(k, 2, 4) % 5);   // the forest at the foot of the mountains
  band(c, 134, SH, ["#6aa356", "#5f9a4c", "#558c43", "#4c7e3b", "#447034"]);                                     // the plain
  for (let k = 0; k < 26; k++) {                                                                                  // clumps of forest on the plain
    const gx = 20 + hash(k, 1, 3) % 700, gy = 142 + hash(k, 2, 3) % 44;
    ellipse(c, X(gx, 1), gy, 14 + k % 3 * 3, 5, "#2f6a3b"); ellipse(c, X(gx, 1) - 2, gy - 2, 9, 3, "#3f8a4a");
  }
  for (let x = 330; x < 520; x += 14) px(c, X(x, 1), 141 + (x % 3), 7, 1, "#cdb27a");                            // the llama's tracks
  // the Storm: a purple wall at the end of the plain, with a jagged edge
  for (let y = 0; y < SH; y++) {
    const edge = LLAMA_EDGE + Math.round(Math.sin(y * 0.35 + t * 0.8) * 5 + (hash(y, 1, 8) % 9) - 4);
    const dark = y < 60 ? ["#1d0f40", "#2a1458"] : y < 130 ? ["#2a1458", "#3a1f78"] : ["#241048", "#33196a"];
    px(c, X(edge - 22, 1), y, 22, 1, "rgba(90,47,160,0.28)");
    px(c, X(edge, 1), y, SW + 200, 1, dark[(y + Math.floor(t * 3)) % 4 < 2 ? 0 : 1]);
  }
  for (let k = 0; k < 18; k++) {                                                                                  // swirling clouds in the Storm
    const cx = LLAMA_EDGE + 24 + hash(k, 5, 6) % 230, cy = 14 + hash(k, 6, 6) % 118;
    ellipse(c, X(cx + Math.sin(t * 0.7 + k) * 6, 1), Math.round(cy + Math.cos(t * 0.6 + k) * 3), 16 + k % 3 * 6, 6 + k % 2 * 3, k % 2 ? "#5a2fa0" : "#7a45c8");
  }
  if (Math.floor(t * 3.3) % 4 === 0 && (t * 3.3) % 1 < 0.14) {                                                    // lightning
    const lx = X(LLAMA_EDGE + 90, 1);
    [[0, 8], [-6, 30], [4, 52], [-5, 76], [3, 100]].forEach(([dx, y], i, a) => px(c, lx + dx, y, 2, (a[i + 1] ? a[i + 1][1] : 124) - y, "#fff7b0"));
    px(c, 0, 0, SW, SH, "rgba(200,170,255,0.12)");
  }
  // the llama, small and far away, walking into the Storm
  const into = clamp01((llamaX - LLAMA_EDGE) / 24);
  const lx = X(llamaX, 1), ly = 142 + Math.round(Math.sin(t * 9));
  ellipse(c, lx, 143, 8, 2, "rgba(0,0,0,0.3)");
  const llama = sprites && sprites.llama;
  c.save();
  c.globalAlpha = 1 - into * 0.9;
  if (llama && llama.complete && llama.naturalWidth) {
    c.imageSmoothingEnabled = false;
    c.drawImage(llama, lx - 8, ly - 28, 16, 28);
  } else {
    px(c, lx - 5, ly - 14, 10, 8, "#ffb3e6"); px(c, lx + 2, ly - 22, 4, 9, "#ffb3e6"); px(c, lx - 4, ly - 6, 2, 6, "#e07fc0"); px(c, lx + 2, ly - 6, 2, 6, "#e07fc0");
  }
  c.restore();
  if (into > 0) { c.globalAlpha = into * 0.6; px(c, lx - 9, ly - 30, 18, 31, "#3a1f78"); c.globalAlpha = 1; }
}

// The round view of a pair of binoculars: black outside the two lenses, with a little scale and crosshair.
function binocularMask(c, r) {
  for (let y = 0; y < SH; y++) {
    const dy = y - LENS_Y, span = [];
    if (Math.abs(dy) <= r) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      LENS_X.forEach((cx) => span.push([cx - half, cx + half]));
    }
    if (!span.length) { px(c, 0, y, SW, 1, "#050508"); continue; }
    const [a, b] = span;
    const joined = a[1] >= b[0];
    const spans = joined ? [[a[0], b[1]]] : span;
    let cursor = 0;
    spans.forEach(([x0, x1]) => {
      if (x0 > cursor) px(c, cursor, y, x0 - cursor, 1, "#050508");
      const rim = Math.abs(dy) > r - 4 ? x1 - x0 + 1 : 3;
      px(c, x0, y, rim, 1, "#0e0e14"); px(c, x1 - rim + 1, y, rim, 1, "#0e0e14");
      px(c, x0 + rim, y, 3, 1, "rgba(0,0,0,0.35)"); px(c, x1 - rim - 2, y, 3, 1, "rgba(0,0,0,0.35)");
      cursor = x1 + 1;
    });
    if (cursor < SW) px(c, cursor, y, SW - cursor, 1, "#050508");
  }
}

function binocularMarks(c) {
  const mark = (x, y, w, h) => { px(c, x + 1, y + 1, w, h, "rgba(0,0,0,0.6)"); px(c, x, y, w, h, "#f4f4d8"); };
  [[92, 58, 1, 1], [92, 134, 1, -1], [227, 58, -1, 1], [227, 134, -1, -1]].forEach(([x, y, dx, dy]) => {
    mark(dx > 0 ? x : x - 8, y, 9, 1); mark(x, dy > 0 ? y : y - 8, 1, 9);
  });
  mark(156, 96, 3, 1); mark(162, 96, 3, 1); mark(160, 92, 1, 3); mark(160, 98, 1, 3);      // the crosshair
  [30, 290].forEach((x) => { for (let k = 0; k < 11; k++) mark(x + (x < 100 ? 0 : -4), 60 + k * 7, k % 5 === 0 ? 6 : 3, 1); });
}

function drawSummitBinoculars(c, t, sprites) {
  if (t < SUMMIT_END) { summitScene(c, t); return; }
  const open = smooth(clamp01((t - SUMMIT_END) / (SUMMIT_LENS - SUMMIT_END)));
  const pan = smooth(clamp01((t - SUMMIT_PAN_FROM) / (SUMMIT_PAN_TO - SUMMIT_PAN_FROM)));
  const llamaX = 440 + (t - SUMMIT_LENS) * 12;
  const camX = lerp(0, 334 + 0, pan);
  c.fillStyle = "#050508"; c.fillRect(0, 0, SW, SH);
  c.save();
  c.translate(Math.round(Math.sin(t * 3.1)), Math.round(Math.sin(t * 2.3)));                   // the hands are never quite still
  summitPanorama(c, camX, t, sprites, llamaX);
  c.restore();
  binocularMask(c, Math.max(1, Math.round(LENS_R * open)));
  if (open < 1) return;
  binocularMarks(c);
  if (t > 7.4) {                                                                               // the llama is spotted
    const lx = Math.round(llamaX - camX), blink = Math.floor(t * 4) % 2 === 0;
    const col = blink ? "#ff4f5e" : "#ffd23f";
    [[-13, -34], [7, -34], [-13, 1], [7, 1]].forEach(([dx, dy]) => {
      px(c, lx + dx, 142 + dy, 6, 1, col); px(c, lx + dx + (dx < 0 ? 0 : 5), 142 + dy, 1, 6, col);
      px(c, lx + dx, 142 + dy + 5, 6, 1, col); px(c, lx + dx + (dx < 0 ? 0 : 5), 142 + dy, 1, 6, col);
    });
    outlined(c, "THE LLAMA!", 160, 62, "#ffd23f", 14);
  }
  if (t > 9.6) outlined(c, "It's walking into the storm!", 160, 140, "#ffffff", 11);
}
