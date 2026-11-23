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
const SOLID_TILES = new Set("thfRwWDslViKXvZYCbBou".split(""));

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
    speckles(c, ox, oy, tx, ty, ["#4fae3d", "#7fd866", "#4fae3d"], 6);
    if (hash(tx, ty, 99) % 17 === 0) { px(c, ox + 7, oy + 8, 2, 2, "#ffffff"); px(c, ox + 7, oy + 8, 1, 1, "#ffd23f"); }
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
  F(c, ox, oy) { px(c, ox, oy, T, T, "#f0a6e6"); },
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
  const roofH = Math.round(h * 0.5);
  px(c, x, y + roofH, w, h - roofH, o.wall);
  px(c, x, y + h - 2, w, 2, o.wallDark || "#9a9384");
  for (let r = 0; r < roofH; r++) px(c, x - 1, y + r, w + 2, 1, r % 4 === 3 ? o.roofDark : o.roof);
  px(c, x - 1, y, w + 2, 1, "rgba(255,255,255,0.25)");
  px(c, x + w - 12, y - 4, 6, 6, "#7d3c2a");                 // chimney
  for (let wx = x + 5; wx < x + w - 8; wx += 12) {
    if (Math.abs(wx - (x + o.door)) < 9) continue;
    px(c, wx - 1, y + roofH + 3, 9, 10, "#4a3a2e");
    px(c, wx, y + roofH + 4, 7, 8, "#7cc4ff");
    px(c, wx + 3, y + roofH + 4, 1, 8, "#4a3a2e");
  }
  px(c, x + o.door - 1, y + h - 14, 10, 14, "#5b3418");
  px(c, x + o.door, y + h - 13, 8, 13, "#8a5a2c");
  px(c, x + o.door + 5, y + h - 7, 2, 2, "#ffd23f");
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

function car(c, x, y, color) {                    // 24 x 12 pixels
  px(c, x + 1, y + 4, 22, 7, color);
  px(c, x + 5, y + 1, 13, 5, color);
  px(c, x + 6, y + 2, 5, 4, "#bfe6ff");
  px(c, x + 12, y + 2, 5, 4, "#bfe6ff");
  px(c, x + 1, y + 8, 22, 1, "rgba(0,0,0,0.25)");
  px(c, x + 2, y + 9, 5, 3, "#1b1b22");
  px(c, x + 16, y + 9, 5, 3, "#1b1b22");
  px(c, x + 21, y + 5, 2, 2, "#ffe680");
}

function waterTower(c, x, y) {
  px(c, x + 3, y + 10, 2, 9, "#4a4f5e"); px(c, x + 11, y + 10, 2, 9, "#4a4f5e");
  ellipse(c, x + 8, y + 6, 8, 6, "#6a7080");
  ellipse(c, x + 6, y + 4, 4, 2, "#8a90a0");
  px(c, x + 7, y - 3, 2, 4, "#4a4f5e");
}

function footballPitch(c, x, y, w, h) {
  for (let xx = 0; xx < w; xx += 8) px(c, x + xx, y, 8, h, (xx / 8) % 2 ? "#58bd45" : "#4caf3a");
  const L = "#f4f4f4";
  px(c, x, y, w, 1, L); px(c, x, y + h - 1, w, 1, L); px(c, x, y, 1, h, L);   // outline + halfway line
  px(c, x + w - 1, y, 1, h, L);
  ellipse(c, x + 1, y + h / 2, 8, 8, L);
  ellipse(c, x + 1, y + h / 2, 7, 7, "#4caf3a");
  px(c, x, y, 1, h, L);
  px(c, x + w - 22, y + 8, 22, 1, L); px(c, x + w - 22, y + h - 9, 22, 1, L); px(c, x + w - 22, y + 8, 1, h - 16, L);
  px(c, x + w - 1, y + h / 2 - 9, 2, 1, "#ffd23f"); px(c, x + w - 1, y + h / 2 + 8, 2, 1, "#ffd23f");
  px(c, x + w, y + h / 2 - 9, 1, 18, "#ffd23f");                                 // the goal
  px(c, x + w - 4, y + h / 2 - 9, 5, 18, "rgba(255,255,255,0.35)");
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
  g[7][2] = "s"; g[7][17] = "s"; g[3][11] = "s";
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
  g[4][2] = "s"; g[4][17] = "s"; g[10][8] = "s";
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
  car(c, 2 * T + 4, 8 * T + 3, "#c0392b");
  car(c, 6 * T + 4, 10 * T + 3, "#3a6fe0");
  car(c, 16 * T + 4, 10 * T + 3, "#e0b030");
}

