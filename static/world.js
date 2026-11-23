"use strict";

// The walking world: pixel art drawn in code (16x16 pixel tiles), the town maps,
// signposts, characters and things you can interact with.
// Nothing in here decides game rules: the server does that.

const T = 16;            // tile size in pixels (small, so everything looks chunky)
const COLS = 20;
const ROWS = 12;

// ---------- tiles ----------
// walkable: g grass  p dirt  c stone  e sidewalk  r road  n snow  k stone path  F storm fog  x storm gate
// solid:    t tree  o autumn tree  u bush  h hedge  f fence  R roof  w wall  W window  D door
//           s sign  l lamp  i ice  K castle  X storm wall  v car  Z wooden roof  Y post
//           C clock  b brick  B big building / obstacle (its picture is drawn by the town)
//           a apple tree  q orange tree  O boulder  L log  Q storm rock  V chasm  T dead tree
// walkable: P wooden planks (the old bridge)
const SOLID_TILES = new Set("thfRwWDslViKXvZYCbBouaqOLQVT".split(""));

function smoothStep(p) { return p * p * (3 - 2 * p); }

function hash(x, y, n) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (n * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function px(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}

function ellipse(c, cx, cy, rx, ry, color) {
  c.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry || 1))));
    c.fillRect(Math.round(cx - half), Math.round(cy + dy), Math.max(1, half * 2), 1);
  }
}

function speckles(c, ox, oy, tx, ty, colors, count) {
  for (let i = 0; i < count; i++) {
    const r = hash(tx, ty, i + 1);
    px(c, ox + 1 + (r % 14), oy + 1 + ((r >>> 8) % 14), 1, 1, colors[i % colors.length]);
  }
}

const TILE_DRAWERS = {
  g(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#62c24d");
    speckles(c, ox, oy, tx, ty, ["#4fae3d", "#7fd866", "#4fae3d"], 8);
    const r = hash(tx, ty, 99);
    if (r % 17 === 0) { px(c, ox + 7, oy + 8, 2, 2, "#ffffff"); px(c, ox + 7, oy + 8, 1, 1, "#ffd23f"); }
    else if (r % 11 === 0) {                                   // a tuft of tall grass
      px(c, ox + 5, oy + 10, 1, 3, "#3f9a35"); px(c, ox + 7, oy + 8, 1, 5, "#3f9a35"); px(c, ox + 9, oy + 10, 1, 3, "#3f9a35");
      px(c, ox + 6, oy + 11, 1, 2, "#2f7f2a"); px(c, ox + 8, oy + 11, 1, 2, "#2f7f2a");
    } else if (r % 23 === 1) {                                 // pebbles
      px(c, ox + 4, oy + 11, 3, 2, "#a8a8a0"); px(c, ox + 5, oy + 10, 2, 1, "#c8c8c0"); px(c, ox + 10, oy + 6, 2, 1, "#a8a8a0");
    } else if (r % 29 === 2) {                                 // a red flower
      px(c, ox + 9, oy + 4, 3, 3, "#ff5a6e"); px(c, ox + 10, oy + 5, 1, 1, "#ffd23f"); px(c, ox + 10, oy + 7, 1, 3, "#3f9a35");
    } else if (r % 31 === 3) {                                 // a blue flower
      px(c, ox + 4, oy + 5, 3, 3, "#6aa8ff"); px(c, ox + 5, oy + 6, 1, 1, "#fff"); px(c, ox + 5, oy + 8, 1, 3, "#3f9a35");
    } else if (r % 37 === 4) {                                 // a mushroom
      px(c, ox + 10, oy + 10, 4, 2, "#e0463c"); px(c, ox + 11, oy + 10, 1, 1, "#fff"); px(c, ox + 11, oy + 12, 2, 2, "#f3e6c8");
    }
  },
  p(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#dcbc7d");
    speckles(c, ox, oy, tx, ty, ["#c8a35e", "#ecd3a0", "#c8a35e"], 7);
  },
  c(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#bdb8aa");
    px(c, ox, oy + 7, T, 1, "#a39e90");
    px(c, ox + ((ty % 2) ? 4 : 11), oy, 1, 7, "#a39e90");
    px(c, ox + ((ty % 2) ? 11 : 4), oy + 8, 1, 8, "#a39e90");
    speckles(c, ox, oy, tx, ty, ["#d3cfc2"], 2);
  },
  e(c, ox, oy, tx, ty) {          // sidewalk
    px(c, ox, oy, T, T, "#cfcbc0");
    px(c, ox, oy + 15, T, 1, "#b5b1a5");
    px(c, ox + 15, oy, 1, T, "#b5b1a5");
    speckles(c, ox, oy, tx, ty, ["#dedacf", "#bdb9ad"], 3);
  },
  r(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#575c6d");
    speckles(c, ox, oy, tx, ty, ["#4c5060", "#686d7f"], 5);
  },
  d(c, ox, oy, tx, ty) {
    TILE_DRAWERS.r(c, ox, oy, tx, ty);
    px(c, ox + 3, oy + 7, 10, 2, "#ffd23f");
  },
  n(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#eef6ff");
    speckles(c, ox, oy, tx, ty, ["#cfe3f7", "#ffffff", "#cfe3f7"], 6);
  },
  k(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#9aa0b8");
    px(c, ox, oy + 7, T, 1, "#80869e");
    px(c, ox + ((ty % 2) ? 5 : 10), oy, 1, 7, "#80869e");
    px(c, ox + ((ty % 2) ? 10 : 5), oy + 8, 1, 8, "#80869e");
  },
  x(c, ox, oy) { px(c, ox, oy, T, T, "#8f45d8"); },
  X(c, ox, oy) { px(c, ox, oy, T, T, "#7b2fc9"); },
  t(c, ox, oy, tx, ty) {
    TILE_DRAWERS.g(c, ox, oy, tx, ty);
    px(c, ox + 6, oy + 10, 4, 6, "#7a4a24");
    px(c, ox + 2, oy + 1, 12, 10, "#2c8a3a");
    px(c, ox + 1, oy + 3, 14, 6, "#2c8a3a");
    px(c, ox + 4, oy + 2, 5, 3, "#46b24c");
    px(c, ox + 10, oy + 8, 4, 2, "#1f6b2c");
  },
  o(c, ox, oy, tx, ty) {          // autumn tree
    TILE_DRAWERS.g(c, ox, oy, tx, ty);
    px(c, ox + 6, oy + 10, 4, 6, "#7a4a24");
    px(c, ox + 2, oy + 1, 12, 10, "#d9731f");
    px(c, ox + 1, oy + 3, 14, 6, "#d9731f");
    px(c, ox + 4, oy + 2, 5, 3, "#f0a23a");
    px(c, ox + 10, oy + 8, 4, 2, "#a8530f");
  },
  a(c, ox, oy, tx, ty) {          // apple tree
    TILE_DRAWERS.t(c, ox, oy, tx, ty);
    [[4, 4], [10, 3], [7, 7], [12, 7], [3, 7]].forEach(([fx, fy]) => { px(c, fx + ox, fy + oy, 2, 2, "#e0243a"); px(c, fx + ox, fy + oy, 1, 1, "#ff8a8a"); });
  },
  q(c, ox, oy, tx, ty) {          // orange tree
    TILE_DRAWERS.t(c, ox, oy, tx, ty);
    [[5, 3], [10, 4], [8, 7], [3, 6], [12, 8]].forEach(([fx, fy]) => { px(c, fx + ox, fy + oy, 2, 2, "#ff9f1c"); px(c, fx + ox, fy + oy, 1, 1, "#ffd27a"); });
  },
  O(c, ox, oy, tx, ty, pal) {     // boulder
    TILE_DRAWERS[pal.floor](c, ox, oy, tx, ty, pal);
    px(c, ox + 2, oy + 14, 12, 1, "rgba(0,0,0,0.25)");
    ellipse(c, ox + 8, oy + 9, 7, 5, "#6f7482");
    ellipse(c, ox + 6, oy + 7, 4, 3, "#9096a6");
    px(c, ox + 10, oy + 11, 4, 2, "#565a68");
    if (pal.floor === "n") { ellipse(c, ox + 8, oy + 6, 5, 2, "#ffffff"); }
  },
  L(c, ox, oy, tx, ty, pal) {     // fallen log
    TILE_DRAWERS[pal.floor](c, ox, oy, tx, ty, pal);
    px(c, ox + 1, oy + 7, 14, 7, "#6b4423"); px(c, ox + 1, oy + 7, 14, 2, "#8a5a2c");
    px(c, ox + 4, oy + 10, 5, 1, "#4f3016"); px(c, ox + 1, oy + 13, 14, 1, "#4f3016");
    ellipse(c, ox + 14, oy + 10, 2, 3, "#c9a066"); px(c, ox + 14, oy + 10, 1, 1, "#8a5a2c");
    px(c, ox + 6, oy + 6, 2, 1, "#46b24c");
  },
  F(c, ox, oy, tx, ty) {          // storm ground: dark stone with glowing cracks
    px(c, ox, oy, T, T, "#3a2368");
    speckles(c, ox, oy, tx, ty, ["#4a2f80", "#2e1a56", "#5a3a9a"], 8);
    const r = hash(tx, ty, 71);
    if (r % 6 === 0) { px(c, ox + 3, oy + 6, 7, 1, "#b45cff"); px(c, ox + 9, oy + 7, 1, 4, "#b45cff"); px(c, ox + 4, oy + 6, 5, 1, "#e0a8ff"); }
    if (r % 9 === 1) { px(c, ox + 10, oy + 3, 3, 2, "#2a1550"); px(c, ox + 2, oy + 12, 4, 2, "#2a1550"); }
  },
  Q(c, ox, oy, tx, ty) {          // jagged storm rocks
    px(c, ox, oy, T, T, "#24113f");
    px(c, ox + 1 + (tx % 3), oy + 2, 5, 14, "#3a1f70"); px(c, ox + 8, oy + (ty % 2) * 2, 6, 16, "#2f1a5c");
    px(c, ox + 3, oy, 2, 6, "#4d2a94"); px(c, ox + 10, oy + 2, 1, 8, "#6a3fb5");
    speckles(c, ox, oy, tx, ty, ["#6a3fb5", "#1a0b30"], 3);
  },
  V(c, ox, oy, tx, ty) {          // the chasm
    px(c, ox, oy, T, T, "#12082a");
    px(c, ox, oy + (ty % 2 ? 8 : 0), T, 8, "#1a0d38");
    speckles(c, ox, oy, tx, ty, ["#2a1458", "#0a0418"], 5);
  },
  T(c, ox, oy, tx, ty, pal) {     // dead tree
    TILE_DRAWERS[pal.floor](c, ox, oy, tx, ty, pal);
    px(c, ox + 7, oy + 4, 3, 12, "#2b1b2e"); px(c, ox + 7, oy + 4, 1, 12, "#4a3050");
    px(c, ox + 3, oy + 5, 5, 1, "#2b1b2e"); px(c, ox + 3, oy + 2, 1, 4, "#2b1b2e");
    px(c, ox + 9, oy + 7, 5, 1, "#2b1b2e"); px(c, ox + 13, oy + 4, 1, 4, "#2b1b2e");
    px(c, ox + 6, oy + 1, 1, 4, "#2b1b2e"); px(c, ox + 10, oy + 1, 1, 4, "#2b1b2e");
  },
  P(c, ox, oy, tx, ty) {          // wooden planks of the old bridge
    px(c, ox, oy, T, T, "#5a3a1c");
    for (let k = 0; k < T; k += 4) { px(c, ox, oy + k, T, 3, "#8a5a2c"); px(c, ox, oy + k, T, 1, "#a8743a"); px(c, ox, oy + k + 3, T, 1, "#3b220f"); }
    px(c, ox + 2, oy + 1, 1, 1, "#3b220f"); px(c, ox + 13, oy + 9, 1, 1, "#3b220f");
  },
  u(c, ox, oy, tx, ty) {          // round bush
    TILE_DRAWERS.g(c, ox, oy, tx, ty);
    ellipse(c, ox + 8, oy + 9, 7, 6, "#2f8f3a");
    ellipse(c, ox + 6, oy + 7, 4, 3, "#46b24c");
  },
  h(c, ox, oy, tx, ty) {
    TILE_DRAWERS.g(c, ox, oy, tx, ty);
    px(c, ox + 1, oy + 5, 14, 10, "#2f8f3a");
    px(c, ox + 3, oy + 6, 4, 2, "#46b24c");
    px(c, ox + 9, oy + 10, 4, 2, "#1f6b2c");
  },
  f(c, ox, oy, tx, ty) {
    TILE_DRAWERS.g(c, ox, oy, tx, ty);
    px(c, ox, oy + 6, T, 2, "#9a6a3a");
    px(c, ox, oy + 11, T, 2, "#9a6a3a");
    px(c, ox + 2, oy + 4, 2, 11, "#7a4a24");
    px(c, ox + 12, oy + 4, 2, 11, "#7a4a24");
  },
  b(c, ox, oy) {
    px(c, ox, oy, T, T, "#8a6f5a");
    px(c, ox, oy + 7, T, 1, "#6f5846");
    px(c, ox + 4, oy, 1, 7, "#6f5846");
    px(c, ox + 11, oy + 8, 1, 8, "#6f5846");
  },
  i(c, ox, oy) {
    px(c, ox, oy, T, T, "#8fd3f4");
    px(c, ox + 1, oy + 1, 6, 3, "#dff4ff");
    px(c, ox, oy + 13, T, 3, "#5fb2dc");
  },
  K(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#555b78");
    px(c, ox, oy + 7, T, 1, "#3f4460");
    px(c, ox + ((ty % 2) ? 4 : 11), oy, 1, 7, "#3f4460");
    px(c, ox + ((ty % 2) ? 11 : 4), oy, 1, 7, "#3f4460");
    px(c, ox, oy, T, 1, "#7a82a3");
  },
  B(c, ox, oy, tx, ty, pal) { TILE_DRAWERS[pal.floor](c, ox, oy, tx, ty, pal); },
  s(c, ox, oy, tx, ty, pal) {
    TILE_DRAWERS[pal.floor](c, ox, oy, tx, ty, pal);
    px(c, ox + 7, oy + 7, 2, 9, "#7a4a24");
    px(c, ox + 1, oy + 2, 14, 7, "#c68a4a");
    px(c, ox + 1, oy + 2, 14, 1, "#e0a863");
    px(c, ox + 2, oy + 4, 12, 1, "#7a4a24");
    px(c, ox + 2, oy + 6, 8, 1, "#7a4a24");
  },
  l(c, ox, oy, tx, ty, pal) {
    TILE_DRAWERS[pal.floor](c, ox, oy, tx, ty, pal);
    px(c, ox + 7, oy + 4, 2, 12, "#3c3f4f");
    px(c, ox + 5, oy + 1, 6, 4, "#ffe680");
    px(c, ox + 5, oy, 6, 1, "#3c3f4f");
  },
};

function drawTile(c, ch, tx, ty, pal) {
  const draw = TILE_DRAWERS[ch] || TILE_DRAWERS.g;
  draw(c, tx * T, ty * T, tx, ty, pal);
}

// ---------- map building helpers ----------

function makeGrid(fill) {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(fill));
}
function fillRect(g, x, y, w, h, ch) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = ch;
}
function border(g, ch) {
  fillRect(g, 0, 0, COLS, 1, ch);
  fillRect(g, 0, ROWS - 1, COLS, 1, ch);
  fillRect(g, 0, 0, 1, ROWS, ch);
  fillRect(g, COLS - 1, 0, 1, ROWS, ch);
}

const PALETTES = {
  pleasant: { floor: "g" },
  retail: { floor: "e" },
  tilted: { floor: "e" },
  polar: { floor: "n" },
  storm: { floor: "F" },
  market: { floor: "e" },
};

// ---------- pixel art: buildings and scenery (x, y, w, h are in pixels) ----------

