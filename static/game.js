"use strict";

// Walk around the island with the keyboard. The game progress is saved in the
// player's own browser (localStorage); the server only checks the rules.
// This file: input, drawing the world, and talking to the server.

const SAVE_KEY = "fortnite-llama-escape-save";
const MUTE_KEY = "fortnite-llama-escape-muted";
const IMG = document.body.dataset.img;
const AUDIO = document.body.dataset.audio;

const $ = (id) => document.getElementById(id);
const SCALE = 3;
const VIEW_W = COLS * T;   // 320
const VIEW_H = ROWS * T;   // 192
const STEP_MS = 130;

const canvas = $("screen");
const ctx = canvas.getContext("2d");
const base = document.createElement("canvas");
base.width = VIEW_W; base.height = VIEW_H;
const b = base.getContext("2d");
const layer = document.createElement("canvas");
layer.width = VIEW_W; layer.height = VIEW_H;
const lc = layer.getContext("2d");
const sprites = loadSprites(IMG);

// ---------- game variables ----------

let state = null;          // saved game state (what the server checks)
let view = null;           // what the server last told us to show
let scene = null;          // "bus", a town id, or "storm"
let town = null;           // the definition from world.js
let path = null;           // while walking between two towns: { left, right, from, to, def }
let grid = null;
let busy = false;          // waiting for the server
let modal = null;          // "menu" | "hazard" | "ending" | "confirm" | null
let modalKeys = [];        // functions for the number keys 1, 2, 3 ...
let dialogQueue = [];      // messages waiting to be read
let dialogOpen = false;
let banner = { text: "", sub: "", time: 0 };
const visited = new Set(); // places whose description was already shown (this visit)
const held = [];           // arrow keys currently held, last one wins
const player = { tx: 0, ty: 0, fx: 0, fy: 0, last: [0, 0], dir: "down", moving: false, prog: 0, step: 0 };
const bus = { sel: 0, jumping: false, jt: 0 };

const BUS_ZONES = [
  { id: "pleasant_park", name: "PLEASANT PARK", color: "#62c24d" },
  { id: "tilted_towers", name: "TILTED TOWERS", color: "#bdb8aa" },
  { id: "polar_peak", name: "POLAR PEAK", color: "#eef6ff" },
  { id: "retail_row", name: "RETAIL ROW", color: "#555a6b" },
];
const DIRS = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};
const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- saving ----------

function readSave() {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
}

function writeSave(newState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(newState));
  } catch (e) {
    showDialog("Your browser blocked saving. You can keep playing, but progress will be lost.");
  }
}

function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) { /* nothing to clear */ }
}

// ---------- sound ----------

const sounds = {
  music: new Audio(AUDIO + "music.mp3"),
  alert: new Audio(AUDIO + "hazard_alert.mp3"),
  shotgun: new Audio(AUDIO + "shotgun.mp3"),
  elimination: new Audio(AUDIO + "elimination.mp3"),
  victory: new Audio(AUDIO + "victory.mp3"),
};
sounds.music.loop = true;
sounds.music.volume = 0.25;
sounds.music.preload = "none";
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch (e) { /* keep default */ }

function play(name, stopAfter) {
  if (muted) return;
  const sound = sounds[name];
  try {
    sound.currentTime = 0;
    const promise = sound.play();
    if (promise) promise.catch(() => {});
    if (stopAfter) setTimeout(() => sound.pause(), stopAfter);
  } catch (e) { /* sound is optional */ }
}

function startMusic() {
  if (!muted && sounds.music.paused) {
    const promise = sounds.music.play();
    if (promise) promise.catch(() => {});
  }
}

function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch (e) { /* keep going */ }
  $("mute-btn").textContent = value ? "Sound: off (M)" : "Sound: on (M)";
  $("mute-btn").setAttribute("aria-pressed", String(value));
  if (value) {
    Object.values(sounds).forEach((s) => s.pause());
  } else if (view && view.status === "in_progress") {
    startMusic();
  }
}