function buildSupermarket() {
  const g = makeGrid("e");
  border(g, "B");
  [[2, 1, 7, 2], [11, 1, 7, 2], [2, 4, 7, 2], [11, 4, 7, 2]].forEach(([x, y, w, h]) => fillRect(g, x, y, w, h, "B"));
  fillRect(g, 11, 9, 4, 1, "B");                                        // checkout counter
  g[11][9] = "e"; g[11][10] = "e";                                      // way out
  return g;
}

function decorSupermarket(c) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    px(c, x * T, y * T, T, T, (x + y) % 2 ? "#e8e6df" : "#d3d0c6");
  }
  px(c, 0, 0, COLS * T, T, "#4a4f5e");
  px(c, 0, T - 2, COLS * T, 2, "#2a2d38");
  const colors = ["#e0463c", "#f0c030", "#3a8ee0", "#4cb050", "#e07a2a", "#a050c0"];
  [[2, 1], [11, 1], [2, 4], [11, 4]].forEach(([sx, sy]) => {
    px(c, sx * T, sy * T, 7 * T, 2 * T, "#8a8d99");
    for (let row = 0; row < 2; row++) {
      px(c, sx * T + 2, sy * T + row * T + 2, 7 * T - 4, 12, "#cfd2dc");
      for (let k = 0; k < 13; k++) px(c, sx * T + 4 + k * 8, sy * T + row * T + 4, 5, 8, colors[hash(sx + k, sy + row, 2) % colors.length]);
    }
  });
  px(c, 11 * T, 9 * T, 4 * T, T, "#7a4a24");                            // checkout counter and register
  px(c, 11 * T, 9 * T, 4 * T, 3, "#9a6a3a");
  px(c, 12 * T + 4, 9 * T - 5, 10, 6, "#3c3f4f"); px(c, 12 * T + 6, 9 * T - 4, 6, 3, "#7cf0a0");
  px(c, 9 * T, 10 * T + 4, 2 * T, 12, "#3a6fe0");                       // entrance mat
  c.font = "bold 7px monospace"; c.textAlign = "center"; c.fillStyle = "#ffd23f";
  c.fillText("SUPERMARKET", COLS * T / 2, 11);
}

function buildPleasantPark() {
  const g = makeGrid("g");
  border(g, "t");
  fillRect(g, 0, 5, COLS, 2, "r");
  fillRect(g, 9, 0, 2, ROWS, "r");
  [[1, 1, 5, 4], [6, 2, 3, 3], [12, 1, 5, 4]].forEach(([x, y, w, h]) => fillRect(g, x, y, w, h, "B"));
  fillRect(g, 13, 7, 5, 1, "B");                                        // bleachers
  g[5][0] = "r"; g[6][0] = "r"; g[5][19] = "r"; g[6][19] = "r";
  g[0][9] = "r"; g[0][10] = "r"; g[11][9] = "r"; g[11][10] = "r";
  g[1][18] = "o"; g[2][18] = "o"; g[8][2] = "o"; g[10][7] = "o"; g[2][11] = "o"; g[9][5] = "u";
  fillRect(g, 1, 10, 4, 1, "h");
  g[4][17] = "s"; g[9][8] = "s"; g[1][11] = "s";
  return g;
}