function brickBuilding(c, x, y, w, h, o) {
  const brick = o.brick || "#a8553c", dark = o.dark || "#7d3c2a", roof = o.roof || "#cfcabd";
  px(c, x, y, w, h, brick);
  for (let yy = y + 8; yy < y + h; yy += 4) px(c, x, yy, w, 1, dark);
  for (let yy = y + 5, k = 0; yy < y + h; yy += 4, k++) {
    for (let xx = x + (k % 2 ? 3 : 0); xx < x + w; xx += 6) px(c, xx, yy, 1, 3, dark);
  }
  px(c, x, y, w, 6, roof);
  px(c, x, y + 6, w, 1, "#8f8a7e");
  px(c, x + w - 1, y, 1, h, dark);
  px(c, x, y + h - 2, w, 2, dark);
  if (o.ac !== false) { px(c, x + 5, y - 3, 9, 4, "#9aa0a8"); px(c, x + 6, y - 2, 3, 2, "#6a7078"); }
  for (let wy = y + 11; wy < y + h - 14; wy += 13) {
    for (let wx = x + 5; wx < x + w - 7; wx += 10) {
      const lit = hash(wx, wy, 3) % 4 === 0;
      px(c, wx - 1, wy - 1, 8, 10, "#4a3a2e");
      px(c, wx, wy, 6, 8, lit ? "#ffe28a" : "#6fb8e8");
      px(c, wx + 3, wy, 1, 8, "#4a3a2e");
      px(c, wx, wy + 4, 6, 1, "#4a3a2e");
    }
  }
  if (o.door !== undefined) {
    const dx = x + o.door;
    px(c, dx - 1, y + h - 15, 10, 15, "#3d2b1f");
    px(c, dx, y + h - 14, 8, 14, "#8a5a2c");
    px(c, dx + 5, y + h - 8, 2, 2, "#ffd23f");
  }
}

function clockTower(c, x, y) {            // 48 x 80 pixels
  const stone = "#b7a888", dark = "#8f8062", light = "#d4c6a6", roofC = "#565a70";
  px(c, x + 6, y + 24, 36, 56, stone);
  px(c, x + 6, y + 24, 3, 56, light);
  px(c, x + 39, y + 24, 3, 56, dark);
  for (let yy = y + 28; yy < y + 80; yy += 6) px(c, x + 6, yy, 36, 1, "#a39571");
  // pointed roof
  for (let r = 0; r < 24; r++) {
    const half = 3 + Math.round(r * 0.8);
    px(c, x + 24 - half, y + r, half * 2, 1, r % 4 === 3 ? "#454960" : roofC);
  }
  px(c, x + 23, y - 6, 2, 8, "#3c3f4f");
  px(c, x + 25, y - 6, 5, 3, "#e0463c");
  px(c, x + 4, y + 22, 40, 3, dark);
  // belfry arches
  [[11, 28], [31, 28]].forEach(([ax, ay]) => {
    px(c, x + ax, y + ay + 3, 7, 9, "#2a2a38");
    ellipse(c, x + ax + 3, y + ay + 3, 3, 3, "#2a2a38");
    px(c, x + ax + 2, y + ay + 8, 3, 4, "#e0a040");
  });
  // the clock
  ellipse(c, x + 24, y + 50, 13, 13, "#3c3f4f");
  ellipse(c, x + 24, y + 50, 11, 11, "#fff6d8");
  [[24, 41], [24, 59], [15, 50], [33, 50]].forEach(([tx, ty]) => px(c, x + tx, y + ty, 1, 2, "#3c3f4f"));
  px(c, x + 24, y + 44, 1, 7, "#222");
  px(c, x + 24, y + 50, 5, 1, "#222");
  px(c, x + 23, y + 49, 3, 3, "#222");
  // door
  px(c, x + 19, y + 66, 10, 14, "#3d2b1f");
  ellipse(c, x + 24, y + 66, 5, 3, "#3d2b1f");
  px(c, x + 20, y + 68, 8, 12, "#7a4a24");
}

function suburbanHouse(c, x, y, w, h, o) {
  // a Pleasant Park house: shingled hip roof, white window frames, porch, chimney
  const roofH = Math.round(h * 0.46);
  const wallDark = o.wallDark || "#9a9384";
  px(c, x, y + roofH, w, h - roofH, o.wall);
  if (o.brick) {                                              // brick pattern
    for (let yy = y + roofH + 2; yy < y + h - 2; yy += 3) px(c, x, yy, w, 1, wallDark);
    for (let yy = y + roofH + 2, k = 0; yy < y + h - 2; yy += 3, k++) for (let xx = x + (k % 2 ? 3 : 0); xx < x + w; xx += 6) px(c, xx, yy, 1, 3, wallDark);
  } else {                                                    // siding
    for (let yy = y + roofH + 3; yy < y + h - 2; yy += 3) px(c, x, yy, w, 1, wallDark);
  }
  px(c, x, y + h - 2, w, 2, wallDark);
  px(c, x, y + roofH, w, 1, "rgba(0,0,0,0.3)");
  for (let r = 0; r < roofH; r++) {                           // hip roof, narrower at the top
    const inset = Math.round((roofH - 1 - r) * 0.4);
    px(c, x - 2 + inset, y + r, w + 4 - inset * 2, 1, r % 3 === 2 ? o.roofDark : o.roof);
  }
  for (let r = 1; r < roofH; r += 3) for (let sx = x + (r % 2 ? 2 : 0); sx < x + w; sx += 5) px(c, sx, y + r, 1, 2, o.roofDark);
  px(c, x - 2, y + roofH - 1, w + 4, 2, "rgba(0,0,0,0.3)");
  px(c, x + w - 13, y - 4, 7, Math.round(roofH * 0.5) + 4, "#7d3c2a");                 // chimney
  px(c, x + w - 14, y - 5, 9, 2, "#5e2f20");
  const doorX = x + o.door;
  for (let wx = x + 4; wx < x + w - 9; wx += 13) {            // windows with white frames and shutters
    if (Math.abs(wx - doorX) < 11) continue;
    const wy = y + roofH + 4;
    px(c, wx - 3, wy, 2, 10, o.shutter || "#3a6a8a"); px(c, wx + 8, wy, 2, 10, o.shutter || "#3a6a8a");
    px(c, wx - 1, wy - 1, 10, 12, "#fffdf0");
    px(c, wx, wy, 8, 10, "#7cc4ff"); px(c, wx, wy, 3, 4, "#cfeaff");
    px(c, wx + 3, wy, 2, 10, "#fffdf0"); px(c, wx, wy + 4, 8, 1, "#fffdf0");
    px(c, wx - 1, wy + 10, 10, 2, "#c0392b");                                 // flower box
    px(c, wx + 1, wy + 9, 2, 1, "#ff8fc8"); px(c, wx + 5, wy + 9, 2, 1, "#ffd23f");
  }
  const dy = y + h - 15;                                      // porch roof, door and steps
  px(c, doorX - 4, dy - 3, 17, 3, o.roofDark); px(c, doorX - 3, dy - 4, 15, 1, o.roof);
  px(c, doorX - 3, dy, 1, 13, "#fffdf0"); px(c, doorX + 11, dy, 1, 13, "#fffdf0");
  px(c, doorX - 1, dy, 10, 13, "#5b3418");
  px(c, doorX, dy + 1, 8, 12, "#8a5a2c"); px(c, doorX + 1, dy + 2, 6, 4, "#bfe8ff");
  px(c, doorX + 5, dy + 8, 2, 2, "#ffd23f");
  px(c, doorX - 2, y + h - 2, 14, 2, "#cfcbc0");
}

function picketFence(c, x, y, w, color) {
  px(c, x, y + 2, w, 1, color); px(c, x, y + 4, w, 1, color);
  for (let xx = 0; xx < w; xx += 3) { px(c, x + xx, y, 2, 6, color); px(c, x + xx, y, 2, 1, "#ffffff"); }
}

function gazebo(c, x, y) {                                    // 48 x 32 pixels
  px(c, x + 2, y + 26, 44, 5, "#bfb7a6");                     // stone base
  px(c, x + 2, y + 26, 44, 1, "#d9d3c4");
  [6, 18, 30, 40].forEach((dx) => px(c, x + dx, y + 12, 3, 15, "#fffdf0"));
  px(c, x + 5, y + 20, 38, 1, "#fffdf0");
  for (let r = 0; r < 12; r++) {                              // pointed roof
    const half = 3 + r * 2;
    px(c, x + 24 - half, y + r, half * 2, 1, r % 3 === 2 ? "#5e3a24" : "#7a4a2c");
  }
  px(c, x + 23, y - 3, 2, 4, "#3c3f4f");
  px(c, x + 3, y + 12, 42, 2, "#4a2f1c");
  px(c, x + 12, y + 14, 24, 12, "rgba(0,0,0,0.25)");            // shade inside
}

function shopFront(c, x, y, w, h, o) {
  px(c, x, y, w, h, o.wall || "#e8eef7");
  px(c, x, y, w, 7, o.roof || "#3c3f4f");
  px(c, x, y + 7, w, 1, "#1f2230");
  for (let xx = 0; xx < w; xx += 6) {         // striped awning
    px(c, x + xx, y + 8, 3, 9, o.stripeA || "#2f9e4f");
    px(c, x + xx + 3, y + 8, 3, 9, "#f4f4f4");
  }
  px(c, x, y + 17, w, 1, "rgba(0,0,0,0.25)");
  for (let wx = x + 5; wx < x + w - 14; wx += 14) {
    px(c, wx - 1, y + 20, 11, h - 24, "#3c3f4f");
    px(c, wx, y + 21, 9, h - 26, "#9ad8ff");
    px(c, wx, y + 21, 3, h - 26, "#d6f0ff");
  }
  px(c, x + w - 13, y + h - 17, 10, 17, "#3c3f4f");
  px(c, x + w - 12, y + h - 16, 8, 16, "#7a4a24");
  if (o.label) {
    c.font = "bold 6px monospace"; c.textAlign = "center"; c.fillStyle = "#ffffff";
    c.fillText(o.label, x + w / 2, y + 5);
  }
}

function supermarketFront(c, x, y, w, h) {        // x,y,w,h in pixels
  px(c, x, y, w, h, "#7b3f2b");
  for (let yy = y + 6; yy < y + h; yy += 4) px(c, x, yy, w, 1, "#5e2f20");
  px(c, x, y, w, 8, "#cfcabd");
  px(c, x, y + 8, w, 1, "#8f8a7e");
  px(c, x + w / 2 - 28, y + 10, 56, 10, "#1f6b3a");
  px(c, x + w / 2 - 27, y + 11, 54, 8, "#2f9e4f");
  c.font = "bold 7px monospace"; c.textAlign = "center"; c.fillStyle = "#ffffff";
  c.fillText("SUPERMARKET", x + w / 2, y + 18);
  // big arched window with glowing lanterns
  const wx = x + w / 2 - 22;
  px(c, wx, y + 28, 44, 26, "#4a2a1c");
  ellipse(c, x + w / 2, y + 28, 22, 8, "#4a2a1c");
  px(c, wx + 2, y + 30, 40, 24, "#ffe9a0");
  ellipse(c, x + w / 2, y + 29, 20, 6, "#ffe9a0");
  for (let k = 0; k < 4; k++) {
    px(c, wx + 6 + k * 10, y + 24, 1, 6, "#4a2a1c");
    ellipse(c, wx + 6 + k * 10, y + 32, 3, 4, "#ffd23f");
    ellipse(c, wx + 6 + k * 10, y + 32, 1, 2, "#fff6c0");
  }
  px(c, wx + 2, y + 50, 40, 4, "#c9a455");
  [x + 4, x + w - 28].forEach((ax) => {      // striped awnings left and right
    for (let xx = 0; xx < 24; xx += 6) {
      px(c, ax + xx, y + 30, 3, 8, "#2f9e4f"); px(c, ax + xx + 3, y + 30, 3, 8, "#f4f4f4");
    }
    px(c, ax, y + 38, 24, 1, "rgba(0,0,0,0.25)");
    px(c, ax + 2, y + 40, 20, 14, "#9ad8ff");
  });
  // double doors (the entrance)
  px(c, x + w / 2 - 12, y + h - 18, 24, 18, "#3c3f4f");
  px(c, x + w / 2 - 10, y + h - 17, 9, 17, "#bfe8ff");
  px(c, x + w / 2 + 1, y + h - 17, 9, 17, "#bfe8ff");
  px(c, x + w / 2 - 1, y + h - 17, 2, 17, "#3c3f4f");
}

function car(c, x, y, color) {                    // 32 x 20 pixels: fills its two parking tiles and rises a little above them
  ellipse(c, x + 16, y + 19, 15, 2, "rgba(0,0,0,0.3)");
  px(c, x + 6, y + 1, 19, 9, color);                                // the cabin
  px(c, x + 5, y + 3, 1, 7, color); px(c, x + 25, y + 3, 1, 7, color);
  px(c, x + 7, y + 1, 17, 1, "rgba(255,255,255,0.35)");            // roof shine
  px(c, x + 8, y + 3, 7, 6, "#bfe6ff"); px(c, x + 16, y + 3, 7, 6, "#bfe6ff");      // the two side windows
  px(c, x + 8, y + 3, 7, 1, "#e8f6ff"); px(c, x + 16, y + 3, 7, 1, "#e8f6ff");
  px(c, x + 15, y + 3, 1, 6, color);
  px(c, x, y + 9, 32, 8, color);                                    // the body
  px(c, x, y + 9, 32, 1, "rgba(255,255,255,0.3)");
  px(c, x, y + 14, 32, 3, "rgba(0,0,0,0.28)");                      // the shaded lower part
  px(c, x + 15, y + 10, 1, 5, "rgba(0,0,0,0.3)");                  // door line
  px(c, x + 11, y + 12, 3, 1, "rgba(0,0,0,0.4)"); px(c, x + 18, y + 12, 3, 1, "rgba(0,0,0,0.4)");   // door handles
  px(c, x + 29, y + 11, 3, 3, "#ffe680"); px(c, x, y + 11, 2, 3, "#e0463c");                          // headlight and taillight
  px(c, x - 1, y + 15, 34, 2, "#9a9fae");                           // bumpers
  [8, 24].forEach((wx) => {                                         // the wheels
    ellipse(c, x + wx, y + 17, 4, 4, "#14141c"); ellipse(c, x + wx, y + 17, 2, 2, "#b8bdc9"); px(c, x + wx, y + 17, 1, 1, "#14141c");
  });
}

function waterTower(c, x, y) {
  px(c, x + 3, y + 10, 2, 9, "#4a4f5e"); px(c, x + 11, y + 10, 2, 9, "#4a4f5e");
  ellipse(c, x + 8, y + 6, 8, 6, "#6a7080");
  ellipse(c, x + 6, y + 4, 4, 2, "#8a90a0");
  px(c, x + 7, y - 3, 2, 4, "#4a4f5e");
}

function footballPitch(c, x, y, w, h) {                       // a small full pitch, circle in the middle
  for (let xx = 0; xx < w; xx += 8) px(c, x + xx, y, 8, h, (xx / 8) % 2 ? "#58bd45" : "#4caf3a");
  const L = "#f4f4f4";
  px(c, x, y, w, 1, L); px(c, x, y + h - 1, w, 1, L); px(c, x, y, 1, h, L); px(c, x + w - 1, y, 1, h, L);
  px(c, x + w / 2, y, 1, h, L);                                                 // halfway line
  const cx = x + w / 2, cy = y + h / 2;
  ellipse(c, cx, cy, 9, 9, L);                                                  // centre circle
  ellipse(c, cx, cy, 8, 8, (Math.floor(w / 16) % 2) ? "#58bd45" : "#4caf3a");
  px(c, cx, cy, 1, 1, L); px(c, cx - 1, cy, 3, 1, L); px(c, cx, cy - 1, 1, 3, L);   // centre spot
  [x + 1, x + w - 14].forEach((bx) => {                                         // penalty areas
    px(c, bx, y + 11, 13, 1, L); px(c, bx, y + h - 12, 13, 1, L);
  });
  px(c, x + 13, y + 11, 1, h - 22, L); px(c, x + w - 14, y + 11, 1, h - 22, L);
  [x + 1, x + w - 5].forEach((gx) => {                                          // goals with nets
    px(c, gx, y + h / 2 - 8, 4, 16, "rgba(255,255,255,0.35)");
    px(c, gx, y + h / 2 - 8, 4, 1, "#ffffff"); px(c, gx, y + h / 2 + 7, 4, 1, "#ffffff");
    for (let k = 0; k < 16; k += 3) px(c, gx, y + h / 2 - 8 + k, 4, 1, "rgba(255,255,255,0.5)");
  });
}