function soundsFor(before, after) {
  if (!before || !after) return;
  if (!before.hazard && after.hazard) play("alert", 3000);
  if (before.status !== "ended" && after.status === "ended") {
    sounds.music.pause();
    sounds.alert.pause();
    const code = after.ending.code;
    if (code === "A") {
      play("victory");
    } else if (code === "C") {
      play("shotgun");
      setTimeout(() => play("elimination"), 1100);
    } else {
      play("elimination");
    }
  }
}

// ---------- server ----------

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try {
    data = await response.json();
  } catch (e) { /* keep empty */ }
  return { ok: response.ok, status: response.status, data };
}

// ---------- small page helpers ----------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function pxImage(file) {
  // Server names are .jpg; the pixel versions are .png in px/.
  const img = el("img", "pixel");
  img.src = IMG + "px/" + file.replace(/\.jpg$/, ".png");
  img.alt = "";
  return img;
}

function showStart(note) {
  const saved = readSave();
  $("start-note").textContent = note ||
    (saved ? "You have a saved game." : "Your Llama ran away. Ready to find it?");
  $("resume-btn").hidden = !saved;
  $("start").hidden = false;
  $("stage").hidden = true;
  $("new-btn").focus();
}

function updateHud() {
  if (!view) return;
  $("place").textContent = scene === "path" && !view.hazard
    ? "Path to " + TOWN_NAMES[path.to]
    : view.hazard ? "Danger!" : view.scene_name;
  const list = $("inventory");
  list.replaceChildren();
  if (!view.inventory.length) list.appendChild(el("li", "empty", "no items"));
  view.inventory.forEach((item) => {
    const li = el("li");
    const icon = el("img", "pixel");
    icon.src = IMG + "px/" + item.icon.replace("item_", "item_");
    icon.alt = "";
    li.appendChild(icon);
    li.appendChild(el("span", "", item.name));
    list.appendChild(li);
  });
  $("hint").textContent = scene === "bus"
    ? "← → choose where to land · SPACE jump · T talk to the bus driver · M sound"
    : "Arrows / WASD walk · SPACE talk, use, next · 1 2 3 choose · M sound";
}

// ---------- dialog box (bottom of the screen) ----------

function showDialog(text) {
  if (!text) return;
  dialogQueue.push(text);
  if (!dialogOpen) nextDialog();
}

function nextDialog() {
  const text = dialogQueue.shift();
  if (text === undefined) {
    dialogOpen = false;
    $("dialog").hidden = true;
    return;
  }
  dialogOpen = true;
  $("dialog-text").textContent = text;
  $("dialog").hidden = false;
}

// ---------- modal windows (menus, danger cards, ending) ----------

function openModal(kind) {
  modal = kind;
  modalKeys = [];
  held.length = 0;
  const panel = $("modal-panel");
  panel.replaceChildren();
  panel.className = "panel " + kind;
  $("modal").hidden = false;
  return panel;
}

function closeModal() {
  modal = null;
  modalKeys = [];
  $("modal").hidden = true;
}

function addOption(panel, label, fn, className) {
  const n = modalKeys.length + 1;
  const button = el("button", className || "", n + ".  " + label);
  button.type = "button";
  button.addEventListener("click", fn);
  panel.appendChild(button);
  modalKeys.push(fn);
  return button;
}

function openChoiceMenu(title, choices, onCancelText) {
  const panel = openModal("menu");
  panel.appendChild(el("p", "question", title));
  choices.forEach((choice) => {
    addOption(panel, choice.label, () => {
      closeModal();
      perform(choice.id);
    });
  });
  const cancel = el("p", "cancel", onCancelText || "ESC: not now");
  panel.appendChild(cancel);
}

function showHazard(v) {
  const panel = openModal("hazard");
  panel.appendChild(el("h2", "", "Danger!"));
  panel.appendChild(pxImage(v.hazard.image));
  panel.appendChild(el("p", "question", v.hazard.situation));
  v.choices.forEach((choice) => {
    addOption(panel, choice.label, () => {
      closeModal();
      perform(choice.id);
    }, "danger-option");
  });
}