function decorPleasantPark(c) {
  px(c, 0, 5 * T - 2, COLS * T, 2, "#cfcbc0"); px(c, 0, 7 * T, COLS * T, 2, "#cfcbc0");   // sidewalks
  px(c, 9 * T - 2, 0, 2, 5 * T, "#cfcbc0"); px(c, 11 * T, 0, 2, 5 * T, "#cfcbc0");
  for (let x = 0; x < COLS * T; x += 16) px(c, x + 2, 6 * T - 1, 10, 2, "#f4f4f4");
  for (let y = 0; y < ROWS * T; y += 16) { if (y < 5 * T || y > 7 * T) px(c, 10 * T - 1, y + 2, 2, 10, "#f4f4f4"); }
  suburbanHouse(c, 1 * T, 1 * T, 5 * T, 4 * T, { roof: "#6a6f7d", roofDark: "#565b69", wall: "#b86b52", wallDark: "#8a4d3a", door: 2 * T + 4 });
  suburbanHouse(c, 6 * T, 2 * T, 3 * T, 3 * T, { roof: "#7a5a46", roofDark: "#634633", wall: "#d8d2c2", door: 18 });
  suburbanHouse(c, 12 * T, 1 * T, 5 * T, 4 * T, { roof: "#8a5a3a", roofDark: "#6e4529", wall: "#e8c14a", wallDark: "#c09a2e", door: 2 * T + 4 });
  footballPitch(c, 11 * T, 8 * T, 8 * T, 3 * T);                                          // the half pitch
  bleachers(c, 13 * T, 7 * T, 5 * T);
}

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
  const top = { 1: 6, 2: 4, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };
  Object.entries(top).forEach(([x, y0]) => { for (let y = y0; y <= 10; y++) g[y][Number(x)] = "B"; });
  MOUNTAIN_PATH.forEach(([x, y]) => { g[y][x] = "k"; });
  g[10][14] = "i"; g[8][13] = "i"; g[9][16] = "i";
  g[1][2] = "s"; g[7][17] = "s"; g[9][8] = "s"; g[7][12] = "s";
  return g;
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
  MOUNTAIN_PATH.forEach(([x, y]) => {                                   // the path winding up
    px(c, x * T, y * T, T, T, "#d9c9a3");
    px(c, x * T, y * T + T - 2, T, 2, "#b5a37c");
    speckles(c, x * T, y * T, x, y, ["#c4b08a", "#e8dcc0"], 4);
  });
  for (let x = 12; x < 18; x++) px(c, x * T, 1 * T, 3, 4, "#3f4460");   // castle ruins on the right
  [12, 14, 16].forEach((x) => { px(c, x * T + 2, 1 * T - 6, 6, 6, "#555b78"); px(c, x * T + 10, 1 * T - 6, 4, 6, "#555b78"); });
  px(c, 13 * T + 4, 3 * T + 4, 10, 12, "#2a2d3c");
}

function buildStorm() {
  return makeGrid("F");
}

// What the signs say when you read them (sarcastic on purpose).
const SIGN_TEXT = {
  polar_peak: "A cold and barren wasteland with nasty surprises around every icy bend. Pack a jacket. And a will.",
  tilted_towers: "Welcome to Tilted Towers! Population: everyone who ever dropped here and instantly regretted it.",
  pleasant_park: "Pleasant Park. Lovely lawns, friendly neighbours, and at least one squad hiding in a gazebo. Nothing suspicious.",
  retail_row: "Retail Row: shop 'til you drop! Mostly the dropping part. Parking is free. Survival is not.",
  storm: "THE STORM. Purple, pretty and deadly, like a unicorn with a grudge. Healing items strongly recommended.",
  danger: "Please do not feed the hazards. (Someone crossed that out and wrote: 'Too late.')",
};