function bleachers(c, x, y, w) {
  const colors = ["#3a6fe0", "#e0782a", "#d93a3a"];
  for (let row = 0; row < 3; row++) {
    for (let xx = 0; xx < w; xx += 8) px(c, x + xx, y + row * 5, 7, 4, colors[(xx / 8 + row) % 3]);
    px(c, x, y + row * 5 + 4, w, 1, "#4a4f5e");
  }
  px(c, x - 1, y + 14, w + 2, 2, "#4a4f5e");
}

// ---------- the towns ----------

function buildTiltedTowers() {
  const g = makeGrid("e");
  border(g, "b");
  fillRect(g, 0, 5, COLS, 2, "r");
  fillRect(g, 9, 0, 2, 5, "r");
  [[1, 0, 4, 5], [5, 1, 4, 4], [12, 0, 3, 5], [15, 1, 4, 4]].forEach(([x, y, w, h]) => fillRect(g, x, y, w, h, "B"));
  g[0][9] = "r"; g[0][10] = "r"; g[5][0] = "r"; g[6][0] = "r"; g[5][19] = "r"; g[6][19] = "r";
  g[9][2] = "o"; g[9][17] = "o"; g[10][8] = "o"; g[10][12] = "o";
  g[8][7] = "l"; g[8][12] = "l";
  return g;
}

function decorTiltedTowers(c) {
  for (let x = 0; x < COLS * T; x += 16) px(c, x + 2, 5 * T + 15, 10, 2, "#f4f4f4");     // road markings
  for (let y = 0; y < 5 * T; y += 16) px(c, 9 * T + 15, y + 2, 2, 10, "#f4f4f4");
  for (let k = 0; k < 6; k++) px(c, 8 * T + 2, 5 * T + 2 + k * 5, 12, 2, "#f4f4f4");     // crosswalk
  brickBuilding(c, 1 * T, 0, 4 * T, 5 * T, { door: 28 });
  brickBuilding(c, 5 * T, 1 * T, 4 * T, 4 * T, { brick: "#8c8f99", dark: "#6b6e78", roof: "#d6d3ca", door: 40 });
  clockTower(c, 12 * T, 0);
  brickBuilding(c, 15 * T, 1 * T, 4 * T, 4 * T, { brick: "#b09a78", dark: "#8a7656", roof: "#d8d2c0", door: 8 });
  ellipse(c, 10 * T, 9 * T + 8, 14, 7, "#bdb8aa");                                         // plaza
  px(c, 9 * T + 2, 9 * T + 4, 28, 3, "#7a4a24");                                           // bench
  px(c, 9 * T + 2, 9 * T + 1, 28, 3, "#9a6a3a");
  ellipse(c, 14 * T + 8, 10 * T + 8, 3, 2, "#2a2d38");                                     // manhole
}

function buildRetailRow() {
  const g = makeGrid("e");
  border(g, "t");
  fillRect(g, 0, 5, COLS, 2, "r");
  fillRect(g, 1, 7, 18, 4, "r");
  fillRect(g, 0, 7, 1, 4, "g"); fillRect(g, 19, 7, 1, 4, "g");
  [[1, 0, 5, 4], [6, 0, 8, 4], [14, 0, 5, 4]].forEach(([x, y, w, h]) => fillRect(g, x, y, w, h, "B"));
  g[3][9] = "e"; g[3][10] = "e";                                        // supermarket entrance tiles
  g[5][0] = "r"; g[6][0] = "r"; g[3][19] = "e"; g[4][19] = "e"; g[11][9] = "r"; g[11][10] = "r";
  [[2, 8, 2], [6, 10, 2], [16, 10, 2]].forEach(([x, y, w]) => fillRect(g, x, y, w, 1, "B"));   // parked cars
  g[7][1] = "u"; g[10][18] = "u"; g[7][18] = "u"; g[4][7] = "l"; g[4][13] = "l"; g[8][12] = "l";
  return g;
}

function decorRetailRow(c) {
  waterTower(c, 11 * T, 0);
  for (let x = 2; x < 18; x += 2) px(c, x * T, 7 * T + 2, 1, 14, "#d8d8d8");              // parking lines
  for (let x = 1; x < 19; x += 4) px(c, x * T + 2, 5 * T + 15, 10, 2, "#ffd23f");
  px(c, T, 4 * T, 18 * T, 2, "#b5b1a5");
  shopFront(c, 1 * T, 0, 5 * T, 4 * T, { label: "SHOP", stripeA: "#2f9e4f" });
  supermarketFront(c, 6 * T, 0, 8 * T, 4 * T);
  shopFront(c, 14 * T, 0, 5 * T, 4 * T, { label: "DINER", stripeA: "#d93a3a", wall: "#f3e6c8" });
  car(c, 2 * T, 8 * T - 3, "#c0392b");
  car(c, 6 * T, 10 * T - 3, "#3a6fe0");
  car(c, 16 * T, 10 * T - 3, "#e0b030");
}

// ---- the supermarket: 12 shelves, each with its own groceries (nothing to interact with) ----

// [x, y, width, height (in tiles), what is on the shelf]
const SHELVES = [
  [1, 1, 3, 1, "fruit"], [4, 1, 3, 1, "veg"], [7, 1, 3, 1, "bread"], [10, 1, 3, 1, "dairy"],
  [13, 1, 3, 1, "drinks"], [16, 1, 3, 1, "cereal"],
  [2, 4, 3, 2, "snacks"], [6, 4, 3, 2, "cans"], [11, 4, 3, 2, "pasta"], [15, 4, 3, 2, "candy"],
  [1, 7, 3, 2, "frozen"], [5, 7, 3, 2, "pizza"],
];

// small 5 x 6 pixel pictures of groceries; (x, y) is the top left corner
const PRODUCTS = {
  fruit: [
    (c, x, y) => { ellipse(c, x + 2, y + 3, 2, 2, "#e0243a"); px(c, x + 2, y, 1, 1, "#3fae3a"); },
    (c, x, y) => { ellipse(c, x + 2, y + 3, 2, 2, "#ff9f1c"); px(c, x + 1, y + 2, 1, 1, "#ffd27a"); },
    (c, x, y) => { px(c, x, y + 3, 5, 2, "#ffe14a"); px(c, x + 3, y + 1, 2, 2, "#ffe14a"); px(c, x, y + 5, 4, 1, "#c8a020"); },
    (c, x, y) => { ellipse(c, x + 2, y + 4, 2, 2, "#9ad94a"); px(c, x + 2, y + 1, 1, 2, "#6b4423"); },
  ],
  veg: [
    (c, x, y) => { px(c, x + 1, y + 1, 2, 5, "#ff8a1c"); px(c, x + 1, y, 2, 1, "#3fae3a"); },
    (c, x, y) => { ellipse(c, x + 2, y + 3, 2, 2, "#3fae3a"); px(c, x + 2, y + 2, 1, 3, "#7fd866"); },
    (c, x, y) => { ellipse(c, x + 2, y + 2, 2, 2, "#2f8f3a"); px(c, x + 2, y + 4, 1, 2, "#9ad94a"); },
    (c, x, y) => { ellipse(c, x + 2, y + 3, 2, 3, "#8a2a6a"); px(c, x + 2, y, 1, 1, "#3fae3a"); },
  ],
  bread: [
    (c, x, y) => { ellipse(c, x + 2, y + 3, 3, 2, "#c98a3c"); px(c, x + 1, y + 2, 1, 2, "#e8b868"); px(c, x + 3, y + 2, 1, 2, "#e8b868"); },
    (c, x, y) => { px(c, x, y + 1, 5, 4, "#e8b868"); px(c, x, y + 1, 5, 1, "#c98a3c"); },
    (c, x, y) => { ellipse(c, x + 2, y + 3, 2, 3, "#d9a050"); px(c, x + 2, y + 1, 1, 4, "#a8743a"); },
  ],
  dairy: [
    (c, x, y) => { px(c, x + 1, y + 1, 3, 5, "#ffffff"); px(c, x + 1, y, 3, 1, "#3a6fe0"); px(c, x + 1, y + 3, 3, 1, "#3a6fe0"); },
    (c, x, y) => { px(c, x, y + 2, 5, 3, "#ffd23f"); px(c, x + 1, y + 3, 1, 1, "#c8a020"); px(c, x + 3, y + 2, 1, 1, "#c8a020"); },
    (c, x, y) => { px(c, x + 1, y + 2, 3, 4, "#ffd0ea"); px(c, x + 1, y + 1, 3, 1, "#ffffff"); },
  ],
  drinks: [
    (c, x, y) => { px(c, x + 1, y + 1, 3, 5, "#e0243a"); px(c, x + 1, y, 3, 1, "#cfd2dc"); px(c, x + 2, y + 3, 1, 1, "#fff"); },
    (c, x, y) => { px(c, x + 1, y + 1, 3, 5, "#3a8ee0"); px(c, x + 1, y, 3, 1, "#cfd2dc"); },
    (c, x, y) => { px(c, x + 2, y, 1, 2, "#4cb050"); px(c, x + 1, y + 2, 3, 4, "#4cb050"); px(c, x + 1, y + 3, 3, 1, "#fff"); },
    (c, x, y) => { px(c, x + 2, y, 1, 2, "#e07a2a"); px(c, x + 1, y + 2, 3, 4, "#e07a2a"); },
  ],
  cereal: [
    (c, x, y) => { px(c, x, y, 5, 6, "#f0c030"); px(c, x + 1, y + 2, 3, 2, "#e0463c"); },
    (c, x, y) => { px(c, x, y, 5, 6, "#3a8ee0"); px(c, x + 1, y + 2, 3, 2, "#ffffff"); },
    (c, x, y) => { px(c, x, y, 5, 6, "#e0463c"); px(c, x + 1, y + 2, 3, 2, "#ffd23f"); },
  ],
  snacks: [
    (c, x, y) => { px(c, x, y + 1, 5, 5, "#e0463c"); px(c, x, y + 1, 5, 1, "#ffd23f"); px(c, x + 1, y + 3, 3, 1, "#ffd23f"); },
    (c, x, y) => { px(c, x, y + 1, 5, 5, "#f0c030"); px(c, x, y + 1, 5, 1, "#3a6fe0"); px(c, x + 1, y + 3, 3, 1, "#e0463c"); },
    (c, x, y) => { px(c, x + 1, y, 3, 6, "#8a5a2c"); px(c, x + 1, y + 2, 3, 1, "#ffd23f"); },
  ],
  cans: [
    (c, x, y) => { px(c, x + 1, y + 1, 3, 5, "#cfd2dc"); px(c, x + 1, y + 2, 3, 3, "#c0392b"); },
    (c, x, y) => { px(c, x + 1, y + 1, 3, 5, "#cfd2dc"); px(c, x + 1, y + 2, 3, 3, "#4cb050"); },
    (c, x, y) => { px(c, x + 1, y + 1, 3, 5, "#cfd2dc"); px(c, x + 1, y + 2, 3, 3, "#e0a020"); },
  ],
  pasta: [
    (c, x, y) => { px(c, x + 1, y, 1, 6, "#f0d27a"); px(c, x + 2, y, 1, 6, "#e8c060"); px(c, x + 3, y, 1, 6, "#f0d27a"); px(c, x, y + 2, 5, 1, "#e0463c"); },
    (c, x, y) => { px(c, x + 1, y + 1, 3, 5, "#c0392b"); px(c, x + 1, y, 3, 1, "#cfd2dc"); px(c, x + 2, y + 3, 1, 1, "#fff"); },
    (c, x, y) => { px(c, x, y + 1, 5, 5, "#f0d27a"); px(c, x + 1, y + 2, 3, 2, "#c0392b"); },
  ],
  candy: [
    (c, x, y) => { px(c, x, y + 3, 5, 3, "#ff8fc8"); px(c, x + 1, y + 1, 1, 2, "#ffd23f"); px(c, x + 3, y + 1, 1, 2, "#6aa8ff"); },
    (c, x, y) => { ellipse(c, x + 2, y + 3, 2, 2, "#a050c0"); px(c, x + 2, y + 3, 1, 1, "#fff"); },
    (c, x, y) => { px(c, x, y + 2, 5, 4, "#6b4423"); px(c, x + 1, y + 3, 3, 1, "#a8743a"); },
  ],
  frozen: [
    (c, x, y) => { px(c, x + 1, y + 2, 3, 4, "#ff8fc8"); px(c, x + 1, y + 1, 3, 1, "#fff"); },
    (c, x, y) => { px(c, x + 1, y + 2, 3, 4, "#8a5a2c"); px(c, x + 1, y + 1, 3, 1, "#fff"); },
    (c, x, y) => { px(c, x, y + 3, 5, 3, "#ffe9a0"); px(c, x + 1, y + 3, 1, 1, "#c8a020"); },
  ],
  pizza: [
    (c, x, y) => { ellipse(c, x + 2, y + 3, 2, 2, "#f0a030"); px(c, x + 1, y + 2, 1, 1, "#e0243a"); px(c, x + 3, y + 3, 1, 1, "#e0243a"); },
    (c, x, y) => { px(c, x, y + 1, 5, 5, "#a8743a"); px(c, x, y + 1, 5, 1, "#c98a3c"); px(c, x + 1, y + 3, 3, 1, "#fff"); },
    (c, x, y) => { px(c, x, y + 2, 5, 3, "#d9a050"); px(c, x + 1, y + 2, 1, 1, "#e0243a"); px(c, x + 3, y + 3, 1, 1, "#3fae3a"); },
  ],
};
const SHELF_LABELS = {
  fruit: "FRUIT", veg: "VEGGIES", bread: "BREAD", dairy: "DAIRY", drinks: "DRINKS", cereal: "CEREAL",
  snacks: "SNACKS", cans: "CANS", pasta: "PASTA", candy: "CANDY", frozen: "FROZEN", pizza: "PIZZA",
};
const SHELF_COLORS = {
  fruit: "#e0463c", veg: "#4cb050", bread: "#c98a3c", dairy: "#3a8ee0", drinks: "#e07a2a", cereal: "#f0c030",
  snacks: "#d93a3a", cans: "#8a8d99", pasta: "#e0a020", candy: "#e060b0", frozen: "#4aa8e0", pizza: "#c0392b",
};

function stockShelf(c, x, y, w, h, kind) {
  const frozen = kind === "frozen";
  px(c, x, y, w, h, frozen ? "#9ac8e8" : "#8a8d99");
  px(c, x, y + h - 2, w, 2, "rgba(0,0,0,0.25)");
  const levels = h >= 28 ? 3 : 2;
  const top = h >= 28 ? 8 : 0;                                  // islands get a label strip on top
  const lh = Math.floor((h - 2 - top) / levels);
  if (top) {
    px(c, x, y, w, top, SHELF_COLORS[kind]);
    c.font = "bold 6px monospace"; c.textAlign = "center"; c.fillStyle = "#ffffff";
    c.fillText(SHELF_LABELS[kind], x + w / 2, y + 6);
  }
  const icons = PRODUCTS[kind];
  for (let l = 0; l < levels; l++) {
    const ly = y + top + 1 + l * lh;
    px(c, x + 1, ly, w - 2, lh - 1, frozen ? "#e6f4ff" : "#cfd2dc");
    px(c, x + 1, ly + lh - 2, w - 2, 1, frozen ? "#7ab0d0" : "#6b6f7c");
    for (let ix = x + 3, k = 0; ix < x + w - 5; ix += 6, k++) {
      icons[(k + l * 2 + hash(x, y, k) % 2) % icons.length](c, ix, ly + lh - 8);
    }
  }
}

function buildSupermarket() {
  const g = makeGrid("e");
  border(g, "B");
  SHELVES.forEach(([x, y, w, h]) => fillRect(g, x, y, w, h, "B"));
  fillRect(g, 11, 9, 4, 1, "B");                                        // checkout counter
  g[11][9] = "e"; g[11][10] = "e";                                      // way out
  return g;
}