function showEnding(v) {
  const panel = openModal("ending ending-" + v.ending.code.toLowerCase());
  panel.appendChild(el("p", "code", "ENDING " + v.ending.code));
  panel.appendChild(el("h2", "", v.ending.title));
  panel.appendChild(pxImage(v.ending.image));
  if (v.ending.code === "A") {
    const banner = el("img", "pixel victory");
    banner.src = IMG + "px/victory_banner.png";
    banner.alt = "Victory Royale";
    panel.appendChild(banner);
  }
  panel.appendChild(el("p", "question", v.ending.text));
  const review = el("ul", "review");
  v.review.decisions.forEach((d) => review.appendChild(el("li", "", d.question + " → " + d.answer)));
  review.appendChild(el("li", "", "Dangers survived: " + v.review.hazards_survived));
  panel.appendChild(review);
  addOption(panel, "New game", () => {
    closeModal();
    startNewGame();
  });
}

function askStartOver() {
  const needsConfirm = Boolean(readSave()) && !(view && view.status === "ended");
  if (!needsConfirm) {
    startNewGame();
    return;
  }
  const panel = openModal("confirm");
  panel.appendChild(el("p", "question", "Starting a new game erases your saved progress. Are you sure?"));
  addOption(panel, "Yes, start over", () => {
    closeModal();
    startNewGame();
  });
  addOption(panel, "Cancel", () => {
    closeModal();
    if (!state) showStart();
  });
}

// ---------- scenes ----------

function enterScene(id, fromId) {
  scene = id;
  path = null;
  Object.assign(player, { moving: false, prog: 0, step: 0, dir: "down" });
  if (id === "bus") {
    Object.assign(bus, { sel: 0, jumping: false, jt: 0 });
    return;
  }
  town = TOWNS[id];
  grid = town.build();
  if (id !== "storm") {
    lc.clearRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(lc, grid[y][x], x, y, town.pal);
  }
  const arrival = fromId && town.exits.find((e) => e.dest === fromId);
  const [sx, sy] = arrival ? arrival.spawn : town.spawn;
  player.tx = sx; player.ty = sy; player.fx = sx; player.fy = sy; player.last = [sx, sy];
  if (arrival) {
    // face into the town, away from the edge you came in from
    const [ex, ey] = arrival.tiles[0];
    player.dir = ex === 0 ? "right" : ex === COLS - 1 ? "left" : ey === 0 ? "down" : "up";
  }
  banner = { text: view ? view.scene_name : "", sub: "", time: 2600 };
  if (!visited.has(id) && view) {
    visited.add(id);
    showDialog(view.text);
  }
  updateHud();
}

