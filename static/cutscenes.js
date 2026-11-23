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

// ---------- the little films about the dangers (3-6 seconds each, the fish is always in them) ----------
// Each one: dur (seconds), caption (a funny line at the bottom) and draw(c, t) with t in seconds.

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

const DEATHS = {
  // Pleasant Park - Tilted Towers
  H1: { dur: 4.6, caption: "Sprint straight through? Bold. Pointy. Wrong.", draw(c, t) {
    bgGrass(c, t);
    const tx = 196, hit = 1.7;
    if (t < hit) {
      px(c, tx - 26, GROUND + 3, 52, 4, "#555a6a"); px(c, tx - 20, GROUND + 3, 12, 2, "#3f9a35"); px(c, tx + 6, GROUND + 3, 10, 2, "#3f9a35");   // leaves hide the trap
      const x = lerp(-24, tx - 4, t / hit);
      speedLines(c, x, GROUND - 14, t);
      fishAt(c, x, GROUND, { dir: "right", step: Math.floor(t * 10) % 2, t });
      return;
    }
    const lift = smooth(clamp01((t - hit) / 0.4)) * 20, sag = clamp01((t - 2.8) / 1.0) * 8;
    const swing = t > 2.2 ? Math.sin(t * 5) : 0;
    fishAt(c, tx + swing * 2, GROUND + 4 - lift + sag, { pose: t < 2.4 ? "scared" : "ko", rot: swing * 0.07, t });
    spikes(c, tx, GROUND + 6, clamp01((t - hit) / 0.12));
    if (t > 1.8 && t < 3.3) outlined(c, "OUCH!", tx, 76, "#ff4f5e", 16);
    if (t > 2.6) dizzy(c, tx, GROUND - 58 - lift + sag, t);
  } },

  // Pleasant Park - Tilted Towers: the clock tower
  H5: { dur: 5.0, caption: "Charging a clock tower alone. The tower won.", draw(c, t) {
    bgCity(c, t);
    clockTower(c, 226, 60);
    const winOn = t > 1.0 && Math.floor(t * 12) % 2 === 0;
    if (winOn) px(c, 236, 86, 5, 7, "#ffe680");
    const x = t < 3.0 ? lerp(-24, 140, smooth(clamp01(t / 2.4))) : 140;
    if (t < 2.4) { speedLines(c, x, GROUND - 14, t); }
    bullets(c, 240, 90, x + 4, GROUND - 24, 1.0, t, 6);
    if (t > 1.6 && t < 3.6) {
      const p = clamp01((t - 1.6) / 2.0);
      [[0, 0], [28, 6], [-24, 4]].forEach(([dx, dy], i) => ellipse(c, x + dx, GROUND - 10 + dy, Math.round(10 + 22 * p), Math.round(7 + 10 * p), "rgba(225,225,235," + (0.7 - 0.4 * p).toFixed(2) + ")"));
    }
    if (t < 2.6) fishAt(c, x, GROUND, { dir: "right", step: Math.floor(t * 10) % 2, pose: t > 1.5 ? "scared" : "walk", t });
    else {
      const down = clamp01((t - 2.6) / 0.5);
      fishAt(c, x - 8 * down, GROUND + 6, { pose: "ko", rot: -1.5 * down, tint: "rgba(70,70,80,0.45)", t });
      if (t > 3.0) dizzy(c, x - 10, GROUND - 28, t);
    }
    if (t > 2.0 && t < 3.6) outlined(c, "RAT-A-TAT!", 150, 72, "#ffd23f", 15);
  } },

  // Pleasant Park - Retail Row: the camping squad
  H2: { dur: 4.8, caption: "Walking past a camping squad in the open: confident, and very, very wrong.", draw(c, t) {
    bgGrass(c, t);
    const pop = smooth(clamp01((t - 1.8) / 0.25));
    [[222, "skull"], [250, "raven"], [278, "renegade"]].forEach(([x, style], i) => {
      npcBig(c, x, GROUND - 8 + 20 * (1 - pop), style, "idle", t, { scale: 2 });
    });
    [[216, GROUND - 6], [244, GROUND - 2], [272, GROUND - 6]].forEach(([x, y]) => { ellipse(c, x, y + 4, 22, 11, "#2f8f3a"); ellipse(c, x - 6, y, 12, 7, "#46b24c"); });   // the bush they hide behind
    if (t < 1.8) {
      const x = lerp(-24, 130, t / 1.8);
      fishAt(c, x, GROUND, { dir: "right", step: Math.floor(t * 6) % 2, t });
      const bob = Math.sin(t * 8) * 2;
      px(c, Math.round(x + 20), Math.round(GROUND - 60 + bob), 2, 6, "#1b1030"); px(c, Math.round(x + 22), Math.round(GROUND - 60 + bob), 4, 2, "#1b1030");   // a whistled note
    } else {
      [[218, 100], [246, 104], [274, 100]].forEach(([x, y], i) => { if (Math.floor(t * 14 + i) % 2 === 0 && t < 3.4) ellipse(c, x - 22, y + 38, 6, 4, "#ffe680"); });
      bullets(c, 230, 130, 150, 128, 1.9, t, 5);
      const hitT = clamp01((t - 2.1) / 0.9);
      fishAt(c, 130 - 38 * smooth(hitT), GROUND - Math.sin(Math.PI * hitT) * 40, { pose: t < 2.6 ? "scared" : "ko", rot: -2.4 * smooth(hitT), t });
      if (t > 3.2) dizzy(c, 90, GROUND - 40, t);
      if (t > 2.0 && t < 3.3) outlined(c, "SURPRISE!", 190, 70, "#ff4f5e", 15);
    }
  } },

  // Pleasant Park - Retail Row: the sniper
  H4: { dur: 5.2, caption: "A sniper has a very good view of people checking their maps.", draw(c, t) {
    bgCity(c, t);
    px(c, 236, 78, 84, 8, "#8c8f99"); px(c, 236, 78, 84, 2, "#cfcabd");
    npcBig(c, 270, 78, "skull", "idle", t, { scale: 2 });
    px(c, 250, 56, 24, 3, "#2a2d38"); px(c, 244, 57, 8, 2, "#555a6a");   // the rifle
    if (Math.floor(t * 6) % 2 === 0) { px(c, 240, 56, 1, 5, "#fff"); px(c, 238, 58, 5, 1, "#fff"); }   // glint
    const mapUp = t > 0.4;
    const pos = 130;
    if (t < 2.7) fishAt(c, pos, GROUND, { t, step: 0 });
    if (mapUp && t < 2.7) {                                                         // the unfolded map
      px(c, pos - 14, GROUND - 38, 28, 22, "#1b1030"); px(c, pos - 13, GROUND - 37, 26, 20, "#f3e6c8");
      px(c, pos - 8, GROUND - 32, 14, 1, "#7cc4ff"); px(c, pos - 4, GROUND - 28, 9, 1, "#7cc4ff");
      px(c, pos + 2, GROUND - 27, 4, 1, "#e0463c"); px(c, pos + 3, GROUND - 28, 1, 3, "#e0463c");
    }
    if (t > 1.4 && t < 2.7) {                                                       // the red laser line and dot
      const p = clamp01((t - 1.4) / 0.5);
      for (let k = 0; k < 14; k++) px(c, Math.round(lerp(240, pos + 2, k / 14)), Math.round(lerp(58, GROUND - 24, k / 14)), 2, 1, "rgba(255,40,40," + (0.3 + 0.5 * p).toFixed(2) + ")");
      px(c, pos - 1, GROUND - 26, 4, 4, Math.floor(t * 10) % 2 ? "#ff2020" : "#ffb0b0");
    }
    if (t < 2.7) return;
    const f = clamp01((t - 2.7) / 0.5);
    flash(c, 0.9 - (t - 2.7) * 2.5);
    outlined(c, "BANG!", 160, 56, "#ffffff", 20);
    px(c, Math.round(pos - 50 + f * 170), Math.round(GROUND - 60 - f * 40), 20, 12, "#f3e6c8");                // the map flies away
    fishAt(c, pos, GROUND + 6, { pose: "ko", rot: -1.55 * smooth(f), t });
    dizzy(c, pos - 10, GROUND - 24, t);
  } },

  // Pleasant Park - Polar Peak: the cliff
  H7: { dur: 5.6, caption: "The edge was icy. The cliff was long. Gravity was keen.", draw(c, t) {
    const slip = 2.4, drop = 3.0;
    if (t < drop) {
      bgSnow(c, t);
      px(c, 214, 124, 106, 70, "#7ab8dc"); px(c, 214, 124, 3, 70, "#dff4ff");                            // the cliff edge: ice and a drop
      for (let k = 0; k < 5; k++) px(c, 220 + k * 20, 130 + (k % 2) * 18, 10, 2, "#a8d8f0");
      const x = t < slip ? lerp(-24, 196, t / slip) : lerp(196, 230, smooth(clamp01((t - slip) / 0.6)));
      if (t < slip) { speedLines(c, x, GROUND - 14, t); fishAt(c, x, GROUND, { dir: "right", step: Math.floor(t * 12) % 2, t }); }
      else {
        const y = x > 214 ? GROUND + (x - 214) * 1.4 : GROUND;
        fishAt(c, x, y, { pose: "scared", rot: (t - slip) * 1.3, t });
        outlined(c, "WHOA!", 190, 84, "#ffffff", 15);
      }
      return;
    }
    band(c, 0, SH, ["#4a7fa8", "#5a90b8", "#6aa0c8", "#7ab0d6", "#8ac0e2", "#9ad0ee"]);                // falling: the ice wall rushes past
    const off = (t - drop) * 220;
    for (let k = -1; k < 8; k++) { const y = ((k * 34 + off) % 238) - 40; px(c, 0, y, 60 + (k * 13) % 20, 3, "#dff4ff"); px(c, SW - 70 - (k * 11) % 18, y + 14, 70, 3, "#dff4ff"); }
    for (let k = 0; k < 14; k++) px(c, 20 + (k * 47) % 280, ((k * 61 + off * 1.3) % 200) - 6, 2, 8, "rgba(255,255,255,0.8)");   // snow streaks
    const fall = t - drop;
    if (fall < 2.0) {
      fishAt(c, 160 + Math.sin(t * 5) * 14, 96, { pose: "fall", scale: 2, rot: Math.sin(t * 3) * 0.35, t });
      outlined(c, "AAAAAAAAAAA!", 160, 40, "#ffffff", 14);
    } else {
      const p = clamp01((fall - 2.0) / 0.5);
      fishAt(c, 160, 96 + p * 66, { pose: "fall", scale: lerp(2, 1, p), t });
      if (p >= 1) {
        ellipse(c, 160, 176, 40, 10, "#ffffff"); ellipse(c, 160, 170, 26, 12, "#f4f9ff");
        outlined(c, "POOF.", 160, 150, "#1b1030", 14);
        px(c, 158, 164, 4, 8, "#f2692d");                                                                // just the fish's hat sticks out
      }
    }
  } },

  // Pleasant Park - Polar Peak: the shotgun
  H8: { dur: 4.4, caption: "Peeking at a pump shotgun is the express elevator to the elimination screen.", draw(c, t) {
    bgSnow(c, t);
    px(c, 172, 56, 20, 100, "#8c8f99"); px(c, 172, 56, 20, 5, "#cfcabd");                               // the wall corner
    for (let y = 64; y < 156; y += 6) px(c, 172, y, 20, 1, "#6f737e");
    npcBig(c, 214, GROUND, "skull", "idle", t, { scale: 2 });
    px(c, 168, GROUND - 38, 30, 4, "#2a2d38"); px(c, 168, GROUND - 38, 10, 2, "#6a6f7d");               // the shotgun
    const peek = smooth(clamp01((t - 0.8) / 0.7));
    const shot = t > 2.2;
    if (!shot) {
      const x = lerp(-24, 150, smooth(clamp01(t / 1.2)));
      fishAt(c, x + peek * 12, GROUND, { dir: "right", step: t < 1.2 ? Math.floor(t * 10) % 2 : 0, t, pose: peek > 0.9 ? "scared" : "walk" });
      return;
    }
    const f = clamp01((t - 2.2) / 0.9);
    boom(c, 186, GROUND - 36, clamp01((t - 2.2) / 0.4), 0.9);
    outlined(c, "BOOM!", 150, 64, "#ffd23f", 20);
    fishAt(c, lerp(160, 40, smooth(f)), GROUND - Math.sin(Math.PI * f) * 36, { pose: "ko", rot: -3.0 * smooth(f), tint: "rgba(50,40,40,0.35)", t });
    if (t > 3.2) dizzy(c, 46, GROUND - 26, t);
  } },

  // Tilted Towers - Retail Row: the rocket
  H3: { dur: 4.8, caption: "Staring at a shop sign: 10% off, 100% rocket.", draw(c, t) {
    bgCity(c, t);
    px(c, 20, 56, 90, 24, "#1b1030"); px(c, 22, 58, 86, 20, "#ffd23f");
    c.font = 'bold 12px "Courier New", Courier, monospace'; c.textAlign = "center"; c.fillStyle = "#c0392b"; c.fillText("SALE -10%", 65, 73);
    px(c, 60, 80, 4, 52, "#4a4f5e");
    const hit = 2.5;
    if (t < hit) {
      fishAt(c, 62, GROUND, { dir: "up", t });
      const p = clamp01((t - 1.0) / (hit - 1.0));
      if (t > 1.0) {                                                                                   // the rocket flies in from the right
        const rx = lerp(350, 76, p), ry = lerp(60, GROUND - 24, p);
        px(c, Math.round(rx), Math.round(ry), 18, 5, "#e8e8f0"); px(c, Math.round(rx), Math.round(ry), 5, 5, "#e0463c"); px(c, Math.round(rx + 18), Math.round(ry) - 1, 4, 7, "#ffb347");
        for (let k = 0; k < 6; k++) ellipse(c, Math.round(rx + 24 + k * 9), Math.round(ry + 2 + (k % 2)), 5, 3, "rgba(200,200,210," + (0.7 - k * 0.1).toFixed(2) + ")");
        outlined(c, "WHOOOOSH", 200, 56, "#ffffff", 12);
      }
      if (t > 1.8) outlined(c, "!", 62, GROUND - 70, "#ff4f5e", 22);
      return;
    }
    const f = clamp01((t - hit) / 1.3);
    boom(c, 70, GROUND - 22, clamp01((t - hit) / 0.6), 1.2);
    flash(c, 0.9 - (t - hit) * 2.5);
    fishAt(c, lerp(62, 200, smooth(f)), GROUND - Math.sin(Math.PI * f) * 60, { pose: "ko", rot: 6 * smooth(f), tint: "rgba(20,12,8,0.6)", t });
    if (t > hit + 1.4) { smoke(c, 200, GROUND - 26, clamp01((t - hit - 1.4) / 1.5), 1); dizzy(c, 196, GROUND - 40, t); }
  } },

  // Tilted Towers - Retail Row: the suspiciously clean doorway
  H6: { dur: 4.8, caption: "A doorway that clean was never an invitation.", draw(c, t) {
    bgCity(c, t);
    px(c, 110, 60, 100, 96, "#a8553c"); px(c, 110, 60, 100, 6, "#cfcabd");
    for (let y = 70; y < 156; y += 5) px(c, 110, y, 100, 1, "#7d3c2a");
    px(c, 120, 78, 18, 16, "#6fb8e8"); px(c, 182, 78, 18, 16, "#6fb8e8");
    px(c, 144, 96, 32, 60, "#fffdf0"); px(c, 146, 98, 28, 58, "#dff4ff");                               // the suspiciously clean doorway
    if (Math.floor(t * 4) % 2 === 0) { px(c, 150, 104, 1, 5, "#fff"); px(c, 148, 106, 5, 1, "#fff"); }  // it sparkles. Suspicious
    px(c, 144, 150, 32, 6, "#2f9e4f");                                                                  // WELCOME mat
    const blow = 2.7;
    if (t < blow) {
      const x = t < 1.6 ? lerp(-24, 160, smooth(t / 1.6)) : 160;
      if (t > 2.0 && t < blow) outlined(c, "click...", 160, 84, "#ffffff", 12);
      fishAt(c, x, GROUND, { dir: "right", step: t < 1.6 ? Math.floor(t * 8) % 2 : 0, pose: t > 2.0 ? "scared" : "walk", t });
      if (t > 2.2) { px(c, 124, 96, 12, 6, "#e0463c"); px(c, 184, 96, 12, 6, "#e0463c"); }
      return;
    }
    const f = clamp01((t - blow) / 1.2);
    boom(c, 160, 124, clamp01((t - blow) / 0.7), 1.5);
    flash(c, 0.9 - (t - blow) * 2.2);
    px(c, 144, 96, 32, 60, "#2a1d14");                                                                  // the doorway is now a black hole
    fishAt(c, lerp(160, 40, smooth(f)), GROUND + 2 - Math.sin(Math.PI * f) * 60, { pose: "ko", rot: -7 * smooth(f), tint: "rgba(20,12,8,0.6)", t });
    outlined(c, "KA-BOOM!", 160, 50, "#ffd23f", 20);
    if (t > blow + 1.4) { smoke(c, 40, GROUND - 24, clamp01((t - blow - 1.4) / 1.5), 1); dizzy(c, 36, GROUND - 40, t); }
  } },

  // Tilted Towers - Polar Peak: thin ice
  H9: { dur: 5.4, caption: "Sliding on thin ice on your stomach. Chill. (Literally.)", draw(c, t) {
    bgSnow(c, t);
    const lakeX = 40, lakeW = 240;
    px(c, lakeX - 4, 132, lakeW + 8, 52, "#cfeaff"); px(c, lakeX, 136, lakeW, 44, "#8fd3f4");
    px(c, lakeX + 10, 140, 40, 3, "#dff4ff"); px(c, lakeX + 140, 160, 60, 3, "#dff4ff");
    const x = lerp(-10, 170, clamp01(t / 2.4));
    const breakT = 2.6;
    const px_ = (a, b, w, h, col) => px(c, Math.round(a), Math.round(b), w, h, col);
    if (t > 1.2) {                                                                                       // cracks spread
      const reach = clamp01((t - 1.2) / 1.4) * 70;
      for (let k = 0; k < 6; k++) { px_(x - reach + k * 22, 150 + (k % 3) * 6, 18, 1, "#ffffff"); px_(x - reach + k * 22 + 17, 150 + (k % 3) * 6, 1, 8, "#ffffff"); }
    }
    if (t < breakT) {
      fishAt(c, x, 160, { rot: -1.5708, scale: 2, pose: "scared", t });
      if (t > 1.9) outlined(c, "CRRRACK!", x, 100, "#ffffff", 14);
      return;
    }
    const f = t - breakT;
    ellipse(c, 170, 160, 30, 8, "#1c5f8c");                                                              // the hole
    const sink = f < 0.8 ? smooth(f / 0.8) : f < 1.8 ? 1 - smooth(clamp01((f - 0.8) / 0.5)) * 0.5 : 0.5 + clamp01((f - 2.6) / 1.2) * 0.8;
    fishAt(c, 170, 160 + sink * 40, { pose: f > 0.8 && f < 2.4 ? "scared" : "ko", tint: f > 0.8 ? "rgba(90,190,255,0.5)" : null, t });
    px(c, 140, 160, 60, 40, "#2a7fb8"); px(c, 140, 160, 60, 2, "#cfeaff");                               // water in front of the sunken fish
    for (let k = 0; k < 7; k++) {                                                                        // splash and ice chunks
      const p = clamp01((f - k * 0.04) / 0.9);
      px_(170 + (k - 3) * 9 * p, 150 - Math.sin(Math.PI * p) * 36, 4, 4, k % 2 ? "#ffffff" : "#dff4ff");
    }
    if (f > 0.9 && f < 2.4) { outlined(c, "BRRRRR!", 170, 96, "#cfeaff", 14); px(c, 164, 124, 3, 6, "#cfeaff"); px(c, 172, 124, 3, 5, "#cfeaff"); }
    if (f > 2.6) for (let k = 0; k < 5; k++) { const bt = (f * 30 + k * 11) % 40; ellipse(c, 166 + k * 4, 150 - bt, 2, 2, "rgba(255,255,255,0.8)"); }
  } },

  // Tilted Towers - Polar Peak: the avalanche
  H10: { dur: 5.4, caption: "Outrunning an avalanche in a straight line. The snow runs faster.", draw(c, t) {
    bgSnow(c, t);
    const front = -60 + 70 * t + 38 * t * t;
    const fx = t < 2.5 ? lerp(40, 180, t / 2.5) : 0;
    if (t < 2.6) {
      fishAt(c, fx, GROUND, { dir: "right", step: Math.floor(t * 12) % 2, t });
      speedLines(c, fx, GROUND - 14, t);
    }
    if (t < 2.6) {
      for (let y = 40; y < 174; y += 3) {                                                                // the wall of snow
        const bump = Math.round(Math.sin(y * 0.3 + t * 8) * 6);
        px(c, 0, y, Math.max(0, Math.round(front) + bump), 3, y % 6 ? "#ffffff" : "#e6f2ff");
      }
      for (let k = 0; k < 8; k++) px(c, Math.round(front) - 6 - (k * 17) % 40, 50 + ((k * 41) % 110), 5, 4, "#6f7790");
      if (t > 1.0) outlined(c, "RUMBLE", 60, 56, "#7a839a", 12);
      return;
    }
    const f = t - 2.6;
    const bx = lerp(170, 290, smooth(clamp01(f / 1.9)));
    const bounce = Math.abs(Math.sin(f * 7)) * 6;
    ellipse(c, Math.round(bx), GROUND - 14 - Math.round(bounce), 24, 24, "#ffffff");
    ellipse(c, Math.round(bx - 5), GROUND - 22 - Math.round(bounce), 14, 12, "#f0f7ff");
    px(c, Math.round(bx + 8 + Math.cos(f * 7) * 10), GROUND - 22 - Math.round(bounce), 4, 4, "#d6e8f6");
    px(c, Math.round(bx - 10), GROUND - 22 - Math.round(bounce), 6, 6, "#ffffff"); px(c, Math.round(bx - 9), GROUND - 21 - Math.round(bounce), 2, 2, "#111");     // two eyes peek out
    px(c, Math.round(bx - 2), GROUND - 22 - Math.round(bounce), 6, 6, "#ffffff"); px(c, Math.round(bx - 1), GROUND - 21 - Math.round(bounce), 2, 2, "#111");
    px(c, Math.round(bx - 8), GROUND - 14 - Math.round(bounce), 8, 3, "#f6c84c");
    if (f < 0.9) outlined(c, "NOPE!", bx - 40, 90, "#ff4f5e", 15);
    if (f > 1.9) {                                                                                       // crash into a pine tree
      pine(c, 300, GROUND + 4, 18);
      outlined(c, "THUD.", 270, 80, "#1b1030", 15);
      for (let k = 0; k < 6; k++) px(c, 282 + k * 6, 60 + ((f * 60 + k * 19) % 80), 4, 4, "#ffffff");
      dizzy(c, 280, GROUND - 52, t);
    }
  } },

  // Retail Row - Polar Peak: the pickaxe duel
  H11: { dur: 5.0, caption: "A pickaxe duel against a squad. They brought guns. Rude.", draw(c, t) {
    bgSnow(c, t);
    npcBig(c, 232, GROUND, "renegade", "idle", t, { scale: 2, flip: true });
    const aim = smooth(clamp01((t - 1.6) / 0.4));
    px(c, Math.round(lerp(236, 200, aim)), GROUND - 34, 34, 4, "#2a2d38"); px(c, Math.round(lerp(236, 200, aim)), GROUND - 34, 10, 2, "#6a6f7d");    // the shotgun
    const shot = 2.2;
    if (t < shot) {
      const x = lerp(-24, 80, smooth(clamp01(t / 1.0)));
      fishAt(c, x, GROUND, { dir: "right", step: t < 1.0 ? Math.floor(t * 10) % 2 : 0, rot: t > 1.0 && t < 1.6 ? Math.sin((t - 1.0) * 5) * 0.2 : 0, t });
      px(c, Math.round(x + 24), GROUND - 36, 2, 20, "#6b4423"); px(c, Math.round(x + 18), GROUND - 40, 14, 3, "#9aa0ae"); px(c, Math.round(x + 18), GROUND - 40, 3, 7, "#9aa0ae");   // the pickaxe
      if (t > 1.0 && t < 1.6) outlined(c, "EN GARDE!", x + 14, GROUND - 66, "#ffffff", 12);
      if (t > 1.6) outlined(c, "...wait", x + 10, GROUND - 66, "#ffffff", 12);
      return;
    }
    const f = clamp01((t - shot) / 1.1);
    boom(c, 196, GROUND - 32, clamp01((t - shot) / 0.4), 0.8);
    outlined(c, "BOOM!", 150, 60, "#ffd23f", 20);
    fishAt(c, lerp(80, 10, smooth(f)), GROUND - Math.sin(Math.PI * f) * 30, { pose: "ko", rot: -3 * smooth(f), t });
    const py = lerp(GROUND - 40, GROUND - 4, clamp01((t - shot - 0.8) / 0.6));
    px(c, 120, Math.round(Math.min(py, GROUND - 4 - Math.abs(Math.sin(t * 9)) * 40 * (1 - clamp01((t - shot - 0.8) / 0.6)))), 2, 20, "#6b4423");   // the pickaxe lands in the snow
    if (t > shot + 1.0) dizzy(c, 22, GROUND - 22, t);
  } },

  // Retail Row - Polar Peak: waving at the rocketeer
  H12: { dur: 5.0, caption: "He waved back. With a rocket.", draw(c, t) {
    bgCity(c, t);
    px(c, 226, 74, 94, 8, "#8c8f99"); px(c, 226, 74, 94, 2, "#cfcabd");
    npcBig(c, 268, 74, "renegade", "idle", t, { scale: 2, flip: true });
    const aim = t > 1.8;
    px(c, aim ? 238 : 264, aim ? 38 : 44, 36, 7, "#3a3d4a"); px(c, aim ? 238 : 264, aim ? 38 : 44, 8, 7, "#c0392b");                  // the rocket launcher
    const x = 100;
    fishAt(c, x, GROUND, { pose: "wave", t });
    if (t > 0.5 && t < 1.8) outlined(c, "HELLOOO!", x, GROUND - 66, "#ffffff", 12);
    if (t > 2.1 && t < 3.2) {                                                                                                          // the rocket flies down to the fish
      const p = (t - 2.1) / 1.1;
      const rx = lerp(240, x + 8, p), ry = lerp(46, GROUND - 22, p * p);
      px(c, Math.round(rx), Math.round(ry), 16, 5, "#e8e8f0"); px(c, Math.round(rx), Math.round(ry), 5, 5, "#e0463c"); px(c, Math.round(rx + 16), Math.round(ry), 4, 5, "#ffb347");
      for (let k = 0; k < 6; k++) ellipse(c, Math.round(rx + 22 + k * 8), Math.round(ry - k * 2), 4, 3, "rgba(200,200,210," + (0.7 - k * 0.1).toFixed(2) + ")");
    }
    if (t < 3.2) return;
    const f = clamp01((t - 3.2) / 1.3);
    boom(c, x + 4, GROUND - 22, clamp01((t - 3.2) / 0.6), 1.3);
    flash(c, 0.9 - (t - 3.2) * 2.4);
    fishAt(c, x + 20 * f, GROUND - Math.sin(Math.PI * f) * 30, { pose: "ko", rot: 2.4 * smooth(f), tint: "rgba(20,12,8,0.6)", t });
    if (t > 4.2) dizzy(c, x + 20, GROUND - 28, t);
  } },
};

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