function decorSupermarket(c) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    px(c, x * T, y * T, T, T, (x + y) % 2 ? "#e8e6df" : "#d3d0c6");
  }
  px(c, 0, 0, COLS * T, T, "#4a4f5e");                                  // the back wall with the aisle signs
  px(c, 0, T - 2, COLS * T, 2, "#2a2d38");
  SHELVES.forEach(([sx, sy, sw, sh, kind]) => {
    stockShelf(c, sx * T, sy * T, sw * T, sh * T, kind);
    if (sy === 1) {                                                     // hanging sign on the wall above the shelf
      px(c, sx * T + 4, 3, sw * T - 8, 9, SHELF_COLORS[kind]);
      c.font = "bold 6px monospace"; c.textAlign = "center"; c.fillStyle = "#ffffff";
      c.fillText(SHELF_LABELS[kind], sx * T + sw * T / 2, 10);
    }
  });
  px(c, 11 * T, 9 * T, 4 * T, T, "#7a4a24");                            // checkout counter and register
  px(c, 11 * T, 9 * T, 4 * T, 3, "#9a6a3a");
  px(c, 12 * T + 4, 9 * T - 5, 10, 6, "#3c3f4f"); px(c, 12 * T + 6, 9 * T - 4, 6, 3, "#7cf0a0");
  px(c, 13 * T + 8, 9 * T + 4, 5, 6, "#ffd23f"); px(c, 13 * T + 9, 9 * T + 6, 3, 1, "#c8a020");   // a bag of snacks at the till
  px(c, 9 * T, 10 * T + 4, 2 * T, 12, "#3a6fe0");                       // entrance mat
  px(c, 17 * T, 8 * T + 2, 24, 10, "#8a5a2c"); px(c, 17 * T + 1, 8 * T + 3, 22, 3, "#a8743a");   // a stack of baskets
  [0, 6, 12].forEach((k) => px(c, 17 * T + 2 + k, 8 * T - 2, 5, 4, "#e0463c"));
}

// ---- Pleasant Park ----

function buildPleasantPark() {
  const g = makeGrid("g");
  border(g, "t");
  fillRect(g, 0, 5, COLS, 2, "r");
  fillRect(g, 9, 0, 2, ROWS, "r");
  [[1, 1, 5, 4], [6, 2, 3, 3], [12, 1, 5, 4]].forEach(([x, y, w, h]) => fillRect(g, x, y, w, h, "B"));
  fillRect(g, 13, 7, 5, 1, "B");                                        // bleachers
  g[5][0] = "r"; g[6][0] = "r"; g[5][19] = "r"; g[6][19] = "r";
  g[0][9] = "r"; g[0][10] = "r"; g[11][9] = "r"; g[11][10] = "r";
  g[1][18] = "a"; g[2][18] = "q"; g[8][2] = "o"; g[10][7] = "q"; g[2][11] = "a";
  [[0, 3, "a"], [0, 7, "q"], [0, 14, "a"], [11, 3, "q"], [11, 6, "a"], [11, 14, "q"], [11, 17, "a"],   // fruit trees along the sides
    [2, 0, "a"], [9, 0, "q"], [3, 19, "q"], [9, 19, "a"], [8, 0, "a"]].forEach(([y, x, ch]) => { g[y][x] = ch; });
  fillRect(g, 3, 8, 3, 2, "B");                                         // the gazebo
  fillRect(g, 1, 10, 4, 1, "h");
  return g;
}

function decorPleasantPark(c) {
  px(c, 0, 5 * T - 2, COLS * T, 2, "#cfcbc0"); px(c, 0, 7 * T, COLS * T, 2, "#cfcbc0");   // sidewalks
  px(c, 9 * T - 2, 0, 2, 5 * T, "#cfcbc0"); px(c, 11 * T, 0, 2, 5 * T, "#cfcbc0");
  for (let x = 0; x < COLS * T; x += 16) px(c, x + 2, 6 * T - 1, 10, 2, "#f4f4f4");
  for (let y = 0; y < ROWS * T; y += 16) { if (y < 5 * T || y > 7 * T) px(c, 10 * T - 1, y + 2, 2, 10, "#f4f4f4"); }
  // the three houses, like the real ones: red brick with a grey roof, a grey one, a yellow one with a brown roof
  suburbanHouse(c, 1 * T, 1 * T, 5 * T, 4 * T - 6, { roof: "#6a6f7d", roofDark: "#565b69", wall: "#b86b52", wallDark: "#8a4d3a", brick: true, door: 2 * T + 4, shutter: "#e8e4d8" });
  picketFence(c, 1 * T, 5 * T - 6, 5 * T, "#d8dde6");
  suburbanHouse(c, 6 * T, 2 * T, 3 * T, 3 * T - 6, { roof: "#8a909c", roofDark: "#6e7480", wall: "#d8dde6", wallDark: "#b0b6c4", door: 18, shutter: "#6a7d99" });
  picketFence(c, 6 * T, 5 * T - 6, 3 * T, "#c5cde0");
  suburbanHouse(c, 12 * T, 1 * T, 5 * T, 4 * T - 6, { roof: "#8a5a3a", roofDark: "#6e4529", wall: "#e8c14a", wallDark: "#c09a2e", door: 2 * T + 4, shutter: "#8a5a3a" });
  picketFence(c, 12 * T, 5 * T - 6, 5 * T, "#8a5a3a");
  gazebo(c, 3 * T, 8 * T);
  footballPitch(c, 11 * T, 8 * T, 8 * T, 3 * T);                                          // the pitch: the circle is in its middle
  bleachers(c, 13 * T, 7 * T, 5 * T);
}

// ---- Polar Peak ----

const MOUNTAIN_PATH = [[7, 10], [6, 10], [5, 10], [4, 10], [4, 9], [4, 8], [5, 8], [6, 8],
  [6, 7], [6, 6], [5, 6], [4, 6], [3, 6], [3, 5]];

function buildPolarPeak() {
  const g = makeGrid("n");
  border(g, "i");
  fillRect(g, 0, 0, COLS, 1, "X");
  fillRect(g, 8, 0, 4, 1, "x");
  fillRect(g, 12, 1, 6, 4, "K");
  fillRect(g, 8, 1, 4, 4, "k");
  fillRect(g, 0, 1, 1, 2, "n"); fillRect(g, 19, 5, 1, 2, "n"); fillRect(g, 9, 11, 2, 1, "n");
  // the mountain: solid, except for the winding path up to the summit
  const top = { 1: 6, 2: 4, 3: 3, 4: 4, 5: 5, 6: 5, 7: 6 };      // closed above and beside the path: the only way up starts at the bottom
  Object.entries(top).forEach(([x, y0]) => { for (let y = y0; y <= 10; y++) g[y][Number(x)] = "B"; });
  MOUNTAIN_PATH.forEach(([x, y]) => { g[y][x] = "k"; });
  g[10][14] = "i"; g[8][13] = "i"; g[9][16] = "i";
  g[7][12] = "s";                                                   // the only sign left: the storm warning
  return g;
}

function pine(c, x, y, h) {                                       // a snowy pine tree, (x, y) = its foot
  px(c, x - 1, y - 3, 3, 4, "#5b3418");
  for (let r = 0; r < h; r++) {
    const half = 2 + Math.floor(r * 0.7);
    px(c, x - half, y - 3 - h + r + 2, half * 2 + 1, 1, r % 3 === 0 ? "#f4f9ff" : r % 3 === 1 ? "#2c7a4a" : "#1f5f38");
  }
}

function decorPolarPeak(c) {
  const poly = (points, color) => {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath(); c.fill();
  };
  // the big icy mountain in the bottom-left
  poly([[16, 96], [32, 64], [48, 48], [64, 64], [80, 80], [96, 96], [112, 112], [128, 122], [128, 176], [16, 176]], "#8d95a8");
  poly([[48, 48], [64, 64], [80, 80], [96, 96], [112, 112], [128, 122], [128, 176], [60, 176], [58, 100]], "#6f7790");
  poly([[32, 64], [48, 48], [64, 64], [74, 72], [64, 74], [56, 66], [48, 78], [40, 68], [34, 76]], "#f4f9ff");
  for (let k = 0; k < 14; k++) {
    const x = 20 + hash(k, 1, 5) % 104, y = 100 + hash(k, 2, 5) % 70;
    px(c, x, y, 6 + (k % 3) * 3, 2, k % 2 ? "#b7d6ef" : "#aab3c7");
  }
  px(c, 22, 150, 10, 3, "#e8f2ff"); px(c, 88, 140, 12, 3, "#e8f2ff");
  pine(c, 26, 170, 8); pine(c, 110, 172, 9); pine(c, 120, 150, 6); pine(c, 18, 118, 6);
  // the path winding up: stone steps with a rope handrail
  MOUNTAIN_PATH.forEach(([x, y], i) => {
    const next = MOUNTAIN_PATH[i + 1] || MOUNTAIN_PATH[i - 1];
    const horizontal = next[1] === y;                                    // walking left/right: the steps are vertical
    px(c, x * T, y * T, T, T, "#cdbd96");
    for (let k = 0; k < 4; k++) {
      if (horizontal) { px(c, x * T + k * 4, y * T, 3, T, "#e8dcc0"); px(c, x * T + k * 4 + 3, y * T, 1, T, "#9c8a64"); }
      else { px(c, x * T, y * T + k * 4, T, 3, "#e8dcc0"); px(c, x * T, y * T + k * 4 + 3, T, 1, "#9c8a64"); }
    }
    px(c, x * T, y * T + T - 1, T, 1, "#7a6a48");
    if (i % 2 === 0) { px(c, x * T + 1, y * T + 1, 1, 6, "#7a4a24"); px(c, x * T + 14, y * T + 9, 1, 6, "#7a4a24"); }   // rope posts
  });
  for (let x = 12; x < 18; x++) px(c, x * T, 1 * T, 3, 4, "#3f4460");   // castle ruins on the right
  [12, 14, 16].forEach((x) => { px(c, x * T + 2, 1 * T - 6, 6, 6, "#555b78"); px(c, x * T + 10, 1 * T - 6, 4, 6, "#555b78"); });
  px(c, 13 * T + 4, 3 * T + 4, 10, 12, "#2a2d3c");
}

// ---- the Storm: a valley with a crumbled bridge, the llama on the far side ----

const STORM_EDGE = [[8, 5], [8, 6]];     // the tiles at the edge of the valley (the jump)

function buildStorm() {
  const g = makeGrid("F");
  border(g, "Q");
  g[5][0] = "F"; g[6][0] = "F";                                   // the way back out (an arrow on the left edge)
  fillRect(g, 8, 1, 4, 10, "V");                                  // the valley
  fillRect(g, 5, 5, 3, 2, "P"); fillRect(g, 12, 5, 3, 2, "P");    // what is left of the bridge
  [[2, 1, "T"], [3, 3, "T"], [9, 6, "T"], [10, 5, "T"], [1, 5, "O"], [2, 6, "O"], [6, 1, "O"], [9, 7, "O"],
    [3, 16, "T"], [8, 17, "T"], [2, 13, "O"], [9, 13, "O"], [7, 17, "O"], [4, 14, "O"], [10, 16, "T"]].forEach(([y, x, ch]) => { g[y][x] = ch; });
  return g;
}

function decorStorm(c) {
  // the chasm: darker and darker the deeper it goes, with fog at the bottom
  const bands = ["#1d0f40", "#180c36", "#130a2c", "#0e0722", "#0a051a", "#070312"];
  bands.forEach((color, i) => px(c, 8 * T, 1 * T + i * 27, 4 * T, 28, color));
  for (let k = 0; k < 9; k++) {
    const x = 8 * T + 4 + hash(k, 1, 8) % 56, y = 20 + hash(k, 2, 8) % 140;
    px(c, x, y, 3 + k % 3, 1, "#3b1f78");
  }
  [[10, 3], [30, 2], [44, 3]].forEach(([dx, w]) => px(c, 8 * T + dx, 152, w * 2, 22, "#2a1458"));   // rock spikes below
  ellipse(c, 10 * T, 165, 34, 9, "rgba(190,110,255,0.35)");
  ellipse(c, 10 * T, 160, 22, 5, "rgba(230,170,255,0.3)");
  // the bridge: broken planks, ropes and a few planks falling down
  const brokenPlank = (x, y, w, tilt) => { px(c, x, y, w, 3, "#8a5a2c"); px(c, x, y, w, 1, "#a8743a"); px(c, x + (tilt ? w : -1), y + tilt, 2, 2, "#5a3a1c"); };
  brokenPlank(8 * T - 6, 5 * T + 2, 6, 0); brokenPlank(8 * T - 4, 5 * T + 11, 4, 1);
  brokenPlank(12 * T, 5 * T + 6, 6, 1); brokenPlank(12 * T, 6 * T + 12, 5, 0);
  [[8 * T - 3, 5 * T + 5], [8 * T - 2, 6 * T + 2]].forEach(([x, y]) => px(c, x, y, 1, 20, "#b59a6a"));     // ropes hanging down
  [[12 * T + 3, 5 * T + 9], [12 * T + 5, 6 * T + 4]].forEach(([x, y]) => px(c, x, y, 1, 22, "#b59a6a"));
  px(c, 8 * T - 4, 6 * T + 21, 4, 2, "#8a5a2c"); px(c, 12 * T + 2, 6 * T + 24, 5, 2, "#8a5a2c");
  [[10 * T - 8, 110, 7], [10 * T + 6, 132, 5], [10 * T - 14, 148, 6]].forEach(([x, y, w]) => { px(c, x, y, w, 2, "#8a5a2c"); px(c, x, y, w, 1, "#a8743a"); });
  // edge of the cliffs
  px(c, 8 * T - 2, 1 * T, 2, 10 * T, "#6a3fb5"); px(c, 12 * T, 1 * T, 2, 10 * T, "#6a3fb5");
  // creepy details: bones, crystals and eyes in the dark
  [[30, 150], [60, 108], [215, 60], [270, 150]].forEach(([x, y]) => {
    px(c, x, y, 6, 1, "#e8e4d8"); px(c, x - 1, y - 1, 2, 3, "#e8e4d8"); px(c, x + 5, y - 1, 2, 3, "#e8e4d8");
  });
  [[40, 60], [96, 150], [236, 110], [286, 52]].forEach(([x, y]) => {
    px(c, x, y, 3, 9, "#b45cff"); px(c, x + 3, y + 3, 3, 6, "#8f45d8"); px(c, x - 3, y + 5, 3, 4, "#8f45d8"); px(c, x, y, 1, 9, "#e0a8ff");
  });
  px(c, 1 * T + 3, 2 * T + 3, 2, 2, "#ffe14a"); px(c, 1 * T + 8, 2 * T + 3, 2, 2, "#ffe14a");     // two eyes watching from a dead tree
  // the llama's side: a little glowing spot where it stands
  ellipse(c, 16 * T + 8, 5 * T + 14, 14, 4, "rgba(255,190,255,0.3)");
}

// The only sign left on the island: the storm warning in Polar Peak (sarcastic on purpose).
// The places themselves are described by a pop-up the first time the player enters them.
const SIGN_TEXT = {
  storm: "THE STORM. Purple, pretty and deadly, like a unicorn with a grudge. Healing items strongly recommended.",
};

// A sign. `text` is only a short name (kept as data); the page shows the long description.
function placeSign(x, y, text, dest) {
  return { x, y, text, desc: SIGN_TEXT[dest], marker: true };
}