// Walk from one town onto the path to another. Nothing is sent to the server yet:
// the game only counts the trip once the player reaches the danger in the middle.
function enterPath(fromId, toId) {
  const def = pathDefinition(fromId, toId);
  scene = "path";
  path = { left: def.left, right: def.right, from: fromId, to: toId, def };
  town = { pal: def.pal, exits: [], signs: def.signs, objects: [], storm: null };
  grid = def.grid;
  lc.clearRect(0, 0, VIEW_W, VIEW_H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(lc, grid[y][x], x, y, town.pal);
  const [sx, sy] = def.ends[fromId].spawn;
  Object.assign(player, { tx: sx, ty: sy, fx: sx, fy: sy, last: [sx, sy], moving: false, prog: 0, step: 0 });
  player.dir = fromId === def.left ? "right" : "left";
  banner = { text: "Path to " + TOWN_NAMES[toId], sub: "", time: 2400 };
  updateHud();
}

async function transition(fn) {
  const fade = $("fade");
  busy = true;
  fade.classList.add("on");
  await new Promise((r) => setTimeout(r, 230));
  fn();
  fade.classList.remove("on");
  busy = false;
}

// Is the thing at this tile used up? (read from the saved state)
function objDone(o) {
  if (o.kind === "decide") return state.decisions[o.key] !== null;
  if (o.kind === "collect") return state.inventory.includes(o.key);
  return false;
}
const objGone = (o) => o.sprite === "prop_supply_drop" && objDone(o);

function solidAt(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  if (SOLID_TILES.has(grid[y][x])) return true;
  return town.objects.some((o) => o.solid && o.x === x && o.y === y && !objGone(o));
}

function objectAt(x, y) {
  return town.objects.find((o) => o.x === x && o.y === y && !objGone(o));
}

// ---------- doing things ----------

async function perform(actionId, onReject) {
  if (busy) return;
  busy = true;
  const before = view;
  const fromScene = before ? before.scene_id : scene;
  let result;
  try {
    result = await post("/api/action", { state: state, action: actionId });
  } catch (e) {
    busy = false;
    showDialog("Cannot reach the game server. Is it still running?");
    if (onReject) onReject();
    return;
  }
  busy = false;
  if (result.ok) {
    state = result.data.state;
    writeSave(state);                // saved after every accepted action
    view = result.data.view;
    soundsFor(before, view);
    afterAction(before, fromScene);
  } else {
    // Not allowed (or broken request): nothing changed, say why.
    if (result.data.view) view = result.data.view;
    showDialog(result.data.error || "Something went wrong. Please try again.");
    if (onReject) onReject();
  }
  updateHud();
}

function afterAction(before, fromScene) {
  if (view.status === "ended") {
    showEnding(view);
    return;
  }
  if (view.hazard) {
    if (!before.hazard) showHazard(view);
    return;
  }
  if (view.scene_id !== fromScene) {
    transition(() => enterScene(view.scene_id, fromScene));
    return;
  }
  if (view.message) showDialog(view.message);
}

// What the player can use right now: the thing they face first, then anything
// they stand on or stand right next to. Used things (already collected or decided)
// are skipped, so the "Press SPACE" hint only shows when there is something to do.
function nearbyTarget() {
  if (!town) return null;
  const [dx, dy] = DELTA[player.dir];
  const spots = [[player.tx + dx, player.ty + dy], [player.tx, player.ty],
    [player.tx + 1, player.ty], [player.tx - 1, player.ty], [player.tx, player.ty + 1], [player.tx, player.ty - 1]];
  for (const [x, y] of spots) {
    const obj = objectAt(x, y);
    if (obj && (obj.kind === "search" || !objDone(obj))) return { kind: "object", obj, x, y };
    const sign = town.signs.find((sg) => sg.x === x && sg.y === y);
    if (sign) return { kind: "sign", sign, x, y };
  }
  // used-up things still answer when faced directly
  const [fx, fy] = spots[0];
  const used = objectAt(fx, fy);
  return used ? { kind: "object", obj: used, x: fx, y: fy, used: true } : null;
}

function interact() {
  if (scene === "bus") {
    if (!bus.jumping) {
      bus.jumping = true;
      bus.jt = 0;
    }
    return;
  }
  if (player.moving) return;
  const target = nearbyTarget();
  if (!target) return;
  if (target.kind === "sign") showDialog('The sign says: "' + target.sign.text + '"');
  else useObject(target.obj);
}

function useObject(o) {
  const id = o.kind === "search" ? "search" : o.kind === "collect" ? "collect:" + o.key : "decide:" + o.key + ":";
  const choices = view.choices.filter((c) => (o.kind === "decide" ? c.id.startsWith(id) : c.id === id));
  if (!choices.length) {
    showDialog(o.kind === "collect" ? "It is empty. You already took what was inside." : "You have already decided here.");
    return;
  }
  openChoiceMenu(choices[0].question || choices[0].label, choices);
}

function talkToDriver() {
  const choices = view.choices.filter((c) => c.id.startsWith("decide:thanked_driver:"));
  if (!choices.length) {
    showDialog("The driver nods. \"Good luck down there!\"");
    return;
  }
  openChoiceMenu(choices[0].question, choices);
}

function onArrive() {
  const x = player.tx, y = player.ty;
  const on = (tiles) => tiles.some(([tx, ty]) => tx === x && ty === y);
  if (scene === "path") {
    if (on(path.def.hazardTiles)) {
      perform("travel:" + path.to, () => stepBack());      // the danger starts here
      return;
    }
    for (const [townId, end] of Object.entries(path.def.ends)) {
      if (on(end.tiles)) {                                  // turned back: return to that town
        const other = townId === path.left ? path.right : path.left;
        transition(() => enterScene(townId, other));
        return;
      }
    }
    return;
  }
  const exit = town.exits.find((e) => on(e.tiles));
  if (exit) {
    transition(() => enterPath(scene, exit.dest));
    return;
  }
  if (town.storm && on(town.storm.tiles)) {
    perform("storm", () => stepBack());
  }
}

function stepBack() {
  // Rejected move: put the player back on the tile they came from.
  player.tx = player.last[0]; player.ty = player.last[1];
  player.fx = player.tx; player.fy = player.ty;
}

// ---------- flow ----------

async function startNewGame() {
  const result = await post("/api/new");
  if (!result.ok) {
    showDialog("Could not start a new game. Please try again.");
    return;
  }
  state = result.data.state;
  view = result.data.view;
  writeSave(state);
  visited.clear();
  beginWorld();
  showDialog(view.text);
  startMusic();
}

async function resume() {
  const saved = readSave();
  const result = await post("/api/view", { state: saved });
  if (!result.ok) {
    clearSave();
    showStart("Your saved game could not be loaded, so it was removed. Please start a new game.");
    return;
  }
  state = result.data.state;
  view = result.data.view;
  visited.clear();
  beginWorld();
  if (view.status === "in_progress") startMusic();
}

function beginWorld() {
  $("start").hidden = true;
  $("stage").hidden = false;
  closeModal();
  dialogQueue = [];
  nextDialog();
  visited.add(view.scene_id);
  enterScene(view.scene_id, null);
  if (view.scene_id !== "bus") banner.time = 2000;
  if (view.status === "ended") showEnding(view);
  else if (view.hazard) showHazard(view);
  updateHud();
}

// ---------- drawing ----------

function outlineText(c, text, x, y, color, size) {
  c.font = "bold " + size + 'px "Courier New", Courier, monospace';
  c.textAlign = "center";
  c.lineWidth = 4;
  c.strokeStyle = "#1b1030";
  c.strokeText(text, x, y);
  c.fillStyle = color;
  c.fillText(text, x, y);
}

function pixelEllipse(c, cx, cy, rx, ry, color) {
  c.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - (dy / ry) * (dy / ry)));
    c.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2, 1);
  }
}

