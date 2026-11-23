"use strict";

// The walking world: tiles drawn in code (16x16 pixels each), the town maps,
// signposts, things you can interact with, and the player sprite.
// Nothing in here decides game rules: the server does that.

const T = 16;            // tile size in pixels (small, so everything looks chunky)
const COLS = 20;
const ROWS = 12;

// ---------- tiles ----------
// g grass  p dirt path  c stone  r road  d road with dash  n snow  k castle floor
// q dance floor  x storm gate  F storm fog   (all walkable)
// t tree  h hedge  f fence  R roof  w wall  W window  D door  s sign  l lamp  i ice
// K castle  X storm wall  v car  Z wooden roof  Y post  C clock  b brick   (all solid)
const SOLID_TILES = new Set("thfRwWDslViKXvZYCb".split(""));
// z = caution tile on a path: stepping on it starts the hazard.

function hash(x, y, n) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (n * 83492791);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function px(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
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
  r(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#555a6b");
    speckles(c, ox, oy, tx, ty, ["#4a4e5e", "#666b7d"], 5);
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
  q(c, ox, oy, tx, ty) {
    const on = (tx + ty) % 2 === 0;
    px(c, ox, oy, T, T, on ? "#ff5fa8" : "#ffd23f");
    px(c, ox, oy, T, 1, "rgba(255,255,255,0.35)");
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
  R(c, ox, oy, tx, ty, pal) {
    px(c, ox, oy, T, T, pal.roof);
    px(c, ox, oy + 3, T, 1, pal.roofDark);
    px(c, ox, oy + 7, T, 1, pal.roofDark);
    px(c, ox, oy + 11, T, 1, pal.roofDark);
    px(c, ox, oy + 15, T, 1, pal.roofDark);
    px(c, ox, oy, T, 1, "rgba(255,255,255,0.25)");
  },
  Z(c, ox, oy) {
    px(c, ox, oy, T, T, "#9a6a3a");
    for (let i = 3; i < T; i += 4) px(c, ox, oy + i, T, 1, "#7a4a24");
  },
  w(c, ox, oy, tx, ty, pal) {
    px(c, ox, oy, T, T, pal.wall);
    px(c, ox, oy + 14, T, 2, pal.wallDark);
  },
  W(c, ox, oy, tx, ty, pal) {
    TILE_DRAWERS.w(c, ox, oy, tx, ty, pal);
    px(c, ox + 3, oy + 3, 10, 9, "#4a5a7a");
    px(c, ox + 4, oy + 4, 8, 7, "#7cc4ff");
    px(c, ox + 7, oy + 4, 2, 7, "#4a5a7a");
    px(c, ox + 4, oy + 4, 3, 2, "#cfeaff");
  },
  D(c, ox, oy, tx, ty, pal) {
    TILE_DRAWERS.w(c, ox, oy, tx, ty, pal);
    px(c, ox + 3, oy + 1, 10, 15, "#5b3418");
    px(c, ox + 4, oy + 2, 8, 14, "#8a5a2c");
    px(c, ox + 10, oy + 9, 2, 2, "#ffd23f");
  },
  C(c, ox, oy, tx, ty, pal) {
    TILE_DRAWERS.R(c, ox, oy, tx, ty, pal);
    px(c, ox + 2, oy + 2, 12, 12, "#4a4f66");
    px(c, ox + 3, oy + 3, 10, 10, "#fff6d8");
    px(c, ox + 8, oy + 4, 1, 5, "#222");
    px(c, ox + 8, oy + 8, 3, 1, "#222");
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
    px(c, ox + ((ty % 2) ? 11 : 4), oy + 8, 1, 8, "#3f4460");
    px(c, ox, oy, T, 1, "#7a82a3");
  },
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
  v(c, ox, oy, tx, ty) {
    TILE_DRAWERS.r(c, ox, oy, tx, ty);
    const colors = ["#e0463c", "#3c8ee0", "#f0c030"];
    const body = colors[hash(tx, ty, 5) % colors.length];
    px(c, ox + 1, oy + 5, 14, 8, body);
    px(c, ox + 3, oy + 3, 10, 4, body);
    px(c, ox + 4, oy + 4, 3, 3, "#bfe6ff");
    px(c, ox + 9, oy + 4, 3, 3, "#bfe6ff");
    px(c, ox + 2, oy + 12, 3, 3, "#222");
    px(c, ox + 11, oy + 12, 3, 3, "#222");
  },
  z(c, ox, oy, tx, ty) {
    px(c, ox, oy, T, T, "#2b2b35");
    // diagonal yellow stripes
    c.fillStyle = "#ffd23f";
    for (let d = -T; d < T * 2; d += 8) {
      for (let y = 0; y < T; y++) {
        const x = d + y;
        if (x >= 0 && x < T) c.fillRect(ox + x, oy + y, Math.min(4, T - x), 1);
      }
    }
  },
  Y(c, ox, oy, tx, ty) {
    TILE_DRAWERS.c(c, ox, oy, tx, ty);
    px(c, ox + 6, oy, 4, T, "#7a4a24");
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
// A house: roof on top, two rows of wall (windows, then door row).
function building(g, x, y, w, h, doorX) {
  fillRect(g, x, y, w, h - 2, "R");
  for (let xx = x; xx < x + w; xx++) {
    g[y + h - 2][xx] = (xx - x) % 2 === 1 ? "W" : "w";
    g[y + h - 1][xx] = "w";
  }
  if (doorX !== null) g[y + h - 1][doorX] = "D";
}

const PALETTES = {
  pleasant: { floor: "g", roof: "#c0392b", roofDark: "#9b2c20", wall: "#f3e6c8", wallDark: "#d6c49c" },
  retail: { floor: "c", roof: "#1fa3a3", roofDark: "#14807f", wall: "#e8eef7", wallDark: "#c3ccdb" },
  tilted: { floor: "c", roof: "#6b6f80", roofDark: "#4f5362", wall: "#d9c9a3", wallDark: "#b9a77f" },
  polar: { floor: "n", roof: "#555b78", roofDark: "#3f4460", wall: "#9aa0b8", wallDark: "#80869e" },
  storm: { floor: "F", roof: "#555b78", roofDark: "#3f4460", wall: "#9aa0b8", wallDark: "#80869e" },
};

function buildPleasantPark() {
  const g = makeGrid("g");
  border(g, "t");
  fillRect(g, 9, 0, 2, ROWS, "p");          // north-south road
  fillRect(g, 10, 5, 10, 2, "p");           // road to the east
  building(g, 2, 1, 5, 5, 4);               // the house, door at (4,5)
  fillRect(g, 4, 6, 1, 2, "p");
  fillRect(g, 4, 7, 6, 1, "p");             // path from the door to the road
  fillRect(g, 13, 1, 5, 2, "Z");            // gazebo roof
  fillRect(g, 14, 3, 3, 1, "c");
  g[3][13] = "Y"; g[3][17] = "Y";
  fillRect(g, 2, 9, 6, 1, "h");
  fillRect(g, 12, 9, 6, 1, "f");
  [[13, 7], [16, 7], [3, 10], [7, 3], [12, 3], [18, 9]].forEach(([x, y]) => { if (g[y][x] === "g") g[y][x] = "t"; });
  g[2][8] = "s"; g[4][17] = "s"; g[10][11] = "s";
  return g;
}

function buildRetailRow() {
  const g = makeGrid("c");
  border(g, "b");
  fillRect(g, 9, 0, 2, 1, "c");
  fillRect(g, 9, ROWS - 1, 2, 1, "c");
  fillRect(g, 0, 5, 19, 3, "r");
  for (let x = 0; x < 19; x++) if (g[6][x] === "r") g[6][x] = "d";
  building(g, 1, 1, 6, 4, 3);
  building(g, 13, 1, 6, 4, 16);
  fillRect(g, 12, 9, 4, 2, "q");            // dance floor
  g[7][3] = "v"; g[7][15] = "v";
  g[8][6] = "l"; g[8][17] = "l"; g[4][8] = "l";
  g[3][8] = "s"; g[8][1] = "s"; g[10][8] = "s";
  return g;
}

function buildTiltedTowers() {
  const g = makeGrid("c");
  border(g, "b");
  fillRect(g, 9, 0, 2, 1, "c");
  fillRect(g, 0, 5, 20, 2, "r");
  for (let x = 0; x < 20; x++) g[5][x] = "r";
  building(g, 1, 1, 6, 4, 3);
  building(g, 13, 1, 5, 4, 15);
  g[1][15] = "C";                            // the clock tower
  g[8][10] = "h"; g[9][10] = "h"; g[9][4] = "t"; g[10][14] = "t";
  g[8][8] = "l"; g[8][17] = "l";
  g[3][8] = "s"; g[7][2] = "s"; g[7][17] = "s";
  return g;
}

function buildPolarPeak() {
  const g = makeGrid("n");
  border(g, "i");
  fillRect(g, 0, 0, COLS, 1, "X");
  fillRect(g, 8, 0, 4, 1, "x");              // the storm gate
  fillRect(g, 2, 1, 6, 4, "K");
  fillRect(g, 12, 1, 6, 4, "K");
  fillRect(g, 8, 1, 4, 4, "k");
  fillRect(g, 0, 5, 1, 2, "n");
  fillRect(g, 19, 5, 1, 2, "n");
  fillRect(g, 9, 11, 2, 1, "n");
  g[8][12] = "i"; g[9][13] = "i"; g[9][5] = "i"; g[10][15] = "i";
  g[7][2] = "s"; g[7][17] = "s"; g[9][8] = "s"; g[7][12] = "s";
  return g;
}

function buildStorm() {
  return makeGrid("F");
}

// Exits: stepping on one of the tiles asks the server to travel there.
// `spawn` is where you appear when you arrive from that place.
const TOWNS = {
  pleasant_park: {
    pal: PALETTES.pleasant, build: buildPleasantPark, spawn: [9, 7],
    exits: [
      { dest: "polar_peak", tiles: [[9, 0], [10, 0]], spawn: [9, 1] },
      { dest: "tilted_towers", tiles: [[19, 5], [19, 6]], spawn: [18, 5] },
      { dest: "retail_row", tiles: [[9, 11], [10, 11]], spawn: [9, 10] },
    ],
    signs: [
      { x: 8, y: 2, text: "POLAR PEAK ↑" },
      { x: 17, y: 4, text: "TILTED TOWERS →" },
      { x: 11, y: 10, text: "RETAIL ROW ↓" },
    ],
    objects: [
      { x: 4, y: 5, kind: "decide", key: "looted_house", solid: true, marker: true },
    ],
  },
  retail_row: {
    pal: PALETTES.retail, build: buildRetailRow, spawn: [9, 8],
    exits: [
      { dest: "tilted_towers", tiles: [[0, 5], [0, 6]], spawn: [1, 5] },
      { dest: "polar_peak", tiles: [[9, 0], [10, 0]], spawn: [9, 1] },
      { dest: "pleasant_park", tiles: [[9, 11], [10, 11]], spawn: [9, 10] },
    ],
    signs: [
      { x: 1, y: 8, text: "← TILTED TOWERS" },
      { x: 8, y: 3, text: "POLAR PEAK ↑" },
      { x: 8, y: 10, text: "PLEASANT PARK ↓" },
    ],
    objects: [
      { x: 12, y: 4, kind: "collect", key: "impulse_grenades", solid: true, sprite: "prop_vending_machine", marker: true },
      { x: 13, y: 9, kind: "decide", key: "danced", solid: false, marker: true },
    ],
  },
  tilted_towers: {
    pal: PALETTES.tilted, build: buildTiltedTowers, spawn: [9, 7],
    exits: [
      { dest: "pleasant_park", tiles: [[0, 5], [0, 6]], spawn: [1, 5] },
      { dest: "retail_row", tiles: [[19, 5], [19, 6]], spawn: [18, 5] },
      { dest: "polar_peak", tiles: [[9, 0], [10, 0]], spawn: [9, 1] },
    ],
    signs: [
      { x: 2, y: 7, text: "← PLEASANT PARK" },
      { x: 17, y: 7, text: "RETAIL ROW →" },
      { x: 8, y: 3, text: "POLAR PEAK ↑" },
    ],
    objects: [
      { x: 5, y: 8, kind: "collect", key: "chug_jug", solid: true, sprite: "prop_supply_drop", marker: true },
      { x: 15, y: 8, kind: "decide", key: "followed_tracks", solid: false, marker: true, decal: "tracks" },
    ],
  },
  polar_peak: {
    pal: PALETTES.polar, build: buildPolarPeak, spawn: [9, 8],
    exits: [
      { dest: "pleasant_park", tiles: [[0, 5], [0, 6]], spawn: [1, 5] },
      { dest: "retail_row", tiles: [[19, 5], [19, 6]], spawn: [18, 5] },
      { dest: "tilted_towers", tiles: [[9, 11], [10, 11]], spawn: [9, 10] },
    ],
    storm: { tiles: [[8, 0], [9, 0], [10, 0], [11, 0]] },
    signs: [
      { x: 2, y: 7, text: "← PLEASANT PARK" },
      { x: 17, y: 7, text: "RETAIL ROW →" },
      { x: 8, y: 9, text: "TILTED TOWERS ↓" },
      { x: 12, y: 7, text: "THE STORM ↑" },
    ],
    objects: [
      { x: 4, y: 8, kind: "decide", key: "took_high_ground", solid: true, marker: true, decal: "lookout" },
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
  item_impulse_grenades: "item_impulse_grenades.png",
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

// The player: a fish-headed character (Fishstick style), 16 wide and 24 tall.
// (x, y) is the top-left of the tile the player stands on; the sprite reaches up
// into the tile above, like the characters in old handheld RPGs.
function drawPlayer(c, x, y, dir, step) {
  const top = y - 8;
  const up = step ? 1 : 0;
  const O = "#f2692d", OD = "#b84a14", OL = "#ff9a5a", TEAL = "#7fb7c1", TD = "#5d939d";
  // legs and shoes (one leg lifts while walking)
  px(c, x + 4, top + 18, 3, 4 - up, "#c9743a");
  px(c, x + 9, top + 18, 3, 3 + up, "#c9743a");
  px(c, x + 3, top + 22 - up, 4, 2, "#5b3418");
  px(c, x + 9, top + 21 + up, 4, 2, "#5b3418");
  // body: overalls, belt, pockets
  px(c, x + 3, top + 12, 10, 7, TEAL);
  px(c, x + 3, top + 17, 10, 2, TD);
  px(c, x + 3, top + 15, 10, 2, "#6b4423");
  px(c, x + 7, top + 15, 2, 2, "#e0b43a");
  if (dir === "down") {
    px(c, x + 4, top + 12, 1, 3, "#4f7f88"); px(c, x + 11, top + 12, 1, 3, "#4f7f88");
    px(c, x + 4, top + 17, 3, 2, "#8a5a2c"); px(c, x + 9, top + 17, 3, 2, "#8a5a2c");
  }
  // arms
  if (dir === "left" || dir === "right") {
    const ax = dir === "left" ? x + 7 : x + 7;
    px(c, ax, top + 12 + up, 2, 6, O); px(c, ax, top + 17 + up, 2, 2, OD);
  } else {
    px(c, x + 1, top + 12 + up, 2, 6, O); px(c, x + 1, top + 17 + up, 2, 2, OD);
    px(c, x + 13, top + 12 + (1 - up), 2, 6, O); px(c, x + 13, top + 17 + (1 - up), 2, 2, OD);
  }
  // head: big orange fish head
  px(c, x + 3, top + 4, 10, 8, O);
  px(c, x + 3, top + 4, 1, 8, OD); px(c, x + 12, top + 4, 1, 8, OD);
  px(c, x + 4, top + 11, 8, 1, OD);
  px(c, x + 5, top + 5, 3, 2, OL);
  px(c, x + 5, top + 11, 6, 1, "#c9743a");        // neck
  // patched cap
  px(c, x + 7, top, 2, 1, "#b79a63");
  px(c, x + 4, top + 1, 8, 3, "#a88b5a");
  px(c, x + 3, top + 3, 10, 1, "#8a6f43");
  px(c, x + 7, top + 1, 1, 2, "#6b5430");
  if (dir === "down") {
    px(c, x + 3, top + 5, 4, 4, "#fff"); px(c, x + 9, top + 5, 4, 4, "#fff");
    px(c, x + 5, top + 6, 2, 2, "#111"); px(c, x + 9, top + 6, 2, 2, "#111");
    px(c, x + 5, top + 6, 1, 1, "#fff"); px(c, x + 9, top + 6, 1, 1, "#fff");
    px(c, x + 5, top + 9, 6, 2, "#f6c84c"); px(c, x + 5, top + 10, 6, 1, "#c9962a");
  } else if (dir === "left" || dir === "right") {
    const left = dir === "left";
    px(c, x + (left ? 3 : 8), top + 5, 5, 4, "#fff");
    px(c, x + (left ? 3 : 10), top + 6, 2, 2, "#111");
    px(c, x + (left ? 1 : 11), top + 9, 4, 2, "#f6c84c");
    px(c, x + (left ? 1 : 11), top + 10, 4, 1, "#c9962a");
  } else {
    px(c, x + 4, top + 5, 8, 6, OD);               // back of the head
    px(c, x + 5, top + 6, 6, 4, O);
  }
}

// ---------- paths between the towns ----------
// Every pair of towns is joined by a winding path. Walking onto the yellow-black
// caution tiles in the middle starts the danger; the server decides which one.

const TOWN_ORDER = ["pleasant_park", "tilted_towers", "retail_row", "polar_peak"];
const TOWN_NAMES = {
  pleasant_park: "PLEASANT PARK", tilted_towers: "TILTED TOWERS",
  retail_row: "RETAIL ROW", polar_peak: "POLAR PEAK",
};
const BIOMES = {
  pleasant_park: { ground: "g", path: "p", border: "t", pal: "pleasant" },
  retail_row: { ground: "c", path: "r", border: "b", pal: "retail" },
  tilted_towers: { ground: "c", path: "r", border: "b", pal: "tilted" },
  polar_peak: { ground: "n", path: "k", border: "i", pal: "polar" },
};
const PATH_HAZARD_TILES = [[8, 6], [9, 6], [8, 7], [9, 7]];

// The path between two towns. The town earlier in TOWN_ORDER is on the left.
function pathDefinition(a, b) {
  const left = TOWN_ORDER.indexOf(a) < TOWN_ORDER.indexOf(b) ? a : b;
  const right = left === a ? b : a;
  const L = BIOMES[left], R = BIOMES[right];
  const g = makeGrid("g");
  const biomeAt = (x) => (x < 10 ? L : R);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g[y][x] = biomeAt(x).ground;
  for (let x = 0; x < COLS; x++) { g[0][x] = biomeAt(x).border; g[ROWS - 1][x] = biomeAt(x).border; }
  for (let y = 0; y < ROWS; y++) { g[y][0] = L.border; g[y][COLS - 1] = R.border; }
  const lay = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = biomeAt(xx).path; };
  lay(0, 3, 10, 2);        // the left part of the path
  lay(8, 3, 2, 7);         // the bend
  lay(8, 8, 12, 2);        // the right part
  // decoration, placed by a fixed pattern (so it looks the same every time)
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (g[y][x] !== biomeAt(x).ground) continue;
      const r = hash(x, y, 7) % 100;
      const ground = biomeAt(x).ground;
      if (ground === "g" && r < 14) g[y][x] = "t";
      else if (ground === "g" && r < 18) g[y][x] = "h";
      else if (ground === "n" && r < 9) g[y][x] = "i";
      else if (ground === "c" && r < 5) g[y][x] = "l";
      else if (ground === "c" && r < 9) g[y][x] = "h";
    }
  }
  PATH_HAZARD_TILES.forEach(([x, y]) => { g[y][x] = "z"; });
  g[5][2] = "s"; g[7][17] = "s"; g[6][6] = "s";
  return {
    left, right,
    pal: PALETTES[L.pal],
    grid: g,
    // the two ends of the path, with the tile where the player appears
    ends: {
      [left]: { tiles: [[0, 3], [0, 4]], spawn: [1, 3] },
      [right]: { tiles: [[19, 8], [19, 9]], spawn: [18, 8] },
    },
    hazardTiles: PATH_HAZARD_TILES,
    signs: [
      { x: 2, y: 5, text: "\u2190 " + TOWN_NAMES[left] },
      { x: 17, y: 7, text: TOWN_NAMES[right] + " \u2192" },
      { x: 6, y: 6, text: "DANGER AHEAD" },
    ],
  };
}