function placeSign(x, y, text, dest) {
  return { x, y, text, desc: SIGN_TEXT[dest] };
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
    signs: [
      placeSign(11, 1, "POLAR PEAK ↑", "polar_peak"),
      placeSign(17, 4, "TILTED TOWERS →", "tilted_towers"),
      placeSign(8, 9, "RETAIL ROW ↓", "retail_row"),
    ],
    objects: [
      { x: 3, y: 4, kind: "decide", key: "looted_house", solid: true, marker: true },
      { x: 13, y: 9, kind: "npc", style: "jonesy", pose: "kick", solid: true, marker: true,
        lines: ["Why do I never win? The ball keeps landing in a gazebo with a squad inside.",
                "Kicking this ball is the only thing in Pleasant Park that hasn't tried to eliminate me."] },
      { x: 15, y: 10, kind: "npc", style: "bear", pose: "run", solid: true, marker: true,
        lines: ["Don't tell the referee, but our ball is a Slurp Juice barrel. It was this or a llama.",
                "Fun fact: the goalposts have better build skills than all of us combined."] },
      { x: 18, y: 9, kind: "npc", style: "raven", pose: "idle", solid: true, marker: true,
        lines: ["I'm the goalkeeper. Saved zero goals today. Do not ask how many I let in. (Yes.)",
                "I'm only here because the storm doesn't do penalty kicks."] },
    ],
    ball: { from: [14, 9], to: [17, 9] },
  },
  retail_row: {
    pal: PALETTES.retail, build: buildRetailRow, decor: decorRetailRow, spawn: [9, 8],
    exits: [
      { dest: "tilted_towers", tiles: [[0, 5], [0, 6]], spawn: [1, 5] },
      { dest: "polar_peak", tiles: [[19, 3], [19, 4]], spawn: [18, 4] },
      { dest: "pleasant_park", tiles: [[9, 11], [10, 11]], spawn: [9, 10] },
    ],
    doors: [{ tiles: [[9, 3], [10, 3]], to: "supermarket" }],
    signs: [
      placeSign(2, 4, "← TILTED TOWERS", "tilted_towers"),
      placeSign(17, 4, "POLAR PEAK →", "polar_peak"),
      placeSign(8, 10, "PLEASANT PARK ↓", "pleasant_park"),
    ],
    objects: [
      { x: 6, y: 4, kind: "collect", key: "impulse_grenades", solid: true, sprite: "prop_vending_machine", marker: true },
      { x: 14, y: 8, kind: "decide", key: "danced", solid: false, marker: true },
      { x: 13, y: 8, kind: "npc", style: "peely", pose: "dance", solid: true, talk: false },
      { x: 15, y: 8, kind: "npc", style: "skull", pose: "dance", solid: true, talk: false },
    ],
  },
  supermarket: {
    name: "Supermarket", interior: true,
    pal: PALETTES.market, build: buildSupermarket, decor: decorSupermarket, spawn: [9, 10],
    exits: [], signs: [],
    leave: { tiles: [[9, 11], [10, 11]], to: "retail_row", spawn: [9, 4] },
    objects: [
      { x: 15, y: 9, kind: "npc", style: "cashier", pose: "idle", solid: true, marker: true,
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
    signs: [
      placeSign(2, 7, "← PLEASANT PARK", "pleasant_park"),
      placeSign(17, 7, "RETAIL ROW →", "retail_row"),
      placeSign(11, 3, "POLAR PEAK ↑", "polar_peak"),
    ],
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
      placeSign(2, 1, "← PLEASANT PARK", "pleasant_park"),
      placeSign(17, 7, "RETAIL ROW →", "retail_row"),
      placeSign(8, 9, "TILTED TOWERS ↓", "tilted_towers"),
      placeSign(12, 7, "THE STORM ↑", "storm"),
    ],
    objects: [
      { x: 3, y: 4, kind: "decide", key: "took_high_ground", solid: true, marker: true, decal: "lookout" },
      { x: 10, y: 2, kind: "npc", style: "referee", pose: "idle", solid: true, marker: true, referee: true,
        lines: ["Whoa there, rookie! The storm does damage. 5 health every second, to be exact. If only you had a healing item…"],
        linesWithJug: ["A Chug Jug! Nice. You might even last a few seconds in there. Good luck. I'll be right here. Far away from the storm."] },
    ],
  },
  storm: {
    pal: PALETTES.storm, build: buildStorm, spawn: [10, 9], exits: [], signs: [],
    objects: [
      { x: 10, y: 4, kind: "search", key: "search", solid: true, sprite: "llama", marker: true },
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
// pose: "walk" (default) or "dance" (arms up, swaying).
function drawPlayer(c, x, y, dir, step, pose, t) {
  const top = y - 8;
  const dance = pose === "dance";
  const up = step ? 1 : 0;
  const sway = dance ? Math.round(Math.sin((t || 0) / 110) * 1.5) : 0;
  const bob = dance ? Math.abs(Math.round(Math.sin((t || 0) / 110) * 2)) : 0;
  const O = "#f2692d", OD = "#b84a14", OL = "#ff9a5a", TEAL = "#7fb7c1", TD = "#5d939d";
  const X = x + sway, Y = top - bob;
  px(c, X + 4, Y + 18 + bob, 3, 4 - up, "#c9743a");
  px(c, X + 9, Y + 18 + bob, 3, 3 + up, "#c9743a");
  px(c, X + 3, Y + 22 + bob - up, 4, 2, "#5b3418");
  px(c, X + 9, Y + 21 + bob + up, 4, 2, "#5b3418");
  px(c, X + 3, Y + 12, 10, 7, TEAL);
  px(c, X + 3, Y + 17, 10, 2, TD);
  px(c, X + 3, Y + 15, 10, 2, "#6b4423");
  px(c, X + 7, Y + 15, 2, 2, "#e0b43a");
  if (dir === "down" || dance) {
    px(c, X + 4, Y + 12, 1, 3, "#4f7f88"); px(c, X + 11, Y + 12, 1, 3, "#4f7f88");
    px(c, X + 4, Y + 17, 3, 2, "#8a5a2c"); px(c, X + 9, Y + 17, 3, 2, "#8a5a2c");
  }
  if (dance) {
    const flip = Math.floor((t || 0) / 220) % 2;
    px(c, X + 1, Y + (flip ? 4 : 12), 2, 7, O); px(c, X + 1, Y + (flip ? 3 : 18), 2, 2, OD);
    px(c, X + 13, Y + (flip ? 12 : 4), 2, 7, O); px(c, X + 13, Y + (flip ? 18 : 3), 2, 2, OD);
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
  const faceDir = dance ? "down" : dir;
  if (faceDir === "down") {
    px(c, X + 3, Y + 5, 4, 4, "#fff"); px(c, X + 9, Y + 5, 4, 4, "#fff");
    px(c, X + 5, Y + 6, 2, 2, "#111"); px(c, X + 9, Y + 6, 2, 2, "#111");
    px(c, X + 5, Y + 6, 1, 1, "#fff"); px(c, X + 9, Y + 6, 1, 1, "#fff");
    px(c, X + 5, Y + 9, 6, 2, "#f6c84c"); px(c, X + 5, Y + 10, 6, 1, "#c9962a");
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

// Other characters, with different "skins".
const NPC_STYLES = {
  jonesy: { head: "human", skin: "#e0a070", hair: "#5b3418", body: "#3a6fe0", pants: "#c8a96a" },
  bear: { head: "bear", skin: "#ff8fc8", body: "#ff8fc8", pants: "#e06aa8" },
  raven: { head: "hood", skin: "#6a4a9a", body: "#3a2a5a", pants: "#241a3a", accent: "#b673ff" },
  peely: { head: "banana", skin: "#ffe14a", body: "#ffe14a", pants: "#ffe14a", accent: "#7a4a24" },
  skull: { head: "skull", skin: "#f2f2f2", body: "#2b2d3a", pants: "#2b2d3a", accent: "#f2f2f2" },
  referee: { head: "human", skin: "#e0a070", hair: "#111", body: "#f4f4f4", pants: "#111", stripes: true, whistle: true },
  cashier: { head: "human", skin: "#d89060", hair: "#3a2a1a", body: "#2f9e4f", pants: "#2a3a7a", cap: "#c0392b" },
};

// pose: "idle" (breathes), "dance" (arms up, sways), "kick" (swings a leg), "run" (steps)
function drawNPC(c, x, y, styleName, pose, t) {
  const s = NPC_STYLES[styleName];
  const top = y - 8;
  const f = Math.floor(t / 180) % 2;
  const sway = pose === "dance" ? Math.round(Math.sin(t / 130) * 2) : 0;
  const bob = pose === "dance" ? Math.abs(Math.round(Math.sin(t / 130) * 2)) : pose === "idle" ? f : 0;
  const X = x + sway, Y = top - bob;
  const kick = pose === "kick" && f;
  px(c, X + 4, Y + 18 + bob, 3, 4, s.pants);
  px(c, X + (kick ? 10 : 9), Y + 18 + bob, 3, kick ? 3 : 4, s.pants);
  px(c, X + 3, Y + 22 + bob, 4, 2, "#2a2a2a");
  px(c, X + (kick ? 11 : 9), Y + 21 + bob + (kick ? 0 : 1), 4, 2, "#2a2a2a");
  px(c, X + 3, Y + 12, 10, 7, s.body);
  if (s.stripes) for (let k = 12; k < 19; k += 2) px(c, X + 3, Y + k, 10, 1, "#111");
  if (styleName === "cashier") { px(c, X + 5, Y + 12, 6, 7, "#fff"); px(c, X + 6, Y + 14, 4, 2, "#2f9e4f"); }
  if (styleName === "skull") { for (let k = 13; k < 19; k += 2) px(c, X + 5, Y + k, 6, 1, "#d8d8d8"); }
  if (styleName === "peely") { px(c, X + 5, Y + 14, 2, 2, "#c8a020"); px(c, X + 10, Y + 16, 2, 2, "#c8a020"); }
  const armColor = s.head === "skull" ? s.body : s.skin;
  px(c, X + 1, Y + (pose === "dance" && f ? 5 : 12), 2, 7, armColor);
  px(c, X + 13, Y + (pose === "dance" && !f ? 5 : 12), 2, 7, armColor);
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
  } else {
    px(c, X + 4, Y + 3, 8, 8, s.skin);
    px(c, X + 4, Y + 1, 8, 3, s.hair);
    if (s.cap) { px(c, X + 3, Y + 1, 10, 3, s.cap); px(c, X + 3, Y + 4, 10, 1, "#8a2a20"); }
  }
  if (s.head === "skull") {
    px(c, X + 4, Y + 5, 3, 3, "#111"); px(c, X + 9, Y + 5, 3, 3, "#111"); px(c, X + 7, Y + 8, 2, 2, "#999");
    px(c, X + 5, Y + 11, 6, 1, "#111");
  } else if (s.head === "banana" || s.head === "bear" || s.head === "human") {
    px(c, X + 5, Y + 5, 2, 2, "#111"); px(c, X + 9, Y + 5, 2, 2, "#111");
    px(c, X + 6, Y + 8, 4, 1, s.head === "bear" ? "#c0407a" : "#8a4a2a");
  }
  if (s.whistle) px(c, X + 7, Y + 12, 2, 3, "#ffd23f");
}

// ---------- paths between the towns ----------
// Every pair of towns is joined by a winding path with trees, rocks or walls on
// both sides, so the player has to walk over whatever lies in the middle.

const TOWN_ORDER = ["pleasant_park", "tilted_towers", "retail_row", "polar_peak"];
const TOWN_NAMES = {
  pleasant_park: "PLEASANT PARK", tilted_towers: "TILTED TOWERS",
  retail_row: "RETAIL ROW", polar_peak: "POLAR PEAK",
};
const BIOMES = {
  pleasant_park: { ground: "g", path: "p", border: "t", pal: "pleasant" },
  retail_row: { ground: "e", path: "r", border: "b", pal: "retail" },
  tilted_towers: { ground: "e", path: "r", border: "b", pal: "tilted" },
  polar_peak: { ground: "n", path: "k", border: "i", pal: "polar" },
};
const PATH_HAZARD_TILES = [[8, 6], [9, 6], [8, 7], [9, 7]];

// What lies on the path for each hazard (kept subtle: footprints, shell casings, scorch marks...).
const HAZARD_DECALS = {
  H1: "trap", H2: "prints", H3: "scorch", H4: "glint", H5: "smoke", H6: "wires",
  H7: "cracks", H8: "casings", H9: "cracks", H10: "snowpile", H11: "prints", H12: "scorch",
};

function drawHazardDecal(c, kind, sprites) {
  const X = 8 * T, Y = 6 * T;           // the 2x2 tiles in the middle of the bend
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

// The path between two towns. The town earlier in TOWN_ORDER is on the left.
// `hazardId` is the hazard waiting on this path (null once both are survived).
function pathDefinition(a, b, hazardId) {
  const left = TOWN_ORDER.indexOf(a) < TOWN_ORDER.indexOf(b) ? a : b;
  const right = left === a ? b : a;
  const L = BIOMES[left], R = BIOMES[right];
  const g = makeGrid("g");
  const biomeAt = (x) => (x < 10 ? L : R);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g[y][x] = biomeAt(x).ground;
  const isPath = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const lay = (x, y, w, h) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { g[yy][xx] = biomeAt(xx).path; isPath[yy][xx] = true; }
  };
  lay(0, 3, 10, 2);        // the left part of the path
  lay(8, 3, 2, 7);         // the bend (the hazard lies in the middle of it)
  lay(8, 8, 12, 2);        // the right part
  // trees, rocks, walls... on both sides, so the path cannot be walked around
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isPath[y][x]) continue;
      let nearPath = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS && isPath[yy][xx]) nearPath = true;
      }
      const biome = biomeAt(x);
      const r = hash(x, y, 7) % 100;
      if (nearPath) {
        g[y][x] = biome.ground === "g" ? (r % 3 === 0 ? "h" : "t")
          : biome.ground === "n" ? "i" : (r % 4 === 0 ? "l" : "b");
      } else if (biome.ground === "g" && r < 30) g[y][x] = "t";
      else if (biome.ground === "n" && r < 12) g[y][x] = "i";
    }
  }
  g[5][2] = "s"; g[7][17] = "s"; g[6][6] = "s";
  return {
    left, right,
    pal: PALETTES[L.pal],
    grid: g,
    ends: {
      [left]: { tiles: [[0, 3], [0, 4]], spawn: [1, 3] },
      [right]: { tiles: [[19, 8], [19, 9]], spawn: [18, 8] },
    },
    hazardTiles: PATH_HAZARD_TILES,
    decal: hazardId ? HAZARD_DECALS[hazardId] : null,
    signs: [
      { x: 2, y: 5, text: "← " + TOWN_NAMES[left], desc: SIGN_TEXT[left] },
      { x: 17, y: 7, text: TOWN_NAMES[right] + " →", desc: SIGN_TEXT[right] },
      { x: 6, y: 6, text: "DANGER AHEAD", desc: SIGN_TEXT.danger },
    ],
  };
}