function drawFog(c, t, strength) {
  for (let i = 0; i < 16; i++) {
    const speed = 4 + (i % 5) * 2;
    const x = ((i * 53 + t / 1000 * speed) % (VIEW_W + 120)) - 60;
    const y = (i * 37) % VIEW_H;
    pixelEllipse(c, x, y, 34 + (i % 4) * 8, 9 + (i % 3) * 3, "rgba(255,225,250," + strength + ")");
  }
}

function drawStormScreen(t) {
  const bands = ["#ffc2f0", "#ffb3ec", "#f7a5ee", "#eb98f2", "#de8cf6", "#d081f8", "#c276fa", "#b46bfb"];
  bands.forEach((color, i) => px(b, 0, i * (VIEW_H / bands.length), VIEW_W, VIEW_H / bands.length + 1, color));
  drawFog(b, t, 0.28);
}

function drawStormTiles(t) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      if (ch !== "x" && ch !== "X") continue;
      const off = Math.floor(t / 90 + x * 5 + y * 3) % 16;
      px(b, x * T, y * T + 4, T, 3, "rgba(255,190,255,0.45)");
      px(b, x * T + off, y * T + 9, 8, 3, "rgba(255,255,255,0.3)");
      px(b, x * T + ((off + 7) % 16), y * T + 1, 6, 2, "rgba(255,255,255,0.25)");
    }
  }
}