// Exits: walking onto one of the tiles leaves the town onto the path to `dest`.
// `spawn` is where you appear when you come back from that path.
const TOWNS = {
  pleasant_park: {
    pal: PALETTES.pleasant, build: buildPleasantPark, decor: decorPleasantPark, spawn: [9, 8],
    exits: [
      { dest: "polar_peak", tiles: [[9, 0], [10, 0]], spawn: [9, 1] },
      { dest: "tilted_towers", tiles: [[19, 5], [19, 6]], spawn: [18, 5] },
      { dest: "retail_row", tiles: [[9, 11], [10, 11]], spawn: [9, 10] },
    ],
    signs: [],
    objects: [
      { x: 3, y: 4, kind: "decide", key: "looted_house", solid: true, marker: true },
      { x: 13, y: 9, kind: "npc", style: "ronaldo", name: "Ronaldo", pose: "idle", ball: 0, solid: true, marker: true,
        lines: ["SIUUUU! That's how I celebrate every goal. Even the ones against my own team. Especially those.",
                "I've scored 900 goals in my career. Zero here, because our ball is a barrel of Slurp Juice."] },
      { x: 16, y: 10, kind: "npc", style: "neymar", name: "Neymar Jr.", pose: "idle", ball: 1, solid: true, marker: true,
        lines: ["I fell over three times today. Two on purpose, one was the grass's fault. The grass owes me a penalty.",
                "The referee gave me a yellow card for diving. I said I was just checking the texture of the pitch."] },
      { x: 18, y: 9, kind: "npc", style: "neuer", name: "Neuer", pose: "idle", ball: 2, solid: true, marker: true,
        lines: ["I'm the goalkeeper AND the sweeper. Mostly I sweep up after these two.",
                "Today I saved a shot and a rocket. The rocket was harder. It had better aim than Ronaldo."] },
    ],
    football: { players: [[13, 9], [16, 10], [18, 9]] },
  },
  retail_row: {
    pal: PALETTES.retail, build: buildRetailRow, decor: decorRetailRow, spawn: [9, 8],
    exits: [
      { dest: "tilted_towers", tiles: [[0, 5], [0, 6]], spawn: [1, 5] },
      { dest: "polar_peak", tiles: [[19, 3], [19, 4]], spawn: [18, 4] },
      { dest: "pleasant_park", tiles: [[9, 11], [10, 11]], spawn: [9, 10] },
    ],
    doors: [{ tiles: [[9, 3], [10, 3]], to: "supermarket", hint: "Walk in to enter the supermarket" }],
    signs: [],
    objects: [
      { x: 6, y: 4, kind: "collect", key: "impulse_grenades", solid: true, sprite: "prop_vending_machine", marker: true },
      { x: 14, y: 8, kind: "decide", key: "danced", solid: false, marker: true },
      { x: 13, y: 8, kind: "npc", style: "peely", name: "Peely", pose: "dance", solid: true, talk: false },
      { x: 15, y: 8, kind: "npc", style: "skull", name: "Skull Trooper", pose: "dance", solid: true, talk: false },
    ],
  },
  supermarket: {
    name: "Supermarket", interior: true,
    pal: PALETTES.market, build: buildSupermarket, decor: decorSupermarket, spawn: [9, 10],
    exits: [], signs: [],
    leave: { tiles: [[9, 11], [10, 11]], to: "retail_row", spawn: [9, 4] },
    objects: [
      { x: 15, y: 9, kind: "npc", style: "cashier", name: "Cashier", pose: "idle", solid: true, marker: true,
        lines: ["Welcome! Sorry if I'm grinning. I'm just SO happy that Jensen Huang is back as NVIDIA CEO!"] },
    ],
  },
  tilted_towers: {
    pal: PALETTES.tilted, build: buildTiltedTowers, decor: decorTiltedTowers, spawn: [9, 7],
    exits: [
      { dest: "pleasant_park", tiles: [[0, 5], [0, 6]], spawn: [1, 5] },
      { dest: "retail_row", tiles: [[19, 5], [19, 6]], spawn: [18, 5] },
      { dest: "polar_peak", tiles: [[9, 0], [10, 0]], spawn: [9, 1] },
    ],
    signs: [],
    objects: [
      { x: 5, y: 8, kind: "collect", key: "chug_jug", solid: true, sprite: "prop_supply_drop", marker: true },
      { x: 15, y: 8, kind: "decide", key: "followed_tracks", solid: false, marker: true, decal: "tracks" },
    ],
  },
  polar_peak: {
    pal: PALETTES.polar, build: buildPolarPeak, decor: decorPolarPeak, spawn: [9, 8],
    exits: [
      { dest: "pleasant_park", tiles: [[0, 1], [0, 2]], spawn: [1, 1] },
      { dest: "retail_row", tiles: [[19, 5], [19, 6]], spawn: [18, 5] },
      { dest: "tilted_towers", tiles: [[9, 11], [10, 11]], spawn: [9, 10] },
    ],
    storm: { tiles: [[8, 0], [9, 0], [10, 0], [11, 0]] },
    signs: [
      placeSign(12, 7, "THE STORM", "storm"),
    ],
    objects: [
      { x: 3, y: 4, kind: "decide", key: "took_high_ground", solid: true, marker: true, decal: "lookout" },
      { x: 10, y: 2, kind: "npc", style: "referee", name: "Referee", pose: "idle", solid: true, marker: true, referee: true,
        lines: ["Whoa there, rookie! The storm does damage. 4 health every second, to be exact. If only you had a healing item…"],
        linesWithJug: ["A Chug Jug! Nice. You might even last a while in there. Good luck. I'll be right here. Far away from the storm."] },
    ],
  },
  storm: {
    pal: { floor: "F" }, build: buildStorm, decor: decorStorm, spawn: [4, 6], exits: [], signs: [],
    stormExit: { tiles: [[0, 5], [0, 6]] },                                        // the arrow on the left edge: the way back out
    objects: [
      { x: 3, y: 3, kind: "note", solid: true, marker: true },
      { x: 3, y: 8, kind: "npc", style: "tanner", name: "Sunbather", pose: "idle", solid: true, marker: true,
        lines: ["Ahh, finally some peace. I was just getting a nice tan and then — WHOOSH — the sky turned purple and started throwing lightning like a toddler with a tantrum.",
                "I'm not leaving. I paid good money for this lounger. Also, the storm gives a very even glow. Dermatologists hate it.",
                "Fun fact: I can get sunburnt, stormburnt AND lightning-burnt in one afternoon. Value for money!"] },
      { x: 4, y: 8, kind: "decor", solid: true, talk: false },
      { x: 8, y: 5, kind: "edge", solid: true, marker: true },
      { x: 8, y: 6, kind: "edge", solid: true },
      { x: 16, y: 5, kind: "decor", sprite: "llama", solid: true, talk: false },
    ],
  },
};

// ---------- sprites ----------

const SPRITE_FILES = {
  bus: "bus.png", llama: "llama.png", prop_vending_machine: "prop_vending_machine.png",
  prop_supply_drop: "prop_supply_drop.png", item_chug_jug: "item_chug_jug.png",
  item_impulse_grenades: "item_impulse_grenades.png", prop_trap: "prop_trap.png",
  drop_pleasant_park: "drop_pleasant_park.png", drop_tilted_towers: "drop_tilted_towers.png",
  drop_polar_peak: "drop_polar_peak.png", drop_retail_row: "drop_retail_row.png",
};

function loadSprites(baseUrl) {
  const sprites = {};
  Object.entries(SPRITE_FILES).forEach(([name, file]) => {
    const image = new Image();
    image.src = baseUrl + "px/" + file;
    sprites[name] = image;
  });
  return sprites;
}

// ---------- characters (16 wide, 24 tall; (x, y) is the tile they stand on) ----------

// The player: a fish-headed character (Fishstick style).
// pose: "walk" (default), "dance" (arms up, swaying), "scared" (arms up, wide eyes), "fall" (arms out,
// legs spread), "ko" (X eyes) or "wave" (waving one arm).
function drawPlayer(c, x, y, dir, step, pose, t) {
  t = t || 0;
  const top = y - 8;
  const dance = pose === "dance", scared = pose === "scared", fall = pose === "fall", ko = pose === "ko", wave = pose === "wave";
  const up = step ? 1 : 0;
  const sway = dance ? Math.round(Math.sin(t / 110) * 1.5) : 0;
  const bob = dance ? Math.abs(Math.round(Math.sin(t / 110) * 2)) : 0;
  const O = "#f2692d", OD = "#b84a14", OL = "#ff9a5a", TEAL = "#7fb7c1", TD = "#5d939d";
  const X = x + sway, Y = top - bob;
  if (fall) {
    px(c, X + 2, Y + 18, 3, 4, "#c9743a"); px(c, X + 11, Y + 18, 3, 4, "#c9743a");
    px(c, X + 1, Y + 22, 4, 2, "#5b3418"); px(c, X + 11, Y + 22, 4, 2, "#5b3418");
  } else {
    px(c, X + 4, Y + 18 + bob, 3, 4 - up, "#c9743a");
    px(c, X + 9, Y + 18 + bob, 3, 3 + up, "#c9743a");
    px(c, X + 3, Y + 22 + bob - up, 4, 2, "#5b3418");
    px(c, X + 9, Y + 21 + bob + up, 4, 2, "#5b3418");
  }
  px(c, X + 3, Y + 12, 10, 7, TEAL);
  px(c, X + 3, Y + 17, 10, 2, TD);
  px(c, X + 3, Y + 15, 10, 2, "#6b4423");
  px(c, X + 7, Y + 15, 2, 2, "#e0b43a");
  if (dir === "down" || dance || scared || fall || ko || wave) {
    px(c, X + 4, Y + 12, 1, 3, "#4f7f88"); px(c, X + 11, Y + 12, 1, 3, "#4f7f88");
    px(c, X + 4, Y + 17, 3, 2, "#8a5a2c"); px(c, X + 9, Y + 17, 3, 2, "#8a5a2c");
  }
  if (dance) {
    const flip = Math.floor(t / 220) % 2;
    px(c, X + 1, Y + (flip ? 4 : 12), 2, 7, O); px(c, X + 1, Y + (flip ? 3 : 18), 2, 2, OD);
    px(c, X + 13, Y + (flip ? 12 : 4), 2, 7, O); px(c, X + 13, Y + (flip ? 18 : 3), 2, 2, OD);
  } else if (scared) {
    px(c, X + 1, Y + 4, 2, 8, O); px(c, X + 1, Y + 3, 2, 2, OD);
    px(c, X + 13, Y + 4, 2, 8, O); px(c, X + 13, Y + 3, 2, 2, OD);
  } else if (fall) {
    px(c, X - 3, Y + 9, 6, 2, O); px(c, X - 4, Y + 8, 2, 3, OD);
    px(c, X + 13, Y + 9, 6, 2, O); px(c, X + 18, Y + 8, 2, 3, OD);
  } else if (wave) {
    px(c, X + 1, Y + 12, 2, 6, O); px(c, X + 1, Y + 17, 2, 2, OD);
    const w = Math.floor(t / 200) % 2;
    px(c, X + 13 + w, Y + 3, 2, 8, O); px(c, X + 13 + w, Y + 2, 2, 2, OD);
  } else if (dir === "left" || dir === "right") {
    px(c, X + 7, Y + 12 + up, 2, 6, O); px(c, X + 7, Y + 17 + up, 2, 2, OD);
  } else {
    px(c, X + 1, Y + 12 + up, 2, 6, O); px(c, X + 1, Y + 17 + up, 2, 2, OD);
    px(c, X + 13, Y + 12 + (1 - up), 2, 6, O); px(c, X + 13, Y + 17 + (1 - up), 2, 2, OD);
  }
  px(c, X + 3, Y + 4, 10, 8, O);
  px(c, X + 3, Y + 4, 1, 8, OD); px(c, X + 12, Y + 4, 1, 8, OD);
  px(c, X + 4, Y + 11, 8, 1, OD);
  px(c, X + 5, Y + 5, 3, 2, OL);
  px(c, X + 5, Y + 11, 6, 1, "#c9743a");
  px(c, X + 7, Y, 2, 1, "#b79a63");
  px(c, X + 4, Y + 1, 8, 3, "#a88b5a");
  px(c, X + 3, Y + 3, 10, 1, "#8a6f43");
  px(c, X + 7, Y + 1, 1, 2, "#6b5430");
  const faceDir = dance || scared || fall || ko || wave ? "down" : dir;
  if (faceDir === "down") {
    px(c, X + 3, Y + 5, 4, 4, "#fff"); px(c, X + 9, Y + 5, 4, 4, "#fff");
    if (ko) {
      [[4, 5], [10, 5]].forEach(([ex, ey]) => {            // X eyes
        px(c, X + ex, Y + ey, 1, 1, "#111"); px(c, X + ex + 2, Y + ey, 1, 1, "#111"); px(c, X + ex + 1, Y + ey + 1, 1, 1, "#111");
        px(c, X + ex, Y + ey + 2, 1, 1, "#111"); px(c, X + ex + 2, Y + ey + 2, 1, 1, "#111");
      });
      px(c, X + 5, Y + 9, 6, 2, "#f6c84c"); px(c, X + 6, Y + 10, 4, 1, "#c9962a"); px(c, X + 10, Y + 11, 2, 2, "#ff6a8a");   // tongue
    } else if (scared || fall) {
      px(c, X + 5, Y + 6, 1, 2, "#111"); px(c, X + 10, Y + 6, 1, 2, "#111");          // tiny pupils: big shock
      px(c, X + 5, Y + 9, 6, 3, "#f6c84c"); px(c, X + 6, Y + 10, 4, 1, "#7a1a1a");   // open beak
    } else {
      px(c, X + 5, Y + 6, 2, 2, "#111"); px(c, X + 9, Y + 6, 2, 2, "#111");
      px(c, X + 5, Y + 6, 1, 1, "#fff"); px(c, X + 9, Y + 6, 1, 1, "#fff");
      px(c, X + 5, Y + 9, 6, 2, "#f6c84c"); px(c, X + 5, Y + 10, 6, 1, "#c9962a");
    }
  } else if (faceDir === "left" || faceDir === "right") {
    const left = faceDir === "left";
    px(c, X + (left ? 3 : 8), Y + 5, 5, 4, "#fff");
    px(c, X + (left ? 3 : 10), Y + 6, 2, 2, "#111");
    px(c, X + (left ? 1 : 11), Y + 9, 4, 2, "#f6c84c");
    px(c, X + (left ? 1 : 11), Y + 10, 4, 1, "#c9962a");
  } else {
    px(c, X + 4, Y + 5, 8, 6, OD);
    px(c, X + 5, Y + 6, 6, 4, O);
  }
}

// Other characters, with different "skins". Heads: human, bear, hood, banana, skull, tomato, cat.
const NPC_STYLES = {
  jonesy: { head: "human", skin: "#e0a070", hair: "#5b3418", body: "#3a6fe0", pants: "#c8a96a" },
  bear: { head: "bear", skin: "#ff8fc8", body: "#ff8fc8", pants: "#e06aa8" },
  raven: { head: "hood", skin: "#6a4a9a", body: "#3a2a5a", pants: "#241a3a", accent: "#b673ff" },
  peely: { head: "banana", skin: "#ffe14a", body: "#ffe14a", pants: "#ffe14a", accent: "#7a4a24" },
  skull: { head: "skull", skin: "#f2f2f2", body: "#2b2d3a", pants: "#2b2d3a", accent: "#f2f2f2" },
  referee: { head: "human", skin: "#e0a070", hair: "#111", body: "#f4f4f4", pants: "#111", stripes: true, whistle: true },
  cashier: { head: "human", skin: "#d89060", hair: "#3a2a1a", body: "#2f9e4f", pants: "#2a3a7a", cap: "#c0392b" },
  // football stars with their real shirt numbers
  ronaldo: { head: "human", skin: "#d9a37a", hair: "#1b1010", body: "#c8102e", pants: "#0a6b3a", trim: "#0a6b3a", socks: "#c8102e", number: "7", numColor: "#ffffff" },
  neymar: { head: "human", skin: "#b9794e", hair: "#2b1b10", mohawk: "#e8c060", body: "#ffd800", pants: "#0036a8", trim: "#0a7a3a", socks: "#ffd800", number: "10", numColor: "#0a7a3a" },
  neuer: { head: "human", skin: "#e8b08a", hair: "#8a6a3a", body: "#2bb34a", pants: "#1b1b1b", trim: "#1b1b1b", socks: "#2bb34a", number: "1", numColor: "#ffffff", gloves: "#ffffff" },
  // more skins for the side stories
  renegade: { head: "human", skin: "#e0a070", hair: "#d9b66b", ponytail: true, goggles: true, bandana: "#c0392b", body: "#6b3a22", pants: "#4a3a2a", trim: "#c0392b" },
  kim: { head: "human", skin: "#d89c78", hair: "#150d0d", long: true, glasses: "#111", body: "#1b1b24", pants: "#1b1b24", earrings: "#ffd23f" },
  tomato: { head: "tomato", skin: "#e0243a", body: "#3a3a4a", pants: "#2a2a35", accent: "#2f8f3a" },
  meow: { head: "cat", skin: "#e0a860", body: "#d9a050", pants: "#6b3a22", buff: true, accent: "#fff0d8" },
};

