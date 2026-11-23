"use strict";

// Walk around the island with the keyboard. The game progress is saved in the
// player's own browser (localStorage); the server only checks the rules.
// This file: input, drawing the world, and talking to the server.

const SAVE_KEY = "fortnite-llama-escape-save";
const EXTRAS_KEY = "fortnite-llama-escape-extras";   // small extras that are not part of the rules
const SNAPSHOT_KEY = "fortnite-llama-escape-snapshot";   // where the player stood when they chose Save & exit
const MUTE_KEY = "fortnite-llama-escape-muted";
const IMG = document.body.dataset.img;
const AUDIO = document.body.dataset.audio;

const $ = (id) => document.getElementById(id);
const SCALE = 3;
const VIEW_W = COLS * T;   // 320
const VIEW_H = ROWS * T;   // 192
const STEP_MS = 130;
const STORM_DAMAGE_PER_SECOND = 4;   // 100 health lasts 25 seconds in the storm
const CHUG_AT = 20;                  // the page offers the Chug Jug when health drops this low
const CHUG_HEAL = 50;
const AUTO_ADVANCE_MS = 30000;   // the bus screen waits this long (or until a click)
const BUS_READY_TEXT = "It's time to drop! Get ready to loot up, fight other players and bring your llama home.";

const canvas = $("screen");
const ctx = canvas.getContext("2d");
const titleCanvas = $("title-canvas");
const titleCtx = titleCanvas.getContext("2d");
const titleBase = document.createElement("canvas");
titleBase.width = VIEW_W; titleBase.height = VIEW_H;
const tb = titleBase.getContext("2d");
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
let modal = null;          // "menu" | "hazard" | "ending" | "confirm" | "pause" | null
let paused = false;        // the game is frozen behind the pause menu
let pausedAt = 0;          // when the pause started (real time)
let pausedSounds = [];     // the sounds that were playing when the game was paused
let modalKeys = [];        // functions for the number keys 1, 2, 3 ...
let dialogQueue = [];      // messages waiting to be read: { text, onClose }
let dialogCurrent = null;
let dialogOpen = false;
let banner = { text: "", time: 0 };
let caption = "";          // text box that shows without blocking (during the dance)
const visited = new Set(); // places whose description was already shown
const readSigns = new Set(); // signs that were read (their "!" goes away)
const held = [];           // arrow keys currently held, last one wins
const player = { tx: 0, ty: 0, fx: 0, fy: 0, last: [0, 0], dir: "down", moving: false, prog: 0, step: 0 };
const bus = { phase: "intro", t0: 0, sel: 0, jumping: false, jt: 0 };   // jt: seconds since the jump started
const landing = { active: false, t: 0, dur: 1900 };    // the player floats down on a parachute
const drop = { active: false, t: 0, dur: 3400 };       // the supply drop floats down (first visit only)
const dance = { active: false, t: 0, dur: 7000 };
const cutscene = { active: false, t: 0, def: null, onDone: null };   // an elimination film
const itemFly = { active: false, t: 0, dur: 1700, sprite: null, from: null };   // an item flies into the backpack
const finale = { phase: null, t: 0, result: null };   // the jump over the valley (and out of the storm)
const talkCount = new Map();   // which line each character says next
let chugAsked = false;         // the Chug Jug offer is shown once per drop below 20 health
let hudPop = null;             // the item that just landed in the backpack (its icon pops)
let health = 100;              // only goes down inside the storm
let extras = { tiltedSeen: false, health: 100, death: null };   // death: which elimination card to show
let lastExtrasSave = 0;

const DROP_TOP = 24, DROP_ROW = 86;     // where the four location pictures sit on the drop screen
const BUS_ZONES = [
  { id: "pleasant_park", name: "PLEASANT PARK" },
  { id: "tilted_towers", name: "TILTED TOWERS" },
  { id: "polar_peak", name: "POLAR PEAK" },
  { id: "retail_row", name: "RETAIL ROW" },
];
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
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch (e) { /* nothing to clear */ }
}
function loadExtras() {
  const saved = readJson(EXTRAS_KEY);
  extras = {
    tiltedSeen: Boolean(saved && saved.tiltedSeen),
    health: saved && typeof saved.health === "number" ? Math.max(0, Math.min(100, saved.health)) : 100,
    death: saved && typeof saved.death === "string" ? saved.death : null,
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
sounds.music.volume = 0.15;                       // quiet, so the footsteps can be heard
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

// ---------- footsteps (made with the browser's audio, so there are no sound files) ----------

let stepContext = null, stepNoise = null, stepCount = 0;

function stepAudio() {
  if (!stepContext) {
    try {
      stepContext = new (window.AudioContext || window.webkitAudioContext)();
      stepNoise = stepContext.createBuffer(1, stepContext.sampleRate * 0.3, stepContext.sampleRate);
      const data = stepNoise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
      stepContext = null;
    }
  }
  if (stepContext && stepContext.state === "suspended") stepContext.resume();
  return stepContext;
}

// which kind of ground is under the player's feet (tile letters are explained in world.js)
function surfaceAt(ch) {
  if ("nik".includes(ch)) return "snow";
  if ("gpuhaqo".includes(ch)) return "grass";
  if ("PZ".includes(ch)) return "wood";
  if ("FxQ".includes(ch)) return "gravel";
  return "hard";
}

// one soft burst of noise (a filter shapes it) and, for some ground, a low thump
function stepBurst(ctx, when, type, freq, q, peak, length) {
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = stepNoise;
  filter.type = type; filter.frequency.value = freq; filter.Q.value = q;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(when, Math.random() * 0.15, length + 0.02);
}

function footstep(surface) {
  if (muted) return;
  const ctx = stepAudio();
  if (!ctx) return;
  const now = ctx.currentTime, vary = 0.9 + Math.random() * 0.2, foot = stepCount++ % 2 ? 1 : 0.85;
  if (surface === "grass") {
    stepBurst(ctx, now, "lowpass", 700 * vary, 0.7, 0.09 * foot, 0.12);
    stepBurst(ctx, now + 0.02, "bandpass", 2400 * vary, 0.9, 0.025 * foot, 0.08);       // a little rustle
  } else if (surface === "snow") {
    stepBurst(ctx, now, "bandpass", 2800 * vary, 0.9, 0.1 * foot, 0.07);                // the crunch
    stepBurst(ctx, now + 0.045, "highpass", 4200 * vary, 0.7, 0.06 * foot, 0.06);
  } else if (surface === "wood") {
    stepBurst(ctx, now, "lowpass", 500 * vary, 0.8, 0.1 * foot, 0.1);
    const osc = ctx.createOscillator(), g = ctx.createGain();                         // the hollow knock of a plank
    osc.type = "triangle"; osc.frequency.setValueAtTime(150 * vary, now); osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);
    g.gain.setValueAtTime(0.12 * foot, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.12);
  } else if (surface === "gravel") {
    stepBurst(ctx, now, "bandpass", 1300 * vary, 0.8, 0.1 * foot, 0.09);
    stepBurst(ctx, now + 0.03, "bandpass", 3200 * vary, 1.2, 0.05 * foot, 0.05);
  } else {                                                                              // pavement: a firm tap
    stepBurst(ctx, now, "bandpass", 1900 * vary, 1.1, 0.1 * foot, 0.05);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(170 * vary, now); osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);
    g.gain.setValueAtTime(0.1 * foot, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.08);
  }
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
    (saved ? "Welcome back! Load your game, or start a new one." : "Your Llama ran away. Ready to find it?");
  $("resume-btn").disabled = !saved;
  $("resume-btn").title = saved ? "" : "There is no saved game yet";
  $("start").hidden = false;
  $("stage").hidden = true;
  (saved ? $("resume-btn") : $("new-btn")).focus();
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
  if (!itemFly.active) {                       // while an item flies into the backpack the list waits
    list.replaceChildren();
    if (!view.inventory.length) list.appendChild(el("li", "empty", "no items"));
    view.inventory.forEach((item) => {
      const li = el("li", item.name === hudPop ? "pop" : "");
      const icon = el("img", "pixel");
      icon.src = IMG + "px/" + item.icon;
      icon.alt = "";
      li.appendChild(icon);
      li.appendChild(el("span", "", item.name));
      list.appendChild(li);
    });
  }
  let hint = "Arrows / WASD walk · SPACE talk, use, next · 1 2 3 choose · ESC pause · click the red X to close · M sound";
  if (scene === "bus") {
    hint = bus.phase === "select"
      ? "Arrow keys choose where to drop · SPACE jump · T talk to the bus driver · M sound"
      : "SPACE or click to continue · M sound";
  }
  $("hint").textContent = hint;
  const inStorm = scene === "storm";
  $("health-box").hidden = !inStorm && health >= 100;           // outside the storm it shows while health is missing
  updateHealthBar();
}