function drawObjects(t) {
  town.objects.forEach((o) => {
    if (objGone(o)) return;
    const done = objDone(o);
    const ox = o.x * T, oy = o.y * T;
    const img = o.sprite ? sprites[o.sprite] : null;
    const spriteH = img && img.naturalHeight ? img.naturalHeight : T;
    if (!done) {
      // yellow glow on the ground under the thing
      const pulse = 0.28 + 0.2 * Math.sin(t / 280);
      pixelEllipse(b, ox + 8, oy + 13, 13, 6, "rgba(255,210,63," + pulse.toFixed(2) + ")");
      pixelEllipse(b, ox + 8, oy + 13, 8, 4, "rgba(255,240,150," + (pulse + 0.12).toFixed(2) + ")");
    }
    if (img && img.complete && img.naturalWidth) {
      const bob = o.sprite === "llama" ? Math.round(Math.sin(t / 400) * 1.5) : 0;
      b.globalAlpha = done ? 0.55 : 1;
      b.drawImage(img, ox + Math.round((T - img.naturalWidth) / 2), oy + T - img.naturalHeight + bob);
      b.globalAlpha = 1;
    }
    if (o.decal === "tracks") {
      const color = done ? "#9b8559" : "#6a4b22";
      [[3, 3], [8, 6], [4, 10], [10, 12]].forEach(([dx, dy]) => {
        px(b, ox + dx, oy + dy, 3, 2, color); px(b, ox + dx + 1, oy + dy - 1, 1, 1, color);
      });
    }
    if (o.decal === "lookout") {
      px(b, ox + 1, oy + 6, 14, 10, "#7c8095"); px(b, ox + 3, oy + 4, 10, 4, "#9aa0b8");
      px(b, ox + 7, oy - 8, 1, 14, "#4a3320");
      px(b, ox + 8, oy - 8, 6, 4, done ? "#ffd23f" : "#e0463c");
    }
    if (o.marker && !done) {
      // a bouncing yellow exclamation mark above the thing
      const bounce = Math.round(Math.abs(Math.sin(t / 240)) * 4);
      const topY = o.decal === "lookout" ? oy - 12 : oy + T - spriteH;
      const mx = ox + 5, my = topY - 14 - bounce;
      px(b, mx - 1, my - 1, 8, 13, "#1b1030");
      px(b, mx, my, 6, 11, "#ffd23f");
      px(b, mx + 2, my + 1, 2, 5, "#1b1030");
      px(b, mx + 2, my + 8, 2, 2, "#1b1030");
    }
  });
}

function drawWorld(t) {
  if (scene === "storm") drawStormScreen(t);
  else b.drawImage(layer, 0, 0);
  drawObjects(t);
  if (scene !== "storm") drawStormTiles(t);
  const x = player.fx + (player.tx - player.fx) * player.prog;
  const y = player.fy + (player.ty - player.fy) * player.prog;
  drawPlayer(b, Math.round(x * T), Math.round(y * T), player.dir, player.step);
  if (scene === "storm") drawFog(b, t + 5000, 0.18);
}