function drawDigits(c, text, x, y, color) {
  const FONT = { 0: ["111", "101", "101", "101", "111"], 1: ["010", "110", "010", "010", "111"], 7: ["111", "001", "010", "010", "010"] };
  text.split("").forEach((ch, i) => FONT[ch].forEach((row, ry) => row.split("").forEach((bit, rx) => {
    if (bit === "1") px(c, x + i * 4 + rx, y + ry, 1, 1, color);
  })));
}

// A sunbather on a striped tanning lounger (two tiles wide).
function drawTanner(c, x, y, t) {
  const f = Math.floor(t / 700) % 2;
  px(c, x + 1, y + 13, 2, 3, "#6a6f7d"); px(c, x + 29, y + 13, 2, 3, "#6a6f7d");
  px(c, x, y + 9, 32, 4, "#fffdf0");
  for (let k = 0; k < 32; k += 6) px(c, x + k, y + 9, 3, 4, "#ff5a8a");
  px(c, x, y + 4, 10, 6, "#fffdf0");
  for (let k = 0; k < 10; k += 6) px(c, x + k, y + 4, 3, 6, "#ff5a8a");
  px(c, x, y + 13, 32, 1, "rgba(0,0,0,0.25)");
  ellipse(c, x + 6, y + 3 + f, 3, 3, "#e0a070");                    // head
  px(c, x + 2, y + 1 + f, 8, 1, "#5b3418");                          // hair
  px(c, x + 2, y + 3 + f, 8, 2, "#111"); px(c, x + 5, y + 3 + f, 1, 1, "#444");   // big sunglasses
  px(c, x + 5, y + 6 + f, 3, 1, "#ff9a8a");                          // a sunburnt nose / grin
  px(c, x + 9, y + 5 + f, 6, 4, "#e0a070");                          // chest
  px(c, x + 14, y + 6, 7, 3, "#3a8ee0"); px(c, x + 14, y + 6, 7, 1, "#6aa8ff");   // trunks
  px(c, x + 21, y + 7, 8, 2, "#e0a070"); px(c, x + 28, y + 5, 3, 4, "#e0a070");   // legs and feet
  px(c, x + 12, y + 3, 5, 5, "#ff5a8a"); px(c, x + 13, y + 4, 3, 3, "#ffd0ea");   // a drink with a little umbrella
  px(c, x + 15, y - 1, 1, 4, "#6b4423"); px(c, x + 13, y - 2, 5, 2, "#ffd23f");
}

// pose: "idle" (breathes), "dance" (arms up, sways), "kick" (swings a leg), "run" (steps)
function drawNPC(c, x, y, styleName, pose, t) {
  if (styleName === "tanner") { drawTanner(c, x, y - 4, t); return; }
  const s = NPC_STYLES[styleName];
  const top = y - 8;
  const f = Math.floor(t / 180) % 2;
  const sway = pose === "dance" ? Math.round(Math.sin(t / 130) * 2) : 0;
  const bob = pose === "dance" ? Math.abs(Math.round(Math.sin(t / 130) * 2)) : pose === "idle" ? f : pose === "run" ? f : 0;
  const X = x + sway, Y = top - bob;
  const kick = pose === "kick" && f;
  px(c, X + 4, Y + 18 + bob, 3, 4, s.pants);
  px(c, X + (kick ? 10 : 9), Y + 18 + bob, 3, kick ? 3 : 4, s.pants);
  if (s.socks) { px(c, X + 4, Y + 20 + bob, 3, 2, s.socks); px(c, X + (kick ? 10 : 9), Y + 20 + bob, 3, kick ? 1 : 2, s.socks); }
  px(c, X + 3, Y + 22 + bob, 4, 2, "#2a2a2a");
  px(c, X + (kick ? 11 : 9), Y + 21 + bob + (kick ? 0 : 1), 4, 2, "#2a2a2a");
  const torsoX = s.buff ? 2 : 3, torsoW = s.buff ? 12 : 10;
  px(c, X + torsoX, Y + 12, torsoW, 7, s.body);
  if (s.stripes) for (let k = 12; k < 19; k += 2) px(c, X + 3, Y + k, 10, 1, "#111");
  if (s.trim) { px(c, X + 3, Y + 12, 10, 1, s.trim); px(c, X + 3, Y + 12, 1, 3, s.trim); px(c, X + 12, Y + 12, 1, 3, s.trim); }
  if (s.number) drawDigits(c, s.number, X + (s.number.length === 2 ? 5 : 7), Y + 13, s.numColor);
  if (styleName === "cashier") { px(c, X + 5, Y + 12, 6, 7, "#fff"); px(c, X + 6, Y + 14, 4, 2, "#2f9e4f"); }
  if (styleName === "skull") { for (let k = 13; k < 19; k += 2) px(c, X + 5, Y + k, 6, 1, "#d8d8d8"); }
  if (styleName === "peely") { px(c, X + 5, Y + 14, 2, 2, "#c8a020"); px(c, X + 10, Y + 16, 2, 2, "#c8a020"); }
  if (styleName === "renegade") { px(c, X + 6, Y + 13, 4, 5, "#222"); px(c, X + 7, Y + 14, 2, 2, "#c0392b"); }   // a red mark on a black vest
  if (styleName === "kim") { px(c, X + 4, Y + 18, 8, 1, "#ffd23f"); }
  if (styleName === "tomato") { px(c, X + 6, Y + 13, 4, 5, "#c0392b"); }
  if (styleName === "meow") { px(c, X + 6, Y + 13, 4, 5, "#e8b868"); px(c, X + 4, Y + 15, 8, 1, "#c98a3c"); }
  const aw = s.buff ? 3 : 2;
  const armColor = s.head === "skull" ? s.body : s.skin;
  const lx = s.buff ? 0 : 1, rx = s.buff ? 13 : 13;
  px(c, X + lx, Y + (pose === "dance" && f ? 5 : 12), aw, 7, armColor);
  px(c, X + rx, Y + (pose === "dance" && !f ? 5 : 12), aw, 7, armColor);
  if (s.gloves) { px(c, X + lx, Y + 17, aw, 2, s.gloves); px(c, X + rx, Y + 17, aw, 2, s.gloves); }
  if (s.head === "banana") {
    px(c, X + 4, Y + 1, 8, 11, s.skin); px(c, X + 5, Y, 6, 2, s.skin); px(c, X + 6, Y - 1, 4, 2, s.accent);
    px(c, X + 4, Y + 1, 1, 11, "#d9b52a");
  } else if (s.head === "skull") {
    px(c, X + 3, Y + 2, 10, 9, s.skin); px(c, X + 4, Y + 11, 8, 2, s.skin);
    px(c, X + 4, Y + 11, 8, 1, "#c8c8c8");
  } else if (s.head === "bear") {
    px(c, X + 3, Y + 3, 10, 9, s.skin); px(c, X + 2, Y + 1, 4, 4, s.skin); px(c, X + 10, Y + 1, 4, 4, s.skin);
    px(c, X + 3, Y + 2, 2, 2, "#ffb6dc"); px(c, X + 11, Y + 2, 2, 2, "#ffb6dc");
    px(c, X + 6, Y + 8, 4, 3, "#ffd0ea");
  } else if (s.head === "hood") {
    px(c, X + 2, Y + 1, 12, 12, s.body); px(c, X + 4, Y + 4, 8, 7, "#150f26");
    px(c, X + 5, Y + 6, 2, 1, s.accent); px(c, X + 9, Y + 6, 2, 1, s.accent);
  } else if (s.head === "tomato") {
    ellipse(c, X + 8, Y + 6, 6, 6, s.skin); px(c, X + 4, Y + 2, 2, 2, "#ff8a8a");
    px(c, X + 5, Y - 1, 6, 2, s.accent); px(c, X + 7, Y - 2, 2, 2, s.accent); px(c, X + 3, Y, 3, 1, s.accent); px(c, X + 10, Y, 3, 1, s.accent);
  } else if (s.head === "cat") {
    px(c, X + 3, Y + 2, 10, 9, s.skin);
    px(c, X + 3, Y - 1, 3, 4, s.skin); px(c, X + 10, Y - 1, 3, 4, s.skin);
    px(c, X + 4, Y, 1, 2, "#ff9aaa"); px(c, X + 11, Y, 1, 2, "#ff9aaa");
    px(c, X + 6, Y + 7, 4, 3, s.accent); px(c, X + 7, Y + 7, 2, 1, "#c0407a");
    px(c, X + 1, Y + 7, 3, 1, "#fff"); px(c, X + 12, Y + 7, 3, 1, "#fff");
  } else {
    px(c, X + 4, Y + 3, 8, 8, s.skin);
    px(c, X + 4, Y + 1, 8, 3, s.hair);
    if (s.mohawk) px(c, X + 7, Y - 1, 2, 3, s.mohawk);
    if (s.long) { px(c, X + 3, Y + 1, 1, 12, s.hair); px(c, X + 12, Y + 1, 1, 12, s.hair); px(c, X + 4, Y, 8, 2, s.hair); }
    if (s.ponytail) { px(c, X + 12, Y + 2, 2, 7, s.hair); px(c, X + 13, Y + 8, 1, 2, s.hair); }
    if (s.cap) { px(c, X + 3, Y + 1, 10, 3, s.cap); px(c, X + 3, Y + 4, 10, 1, "#8a2a20"); }
    if (s.goggles) { px(c, X + 4, Y + 1, 8, 3, "#7cc4ff"); px(c, X + 3, Y + 2, 10, 1, "#4a3a2a"); px(c, X + 7, Y + 1, 2, 3, "#4a3a2a"); }
    if (s.bandana) px(c, X + 4, Y + 10, 8, 2, s.bandana);
    if (s.earrings) { px(c, X + 3, Y + 8, 1, 2, s.earrings); px(c, X + 12, Y + 8, 1, 2, s.earrings); }
  }
  if (s.head === "skull") {
    px(c, X + 4, Y + 5, 3, 3, "#111"); px(c, X + 9, Y + 5, 3, 3, "#111"); px(c, X + 7, Y + 8, 2, 2, "#999");
    px(c, X + 5, Y + 11, 6, 1, "#111");
  } else if (s.head === "banana" || s.head === "bear" || s.head === "human" || s.head === "tomato" || s.head === "cat") {
    if (s.glasses) {
      px(c, X + 4, Y + 5, 8, 3, s.glasses); px(c, X + 7, Y + 5, 2, 1, "#555");
    } else {
      px(c, X + 5, Y + 5, 2, 2, "#111"); px(c, X + 9, Y + 5, 2, 2, "#111");
    }
    if (s.head !== "cat") px(c, X + 6, Y + 8, 4, 1, s.head === "bear" ? "#c0407a" : "#8a4a2a");
  }
  if (s.whistle) px(c, X + 7, Y + 12, 2, 3, "#ffd23f");
}

// ---------- paths between the towns ----------
// Every pair of towns is joined by a winding path walled in by trees, rocks or bricks, so the
// player has to walk over whatever lies in the middle. Small side trails lead to funny meetings.

const TOWN_ORDER = ["pleasant_park", "tilted_towers", "retail_row", "polar_peak"];
const TOWN_NAMES = {
  pleasant_park: "PLEASANT PARK", tilted_towers: "TILTED TOWERS",
  retail_row: "RETAIL ROW", polar_peak: "POLAR PEAK",
};
const BIOMES = {
  pleasant_park: { ground: "g", path: "p", pal: "pleasant", walls: ["t", "t", "t", "o", "a", "q", "u", "h", "t"], props: ["u", "O", "L"] },
  retail_row: { ground: "e", path: "r", pal: "retail", walls: ["b", "b", "b", "b", "l", "O", "b"], props: ["O", "l", "O"] },
  tilted_towers: { ground: "e", path: "r", pal: "tilted", walls: ["b", "b", "b", "b", "l", "O", "b"], props: ["O", "l", "O"] },
  polar_peak: { ground: "n", path: "k", pal: "polar", walls: ["i", "i", "O", "i", "O"], props: ["O", "i", "O"] },
};
// The danger waits at the far end of the path (2 x 2 tiles across the whole width), so every side trail
// can be visited first, whichever way you walk. [x, y] is the top left tile of the danger.
const HAZARD_AT = { toRight: [16, 8], toLeft: [2, 3], iceToLeft: [11, 8] };
// The icy dangers must lie on the icy half of the path (the Polar Peak side), whichever way you walk.
const ICY_HAZARDS = ["H7", "H9", "H10"];

// The three places a side trail can lead to (positions are the same on every path).
const SPOTS = {
  A: { rect: [3, 0, 4, 3], npc: [5, 1], props: [[4, 0], [5, 0], [6, 0], [4, 1], [6, 1]] },
  B: { rect: [2, 5, 5, 5], npc: [3, 9], house: [2, 6, 3, 3], props: [[6, 5], [6, 9]] },
  C: { rect: [12, 4, 6, 4], npc: [15, 5], props: [[17, 4], [12, 4], [17, 7]], fire: [14, 6] },
};

// Who you meet where (2-3 per path), keyed by "left|right".
const SIDE_STORIES = {
  "pleasant_park|tilted_towers": [
    { spot: "A", style: "renegade", name: "Renegade Raider", lines: [
      "Shhh! Get down! A team of sweats is hunting me. Four of them, all in the same glowing skin, all shouting 'GG easy' at nobody.",
      "I've been in this bush for an hour. A squirrel moved in. We're splitting the rent."] },
    { spot: "B", style: "peely", name: "Peely", lines: [
      "This house has been abandoned for years. Then I moved in and ate the wallpaper. Now it's a lifestyle.",
      "I'm a banana and I'm the scariest thing in this haunted house. The ghost asked for my autograph."] },
    { spot: "C", style: "kim", name: "Kim Kardashian", lines: [
      "Oh my gosh, a fan! Quick, the lighting here is perfect. Storm in the background, drama in the foreground.",
      "I'm launching my own Slurp Juice. It's pink, it costs forty V-Bucks, and people will absolutely buy it."] },
  ],
  "pleasant_park|retail_row": [
    { spot: "A", style: "tomato", name: "Tomatohead", lines: [
      "Fruit or vegetable? Don't answer. I've had that argument with three squads today and lost.",
      "I came here to relax. A squad used me as a target. I'm feeling a bit... ripe about it."] },
    { spot: "C", style: "skull", name: "Skull Trooper", lines: [
      "I used to be scary. Now toddlers ask if I'm a Halloween decoration. I cried into my ribcage.",
      "Want to hear a spooky story? Once I paid full price for V-Bucks. TERRIFYING."] },
  ],
  "pleasant_park|polar_peak": [
    { spot: "A", style: "raven", name: "Raven", lines: [
      "I'm not edgy. I'm just misunderstood. And hooded. And slightly haunted.",
      "Birds of a feather flock together. I flock alone. It's very cost efficient."] },
    { spot: "B", style: "jonesy", name: "Jonesy", lines: [
      "I'm the default guy. Nobody ever asks about me. Not even the hazards.",
      "I tried to buy a new skin. The shop laughed and offered me a coupon for a haircut."] },
    { spot: "C", style: "meow", name: "Meowscles", lines: [
      "Do you even lift? I do. Mostly my own opinions.",
      "People ask if I'm a cat or a bodybuilder. Yes. Next question."] },
  ],
  "tilted_towers|retail_row": [
    { spot: "A", style: "bear", name: "Cuddle Team Leader", lines: [
      "Every tree needs a hug. Especially this one. It lost its job and half its branches.",
      "I once tried hugging a sweat. We don't talk about it."] },
    { spot: "C", style: "peely", name: "Peely", lines: [
      "Slip on my peel and I will NEVER let you forget it.",
      "People keep trying to peel me. Rude. I'm not that kind of banana."] },
  ],
  "tilted_towers|polar_peak": [
    { spot: "A", style: "meow", name: "Meowscles", lines: [
      "My fur is NOT rated for this weather. I'm basically a very muscular ice cube.",
      "I checked the weather. It said 'doom'. I checked again. It said 'doom, but colder'."] },
    { spot: "B", style: "skull", name: "Skull Trooper", lines: [
      "Welcome to my haunted cabin! Free hot chocolate. It's just cold chocolate, but it's the thought that counts.",
      "I'd offer you a seat, but the ghosts already took them all."] },
    { spot: "C", style: "peely", name: "Peely", lines: [
      "I slid all the way here on my own peel. 10/10, would slide again. Zero control.",
      "Is it cold or am I just very yellow? I can't tell anymore."] },
  ],
  "retail_row|polar_peak": [
    { spot: "A", style: "tomato", name: "Tomatohead", lines: [
      "I'm a frozen tomato. I'm basically a very sad popsicle.",
      "Please don't turn me into ketchup. I have a family. A very saucy family."] },
    { spot: "C", style: "kim", name: "Kim Kardashian", lines: [
      "Hot cocoa? Check. Fur-lined coat? Check. Squad? In the storm somewhere, I think.",
      "I took a selfie with a snowman. He didn't like the filter."] },
  ],
};

