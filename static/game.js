"use strict";

// Walk around the island with the keyboard. The game progress is saved in the
// player's own browser (localStorage); the server only checks the rules.
// This file: input, drawing the world, and talking to the server.

const SAVE_KEY = "fortnite-llama-escape-save";
const EXTRAS_KEY = "fortnite-llama-escape-extras";   // small extras that are not part of the rules
const MUTE_KEY = "fortnite-llama-escape-muted";
const IMG = document.body.dataset.img;
const AUDIO = document.body.dataset.audio;

const $ = (id) => document.getElementById(id);
const SCALE = 3;
const VIEW_W = COLS * T;   // 320
const VIEW_H = ROWS * T;   // 192
const STEP_MS = 130;
const STORM_DAMAGE_PER_SECOND = 5;
const AUTO_ADVANCE_MS = 30000;   // the bus screen waits this long (or until a click)
const BUS_READY_TEXT = "It's time to drop! Get ready to loot up, fight other players and bring your llama home.";

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
let scene = null;          // "bus", a town id, "path" or "storm"
let town = null;           // the definition from world.js
let grid = null;
let path = null;           // while walking between two towns: { left, right, from, to, def }
let busy = false;          // waiting for the server, or fading between screens
let modal = null;          // "menu" | "hazard" | "ending" | "confirm" | null
let modalKeys = [];        // functions for the number keys 1, 2, 3 ...
let dialogQueue = [];      // messages waiting to be read: { text, onClose }
let dialogCurrent = null;
let dialogOpen = false;
let banner = { text: "", time: 0 };
let caption = "";          // text box that shows without blocking (during the dance)
const visited = new Set(); // places whose description was already shown
const held = [];           // arrow keys currently held, last one wins
const player = { tx: 0, ty: 0, fx: 0, fy: 0, last: [0, 0], dir: "down", moving: false, prog: 0, step: 0 };
const bus = { phase: "intro", t0: 0, sel: 0, jumping: false, jt: 0 };
const landing = { active: false, t: 0, dur: 1900 };    // the player floats down on a parachute
const drop = { active: false, t: 0, dur: 3400 };       // the supply drop floats down (first visit only)
const dance = { active: false, t: 0, dur: 7000 };
const talkCount = new Map();   // which line each character says next
let health = 100;              // only goes down inside the storm
let extras = { tiltedSeen: false, health: 100 };
let lastExtrasSave = 0;

const BUS_ZONES = [
  { id: "pleasant_park", name: "PLEASANT PARK" },
  { id: "tilted_towers", name: "TILTED TOWERS" },
  { id: "polar_peak", name: "POLAR PEAK" },
  { id: "retail_row", name: "RETAIL ROW" },
];
const NPC_NAMES = { jonesy: "Footballer", bear: "Footballer", raven: "Goalkeeper", referee: "Referee", cashier: "Cashier" };
const DIRS = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};
const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- saving ----------

function readJson(key) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}
const readSave = () => readJson(SAVE_KEY);
function writeSave(newState) {
  if (!writeJson(SAVE_KEY, newState)) {
    showDialog("Your browser blocked saving. You can keep playing, but progress will be lost.");
  }
}
function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(EXTRAS_KEY);
  } catch (e) { /* nothing to clear */ }
}
function loadExtras() {
  const saved = readJson(EXTRAS_KEY);
  extras = {
    tiltedSeen: Boolean(saved && saved.tiltedSeen),
    health: saved && typeof saved.health === "number" ? Math.max(0, Math.min(100, saved.health)) : 100,
  };
}
function saveExtras() {
  extras.health = health;
  writeJson(EXTRAS_KEY, extras);
}

// ---------- sound ----------