function drawBusScene(t) {
  const sky = ["#2f7fe0", "#3a8ae6", "#4a96ea", "#5ca4ee", "#74b4f2", "#8cc4f6", "#a6d4fa", "#c4e4fc"];
  sky.forEach((color, i) => px(b, 0, i * 20, VIEW_W, 21, color));
  for (let i = 0; i < 7; i++) {
    const x = ((i * 71 + t / 1000 * (6 + i * 2)) % (VIEW_W + 100)) - 50;
    pixelEllipse(b, x, 30 + (i * 23) % 100, 26 + (i % 3) * 8, 7 + (i % 2) * 2, "#ffffff");
    pixelEllipse(b, x + 18, 34 + (i * 23) % 100, 16, 5, "#e8f4ff");
  }
  const busImg = sprites.bus;
  const bobY = Math.round(Math.sin(t / 500) * 2);
  const busX = 160;
  if (busImg.complete && busImg.naturalWidth) {
    b.drawImage(busImg, busX - Math.round(busImg.naturalWidth / 2), 6 + bobY);
  }
  // the island and the four landing spots
  px(b, 0, 138, VIEW_W, 54, "#1f6fd0");
  BUS_ZONES.forEach((zone, i) => {
    const x = 10 + i * 78;
    px(b, x, 140, 62, 36, "#2c9a3a");
    px(b, x + 4, 144, 54, 28, zone.color);
    px(b, x + 4, 144, 54, 2, "rgba(255,255,255,0.35)");
    if (zone.id === "pleasant_park") { px(b, x + 10, 150, 14, 10, "#c0392b"); px(b, x + 12, 160, 10, 8, "#f3e6c8"); px(b, x + 36, 152, 10, 10, "#2c8a3a"); }
    if (zone.id === "tilted_towers") { px(b, x + 8, 148, 12, 20, "#6b6f80"); px(b, x + 24, 154, 12, 14, "#d9c9a3"); px(b, x + 40, 146, 8, 22, "#6b6f80"); }
    if (zone.id === "polar_peak") { px(b, x + 12, 150, 30, 16, "#555b78"); px(b, x + 18, 146, 8, 6, "#555b78"); px(b, x + 32, 146, 8, 6, "#555b78"); }
    if (zone.id === "retail_row") { px(b, x + 6, 146, 42, 10, "#1fa3a3"); px(b, x + 6, 160, 42, 4, "#ffd23f"); }
  });
  const sel = BUS_ZONES[bus.sel];
  const selX = 10 + bus.sel * 78 + 31;
  const arrowY = 124 + Math.round(Math.sin(t / 200) * 2);
  px(b, selX - 4, arrowY, 9, 2, "#ffd23f"); px(b, selX - 3, arrowY + 2, 7, 2, "#ffd23f");
  px(b, selX - 2, arrowY + 4, 5, 2, "#ffd23f"); px(b, selX - 1, arrowY + 6, 3, 2, "#ffd23f");
  if (bus.jumping) {
    bus.jt = Math.min(1, bus.jt + 0.016 / 1.6);
    const e = bus.jt;
    const x = busX + (selX - busX) * e;
    const y = 52 + (150 - 52) * e;
    px(b, Math.round(x) - 10, Math.round(y) - 20, 20, 8, "#ff5fa8");
    px(b, Math.round(x) - 8, Math.round(y) - 22, 16, 2, "#ff5fa8");
    px(b, Math.round(x) - 10, Math.round(y) - 12, 1, 8, "#fff");
    px(b, Math.round(x) + 9, Math.round(y) - 12, 1, 8, "#fff");
    drawPlayer(b, Math.round(x) - 8, Math.round(y) - 2, "down", Math.floor(t / 150) % 2);
    if (bus.jt >= 1 && !busy) {
      bus.jumping = false;
      perform("land:" + sel.id, () => { bus.jumping = false; bus.jt = 0; });
    }
  }
}

function drawLabels(t) {
  if (scene === "bus") {
    BUS_ZONES.forEach((zone, i) => {
      outlineText(ctx, zone.name, (10 + i * 78 + 31) * SCALE, 186 * SCALE, i === bus.sel ? "#ffd23f" : "#ffffff", 13);
    });
    return;
  }
  town.signs.forEach((s) => {
    ctx.font = 'bold 13px "Courier New", Courier, monospace';
    const w = ctx.measureText(s.text).width + 14;
    const cx = (s.x * T + 8) * SCALE;
    const top = (s.y * T - 4) * SCALE - 20;
    const left = Math.max(4, Math.min(canvas.width - w - 4, cx - w / 2));
    ctx.fillStyle = "#1b1030"; ctx.fillRect(left - 2, top - 2, w + 4, 24);
    ctx.fillStyle = "#c68a4a"; ctx.fillRect(left, top, w, 20);
    ctx.fillStyle = "#e0a863"; ctx.fillRect(left, top, w, 3);
    ctx.fillStyle = "#3b220f"; ctx.textAlign = "center";
    ctx.fillText(s.text, left + w / 2, top + 15);
  });
  if (!modal && !dialogOpen) {
    const target = nearbyTarget();
    if (target && !target.used) {
      let tileTop = target.y * T;
      if (target.kind === "object" && target.obj.sprite) {
        const img = sprites[target.obj.sprite];
        if (img && img.naturalHeight) tileTop = target.y * T + T - img.naturalHeight;
      }
      const label = target.kind === "sign" ? "Press SPACE to read" : "Press SPACE to interact";
      ctx.font = 'bold 14px "Courier New", Courier, monospace';
      const w = ctx.measureText(label).width + 16;
      const cx = Math.max(w / 2 + 4, Math.min(canvas.width - w / 2 - 4, (target.x * T + 8) * SCALE));
      const cy = Math.max(70, (tileTop - 34) * SCALE);
      ctx.fillStyle = "#1b1030"; ctx.fillRect(cx - w / 2 - 2, cy - 17, w + 4, 26);
      ctx.fillStyle = "#fffdf0"; ctx.fillRect(cx - w / 2, cy - 15, w, 22);
      ctx.fillStyle = "#1b1030"; ctx.textAlign = "center";
      ctx.fillText(label, cx, cy);
    }
  }
  if (banner.time > 0) {
    ctx.globalAlpha = Math.min(1, banner.time / 500);
    outlineText(ctx, banner.text.toUpperCase(), canvas.width / 2, 34, "#ffd23f", 24);
    ctx.globalAlpha = 1;
  }
}