// What lies on the path for each hazard (kept subtle: footprints, shell casings, scorch marks...).
const HAZARD_DECALS = {
  H1: "trap", H2: "tent", H3: "launcher", H4: "sniper", H5: "smoke", H6: "launchpad",
  H7: "cracks", H8: "casings", H9: "cracks", H10: "snowpile", H11: "bush", H12: "scorch",
};

function drawHazardDecal(c, kind, sprites, at) {
  const X = at[0] * T, Y = at[1] * T;   // the 2x2 tiles where the danger waits
  const brass = "#d9a63a", dark = "rgba(30,25,20,0.55)", rnd = (i, m) => hash(i, 41, 9) % m;
  const casing = (x, y) => { px(c, X + x, Y + y, 2, 1, brass); px(c, X + x, Y + y + 1, 2, 1, "#8a6a1e"); };
  const print = (x, y) => { px(c, X + x, Y + y, 2, 3, dark); px(c, X + x + 3, Y + y + 2, 2, 3, dark); };
  if (kind === "trap") {
    const img = sprites.prop_trap;
    ellipse(c, X + 16, Y + 22, 12, 4, "rgba(0,0,0,0.25)");
    if (img && img.complete && img.naturalWidth) c.drawImage(img, X + 16 - Math.round(img.naturalWidth / 2), Y + 8);
  } else if (kind === "prints" || kind === "casings" || kind === "glint" || kind === "smoke") {
    [[3, 4], [10, 9], [5, 15], [14, 20], [8, 26], [19, 14], [24, 25]].forEach(([x, y]) => print(x, y));
    for (let i = 0; i < 8; i++) casing(3 + rnd(i, 26), 3 + rnd(i + 9, 26));
    if (kind === "smoke") { ellipse(c, X + 12, Y + 8, 7, 4, "rgba(220,220,230,0.5)"); ellipse(c, X + 20, Y + 12, 5, 3, "rgba(200,200,215,0.45)"); }
    if (kind === "glint") { px(c, X + 22, Y + 6, 1, 5, "#fff"); px(c, X + 20, Y + 8, 5, 1, "#fff"); }
    if (kind === "casings") for (let i = 0; i < 4; i++) px(c, X + 4 + rnd(i + 3, 24), Y + 4 + rnd(i + 5, 24), 3, 1, "#c0392b");
  } else if (kind === "launcher") {
    // a burnt crater with a rocket launcher and its last rocket lying in it
    ellipse(c, X + 16, Y + 17, 14, 10, "rgba(25,20,20,0.5)");
    ellipse(c, X + 16, Y + 17, 9, 6, "rgba(10,8,8,0.6)");
    [[2, 8, 5, 1], [26, 9, 4, 1], [5, 27, 6, 1], [23, 26, 5, 1], [14, 2, 1, 4], [18, 29, 1, 3], [27, 20, 3, 1]].forEach(([x, y, w, h]) => px(c, X + x, Y + y, w, h, "rgba(25,20,20,0.5)"));
    [[8, 12], [22, 13], [16, 8], [11, 22]].forEach(([x, y], i) => { px(c, X + x, Y + y, 2, 2, i % 2 ? "#ffb347" : "#e0463c"); });
    ellipse(c, X + 21, Y + 7, 4, 2, "rgba(200,200,215,0.4)"); ellipse(c, X + 24, Y + 4, 3, 2, "rgba(200,200,215,0.3)");   // a last wisp of smoke
    ellipse(c, X + 16, Y + 26, 14, 2, "rgba(0,0,0,0.35)");                       // the launcher: a long tube
    px(c, X + 4, Y + 17, 22, 6, "#4a5060"); px(c, X + 4, Y + 17, 22, 1, "#8a92a6"); px(c, X + 4, Y + 22, 22, 1, "#2a2d38");
    px(c, X + 10, Y + 17, 3, 6, "#4f7a3a"); px(c, X + 18, Y + 17, 2, 6, "#4f7a3a");
    px(c, X + 26, Y + 16, 3, 8, "#2a2d38"); px(c, X + 26, Y + 16, 3, 1, "#6a7080");      // the muzzle
    px(c, X + 1, Y + 16, 4, 8, "#2a2d38"); px(c, X + 2, Y + 17, 2, 6, "#14141c");        // the back
    px(c, X + 14, Y + 14, 5, 3, "#2a2d38"); px(c, X + 15, Y + 13, 3, 1, "#8fd4ff");      // the sight
    px(c, X + 12, Y + 23, 3, 4, "#2a2d38"); px(c, X + 16, Y + 23, 1, 3, "#2a2d38");      // the grip
    px(c, X + 4, Y + 26, 12, 3, "#aab0bd"); px(c, X + 4, Y + 26, 12, 1, "#d6dae3");      // the rocket
    px(c, X + 16, Y + 26, 3, 3, "#e0463c"); px(c, X + 2, Y + 25, 2, 5, "#7a8296");       // nose cone and fins
  } else if (kind === "sniper") {
    // a player in a ghillie suit lying flat, aiming a sniper rifle
    ellipse(c, X + 14, Y + 24, 14, 3, "rgba(0,0,0,0.3)");
    const leaf = ["#3f5a2a", "#5a7a35", "#2a3f1e", "#7a6a3a", "#4a6a2a", "#6b8a3a"];
    const suit = (cx, cy, rx, ry, n, seed) => {
      ellipse(c, X + cx, Y + cy, rx, ry, "#34502a");
      for (let i = 0; i < n; i++) {
        const a = hash(i, seed, 11) % 628 / 100, d = Math.sqrt((hash(i, seed, 12) % 100) / 100);
        px(c, Math.round(X + cx + Math.cos(a) * rx * d), Math.round(Y + cy + Math.sin(a) * ry * d), 2, 1, leaf[hash(i, seed, 13) % leaf.length]);
      }
    };
    suit(8, 20, 9, 5, 60, 1);                                                      // the body
    suit(17, 18, 5, 5, 30, 2);                                                     // the hooded head
    for (let i = 0; i < 12; i++) {                                                 // loose strands of grass and fabric
      const sx = X + 1 + hash(i, 5, 21) % 20, sy = Y + 14 + hash(i, 6, 21) % 4;
      px(c, sx, sy, 1, 3, leaf[i % leaf.length]);
    }
    px(c, X + 18, Y + 18, 3, 2, "#e8b88a"); px(c, X + 19, Y + 18, 1, 1, "#14141c");     // a bit of face and one eye
    px(c, X + 17, Y + 20, 14, 2, "#2a2d38"); px(c, X + 17, Y + 20, 14, 1, "#8a92a6");  // the rifle
    px(c, X + 15, Y + 21, 4, 3, "#5a3a1c");                                          // the stock
    px(c, X + 31, Y + 19, 1, 4, "#14141c");
    px(c, X + 21, Y + 16, 7, 4, "#1a1c26"); px(c, X + 27, Y + 17, 1, 2, "#8fd4ff");     // the scope
    px(c, X + 24, Y + 22, 1, 4, "#2a2d38"); px(c, X + 28, Y + 22, 1, 4, "#2a2d38");     // the little legs of the rifle
  } else if (kind === "scorch") {
    ellipse(c, X + 16, Y + 16, 13, 9, "rgba(25,20,20,0.5)");
    ellipse(c, X + 16, Y + 16, 8, 5, "rgba(10,8,8,0.55)");
    px(c, X + 9, Y + 20, 5, 2, "#c0392b"); px(c, X + 20, Y + 10, 4, 2, "#8a8f9c"); px(c, X + 12, Y + 9, 2, 2, "#ffb347");
  } else if (kind === "wires") {
    px(c, X + 2, Y + 14, 28, 1, "#6a6f7d"); px(c, X + 6, Y + 20, 22, 1, "#6a6f7d");
    px(c, X + 21, Y + 6, 6, 5, "#7a4a24"); px(c, X + 22, Y + 7, 2, 2, "#e0463c");
  } else if (kind === "cracks") {
    const col = "rgba(40,60,90,0.55)";
    [[2, 8, 10, 3], [12, 11, 8, 4], [20, 15, 9, 3], [6, 20, 12, 3], [14, 24, 10, 2]].forEach(([x, y, w, h]) => {
      px(c, X + x, Y + y, w, 1, col); px(c, X + x + w, Y + y, 1, h, col);
    });
  } else if (kind === "snowpile") {
    ellipse(c, X + 12, Y + 22, 12, 6, "#ffffff"); ellipse(c, X + 22, Y + 12, 8, 5, "#f4f9ff");
    px(c, X + 6, Y + 16, 4, 3, "#8a8f9c"); px(c, X + 24, Y + 20, 3, 3, "#6f7790");
  }
}

// A head that looks out of its hiding place. look: -1 left, 0 straight, 1 right.
function peeker(c, x, y, look, helmet, shine) {
  px(c, x, y, 8, 8, "#e8b88a");
  px(c, x - 1, y - 1, 10, 5, helmet); px(c, x - 1, y - 1, 10, 1, shine);
  px(c, x + 1, y + 3, 6, 1, "#1b1030");
  [1, 5].forEach((ex) => {
    px(c, x + ex, y + 4, 2, 2, "#ffffff");
    px(c, x + ex + (look > 0 ? 1 : 0), y + 4 + (look === 0 ? 1 : 0), 1, 1, "#1b1030");
  });
  px(c, x + 3, y + 7, 2, 1, "#a05a3a");
}

// The hazards that move: the camper in the tent, the player in the bush and the glint of the sniper's scope.
function drawHazardLive(c, kind, at, t) {
  const X = at[0] * T, Y = at[1] * T, sec = t / 1000;
  if (kind === "tent") {
    const ph = sec % 5.2;
    const out = ph < 2.2 ? 0 : ph < 2.6 ? (ph - 2.2) / 0.4 : ph < 3.6 ? 1 : ph < 4.0 ? 1 - (ph - 3.6) / 0.4 : 0;
    ellipse(c, X + 16, Y + 28, 15, 3, "rgba(0,0,0,0.3)");
    for (let y = 4; y <= 27; y++) {                                         // the canvas
      const half = Math.round((y - 4) * 15 / 23);
      px(c, X + 16 - half, Y + y, half, 1, "#4a9a44"); px(c, X + 16, Y + y, half + 1, 1, "#2f6e30");
      if (y % 6 === 0 && half > 3) { px(c, X + 16 - half + 2, Y + y, 3, 1, "#3a8038"); px(c, X + 16 + half - 4, Y + y, 3, 1, "#245a28"); }   // patches
    }
    px(c, X + 16, Y + 4, 1, 23, "#1f4a22");                                 // the ridge
    px(c, X + 2, Y + 26, 28, 2, "#6b4a2a");                                 // the ground sheet
    for (let y = 12; y <= 27; y++) {                                        // the open entrance
      const half = Math.round((y - 12) * 7 / 15);
      px(c, X + 16 - half, Y + y, half * 2 + 1, 1, "#16120e");
      px(c, X + 15 - half, Y + y, 1, 1, "#8ed07a"); px(c, X + 17 + half, Y + y, 1, 1, "#8ed07a");   // the folded-back flaps
    }
    if (out > 0) {                                                          // a head pops out, looks around, ducks back in
      c.save(); c.beginPath(); c.rect(X, Y, 32, 27); c.clip();
      const look = out < 1 ? 0 : Math.floor((ph - 2.6) / 0.5) % 2 ? 1 : -1;
      peeker(c, X + 12 + look, Y + 27 - Math.round(10 * smoothStep(out)), look, "#e0463c", "#ff8a7a");
      c.restore();
    }
    px(c, X + 16, Y, 1, 5, "#8a5a2c");                                      // pole with a waving pennant
    px(c, X + 17, Y, 4 + (Math.floor(sec * 4) % 2), 3, "#e0463c");
    [[1, 27], [29, 27]].forEach(([x, y]) => px(c, X + x, Y + y, 2, 2, "#6b4a2a"));                  // pegs and ropes
  } else if (kind === "bush") {
    const ph = sec % 6.4;
    const up = ph < 1.6 ? 0 : ph < 2.1 ? (ph - 1.6) / 0.5 : ph < 4.4 ? 1 : ph < 4.9 ? 1 - (ph - 4.4) / 0.5 : 0;
    ellipse(c, X + 16, Y + 29, 14, 3, "rgba(0,0,0,0.3)");
    if (up > 0) {                                                           // the head, behind the leaves
      const look = up < 1 ? 0 : ph < 2.9 ? -1 : ph < 3.7 ? 1 : ph < 4.1 ? -1 : 0;
      peeker(c, X + 12 + look, Y + 17 - Math.round(16 * smoothStep(up)), look, "#3a6fe0", "#8fb4ff");
    }
    ellipse(c, X + 16, Y + 21, 15, 9, "#1f5a2c");                           // the bush
    ellipse(c, X + 9, Y + 19, 9, 8, "#2b7a38"); ellipse(c, X + 23, Y + 19, 9, 8, "#2b7a38");
    ellipse(c, X + 16, Y + 16, 10, 8, "#35893f");
    ellipse(c, X + 12, Y + 14, 4, 3, "#56b64f"); ellipse(c, X + 21, Y + 17, 3, 2, "#56b64f"); ellipse(c, X + 7, Y + 21, 3, 2, "#56b64f");
    for (let i = 0; i < 26; i++) px(c, X + 4 + hash(i, 3, 5) % 25, Y + 11 + hash(i, 4, 5) % 15, 2, 1, i % 3 ? "#7fd35a" : "#17491f");   // leaves
    px(c, X + 19, Y + 21, 2, 2, "#e0463c"); px(c, X + 8, Y + 24, 2, 2, "#e0463c");                                        // a few berries
  } else if (kind === "launchpad") {
    drawLaunchPad(c, X, Y, sec);
  } else if (kind === "sniper") {
    const ph = sec % 2.6;
    if (ph < 0.3) {                                                         // the scope catches the light
      const x = X + 27, y = Y + 17;
      px(c, x - 3, y, 7, 1, "#ffffff"); px(c, x, y - 3, 1, 7, "#ffffff"); px(c, x - 1, y - 1, 3, 3, "#fff7b0");
    }
  }
}