function updateHealthBar() {
  const pct = Math.max(0, Math.min(100, health));
  $("health-bar").style.width = pct + "%";
  $("health-bar").className = pct > 50 ? "ok" : pct > 25 ? "low" : "critical";
  $("health-text").textContent = Math.ceil(pct);
}

// ---------- dialog box (bottom of the screen) ----------

// live: the storm keeps hurting while this message is open (talking is a choice in the storm)
function showDialog(text, onClose, live) {
  if (!text) {
    if (onClose) onClose();
    return;
  }
  dialogQueue.push({ text, onClose, live: Boolean(live) });
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

// The red X in the corner of a window closes it (instead of the ESC key).
function addCloseX(panel) {
  const x = el("button", "close-x");
  x.type = "button";
  x.setAttribute("aria-label", "Close");
  x.addEventListener("click", closeModal);
  panel.appendChild(x);
}

// choices: server actions ({id, label}); extra: choices that only show a message ({label, text})
function openChoiceMenu(title, choices, extra) {
  const panel = openModal("menu");
  addCloseX(panel);
  panel.appendChild(el("p", "question", title));
  choices.forEach((choice) => {
    addOption(panel, choice.label, () => {
      closeModal();
      perform(choice.id);
    });
  });
  (extra || []).forEach((choice) => {
    addOption(panel, choice.label, () => {
      closeModal();
      showDialog(choice.text);
    }, "secondary");
  });
}

const NOTE_LINES = [
  "PINEAPPLE DOES NOT BELONG ON PIZZA.",
  "1. Fruit has no business being hot. This is a pizza, not a smoothie.",
  "2. It makes the cheese cry. I HEARD it. It was awful.",
  "3. If I wanted sweet I'd order dessert. Or fight a Cuddle Team Leader.",
  "(signed: somebody who has seen things, and is also quite hungry)",
];

// A close-up of the handwritten note. The storm keeps hurting while it is open.
function showNote() {
  const panel = openModal("note");
  addCloseX(panel);
  panel.appendChild(el("p", "question", "A note, pinned to a dead tree:"));
  const paper = el("div", "note-paper");
  NOTE_LINES.forEach((line, i) => paper.appendChild(el("p", i === 0 ? "note-head" : "", line)));
  panel.appendChild(paper);
}

function showChugPrompt() {
  chugAsked = true;
  const panel = openModal("chug");
  panel.appendChild(el("h2", "", "Low health!"));
  const icon = el("img", "pixel chug");
  icon.src = IMG + "px/item_chug_jug.png";
  icon.alt = "";
  panel.appendChild(icon);
  panel.appendChild(el("p", "question", "The storm is chewing through your health. Drink the Chug Jug for +" + CHUG_HEAL + " health?"));
  addOption(panel, "Drink the Chug Jug (+" + CHUG_HEAL + " health)", () => {
    closeModal();
    perform("use_chug_jug");
  }, "danger-option");
}

// The danger alarm plays for 6 seconds while the card is up. The options can only be chosen when it
// has finished (so the player hears the warning first); a bar shows how long. With the sound off there is no wait.
const ALARM_SECONDS = 6;
function showHazard(v) {
  const panel = openModal("hazard");
  panel.appendChild(el("h2", "", "Danger!"));
  panel.appendChild(hazardPicture(v.hazard.id, sprites) || pxImage(v.hazard.image));     // H6 keeps its old picture until it is redesigned
  panel.appendChild(el("p", "question", v.hazard.situation));
  const buttons = v.choices.map((choice) => addOption(panel, choice.label, () => {
    closeModal();
    perform(choice.id);
  }, "danger-option"));
  const alarm = sounds.alert;
  let locked = false;
  if (!muted) {
    try {
      alarm.currentTime = 0;
      const started = alarm.play();
      locked = true;
      if (started) started.catch(() => release());                // the browser refused to play it: do not make the player wait
    } catch (e) { locked = false; }
  }
  if (!locked) return;
  const seconds = ALARM_SECONDS;
  const bar = el("div", "alarm-bar");
  const fill = el("div", "");
  fill.style.animationDuration = seconds + "s";
  bar.appendChild(fill);
  panel.appendChild(bar);
  buttons.forEach((b) => { b.disabled = true; });
  const guarded = modalKeys.map((fn) => () => { if (!locked) fn(); });
  modalKeys = guarded;
  function release() {
    if (!locked) return;
    locked = false;
    alarm.removeEventListener("ended", release);
    alarm.removeEventListener("pause", release);
    clearTimeout(fadeTimer); clearTimeout(stopTimer); clearInterval(fadeLoop);
    alarm.volume = 1;
    buttons.forEach((b) => { b.disabled = false; });
    fill.classList.add("ready");                                  // the bar is full and turns green
  }
  alarm.addEventListener("ended", release);
  alarm.addEventListener("pause", release);                       // the player switched the sound off
  let fadeLoop = null;
  const fadeTimer = setTimeout(() => {                            // the alarm fades out over its last half second
    const t0 = performance.now();
    fadeLoop = setInterval(() => { alarm.volume = Math.max(0, 1 - (performance.now() - t0) / 500); }, 40);
  }, (seconds - 0.5) * 1000);
  const stopTimer = setTimeout(() => { alarm.pause(); release(); }, seconds * 1000);           // 6 seconds, then the options unlock
}

function showEnding(v) {
  const panel = openModal("ending ending-" + v.ending.code.toLowerCase());
  const card = v.ending.code !== "A" && ELIMINATIONS[extras.death];       // the elimination card has its own big banner
  if (!card || v.ending.code !== "C") panel.appendChild(el("h2", "", v.ending.title));
  panel.appendChild(card ? eliminationCard(extras.death) : pxImage(v.ending.image));
  if (v.ending.code === "A") {
    const victory = el("img", "pixel victory");
    victory.src = IMG + "px/victory_banner.png";
    victory.alt = "Victory Royale";
    panel.appendChild(victory);
  }
  panel.appendChild(el("p", "question", v.ending.text));
  if (v.ending.code !== "C") {                                          // no breakdown when a danger on a path got the player
    const review = el("ul", "review");
    v.review.decisions.forEach((d) => review.appendChild(el("li", "", d.question + " → " + d.answer)));
    review.appendChild(el("li", "", "Dangers survived: " + v.review.hazards_survived));
    panel.appendChild(review);
  }
  addOption(panel, "New game", startOver);
}

// The elimination picture of the way the player lost: drawn in code and animated while the card is open.
function eliminationCard(id) {
  const card = el("canvas", "pixel");
  card.width = SW; card.height = SH;
  card.setAttribute("aria-label", "Elimination screen: " + (KILL_FEED[id] || ""));
  const cx = card.getContext("2d");
  const t0 = performance.now();
  const tick = (now) => {
    if (!card.isConnected) return;
    drawElimination(cx, id, (now - t0) / 1000, sprites);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return card;
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

// ---------- pause, save and exit ----------

function canPause() {
  return !$("stage").hidden && Boolean(state) && !modal && !busy && !paused;
}

function pauseGame() {
  if (!canPause()) return;
  paused = true;
  pausedAt = performance.now();
  pausedSounds = Object.values(sounds).filter((s) => !s.paused);
  pausedSounds.forEach((s) => s.pause());
  showPauseMenu();
}

function showPauseMenu() {
  const panel = openModal("pause");
  panel.appendChild(el("h2", "", "Paused"));
  addOption(panel, "Resume", resumePlay);
  addOption(panel, "New game", askNewGameFromPause, "secondary");
  addOption(panel, "Save & exit", saveAndExit, "secondary");
}

function resumePlay() {
  closeModal();
  paused = false;
  bus.t0 += performance.now() - pausedAt;          // the bus screen's 30 second wait does not run while paused
  if (!muted) pausedSounds.forEach((s) => { const p = s.play(); if (p) p.catch(() => {}); });
  pausedSounds = [];
}

function askNewGameFromPause() {
  const panel = openModal("confirm");
  panel.appendChild(el("p", "question", "Starting a new game erases your saved progress. Are you sure?"));
  addOption(panel, "Yes, start over", () => {
    startOver();
  });
  addOption(panel, "Cancel", showPauseMenu);
}

// Remember everything the rules do not know about: where the player stands and which texts were shown.
function saveSnapshot() {
  const onPath = scene === "path" && path;
  writeJson(SNAPSHOT_KEY, {
    stamp: JSON.stringify(state),            // only used while the saved game has not changed since
    scene: scene,
    pathFrom: onPath ? path.from : null,
    pathTo: onPath ? path.to : null,
    tx: player.tx, ty: player.ty, dir: player.dir,
    chugAsked: chugAsked,
    visited: Array.from(visited),
  });
}

function applySnapshot() {
  const snap = readJson(SNAPSHOT_KEY);
  if (!snap || snap.stamp !== JSON.stringify(state)) return;
  (snap.visited || []).forEach((id) => visited.add(id));
  chugAsked = Boolean(snap.chugAsked);
  if (snap.scene === "path" && snap.pathFrom === view.scene_id && view.ahead && snap.pathTo in view.ahead) {
    enterPath(snap.pathFrom, snap.pathTo);
  }
  if (snap.scene !== scene || scene === "bus") return;
  const inside = Number.isInteger(snap.tx) && Number.isInteger(snap.ty) &&
    snap.tx >= 0 && snap.tx < COLS && snap.ty >= 0 && snap.ty < ROWS;
  if (inside && !solidAt(snap.tx, snap.ty)) placePlayer(snap.tx, snap.ty, snap.dir);
}

function saveAndExit() {
  saveExtras();
  saveSnapshot();
  writeSave(state);
  leaveToTitle("Game saved. Load your game to carry on, or start a new one.");
}

// Back to the title picture: everything that is running stops.
function leaveToTitle(note) {
  Object.values(sounds).forEach((s) => s.pause());
  pausedSounds = [];
  paused = false;
  closeModal();
  resetDialogs();
  held.length = 0;
  cutscene.active = false; dance.active = false; caption = "";
  finale.phase = null; itemFly.active = false; landing.active = false; drop.active = false;
  bus.jumping = false;
  $("stage").hidden = true;
  showStart(note);
}

// "New game" inside the game: the old save is erased and the player is back at the very beginning.
function startOver() {
  clearSave();
  state = null; view = null; scene = null;
  leaveToTitle("");
}

// ---------- scenes ----------

function layoutScene(def, decorArg) {
  grid = def.build ? def.build() : decorArg;
  lc.clearRect(0, 0, VIEW_W, VIEW_H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(lc, grid[y][x], x, y, def.palAt ? def.palAt(x) : def.pal);
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
  layoutScene(town);
  if (id === "storm") {
    chugAsked = false;                       // the health is NOT reset: what the storm took stays taken
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
  if (id === "storm" && !opts.resume) pulseHealthBar();          // "watch this bar!" when the player enters the storm
  if (!landing.active) afterEnter(id);
}

// The health bar pulses three times so the player knows it is what to keep an eye on.
function pulseHealthBar() {
  const box = $("health-box");
  box.classList.remove("pulse");
  void box.offsetWidth;                // restart the animation
  box.classList.add("pulse");
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
  town = { pal: def.pal, exits: [], signs: def.signs, objects: def.objects, storm: null };
  layoutScene({ pal: def.pal, palAt: def.palAt, build: null, decor: def.decor }, def.grid);
  if (def.decal) drawHazardDecal(lc, def.decal, sprites, def.decalAt);
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
    // the elimination films and the jump out of the storm play first; their sounds come after
    const film = view.status === "ended" &&
      ((actionId.startsWith("hazard:") && before && before.hazard && DEATHS[before.hazard.id]) || actionId === "search");
    if (!film) soundsFor(before, view);
    afterAction(actionId, before, fromScene);
  } else {
    if (result.data.view) view = result.data.view;
    showDialog(rejectText || result.data.error || "Something went wrong. Please try again.");
    if (onReject) onReject();
  }
  updateHud();
}

function afterAction(actionId, before, fromScene) {
  if (actionId.startsWith("collect:")) {
    play("open");
    startItemFly(actionId.split(":")[1], () => { if (view.message) showDialog(view.message); });
    return;
  }
  if (actionId === "use_chug_jug") {
    health = Math.min(100, health + CHUG_HEAL);
    chugAsked = false;
    saveExtras();
    updateHealthBar();
    play("open", 1500);
    showDialog("Glug, glug, glug! Your health goes up by " + CHUG_HEAL + ". The Chug Jug is empty now.", null, true);
    return;
  }
  if (view.status === "ended") {
    resetDialogs();
    closeModal();
    if (actionId.startsWith("hazard:") && before && before.hazard) extras.death = before.hazard.id;
    else if (actionId === "storm_timeout") extras.death = "B";
    saveExtras();
    if (actionId === "search") {                                  // landed next to the Llama in time
      finaleHug();
    } else if (actionId.startsWith("hazard:") && before && before.hazard && DEATHS[before.hazard.id]) {
      startCutscene(DEATHS[before.hazard.id], () => { soundsFor(before, view); showEnding(view); });
    } else {
      showEnding(view);
    }
    return;
  }
  if (actionId.startsWith("hazard:")) {                           // a safe choice: say what happened, then arrive
    showDialog(view.message, () => transition(() => enterScene(view.scene_id, fromScene)));
    return;
  }
  if (view.hazard) {
    if (!before.hazard) showHazard(view);
    return;
  }
  if (view.scene_id !== fromScene) {
    const landed = fromScene === "bus";
    const leftStorm = fromScene === "storm";
    if (leftStorm) saveExtras();                                  // the health the storm took stays with the player
    transition(() => {
      enterScene(view.scene_id, fromScene, { landing: landed, spawn: leftStorm ? [9, 1] : undefined });
      if (leftStorm) showDialog(view.message);
    });
    return;
  }
  if (actionId === "decide:danced:yes") {
    startDance();
    return;
  }
  if (actionId === "decide:took_high_ground:yes") {               // up the mountain, binoculars, the llama in the distance
    startCutscene({ dur: SUMMIT_SECONDS, caption: "", draw: (c, t) => drawSummitBinoculars(c, t, sprites) },
      () => { startMusic(); if (view.message) showDialog(view.message); });
    return;
  }
  if (view.message) showDialog(view.message);
}

// ---------- the little films ----------

function startCutscene(def, onDone) {
  resetDialogs();
  closeModal();
  cutscene.active = true;
  cutscene.t = 0;
  cutscene.def = def;
  cutscene.onDone = onDone;
  sounds.music.pause();
}

function endCutscene() {
  const done = cutscene.onDone;
  cutscene.active = false;
  cutscene.onDone = null;
  cutscene.def = null;
  if (done) done();
}

// An item pops out of the machine, flies to the player and is tucked into the backpack.
function startItemFly(key, done) {
  const obj = town.objects.find((o) => o.kind === "collect" && o.key === key);
  itemFly.active = true;
  itemFly.t = 0;
  itemFly.sprite = sprites["item_" + key];
  itemFly.from = { x: (obj ? obj.x : player.tx) * T + 8, y: (obj ? obj.y : player.ty) * T + 6 };
  itemFly.done = done;
  itemFly.name = view.inventory.length ? view.inventory[view.inventory.length - 1].name : null;
}

function endItemFly() {
  itemFly.active = false;
  hudPop = itemFly.name;
  updateHud();
  setTimeout(() => { hudPop = null; }, 1200);
  if (itemFly.done) itemFly.done();
}

const HUG_GOOD = "You land right next to your Llama and give it the biggest hug of your life. It makes a noise a llama really should not be able to make. \"Time to go home,\" you whisper, and you pull out another Impulse Grenade.";
const HUG_BAD = "You land next to your Llama and hug it. Then it hits you: you have no idea where the safe zone is. The last Impulse Grenade would only throw you deeper into the purple fog.";

// The jump over the valley. The storm keeps draining health while the player is in the air. Only when the
// player lands next to the Llama with health left does the page tell the server ("search"): that is the win.
function startJump() {
  finale.phase = "jump";
  finale.t = 0;
  finale.before = view;
  finale.from = { x: player.tx, y: player.ty };
  finale.to = { x: 15, y: 5 };
  held.length = 0;
}

function finaleHug() {
  finale.phase = "hug";
  placePlayer(finale.to.x, finale.to.y, "right");
  const good = view.ending.code === "A";
  showDialog(good ? HUG_GOOD : HUG_BAD, () => {
    finale.phase = null;
    if (good) {
      startCutscene({ dur: 3.8, caption: "", draw: (c, t) => drawStormEscape(c, t, sprites) },
        () => { soundsFor(finale.before, view); showEnding(view); });
    } else {
      soundsFor(finale.before, view);
      showEnding(view);
    }
  });
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
    } else if (bus.jumping && bus.jt > 1.5) {
      bus.jt = BUS_JUMP_SECONDS;               // skip the rest of the film
    }
    return;
  }
  if (player.moving) return;
  const target = nearbyTarget();
  if (!target) return;
  if (target.kind === "sign") {
    readSigns.add(target.sign);
    showDialog(target.sign.desc || target.sign.text);           // only the long description
  } else {
    useObject(target.obj);
  }
}

// What the machines offer besides taking the item.
const OTHER_OPTION = {
  chug_jug: {
    ask: "A supply drop! What do you do?",
    label: "Save for a rainy day",
    text: "You decide to save the supply drop for a rainy day. It will still be here when you come back. (Psst: the storm is basically one giant rainy day.)",
  },
  impulse_grenades: {
    ask: "A vending machine, humming quietly. What do you do?",
    label: "Save a penny. Everything is so expensive these days.",
    text: "You keep your penny. The machine's screen flashes: 'IMPULSE GRENADES: 1 PENNY* (*plus tax, plus service fee, plus a mandatory subscription)'. You walk away richer by exactly one penny. Congratulations.",
  },
};

const BRIDGE_LINES = [
  "You peek over the edge. The valley is deep, the gap is wide and the llama is annoyingly close. Without a movement item, that jump is impossible.",
  "You take a mental run-up. Your brain says no. Your legs say 'bold of you to assume'. Without a movement item, that jump is impossible.",
  "The bridge is 50% bridge and 50% hole, and the missing half is the important one. You would need something that launches you, a movement item, or this ends with a very long fall.",
  "Across the gap, the llama chews calmly and ignores you. You consider shouting 'JUMP!' at yourself. Without a movement item, that jump is impossible.",
  "You throw a pebble across. It lands. You are bigger than a pebble. Without a movement item, that jump is impossible. (And the storm is still ticking.)",
];
let bridgeLine = -1;
function nextBridgeLine() {                           // a different line every time
  bridgeLine = (bridgeLine + 1 + Math.floor(Math.random() * (BRIDGE_LINES.length - 1))) % BRIDGE_LINES.length;
  return BRIDGE_LINES[bridgeLine];
}

// The exit tile in the Storm: leave and keep the health as it is.
function askLeaveStorm() {
  const panel = openModal("confirm");
  panel.appendChild(el("p", "question", "Leave the Storm and go back to Polar Peak? Your health stays exactly as it is. The storm will still be here."));
  addOption(panel, "Yes, leave the Storm", () => {
    closeModal();
    perform("leave_storm", () => stepBack());
  });
  addOption(panel, "No, stay in the Storm", () => {
    closeModal();
    stepBack();
  });
}

function useEdge() {
  if (!state.inventory.includes("impulse_grenades")) {
    showDialog(nextBridgeLine(), null, true);
    return;
  }
  const panel = openModal("menu");
  addCloseX(panel);
  panel.appendChild(el("p", "question", "Throw an Impulse Grenade at your feet and launch yourself across the valley? The storm keeps hurting you in the air!"));
  addOption(panel, "Throw the Impulse Grenade (jump!)", () => {
    closeModal();
    startJump();
  });
}

function useObject(o) {
  const inStorm = scene === "storm";
  if (o.kind === "npc") {
    let lines = o.lines;
    if (o.referee && state.inventory.includes("chug_jug")) lines = o.linesWithJug;
    const n = talkCount.get(o) || 0;
    talkCount.set(o, n + 1);
    showDialog((o.name || "") + ": " + lines[n % lines.length], null, inStorm);
    return;
  }
  if (o.kind === "note") {
    showNote();
    return;
  }
  if (o.kind === "edge") {
    useEdge();
    return;
  }
  const id = o.kind === "search" ? "search" : o.kind === "collect" ? "collect:" + o.key : "decide:" + o.key + ":";
  const choices = view.choices.filter((c) => (o.kind === "decide" ? c.id.startsWith(id) : c.id === id));
  if (!choices.length) {
    showDialog(o.kind === "collect" ? "It is empty. You already took what was inside." : "You have already decided here.");
    return;
  }
  const other = o.kind === "collect" ? OTHER_OPTION[o.key] : null;
  if (other) {
    openChoiceMenu(other.ask, choices, [{ label: other.label, text: other.text }]);
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
  if (grid && grid[y]) footstep(surfaceAt(grid[y][x]));
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
  if (town.stormExit && on(town.stormExit.tiles)) {          // the way back out of the Storm
    askLeaveStorm();
    return;
  }
  if (scene === "storm" && !state.inventory.includes("impulse_grenades") && x === 7 && (y === 5 || y === 6)) {
    showDialog(nextBridgeLine(), null, true);                 // at the broken bridge without a way across
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
  extras = { tiltedSeen: false, health: 100, death: null };
  health = 100;
  saveExtras();
  visited.clear();
  readSigns.clear();
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
  health = extras.health;
  visited.clear();
  readSigns.clear();
  talkCount.clear();
  dance.active = false; caption = "";
  $("start").hidden = true;
  $("stage").hidden = false;
  closeModal();
  resetDialogs();
  visited.add(view.scene_id);
  enterScene(view.scene_id, null, { resume: true });
  applySnapshot();
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

function drawFog(c, t, strength, rgb) {
  for (let i = 0; i < 16; i++) {
    const speed = 4 + (i % 5) * 2;
    const x = ((i * 53 + t / 1000 * speed) % (VIEW_W + 120)) - 60;
    const y = (i * 37) % VIEW_H;
    pixelEllipse(c, x, y, 34 + (i % 4) * 8, 9 + (i % 3) * 3, "rgba(" + (rgb || "255,225,250") + "," + strength + ")");
  }
}

// Things that move in the Storm: drifting fog, falling ash, lightning, a dark frame.
function drawStormOverlay(t) {
  drawFog(b, t, 0.2, "190,120,255");
  for (let i = 0; i < 4; i++) {                                       // fog rising out of the valley
    const x = 8 * T + ((i * 29 + t / 40) % 64), y = 168 - ((t / 30 + i * 41) % 130);
    pixelEllipse(b, x, y, 16, 6, "rgba(170,100,240,0.22)");
  }
  for (let i = 0; i < 26; i++) {                                      // ash and sparks blowing past
    const x = ((i * 47 - t / 9) % (VIEW_W + 20) + VIEW_W + 20) % (VIEW_W + 20) - 10;
    const y = (i * 29 + t / 14 * (1 + (i % 3) * 0.4)) % VIEW_H;
    px(b, Math.round(x), Math.round(y), 2, 2, i % 3 ? "rgba(230,190,255,0.55)" : "rgba(255,255,255,0.7)");
  }
  const phase = (t / 1000) % 5;
  if (phase < 0.14) {                                                 // lightning
    px(b, 0, 0, VIEW_W, VIEW_H, "rgba(235,215,255,0.3)");
    const bx = 40 + (Math.floor(t / 5000) * 83) % 240;
    [[0, 0], [-6, 14], [4, 30], [-5, 46], [3, 62], [-4, 80]].forEach(([dx, dy], k) => {
      px(b, bx + dx, dy, 3, 18, "#ffffff"); px(b, bx + dx + 1, dy, 1, 18, "#ffe6ff");
    });
  }
  const hurt = Math.floor(t / 1000) % 2 === 0 && canDrain();          // a faint red flash while the storm hurts
  px(b, 0, 0, VIEW_W, 6, "rgba(10,0,25,0.5)"); px(b, 0, VIEW_H - 6, VIEW_W, 6, "rgba(10,0,25,0.5)");
  px(b, 0, 0, 6, VIEW_H, "rgba(10,0,25,0.4)"); px(b, VIEW_W - 6, 0, 6, VIEW_H, "rgba(10,0,25,0.4)");
  if (hurt) px(b, 0, 0, VIEW_W, VIEW_H, "rgba(255,0,0,0.06)");
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

// ----- football: Ronaldo, Neymar Jr. and Neuer pass the ball round the triangle -----
const PASS_MS = 1500, HOLD_MS = 500;

function footballState(t) {
  const cycle = PASS_MS + HOLD_MS;
  const n = Math.floor(t / cycle), within = t % cycle;
  return { from: n % 3, to: (n + 1) % 3, flying: within >= HOLD_MS, p: Math.max(0, (within - HOLD_MS) / PASS_MS) };
}

function footballPose(i, t) {
  const f = footballState(t);
  if (f.flying && f.from === i && f.p < 0.2) return "kick";
  if (f.flying && f.to === i && f.p > 0.6) return "run";
  return "idle";
}

function drawBall(t) {
  const players = town.football.players;
  const f = footballState(t);
  const feet = (i) => [players[i][0] * T + 8, players[i][1] * T + 15];
  const [ax, ay] = feet(f.from), [bx, by] = feet(f.to);
  const side = Math.sign(bx - ax) * 5;
  let x = ax + side, y = ay, lift = 0;
  if (f.flying) {
    const p = f.p;
    x = ax + side + (bx - side - ax - side) * p;
    y = ay + (by - ay) * p;
    lift = Math.sin(Math.PI * p) * (5 + Math.hypot(bx - ax, by - ay) * 0.12) + Math.abs(Math.sin(p * Math.PI * 2)) * 1.5 * (1 - p);
  }
  const spin = f.flying ? Math.floor(f.p * 10) % 3 : 0;
  const ox = Math.round(x) - 4, oy = Math.round(y - lift) - 9;
  pixelEllipse(b, Math.round(x), Math.round(y), 5, 1, "rgba(0,0,0,0.3)");
  px(b, ox + 1, oy, 7, 9, "#1b1030"); px(b, ox, oy + 1, 9, 7, "#1b1030");        // outline
  px(b, ox + 2, oy + 1, 5, 7, "#ffffff"); px(b, ox + 1, oy + 2, 7, 5, "#ffffff");   // a bigger ball
  px(b, ox + 3 + (spin === 1 ? 1 : 0), oy + 2, 3, 3, "#222"); px(b, ox + 1 + (spin === 2 ? 1 : 0), oy + 5, 2, 2, "#222"); px(b, ox + 6, oy + 5 - (spin === 0 ? 1 : 0), 2, 2, "#222");
  px(b, ox + 2, oy + 2, 1, 1, "#cfd2dc");
  return (y - lift) / T;
}

function drawArrow(c, cx, cy, dir, t) {            // a pulsing white arrow that shows where one can walk
  const wave = Math.sin(t / 250);
  const out = Math.round(wave * 3) + 2;
  const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir];
  c.save();
  c.translate(Math.round(cx), Math.round(cy));
  c.rotate(angle);
  c.translate(out, 0);
  c.globalAlpha = 0.65 + 0.35 * wave;
  px(c, -9, -3, 11, 7, "#1b1030");
  for (let k = 0; k < 7; k++) px(c, k, -(6 - k), 1, 2 * (6 - k) + 1, "#1b1030");
  px(c, -8, -2, 9, 5, "#ffffff");
  for (let k = 0; k < 6; k++) px(c, 1 + k, -(5 - k), 1, 2 * (5 - k) + 1, "#ffffff");
  c.restore();
}

function exitDirection([tx, ty]) {
  return tx === 0 ? "left" : tx === COLS - 1 ? "right" : ty === 0 ? "up" : "down";
}

function drawExitArrows(t) {
  const lists = scene === "path" ? Object.values(path.def.ends).map((e) => e.tiles) : (town.exits || []).map((e) => e.tiles);
  if (town.leave) lists.push(town.leave.tiles);
  if (town.stormExit) lists.push(town.stormExit.tiles);                      // the way back out of the Storm
  lists.forEach((tiles) => {
    const cx = tiles.reduce((a, [x]) => a + x, 0) / tiles.length * T + 8;
    const cy = tiles.reduce((a, [, y]) => a + y, 0) / tiles.length * T + 8;
    drawArrow(b, cx, cy, exitDirection(tiles[0]), t);
  });
}

function drawDoorGlow(t) {                         // a pulsing yellow frame around the entrance (like the glow on things you can use)
  (town.doors || []).forEach((door) => {
    const pulse = 0.5 + 0.5 * Math.sin(t / 280);
    const xs = door.tiles.map(([x]) => x), ys = door.tiles.map(([, y]) => y);
    const x0 = Math.min(...xs) * T, y0 = Math.min(...ys) * T, w = (Math.max(...xs) - Math.min(...xs) + 1) * T, h = (Math.max(...ys) - Math.min(...ys) + 1) * T;
    pixelEllipse(b, x0 + w / 2, y0 + h - 3, 22, 6, "rgba(255,210,63," + (0.25 + 0.2 * pulse).toFixed(2) + ")");
    const col = "rgba(255,210,63," + (0.55 + 0.45 * pulse).toFixed(2) + ")";
    px(b, x0, y0, w, 2, col); px(b, x0, y0 + h - 2, w, 2, col); px(b, x0, y0, 2, h, col); px(b, x0 + w - 2, y0, 2, h, col);
    const bounce = Math.round(Math.abs(Math.sin(t / 240)) * 4);       // a bouncing arrow above the door
    const ax = x0 + w / 2, ay = y0 - 12 - bounce;
    px(b, ax - 5, ay - 1, 11, 4, "#1b1030"); px(b, ax - 4, ay, 9, 2, "#ffd23f");
    for (let k = 0; k < 5; k++) { px(b, ax - 5 + k, ay + 3 + k, 11 - 2 * k, 1, "#1b1030"); px(b, ax - 4 + k, ay + 3 + k, 9 - 2 * k, 1, "#ffd23f"); }
  });
}

function drawActors(t) {
  const actors = [];
  const ground = [];
  drawDoorGlow(t);
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
  const openSigns = (town.signs || []).filter((sg) => sg.marker && !readSigns.has(sg));
  openSigns.forEach((sg) => {                                      // the storm sign glows like the other things to use
    const pulse = 0.28 + 0.2 * Math.sin(t / 280);
    pixelEllipse(b, sg.x * T + 8, sg.y * T + 13, 13, 6, "rgba(255,210,63," + pulse.toFixed(2) + ")");
    pixelEllipse(b, sg.x * T + 8, sg.y * T + 13, 8, 4, "rgba(255,240,150," + (pulse + 0.12).toFixed(2) + ")");
  });
  if (scene === "path" && path && path.def.decal) {                // the moving hazards: tent, bush, sniper glint
    const at = path.def.decalAt;
    actors.push({ y: at[1] + 1, draw: () => drawHazardLive(b, path.def.decal, at, t) });
  }
    if (town.football) actors.push({ y: 9.9, draw: () => drawBall(t) });
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
    let mx = ox + 5, my = topY - 14 - bounce;
    if (my < 2) { mx = ox + 13; my = oy - 8 + bounce; }              // at the top edge of the screen: beside the head
    px(b, mx - 1, my - 1, 8, 13, "#1b1030");
    px(b, mx, my, 6, 11, "#ffd23f");
    px(b, mx + 2, my + 1, 2, 5, "#1b1030");
    px(b, mx + 2, my + 8, 2, 2, "#1b1030");
  });
  openSigns.forEach((sg) => {
    const bounce = Math.round(Math.abs(Math.sin(t / 240)) * 4);
    const mx = sg.x * T + 5, my = sg.y * T - 14 - bounce;
    px(b, mx - 1, my - 1, 8, 13, "#1b1030");
    px(b, mx, my, 6, 11, "#ffd23f");
    px(b, mx + 2, my + 1, 2, 5, "#1b1030");
    px(b, mx + 2, my + 8, 2, 2, "#1b1030");
  });
  // effects on top: the grenade shock ring, the item flying into the backpack
  if (finale.phase === "jump" && finale.t > 0.55 && finale.t < 1.05) {
    shockRing(b, finale.from.x * T + 8, finale.from.y * T + 14, (finale.t - 0.55) / 0.5);
  }
  if (itemFly.active) {
    drawItemFly(b, itemFly.t / itemFly.dur, itemFly.from, { x: player.tx * T + 5, y: player.ty * T - 4 }, itemFly.sprite);
  }
}

function drawObjectSprite(o, done, t) {
  const ox = o.x * T, oy = o.y * T;
  if (o.kind === "npc") {
    drawNPC(b, ox, oy, o.style, o.ball !== undefined ? footballPose(o.ball, t) : o.pose, t);
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
  if (finale.phase === "jump") {                // the jump over the valley with an Impulse Grenade
    const sx = finale.from.x * T, sy = finale.from.y * T, ex = finale.to.x * T, ey = finale.to.y * T;
    if (finale.t < 0.6) {
      drawPlayer(b, sx, sy, "right", 0, "walk", t);
      const grenade = sprites.item_impulse_grenades;                 // the grenade rolls to the feet
      if (grenade.complete && grenade.naturalWidth) {
        const gp = finale.t / 0.6;
        b.drawImage(grenade, Math.round(sx + 6 + gp * 6), Math.round(sy + 6 - Math.sin(Math.PI * gp) * 10), 12, 11);
      }
      return;
    }
    const p = Math.min(1, (finale.t - 0.6) / 1.5);
    const e = p * p * (3 - 2 * p);
    drawPlayer(b, Math.round(sx + (ex - sx) * e), Math.round(sy + (ey - sy) * p - Math.sin(Math.PI * p) * 70), "down", 0, "fall", t);
    return;
  }
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
  b.drawImage(layer, 0, 0);
  drawActors(t);
  if (scene === "storm") {
    drawStormOverlay(t);
    if (!landing.active && !itemFly.active && !finale.phase) drawExitArrows(t);       // the arrow back out of the Storm
  } else {
    drawStormTiles(t);
    if (!landing.active && !dance.active && !itemFly.active) drawExitArrows(t);
  }
}

function drawBusScene(t) {
  if (bus.jumping) {                                              // jumping out of the bus: a little film
    drawBusJump(b, Math.min(bus.jt, BUS_JUMP_SECONDS + 0.5), sprites.bus);
    return;
  }
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
    const cx = 16 + (i % 2) * 160, cy = DROP_TOP + Math.floor(i / 2) * DROP_ROW;
    const selected = i === bus.sel;
    px(b, cx - 3, cy - 3, 134, 78, selected ? "#ffd23f" : "#1b1030");
    const img = sprites["drop_" + zone.id];
    if (img.complete && img.naturalWidth) b.drawImage(img, cx, cy);
  });
}

function labelBox(text, x, y) {                   // a small white box with a short line of text
  ctx.font = 'bold 14px "Courier New", Courier, monospace';
  const w = ctx.measureText(text).width + 16;
  const cx = Math.max(w / 2 + 4, Math.min(canvas.width - w / 2 - 4, x));
  ctx.fillStyle = "#1b1030"; ctx.fillRect(cx - w / 2 - 2, y - 17, w + 4, 26);
  ctx.fillStyle = "#fffdf0"; ctx.fillRect(cx - w / 2, y - 15, w, 22);
  ctx.fillStyle = "#1b1030"; ctx.textAlign = "center";
  ctx.fillText(text, cx, y);
}

function captionBox(text) {                        // a text box at the bottom that does not block anything
  const words = text.split(" ");
  let lines = [text];
  if (text.length > 62) {
    const mid = Math.ceil(words.length / 2);
    lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  }
  ctx.font = 'bold 16px "Courier New", Courier, monospace';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 40;
  const h = 14 + lines.length * 24;
  const x = canvas.width / 2 - w / 2, y = canvas.height - h - 24;
  ctx.fillStyle = "#1b1030"; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = "#fffdf0"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#1b1030"; ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, y + 28 + i * 24));
}

function drawLabels(t) {
  if (cutscene.active) {
    if (cutscene.def.caption && cutscene.t > 0.6) captionBox(cutscene.def.caption);
    return;
  }
  if (scene === "bus") {
    if (bus.phase === "select" && !bus.jumping) {
      outlineText(ctx, "WHERE WE DROPPIN?", canvas.width / 2, 36, "#ffffff", 20);
      BUS_ZONES.forEach((zone, i) => {                            // each name sits above its own picture
        const cx = 16 + (i % 2) * 160, cy = DROP_TOP + Math.floor(i / 2) * DROP_ROW;
        outlineText(ctx, zone.name, (cx + 64) * SCALE, (cy - 5) * SCALE, i === bus.sel ? "#ffd23f" : "#ffffff", 13);
      });
    }
    return;
  }
  if (!modal && !dialogOpen && !landing.active && !dance.active && !finale.phase && !itemFly.active) {
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
      labelBox(label, (target.x * T + 8) * SCALE, Math.max(70, (tileTop - 34) * SCALE));
    } else if (town && town.doors) {
      town.doors.forEach((door) => {                              // near the entrance: say that one can walk in
        const [dx, dy] = door.tiles[0];
        if (Math.abs(player.tx - dx) <= 3 && Math.abs(player.ty - dy) <= 3) {
          labelBox(door.hint, (dx * T + T) * SCALE, Math.max(70, (dy * T - 30) * SCALE));
        }
      });
    }
  }
  if (caption) captionBox(caption);                                 // (the dance)
  if (banner.time > 0) {
    ctx.globalAlpha = Math.min(1, banner.time / 500);
    outlineText(ctx, banner.text.toUpperCase(), canvas.width / 2, 34, "#ffd23f", 24);
    ctx.globalAlpha = 1;
  }
}

// ---------- the loop ----------

// The storm hurts while the player plays. It waits during menus, films and the Chug Jug offer, but not
// while reading the note or talking (those are choices that cost health).
function canDrain() {
  const waiting = dialogOpen && !(dialogCurrent && dialogCurrent.live);
  return scene === "storm" && !busy && !waiting && !cutscene.active && (!finale.phase || finale.phase === "jump") && !itemFly.active &&
    (!modal || modal === "note") && Boolean(view) && view.status === "in_progress";
}

let lastTime = performance.now();
function loop(now) {
  const real = now - lastTime;             // real time: animations and sounds keep their length
  const dt = Math.min(50, real);           // capped time: walking and the storm never jump ahead
  lastTime = now;
  if (!$("start").hidden) {                  // the title picture
    drawTitleScene(tb, now / 1000, sprites);
    titleCtx.imageSmoothingEnabled = false;
    titleCtx.drawImage(titleBase, 0, 0, titleCanvas.width, titleCanvas.height);
  }
  if (!$("stage").hidden && scene) {
    if (!paused) update(dt, now, real);
    if (cutscene.active) cutscene.def.draw(b, cutscene.t);
    else if (scene === "bus") drawBusScene(now); else drawWorld(now);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    drawLabels(now);
    if (banner.time > 0 && !paused) banner.time -= dt;
  }
  requestAnimationFrame(loop);
}

function canMove() {
  return !modal && !dialogOpen && !busy && scene !== "bus" && !landing.active && !dance.active &&
    !cutscene.active && !finale.phase && !itemFly.active;
}

function update(dt, now, real) {
  if (cutscene.active) {                            // a little film is playing
    cutscene.t += real / 1000;
    if (cutscene.t >= cutscene.def.dur) endCutscene();
    return;
  }
  if (itemFly.active) {
    itemFly.t += real;
    if (itemFly.t >= itemFly.dur) endItemFly();
  }
  if (finale.phase === "jump") {
    finale.t += real / 1000;
    if (finale.t >= 2.3 && health > 0 && !busy) perform("search");       // landed with health left: the Llama is yours
  }
  // the bus screen waits for 30 seconds or a click, then moves on
  if (scene === "bus" && dialogOpen && (bus.phase === "intro" || bus.phase === "ready") && now - bus.t0 > AUTO_ADVANCE_MS) {
    nextDialog();
  }
  if (scene === "bus" && bus.jumping) {
    bus.jt += real / 1000;
    if (bus.jt >= BUS_JUMP_SECONDS && !busy) {      // the film is over: land at the chosen place
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
      finale.phase = null;                           // out of health in the air: no landing
      perform("storm_timeout");
    } else if (health <= CHUG_AT && !finale.phase && !chugAsked && state.inventory.includes("chug_jug") && modal !== "chug") {
      showChugPrompt();                              // low health: offer the Chug Jug
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
  if (code === "Escape" || code === "KeyP") {
    e.preventDefault();
    if (e.repeat) return;
    if (paused && modal === "pause") resumePlay();
    else pauseGame();
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
    }
    return;
  }
  if (code === "Space" || code === "Enter" || code === "KeyE") {
    e.preventDefault();
    if (e.repeat) return;
    if (cutscene.active) {
      if (cutscene.t > 1.2) cutscene.t = cutscene.def.dur;       // skip the film
      return;
    }
    if (dialogOpen) nextDialog();
    else if (!busy && !landing.active && !dance.active && !finale.phase && !itemFly.active) interact();
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
$("health-box").addEventListener("animationend", (e) => e.currentTarget.classList.remove("pulse"));
$("pause-btn").addEventListener("click", (e) => { e.currentTarget.blur(); pauseGame(); });
$("mute-btn").addEventListener("click", (e) => { e.currentTarget.blur(); setMuted(!muted); });
$("dialog").addEventListener("click", nextDialog);
canvas.addEventListener("click", () => {
  if (cutscene.active && cutscene.t > 1.2) cutscene.t = cutscene.def.dur;
  else if (scene === "bus" && dialogOpen) nextDialog();
});

loadExtras();
setMuted(muted);
showStart();
updateHealthBar();
requestAnimationFrame(loop);