// ---------- the loop ----------

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;
  if (!$("stage").hidden && scene) {
    update(dt);
    if (scene === "bus") drawBusScene(now); else drawWorld(now);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    drawLabels(now);
    if (banner.time > 0) banner.time -= dt;
  }
  requestAnimationFrame(loop);
}

function canMove() {
  return !modal && !dialogOpen && !busy && scene !== "bus";
}

function update(dt) {
  if (!canMove()) return;
  if (player.moving) {
    player.prog += dt / STEP_MS;
    if (player.prog >= 1) {
      player.fx = player.tx; player.fy = player.ty;
      player.moving = false; player.prog = 0;
      player.step = 1 - player.step;
      onArrive();
    }
  }
  if (!player.moving && held.length) {
    const dir = held[held.length - 1];
    player.dir = dir;
    const nx = player.tx + DELTA[dir][0], ny = player.ty + DELTA[dir][1];
    if (!solidAt(nx, ny)) {
      player.fx = player.tx; player.fy = player.ty;
      player.last = [player.tx, player.ty];
      player.tx = nx; player.ty = ny;
      player.moving = true; player.prog = 0;
    }
  }
}

// ---------- keyboard ----------

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const code = e.code;
  if (code === "KeyM") {
    setMuted(!muted);
    return;
  }
  if ($("stage").hidden && !modal) return;   // the start screen uses its buttons
  const dir = DIRS[code];
  if (dir) {
    e.preventDefault();
    if (scene === "bus" && !modal && !dialogOpen && !bus.jumping && !e.repeat) {
      if (dir === "left") bus.sel = (bus.sel + BUS_ZONES.length - 1) % BUS_ZONES.length;
      if (dir === "right") bus.sel = (bus.sel + 1) % BUS_ZONES.length;
    }
    if (!held.includes(dir)) held.push(dir);
    return;
  }
  const digit = /^Digit([1-9])$/.exec(code);
  if (modal) {
    if (digit && modalKeys[Number(digit[1]) - 1]) {
      e.preventDefault();
      modalKeys[Number(digit[1]) - 1]();
    } else if (code === "Escape" && modal === "menu") {
      closeModal();
    }
    return;
  }
  if (code === "Space" || code === "Enter" || code === "KeyE" || code === "Escape") {
    e.preventDefault();
    if (e.repeat) return;
    if (dialogOpen) nextDialog();
    else if (!busy && code !== "Escape") interact();
    return;
  }
  if (code === "KeyT" && scene === "bus" && !dialogOpen && !busy && !bus.jumping) talkToDriver();
});

window.addEventListener("keyup", (e) => {
  const dir = DIRS[e.code];
  if (dir) {
    const i = held.indexOf(dir);
    if (i >= 0) held.splice(i, 1);
  }
});
window.addEventListener("blur", () => { held.length = 0; });

// ---------- buttons ----------

$("resume-btn").addEventListener("click", resume);
$("new-btn").addEventListener("click", askStartOver);
$("restart-btn").addEventListener("click", (e) => { e.currentTarget.blur(); askStartOver(); });
$("mute-btn").addEventListener("click", (e) => { e.currentTarget.blur(); setMuted(!muted); });
$("dialog").addEventListener("click", nextDialog);

setMuted(muted);
showStart();
requestAnimationFrame(loop);