const sounds = {
  music: new Audio(AUDIO + "music.mp3"),
  alert: new Audio(AUDIO + "hazard_alert.mp3"),
  shotgun: new Audio(AUDIO + "shotgun.mp3"),
  elimination: new Audio(AUDIO + "elimination.mp3"),
  victory: new Audio(AUDIO + "victory.mp3"),
  open: new Audio(AUDIO + "open.mp3"),
  dance: new Audio(AUDIO + "dance.mp3"),
};
sounds.music.loop = true;
sounds.music.volume = 0.25;
sounds.music.preload = "none";
sounds.dance.volume = 0.8;
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
  if (!muted && sounds.music.paused && !dance.active) {
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
    sounds.dance.pause();
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

async function post(path_, body) {
  const response = await fetch(path_, {
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

function placeName() {
  if (scene === "path") return "Path to " + TOWN_NAMES[path.to];
  if (view && view.hazard) return "Danger!";
  if (town && town.name) return town.name;
  return view ? view.scene_name : "";
}

function updateHud() {
  if (!view) return;
  $("place").textContent = placeName();
  const list = $("inventory");
  list.replaceChildren();
  if (!view.inventory.length) list.appendChild(el("li", "empty", "no items"));
  view.inventory.forEach((item) => {
    const li = el("li");
    const icon = el("img", "pixel");
    icon.src = IMG + "px/" + item.icon;
    icon.alt = "";
    li.appendChild(icon);
    li.appendChild(el("span", "", item.name));
    list.appendChild(li);
  });
  let hint = "Arrows / WASD walk · SPACE talk, use, next · 1 2 3 choose · M sound";
  if (scene === "bus") {
    hint = bus.phase === "select"
      ? "Arrow keys choose where to drop · SPACE jump · T talk to the bus driver · M sound"
      : "SPACE or click to continue · M sound";
  }
  $("hint").textContent = hint;
  const inStorm = scene === "storm";
  $("health-box").hidden = !inStorm;
}

function updateHealthBar() {
  const pct = Math.max(0, Math.min(100, health));
  $("health-bar").style.width = pct + "%";
  $("health-bar").className = pct > 50 ? "ok" : pct > 25 ? "low" : "critical";
  $("health-text").textContent = Math.ceil(pct);
}

// ---------- dialog box (bottom of the screen) ----------

function showDialog(text, onClose) {
  if (!text) {
    if (onClose) onClose();
    return;
  }
  dialogQueue.push({ text, onClose });
  if (!dialogOpen) nextDialog();
}

function nextDialog() {
  const done = dialogCurrent;
  dialogCurrent = null;
  if (done && done.onClose) done.onClose();     // may add more messages
  const item = dialogQueue.shift();
  if (!item) {
    dialogOpen = false;
    $("dialog").hidden = true;
    return;
  }
  dialogOpen = true;
  dialogCurrent = item;
  $("dialog-text").textContent = item.text;
  $("dialog").hidden = false;
}

function resetDialogs() {
  dialogQueue = [];
  dialogCurrent = null;
  dialogOpen = false;
  $("dialog").hidden = true;
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

function openChoiceMenu(title, choices) {
  const panel = openModal("menu");
  panel.appendChild(el("p", "question", title));
  choices.forEach((choice) => {
    addOption(panel, choice.label, () => {
      closeModal();
      perform(choice.id);
    });
  });
  panel.appendChild(el("p", "cancel", "ESC: not now"));
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
    const victory = el("img", "pixel victory");
    victory.src = IMG + "px/victory_banner.png";
    victory.alt = "Victory Royale";
    panel.appendChild(victory);
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

function layoutScene(def, decorArg) {
  grid = def.build ? def.build() : decorArg;
  lc.clearRect(0, 0, VIEW_W, VIEW_H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(lc, grid[y][x], x, y, def.pal);
  if (def.decor) def.decor(lc);
}

function placePlayer(sx, sy, dir) {
  Object.assign(player, { tx: sx, ty: sy, fx: sx, fy: sy, last: [sx, sy], moving: false, prog: 0, step: 0, dir: dir || "down" });
}

// opts: landing (float down on a parachute), spawn ([x, y] to start on), resume
function enterScene(id, fromId, opts) {
  opts = opts || {};
  scene = id;
  path = null;
  held.length = 0;
  if (id === "bus") {
    Object.assign(bus, { sel: 0, jumping: false, jt: 0 });
    town = null;
    updateHud();
    return;
  }
  town = TOWNS[id];
  if (id === "storm") {
    grid = town.build();
    health = opts.resume ? extras.health : 100;
    if (!opts.resume) saveExtras();
  } else {
    layoutScene(town);
  }
  const arrival = fromId && town.exits.find((e) => e.dest === fromId);
  const [sx, sy] = opts.spawn || (arrival ? arrival.spawn : town.spawn);
  let dir = "down";
  if (arrival) {                     // face into the town, away from the edge you came in from
    const [ex, ey] = arrival.tiles[0];
    dir = ex === 0 ? "right" : ex === COLS - 1 ? "left" : ey === 0 ? "down" : "up";
  }
  placePlayer(sx, sy, dir);
  banner = { text: placeName(), time: 2600 };
  landing.active = Boolean(opts.landing);
  landing.t = 0;
  // the supply drop floats down the first time the player is in Tilted Towers
  drop.active = id === "tilted_towers" && !extras.tiltedSeen && !opts.resume && !state.inventory.includes("chug_jug");
  drop.t = 0;
  if (id === "tilted_towers" && !extras.tiltedSeen) {
    extras.tiltedSeen = true;
    saveExtras();
  }
  updateHud();
  if (!landing.active) afterEnter(id);
}

function afterEnter(id) {
  if (!visited.has(id) && view && !(town && town.interior)) {
    visited.add(id);
    showDialog(view.text);
  }
}

// Walk from one town onto the path to another. Nothing is sent to the server yet:
// the game only counts the trip once the player reaches the hazard in the middle.
function enterPath(fromId, toId) {
  const hazardId = view && view.ahead ? view.ahead[toId] : null;
  const def = pathDefinition(fromId, toId, hazardId);
  scene = "path";
  path = { left: def.left, right: def.right, from: fromId, to: toId, def };
  town = { pal: def.pal, exits: [], signs: def.signs, objects: [], storm: null };
  layoutScene({ pal: def.pal, build: null }, def.grid);
  if (def.decal) drawHazardDecal(lc, def.decal, sprites);
  const [sx, sy] = def.ends[fromId].spawn;
  placePlayer(sx, sy, fromId === def.left ? "right" : "left");
  landing.active = false; drop.active = false;
  banner = { text: "Path to " + TOWN_NAMES[toId], time: 2400 };
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
const objLocked = (o) => o.sprite === "prop_supply_drop" && drop.active;   // still floating down

function solidAt(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  if (SOLID_TILES.has(grid[y][x])) return true;
  return town.objects.some((o) => o.solid && o.x === x && o.y === y && !objGone(o));
}

function objectAt(x, y) {
  return town.objects.find((o) => o.x === x && o.y === y && !objGone(o));
}

// ---------- doing things ----------

// rejectText: shown instead of the server's reason when the action is refused
async function perform(actionId, onReject, rejectText) {
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
    afterAction(actionId, before, fromScene);
  } else {
    if (result.data.view) view = result.data.view;
    showDialog(rejectText || result.data.error || "Something went wrong. Please try again.");
    if (onReject) onReject();
  }
  updateHud();
}

function afterAction(actionId, before, fromScene) {
  if (actionId.startsWith("collect:")) play("open");
  if (view.status === "ended") {
    showEnding(view);
    return;
  }
  if (view.hazard) {
    if (!before.hazard) showHazard(view);
    return;
  }
  if (view.scene_id !== fromScene) {
    const landed = fromScene === "bus";
    transition(() => enterScene(view.scene_id, fromScene, { landing: landed }));
    return;
  }
  if (actionId === "decide:danced:yes") {
    startDance();
    return;
  }
  if (view.message) showDialog(view.message);
}

// The player's 7 second dance with the disco fever music.
function startDance() {
  dance.active = true;
  dance.t = 0;
  caption = "You bust out the default dance. Disco fever!";
  sounds.music.pause();
  play("dance");
}

function endDance() {
  dance.active = false;
  caption = "";
  sounds.dance.pause();
  if (view && view.status === "in_progress") startMusic();
  showDialog("The two dancers nod in respect. Peely looks a little jealous of your moves.");
}

// What the player can use right now: the thing they face first, then anything they
// stand on or right next to. Used things (already collected or decided) are skipped,
// so the "Press SPACE" hint only shows when there is something to do.
function nearbyTarget() {
  if (!town || !state) return null;
  const [dx, dy] = DELTA[player.dir];
  const spots = [[player.tx + dx, player.ty + dy], [player.tx, player.ty],
    [player.tx + 1, player.ty], [player.tx - 1, player.ty], [player.tx, player.ty + 1], [player.tx, player.ty - 1]];
  for (const [x, y] of spots) {
    const obj = objectAt(x, y);
    if (obj && obj.talk !== false && !objLocked(obj) && (obj.kind === "search" || obj.kind === "npc" || !objDone(obj))) {
      return { kind: "object", obj, x, y };
    }
    const sign = town.signs.find((sg) => sg.x === x && sg.y === y);
    if (sign) return { kind: "sign", sign, x, y };
  }
  const [fx, fy] = spots[0];     // used-up things still answer when faced directly
  const used = objectAt(fx, fy);
  return used && used.talk !== false && !objLocked(used) ? { kind: "object", obj: used, x: fx, y: fy, used: true } : null;
}

function interact() {
  if (scene === "bus") {
    if (bus.phase === "select" && !bus.jumping) {
      bus.jumping = true;
      bus.jt = 0;
    }
    return;
  }
  if (player.moving) return;
  const target = nearbyTarget();
  if (!target) return;
  if (target.kind === "sign") {
    showDialog('The sign says: "' + target.sign.text + '"');
    if (target.sign.desc) showDialog(target.sign.desc);
  } else {
    useObject(target.obj);
  }
}

function useObject(o) {
  if (o.kind === "npc") {
    let lines = o.lines;
    if (o.referee && state.inventory.includes("chug_jug")) lines = o.linesWithJug;
    const n = talkCount.get(o) || 0;
    talkCount.set(o, n + 1);
    showDialog(NPC_NAMES[o.style] + ": " + lines[n % lines.length]);
    return;
  }
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
      perform("travel:" + path.to, () => stepBack());      // the hazard (if any is left) starts here
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
  if (town.leave && on(town.leave.tiles)) {                  // leaving the supermarket
    transition(() => enterScene(town.leave.to, null, { spawn: town.leave.spawn }));
    return;
  }
  const door = (town.doors || []).find((d) => on(d.tiles));
  if (door) {
    const inside = TOWNS[door.to];
    transition(() => enterScene(door.to, scene, { spawn: inside.spawn }));
    return;
  }
  const exit = town.exits.find((e) => on(e.tiles));
  if (exit) {
    transition(() => enterPath(scene, exit.dest));
    return;
  }
  if (town.storm && on(town.storm.tiles)) {
    const referee = TOWNS.polar_peak.objects.find((o) => o.referee);
    perform("storm", () => stepBack(), "Referee: " + referee.lines[0]);
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
  extras = { tiltedSeen: false, health: 100 };
  health = 100;
  saveExtras();
  visited.clear();
  talkCount.clear();
  dance.active = false; caption = "";
  $("start").hidden = true;
  $("stage").hidden = false;
  closeModal();
  resetDialogs();
  enterScene("bus", null);
  startBusIntro();
  startMusic();
}

function startBusIntro() {
  bus.phase = "intro";
  bus.t0 = performance.now();
  showDialog(view.text, () => {
    bus.phase = "ready";
    bus.t0 = performance.now();
    showDialog(BUS_READY_TEXT, () => {
      bus.phase = "select";
      updateHud();
    });
  });
  updateHud();
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
  loadExtras();
  visited.clear();
  talkCount.clear();
  dance.active = false; caption = "";
  $("start").hidden = true;
  $("stage").hidden = false;
  closeModal();
  resetDialogs();
  visited.add(view.scene_id);
  enterScene(view.scene_id, null, { resume: true });
  if (view.scene_id === "bus") bus.phase = "select";
  banner.time = view.scene_id === "bus" ? 0 : 2000;
  if (view.status === "ended") showEnding(view);
  else if (view.hazard) showHazard(view);
  else startMusic();
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
  ellipse(c, cx, cy, rx, ry, color);
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

const easeOut = (p) => 1 - Math.pow(1 - p, 3);

// llama hoof prints: two toes side by side, a heel mark, a trail leading off
function drawLlamaTracks(ox, oy, used) {
  const color = used ? "#9b8559" : "#5a3d1c";
  [[1, 10], [7, 5], [2, 1]].forEach(([dx, dy], i) => {
    const x = ox + dx + (i % 2) * 2, y = oy + dy;
    px(b, x, y, 2, 4, color); px(b, x + 3, y, 2, 4, color);       // two toes
    px(b, x + 1, y + 4, 3, 1, color);                              // heel
    px(b, x + 2, y - 1, 1, 1, color);                              // notch between the toes
  });
  px(b, ox + 11, oy + 12, 2, 3, color); px(b, ox + 14, oy + 12, 2, 3, color);
}

function drawActors(t) {
  const actors = [];
  const ground = [];
  town.objects.forEach((o) => {
    if (objGone(o)) return;
    const done = objDone(o);
    const ox = o.x * T, oy = o.y * T;
    if (o.decal === "tracks") drawLlamaTracks(ox, oy, done);
    if (o.decal === "lookout") {
      px(b, ox + 7, oy - 10, 1, 16, "#4a3320");
      px(b, ox + 8, oy - 10, 7, 5, done ? "#ffd23f" : "#e0463c");
    }
    if (o.marker && !done && !objLocked(o)) {
      const pulse = 0.28 + 0.2 * Math.sin(t / 280);               // yellow glow on the ground
      pixelEllipse(b, ox + 8, oy + 13, 13, 6, "rgba(255,210,63," + pulse.toFixed(2) + ")");
      pixelEllipse(b, ox + 8, oy + 13, 8, 4, "rgba(255,240,150," + (pulse + 0.12).toFixed(2) + ")");
    }
    ground.push(o);
    actors.push({ y: o.y, draw: () => drawObjectSprite(o, done, t) });
  });
  if (town.ball) {
    const p = 0.5 + 0.5 * Math.sin(t / 650);
    const bx = (town.ball.from[0] + (town.ball.to[0] - town.ball.from[0]) * p) * T + 6;
    const by = (town.ball.from[1] + (town.ball.to[1] - town.ball.from[1]) * p) * T + 11 - Math.abs(Math.sin(t / 650 * 2)) * 6;
    actors.push({ y: town.ball.from[1], draw: () => { pixelEllipse(b, bx + 2, by + 6, 3, 1, "rgba(0,0,0,0.25)"); px(b, bx, by, 5, 5, "#f4f4f4"); px(b, bx + 1, by + 1, 2, 2, "#222"); } });
  }
  const px_ = player.fx + (player.tx - player.fx) * player.prog;
  const py_ = player.fy + (player.ty - player.fy) * player.prog;
  actors.push({ y: py_ + 0.4, draw: () => drawThePlayer(px_, py_, t) });
  actors.sort((a, c2) => a.y - c2.y).forEach((a) => a.draw());
  ground.forEach((o) => {                                          // bouncing exclamation marks on top
    if (!o.marker || objDone(o) || objGone(o) || objLocked(o)) return;
    const ox = o.x * T, oy = o.y * T;
    const img = o.sprite ? sprites[o.sprite] : null;
    const topY = o.kind === "npc" || o.sprite === "llama" ? oy - 8 - (o.sprite === "llama" ? 18 : 0)
      : o.decal === "lookout" ? oy - 12 : img && img.naturalHeight ? oy + T - img.naturalHeight : oy;
    const bounce = Math.round(Math.abs(Math.sin(t / 240)) * 4);
    const mx = ox + 5, my = topY - 14 - bounce;
    px(b, mx - 1, my - 1, 8, 13, "#1b1030");
    px(b, mx, my, 6, 11, "#ffd23f");
    px(b, mx + 2, my + 1, 2, 5, "#1b1030");
    px(b, mx + 2, my + 8, 2, 2, "#1b1030");
  });
}

function drawObjectSprite(o, done, t) {
  const ox = o.x * T, oy = o.y * T;
  if (o.kind === "npc") {
    drawNPC(b, ox, oy, o.style, o.pose, t);
    return;
  }
  const img = o.sprite ? sprites[o.sprite] : null;
  if (!img || !img.complete || !img.naturalWidth) return;
  const w = img.naturalWidth, h = img.naturalHeight;
  const x = ox + Math.round((T - w) / 2);
  if (o.sprite === "prop_supply_drop") {
    if (drop.active) {                          // floating down on its balloon
      const p = easeOut(Math.min(1, drop.t / drop.dur));
      const y = -h + (oy + T) * p;
      pixelEllipse(b, ox + 8, oy + 13, 4 + 6 * p, 2 + 3 * p, "rgba(0,0,0," + (0.1 + 0.2 * p).toFixed(2) + ")");
      b.drawImage(img, x + Math.round(Math.sin(t / 300) * 2 * (1 - p)), Math.round(y));
    } else {                                    // landed: only the crate is left
      const crate = Math.round(h * 0.34);
      b.drawImage(img, 0, h - crate, w, crate, x, oy + T - crate, w, crate);
    }
    return;
  }
  const bob = o.sprite === "llama" ? Math.round(Math.sin(t / 400) * 1.5) : 0;
  b.globalAlpha = done ? 0.55 : 1;
  b.drawImage(img, x, oy + T - h + bob);
  b.globalAlpha = 1;
}

function drawThePlayer(x, y, t) {
  const tx = Math.round(x * T), ty = Math.round(y * T);
  if (landing.active) {                         // floating down on a parachute
    const p = easeOut(Math.min(1, landing.t / landing.dur));
    const lift = (1 - p) * (ty + 40);
    const chute = p < 0.93;
    if (chute) {
      const cy = ty - lift - 30;
      ellipse(b, tx + 8, cy + 6, 14, 7, "#ff5fa8");
      ellipse(b, tx + 8, cy + 4, 10, 4, "#ff8fc8");
      px(b, tx + 2, cy + 9, 1, 14, "#f4f4f4"); px(b, tx + 14, cy + 9, 1, 14, "#f4f4f4");
    }
    drawPlayer(b, tx, Math.round(ty - lift), "down", 0, "walk", t);
    return;
  }
  drawPlayer(b, tx, ty, player.dir, player.step, dance.active ? "dance" : "walk", t);
}

function drawWorld(t) {
  if (scene === "storm") drawStormScreen(t);
  else b.drawImage(layer, 0, 0);
  drawActors(t);
  if (scene !== "storm") drawStormTiles(t);
  if (scene === "storm") {
    drawFog(b, t + 5000, 0.18);
    const hit = Math.floor(t / 1000) % 2 === 0 ? 0.05 : 0;       // a faint red flash while the storm hurts
    if (hit && canDrain()) px(b, 0, 0, VIEW_W, VIEW_H, "rgba(255,0,0," + hit + ")");
  }
}

function drawBusScene(t) {
  const sky = ["#2f7fe0", "#3a8ae6", "#4a96ea", "#5ca4ee", "#74b4f2", "#8cc4f6", "#a6d4fa", "#c4e4fc"];
  sky.forEach((color, i) => px(b, 0, i * 24, VIEW_W, 25, color));
  for (let i = 0; i < 9; i++) {
    const x = ((i * 71 + t / 1000 * (6 + i * 2)) % (VIEW_W + 100)) - 50;
    pixelEllipse(b, x, 22 + (i * 23) % 150, 26 + (i % 3) * 8, 7 + (i % 2) * 2, "#ffffff");
    pixelEllipse(b, x + 18, 26 + (i * 23) % 150, 16, 5, "#e8f4ff");
  }
  if (bus.phase !== "select") {                                   // the big Battle Bus
    const img = sprites.bus;
    if (img.complete && img.naturalWidth) {
      const bob = Math.round(Math.sin(t / 500) * 3);
      b.drawImage(img, Math.round(VIEW_W / 2 - img.naturalWidth / 2), 10 + bob);
    }
    return;
  }
  BUS_ZONES.forEach((zone, i) => {                                // the four drop locations
    const cx = 16 + (i % 2) * 160, cy = 22 + Math.floor(i / 2) * 82;
    const selected = i === bus.sel;
    const flash = bus.jumping && Math.floor(t / 90) % 2 === 0;
    px(b, cx - 3, cy - 3, 134, 78, selected ? (flash ? "#ffffff" : "#ffd23f") : "#1b1030");
    const img = sprites["drop_" + zone.id];
    if (img.complete && img.naturalWidth) b.drawImage(img, cx, cy);
  });
}

function drawLabels(t) {
  if (scene === "bus") {
    if (bus.phase === "select") {
      outlineText(ctx, bus.jumping ? "JUMP!" : "CHOOSE WHERE TO DROP", canvas.width / 2, 16 * SCALE - 8, "#ffffff", 20);
      BUS_ZONES.forEach((zone, i) => {
        const cx = 16 + (i % 2) * 160, cy = 22 + Math.floor(i / 2) * 82;
        outlineText(ctx, zone.name, (cx + 64) * SCALE, (cy + 72 + 9) * SCALE, i === bus.sel ? "#ffd23f" : "#ffffff", 13);
      });
    }
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
  if (!modal && !dialogOpen && !landing.active && !dance.active) {
    const target = nearbyTarget();
    if (target && !target.used) {
      let tileTop = target.y * T;
      if (target.kind === "object" && target.obj.kind === "npc") tileTop -= 8;
      else if (target.kind === "object" && target.obj.sprite) {
        const img = sprites[target.obj.sprite];
        if (img && img.naturalHeight) tileTop = target.y * T + T - img.naturalHeight;
      }
      const label = target.kind === "sign" ? "Press SPACE to read"
        : target.obj.kind === "npc" ? "Press SPACE to talk" : "Press SPACE to interact";
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
  if (caption) {                                                   // a text box that does not block (dance)
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    const w = ctx.measureText(caption).width + 40;
    const x = canvas.width / 2 - w / 2, y = canvas.height - 62;
    ctx.fillStyle = "#1b1030"; ctx.fillRect(x - 3, y - 3, w + 6, 44);
    ctx.fillStyle = "#fffdf0"; ctx.fillRect(x, y, w, 38);
    ctx.fillStyle = "#1b1030"; ctx.textAlign = "center";
    ctx.fillText(caption, canvas.width / 2, y + 24);
  }
  if (banner.time > 0) {
    ctx.globalAlpha = Math.min(1, banner.time / 500);
    outlineText(ctx, banner.text.toUpperCase(), canvas.width / 2, 34, "#ffd23f", 24);
    ctx.globalAlpha = 1;
  }
}

// ---------- the loop ----------

function canDrain() {
  return scene === "storm" && !modal && !dialogOpen && !busy && view && view.status === "in_progress";
}

let lastTime = performance.now();
function loop(now) {
  const real = now - lastTime;             // real time: animations and sounds keep their length
  const dt = Math.min(50, real);           // capped time: walking and the storm never jump ahead
  lastTime = now;
  if (!$("stage").hidden && scene) {
    update(dt, now, real);
    if (scene === "bus") drawBusScene(now); else drawWorld(now);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    drawLabels(now);
    if (banner.time > 0) banner.time -= dt;
  }
  requestAnimationFrame(loop);
}

function canMove() {
  return !modal && !dialogOpen && !busy && scene !== "bus" && !landing.active && !dance.active;
}

function update(dt, now, real) {
  // the bus screen waits for 30 seconds or a click, then moves on
  if (scene === "bus" && dialogOpen && (bus.phase === "intro" || bus.phase === "ready") && now - bus.t0 > AUTO_ADVANCE_MS) {
    nextDialog();
  }
  if (scene === "bus" && bus.jumping) {
    bus.jt += real / 1000;
    if (bus.jt >= 0.8 && !busy) {
      bus.jumping = false;
      const zone = BUS_ZONES[bus.sel];
      perform("land:" + zone.id, () => { bus.jumping = false; });
    }
  }
  if (landing.active) {
    landing.t += real;
    if (landing.t >= landing.dur) {
      landing.active = false;
      afterEnter(scene);
    }
  }
  if (drop.active) {
    drop.t += real;
    if (drop.t >= drop.dur) drop.active = false;
  }
  if (dance.active) {
    dance.t += real;
    if (dance.t >= dance.dur) endDance();
  }
  if (canDrain()) {                                // only inside the storm: the health goes down
    health = Math.max(0, health - STORM_DAMAGE_PER_SECOND * dt / 1000);
    updateHealthBar();
    if (now - lastExtrasSave > 500) { saveExtras(); lastExtrasSave = now; }
    if (health <= 0) {
      saveExtras();
      perform("storm_timeout");
    }
  }
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
    if (scene === "bus" && bus.phase === "select" && !modal && !dialogOpen && !bus.jumping && !e.repeat) {
      if (dir === "left" && bus.sel % 2 === 1) bus.sel -= 1;
      if (dir === "right" && bus.sel % 2 === 0) bus.sel += 1;
      if (dir === "up" && bus.sel >= 2) bus.sel -= 2;
      if (dir === "down" && bus.sel < 2) bus.sel += 2;
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
    else if (!busy && !landing.active && !dance.active && code !== "Escape") interact();
    return;
  }
  if (code === "KeyT" && scene === "bus" && bus.phase === "select" && !dialogOpen && !busy && !bus.jumping) talkToDriver();
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
canvas.addEventListener("click", () => { if (scene === "bus" && dialogOpen) nextDialog(); });

loadExtras();
setMuted(muted);
showStart();
updateHealthBar();
requestAnimationFrame(loop);