// The Launch Pad (a Fortnite classic): a steel base with hazard stripes, springs at the sides, a glowing teal pad with
// white arrows rushing upwards and a column of light. (X, Y) = top left of its 32 x 32 tile, sec = time in seconds.
// The same drawing is used on the path, on the danger card, in the death film and on the elimination card.
function drawLaunchPad(c, X, Y, sec, o) {
  o = o || {};
  const pulse = 0.5 + 0.5 * Math.sin(sec * 5);
  if (!o.noBeam) {                                                                       // the column of light
    for (let seg = 0; seg < 9; seg++) {
      const a = (0.3 * (1 - seg / 9) * (0.7 + 0.3 * pulse)).toFixed(2);
      c.fillStyle = "rgba(122,240,224," + a + ")"; c.fillRect(X + 9, Y + 15 - (seg + 1) * 5, 14, 6);
      c.fillStyle = "rgba(210,255,248," + (a * 0.7).toFixed(2) + ")"; c.fillRect(X + 13, Y + 15 - (seg + 1) * 5, 6, 6);
    }
    for (let k = 0; k < 6; k++) px(c, X + 10 + (hash(k, 1, 4) % 12), Math.round(Y + 12 - ((sec * 22 + k * 9) % 44)), 1, 2, k % 2 ? "#fff" : "#7af0e0");   // sparks rising
  }
  ellipse(c, X + 16, Y + 28, 15, 3, "rgba(0,0,0,0.35)");
  ellipse(c, X + 16, Y + 20, 19, 8, "rgba(56,224,204," + (0.15 + 0.12 * pulse).toFixed(2) + ")");                       // glow on the ground
  px(c, X + 1, Y + 18, 30, 9, "#23262f"); px(c, X + 1, Y + 18, 30, 1, "#5a5f6e"); px(c, X + 1, Y + 25, 30, 2, "#14151b");
  for (let k = 0; k < 7; k++) px(c, X + 2 + k * 4, Y + 25, 2, 2, k % 2 ? "#14151b" : "#f4c542");                         // hazard stripes along the front
  px(c, X + 2, Y + 14, 3, 8, "#8a8f9c"); px(c, X + 27, Y + 14, 3, 8, "#8a8f9c");                                         // the springs
  [16, 18, 20].forEach((yy) => { px(c, X + 2, Y + yy, 3, 1, "#4a4f5e"); px(c, X + 27, Y + yy, 3, 1, "#4a4f5e"); });
  px(c, X + 2, Y + 14, 3, 1, "#d0d4de"); px(c, X + 27, Y + 14, 3, 1, "#d0d4de");
  ellipse(c, X + 16, Y + 19, 14, 6, "#3a3f4c"); ellipse(c, X + 16, Y + 19, 12, 5, "#171a22");                            // the rim
  ellipse(c, X + 16, Y + 19, 11, 4, "#18a898"); ellipse(c, X + 16, Y + 19, 8, 3, "#38e0cc"); ellipse(c, X + 16, Y + 18, 5, 2, "#a8fff0");   // the glowing pad
  [[4, 22], [26, 22]].forEach(([bx, by]) => { px(c, X + bx, Y + by, 2, 2, "#9aa0ae"); px(c, X + bx, Y + by, 1, 1, "#e8ecf4"); });     // bolts
  for (let i = 0; i < 3; i++) {                                                                                            // white arrows rushing up
    const ph = (sec * 1.4 + i / 3) % 1, cy = Y + 21 - ph * 15;
    c.globalAlpha = Math.sin(Math.PI * ph);
    for (let k = 0; k < 5; k++) { px(c, X + 16 - k - 1, Math.round(cy) + k, 2, 1, "#ffffff"); px(c, X + 15 + k, Math.round(cy) + k, 2, 1, "#ffffff"); }
    c.globalAlpha = 1;
  }
}

// More texture for the paths between the places: flowers and tall grass in the meadow, cracks, puddles, manholes
// and bullet holes in town, footprints, drifts and icicles in the mountains, plus shadows next to every tree, wall
// and boulder. Drawn once with the path; what moves (leaves, steam, snow...) is drawn by the page every frame.
function pathTexture(c, g, isOpen, palOf) {
  const open = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !SOLID_TILES.has(g[y][x]);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = g[y][x], pal = palOf(x), r = hash(x, y, 51), X = x * T, Y = y * T;
      if (!SOLID_TILES.has(ch)) {                                                                  // ground you can walk on
        if (pal === "pleasant") {
          if (r % 5 === 0) { px(c, X + 4 + r % 9, Y + 7 + (r >>> 3) % 7, 1, 3, "#3f8a30"); px(c, X + 3 + r % 9, Y + 5 + (r >>> 3) % 7, 3, 3, ["#ffe14a", "#ff8fc8", "#ffffff", "#ffb347"][(r >>> 6) % 4]); px(c, X + 4 + r % 9, Y + 6 + (r >>> 3) % 7, 1, 1, "#c0602a"); }
          if (r % 7 === 1) { px(c, X + 2 + r % 10, Y + 9, 1, 5, "#3f8a30"); px(c, X + 4 + r % 10, Y + 8, 1, 6, "#5aa238"); px(c, X + 6 + r % 10, Y + 10, 1, 4, "#3f8a30"); }
          if (ch === "p" && r % 6 === 2) { px(c, X + 3, Y + 4, 2, 3, "rgba(70,45,20,0.4)"); px(c, X + 8, Y + 9, 2, 3, "rgba(70,45,20,0.4)"); }       // footprints on the dirt
          if (ch === "p" && r % 13 === 5) { ellipse(c, X + 8, Y + 9, 5, 2, "rgba(100,150,200,0.45)"); px(c, X + 6, Y + 8, 3, 1, "rgba(230,245,255,0.7)"); }   // a puddle
        } else if (pal === "polar") {
          if (r % 6 === 0) { px(c, X + 3, Y + 4, 2, 3, "rgba(120,150,190,0.55)"); px(c, X + 9, Y + 9, 2, 3, "rgba(120,150,190,0.55)"); }               // footprints in the snow
          if (r % 8 === 3) { px(c, X + 5, Y + 6, 5, 1, "#ffffff"); px(c, X + 7, Y + 4, 1, 5, "#ffffff"); }                                        // a glint on the ice
          if (r % 9 === 4) { ellipse(c, X + 8, Y + 11, 6, 2, "#ffffff"); ellipse(c, X + 6, Y + 10, 3, 1, "#f4f9ff"); }                              // a little drift
        } else {                                                                                   // the street
          if (r % 11 === 0) ellipse(c, X + 8, Y + 9, 5, 3, "rgba(20,20,30,0.2)");                                                                 // an oil stain
          if (r % 23 === 3) { ellipse(c, X + 8, Y + 8, 6, 4, "#3a3d4a"); ellipse(c, X + 8, Y + 8, 4, 3, "#2a2d38"); px(c, X + 4, Y + 8, 8, 1, "#4a4f5e"); px(c, X + 8, Y + 5, 1, 6, "#4a4f5e"); }   // a manhole
          if (r % 29 === 5) { ellipse(c, X + 8, Y + 9, 6, 3, "rgba(120,170,220,0.5)"); px(c, X + 5, Y + 8, 4, 1, "rgba(230,245,255,0.75)"); }       // a puddle
          if (r % 31 === 7) { px(c, X + 6, Y + 7, 2, 2, "#14151b"); px(c, X + 5, Y + 6, 4, 1, "rgba(255,255,255,0.2)"); px(c, X + 10, Y + 10, 2, 2, "#14151b"); }   // bullet holes
          if (r % 37 === 9) { px(c, X + 2, Y + 3, 12, 1, "rgba(255,255,255,0.25)"); px(c, X + 2, Y + 4, 12, 1, "rgba(0,0,0,0.2)"); }              // a crack
        }
      } else {                                                                                     // walls, trees and rocks
        if (open(x + 1, y)) px(c, X + T - 1, Y + 3, 5, T - 3, "rgba(0,0,0,0.13)");                 // shadows on the open ground next to them
        if (open(x, y + 1)) { ellipse(c, X + 9, Y + T + 1, 8, 2, "rgba(0,0,0,0.16)"); }
        if (ch === "b") {
          if (r % 6 === 0) { px(c, X + 3, Y + 3, 10, 9, "#4a3a2e"); px(c, X + 4, Y + 4, 8, 7, r % 3 ? "#8fd0f0" : "#ffe28a"); px(c, X + 8, Y + 4, 1, 7, "#4a3a2e"); }   // a window
          else if (r % 17 === 1) { px(c, X + 3, Y + 3, 10, 9, "#f2e8c8"); px(c, X + 5, Y + 5, 6, 2, "#c0392b"); px(c, X + 5, Y + 8, 6, 1, "#3a6fe0"); }            // a poster
          else if (r % 11 === 2) { px(c, X + 2, Y + 4, 12, 2, "#ff5fa8"); px(c, X + 4, Y + 7, 8, 2, "#3ad6c0"); }                                              // graffiti
          else if (r % 13 === 3) { px(c, X + 4, Y + 4, 8, 8, "#5a5f6e"); for (let k = 0; k < 4; k++) px(c, X + 5, Y + 5 + k * 2, 6, 1, "#2a2d38"); }       // a vent
        } else if (ch === "i") {
          if (open(x, y + 1) || open(x, y - 1)) for (let k = 0; k < 3; k++) { px(c, X + 2 + k * 5, Y + T - 1, 2, 3 + (r + k) % 4, "#e8f6ff"); px(c, X + 2 + k * 5, Y + T - 1, 1, 3 + (r + k) % 4, "#ffffff"); }   // icicles
        } else if (ch === "O") {
          px(c, X + 3, Y + 3, 5, 3, "#5aa238"); px(c, X + 9, Y + 5, 3, 2, "#6ac04a");
        } else if ("toaq".includes(ch) && r % 5 === 0) {
          px(c, X + 4 + r % 7, Y + 6, 2, 2, "#e0463c");                                           // berries in the trees
        }
      }
    }
  }
}

// An old, broken-down house for the side trails (w x h in pixels).
function abandonedHouse(c, x, y, w, h, snowy) {
  const wall = "#8a7a6a", dark = "#5e5044", roof = "#4a3a30";
  px(c, x, y + 14, w, h - 14, wall);
  for (let yy = y + 18; yy < y + h; yy += 4) px(c, x, yy, w, 1, dark);
  for (let r = 0; r < 16; r++) px(c, x - 2 + Math.round((15 - r) * 0.4), y + r - 2, w + 4 - Math.round((15 - r) * 0.8), 1, r % 3 === 2 ? "#3a2c24" : roof);
  px(c, x + 8, y + 4, 6, 4, "#14100c"); px(c, x + w - 16, y + 7, 5, 3, "#14100c");              // holes in the roof
  px(c, x + w - 10, y - 4, 5, 8, "#5e2f20");                                                    // broken chimney
  [x + 6, x + w - 16].forEach((wx) => {
    px(c, wx, y + 20, 10, 12, "#2a2018"); px(c, wx, y + 22, 10, 2, "#9c8a64"); px(c, wx, y + 27, 10, 2, "#9c8a64");   // boarded window
    px(c, wx + 3, y + 20, 1, 12, "#14100c");
  });
  px(c, x + w / 2 - 5, y + h - 14, 10, 14, "#2a1d14"); px(c, x + w / 2 - 4, y + h - 13, 8, 13, "#4a3322");   // crooked door
  px(c, x + w / 2 + 1, y + h - 13, 1, 13, "#14100c");
  px(c, x + 2, y + 16, 2, 14, "#3a6a2a"); px(c, x + 3, y + 22, 2, 6, "#4a8a3a");               // creeping vines
  px(c, x + w - 4, y + 18, 2, 10, "#3a6a2a");
  if (snowy) { px(c, x - 2, y - 2, w + 4, 3, "#f4f9ff"); px(c, x + 4, y + 2, 12, 2, "#ffffff"); px(c, x + w - 18, y + 5, 10, 2, "#ffffff"); }
  px(c, x, y + h - 2, w, 2, dark);
}

function campfire(c, x, y) {
  [[0, 5], [3, 6], [6, 5], [9, 6]].forEach(([dx, dy]) => px(c, x + dx, y + dy, 3, 2, "#8a8d99"));
  px(c, x + 2, y + 5, 8, 2, "#6b4423");
  px(c, x + 4, y + 1, 4, 5, "#ff9f1c"); px(c, x + 5, y, 2, 4, "#ffd23f"); px(c, x + 5, y + 3, 2, 2, "#fff6c0");
}

// The path between two towns. The town earlier in TOWN_ORDER is on the left.
// `hazardId` is the hazard waiting on this path (null once both are survived).
function pathDefinition(a, b, hazardId) {
  const left = TOWN_ORDER.indexOf(a) < TOWN_ORDER.indexOf(b) ? a : b;
  const right = left === a ? b : a;
  const hazardAt = a === left ? HAZARD_AT.toRight : ICY_HAZARDS.includes(hazardId) ? HAZARD_AT.iceToLeft : HAZARD_AT.toLeft;   // a = where the player starts
  const L = BIOMES[left], R = BIOMES[right];
  const g = makeGrid("g");
  const biomeAt = (x) => (x < 10 ? L : R);
  const palAt = (x) => PALETTES[biomeAt(x).pal];
  const isOpen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));       // can be walked on
  const lay = (x, y, w, h, ch) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { g[yy][xx] = ch(xx); isOpen[yy][xx] = true; }
  };
  lay(0, 3, 10, 2, (x) => biomeAt(x).path);        // the left part of the path
  lay(8, 3, 2, 7, (x) => biomeAt(x).path);         // the bend
  lay(8, 8, 12, 2, (x) => biomeAt(x).path);        // the right part
  const stories = SIDE_STORIES[left + "|" + right] || [];
  const objects = [];
  const houses = [];
  stories.forEach((story) => {                      // carve the side trails
    const spot = SPOTS[story.spot];
    const [rx, ry, rw, rh] = spot.rect;
    const biome = biomeAt(rx);
    lay(rx, ry, rw, rh, () => biome.ground);
    spot.props.forEach(([px_, py_], i) => { g[py_][px_] = biome.props[i % biome.props.length]; });
    if (spot.house) {
      const [hx, hy, hw, hh] = spot.house;
      fillRect(g, hx, hy, hw, hh, "B");
      houses.push({ x: hx, y: hy, w: hw, h: hh, snowy: biome.ground === "n" });
    }
    objects.push({ x: spot.npc[0], y: spot.npc[1], kind: "npc", style: story.style, name: story.name,
      pose: "idle", solid: true, marker: true, lines: story.lines, side: true });
  });
  // everything that is not path or side trail is a solid wall of trees, bricks, rocks or ice
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isOpen[y][x]) continue;
      const walls = biomeAt(x).walls;
      g[y][x] = walls[hash(x, y, 7) % walls.length];
    }
  }
  const fires = stories.filter((st) => SPOTS[st.spot].fire).map((st) => SPOTS[st.spot].fire);
  return {
    left, right,
    pal: PALETTES[L.pal],
    palAt,
    grid: g,
    objects,
    ends: {
      [left]: { tiles: [[0, 3], [0, 4]], spawn: [1, 3] },
      [right]: { tiles: [[19, 8], [19, 9]], spawn: [18, 8] },
    },
    hazardTiles: [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => [hazardAt[0] + dx, hazardAt[1] + dy]),
    decal: hazardId ? HAZARD_DECALS[hazardId] : null,
    decalAt: hazardAt,
    hazardTown: hazardAt[0] < 10 ? left : right,                      // the town whose setting surrounds the danger
    decor(c) {
      pathTexture(c, g, isOpen, (x) => biomeAt(x).pal);
      houses.forEach((h) => abandonedHouse(c, h.x * T, h.y * T, h.w * T, h.h * T, h.snowy));
      fires.forEach(([fx, fy]) => campfire(c, fx * T + 2, fy * T + 4));
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {    // a little texture on the path
        if (!isOpen[y][x] || SOLID_TILES.has(g[y][x])) continue;
        const r = hash(x, y, 33);
        const biome = biomeAt(x);
        if (biome.path === "r" && r % 5 === 0) px(c, x * T + 2 + r % 9, y * T + 3 + (r >>> 4) % 9, 4, 1, "rgba(20,20,30,0.35)");     // cracks
        else if (biome.path === "p" && r % 4 === 0) { px(c, x * T + 3 + r % 8, y * T + 4 + (r >>> 3) % 8, 2, 1, "#a8884a"); px(c, x * T + 9, y * T + 12, 1, 1, "#f0e0b0"); }   // pebbles
        else if (biome.path === "k" && r % 5 === 0) ellipse(c, x * T + 4 + r % 8, y * T + 12, 3, 1, "#ffffff");     // snow dusting
      }
    },
    signs: [],
  };
}
