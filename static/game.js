"use strict";

// The game progress is saved in the player's own browser (localStorage).
// The server only checks the rules and sends back the new state.
const SAVE_KEY = "fortnite-llama-escape-save";
const MUTE_KEY = "fortnite-llama-escape-muted";
const IMG = document.body.dataset.img;
const AUDIO = document.body.dataset.audio;

const $ = (id) => document.getElementById(id);
let state = null;     // current game state (what gets saved)
let lastView = null;  // what is currently shown
let busy = false;     // true while the player token is moving

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
    showError("Your browser blocked saving. You can keep playing, but progress will be lost.");
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

function play(name, options) {
  if (muted) return;
  const sound = sounds[name];
  try {
    sound.currentTime = 0;
    const promise = sound.play();
    if (promise) promise.catch(() => {}); // the browser may block sound until the player clicks
    if (options && options.stopAfter) {
      setTimeout(() => sound.pause(), options.stopAfter);
    }
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
  $("mute-btn").textContent = value ? "Sound: off" : "Sound: on";
  $("mute-btn").setAttribute("aria-pressed", String(value));
  if (value) {
    Object.values(sounds).forEach((s) => s.pause());
  } else if (lastView && lastView.status === "in_progress") {
    startMusic();
  }
}

// Sounds that belong to what just happened (only after a player action).
function soundsFor(before, after) {
  if (!before || !after) return;
  if (!before.hazard && after.hazard) {
    play("alert", { stopAfter: 3000 });
  }
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

// ---------- talking to the server ----------

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

// ---------- showing things ----------

function show(id, visible) {
  $(id).hidden = !visible;
}

function showError(text) {
  $("error").textContent = text || "";
  show("error", Boolean(text));
}

function showStart(note) {
  const saved = readSave();
  $("start-note").textContent = note ||
    (saved ? "You have a saved game." : "Welcome! Ready to look for your Llama?");
  show("resume-btn", Boolean(saved));
  show("start", true);
  show("game", false);
  show("confirm", false);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function placeToken(view) {
  const target = view.map.nodes.find((n) => n.id === view.map.token_at) ||
    { x: 50, y: 50 };
  const token = $("token");
  token.style.left = target.x + "%";
  token.style.top = target.y + "%";
}

function drawMap(view) {
  const nodes = view.map.nodes;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // dashed paths between all four places, and a purple one into the Storm
  const lines = $("map-lines");
  lines.replaceChildren();
  const places = nodes.filter((n) => n.id !== "bus" && n.id !== "storm");
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      lines.appendChild(svgLine(places[i], places[j], ""));
    }
  }
  if (byId.storm && byId.polar_peak) {
    lines.appendChild(svgLine(byId.polar_peak, byId.storm, "storm-line"));
  }
  if (byId.bus) {
    places.forEach((p) => lines.appendChild(svgLine(byId.bus, p, "")));
  }

  const box = $("map-nodes");
  box.replaceChildren();
  nodes.forEach((n) => {
    const button = el("button", "node", n.name);
    button.type = "button";
    button.style.left = n.x + "%";
    button.style.top = n.y + "%";
    if (n.here) button.classList.add("here");
    if (n.id === "storm") button.classList.add("storm");
    if (n.action) {
      button.classList.add("go");
      button.addEventListener("click", () => move(n));
    } else {
      button.disabled = true;
    }
    box.appendChild(button);
  });
  placeToken(view);
}

function svgLine(a, b, className) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", a.x);
  line.setAttribute("y1", a.y);
  line.setAttribute("x2", b.x);
  line.setAttribute("y2", b.y);
  if (className) line.setAttribute("class", className);
  return line;
}

function render(view) {
  lastView = view;
  show("start", false);
  show("confirm", false);
  show("game", true);

  const ended = view.status === "ended";
  const inHazard = Boolean(view.hazard);

  show("map-box", !ended);
  drawMap(view);
  $("map-hint").textContent = ended || inHazard ? "" :
    view.map.nodes.some((n) => n.action) ? "Click a glowing place on the map to move there." : "";

  const card = $("card");
  card.classList.toggle("danger", inHazard);

  // picture: ending, danger or the current place
  const picture = ended ? view.ending.image : inHazard ? view.hazard.image : view.image;
  $("scene-img").src = IMG + picture;
  $("scene-img").alt = ended ? view.ending.title : inHazard ? view.hazard.situation : view.scene_name;

  const prop = !ended && !inHazard && view.props.length ? view.props[0] : null;
  show("prop-img", Boolean(prop));
  if (prop) {
    $("prop-img").src = IMG + prop.image;
    $("prop-img").alt = prop.name;
  }

  $("scene-name").textContent = view.scene_name;
  $("scene-text").textContent = ended ? view.ending.text : view.text;
  // At an ending the ending text is shown instead of the last message.
  const message = ended || inHazard ? "" : view.message;
  $("message").textContent = message || "";
  show("message", Boolean(message));

  const actions = $("actions");
  actions.replaceChildren();
  view.choices.forEach((choice) => {
    const button = el("button", "choice");
    button.type = "button";
    if (choice.image) {
      const icon = el("img");
      icon.src = IMG + choice.image;
      icon.alt = "";
      button.appendChild(icon);
    }
    button.appendChild(el("span", "", choice.label));
    if (inHazard) button.classList.add("danger-option");
    button.addEventListener("click", () => act(choice.id));
    actions.appendChild(button);
  });

  const ending = $("ending");
  show("ending", ended);
  ending.className = "ending" + (ended ? " ending-" + view.ending.code.toLowerCase() : "");
  if (ended) {
    $("ending-code").textContent = "ENDING " + view.ending.code;
    $("ending-title").textContent = view.ending.title;
  }
  show("review", ended);
  if (ended) {
    const list = $("review-list");
    list.replaceChildren();
    view.review.decisions.forEach((d) => {
      list.appendChild(el("li", "", d.question + " → " + d.answer));
    });
    list.appendChild(el("li", "", "Dangers survived: " + view.review.hazards_survived));
  }

  const inventory = $("inventory");
  inventory.replaceChildren();
  if (!view.inventory.length) {
    inventory.appendChild(el("li", "empty", "empty"));
  }
  view.inventory.forEach((item) => {
    const li = el("li");
    const icon = el("img");
    icon.src = IMG + item.icon;
    icon.alt = "";
    li.appendChild(icon);
    li.appendChild(el("span", "", item.name));
    inventory.appendChild(li);
  });
}

// ---------- game flow ----------

async function startNewGame() {
  const result = await post("/api/new");
  if (!result.ok) {
    showError("Could not start a new game. Please try again.");
    return;
  }
  state = result.data.state;
  writeSave(state);
  showError("");
  render(result.data.view);
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
  showError("");
  render(result.data.view);
  if (result.data.view.status === "in_progress") startMusic();
}

// Walk the player token to a place on the map, then ask the server to move.
async function move(node) {
  if (busy) return;
  busy = true;
  $("map").classList.add("busy");
  const token = $("token");
  token.style.left = node.x + "%";
  token.style.top = node.y + "%";
  await new Promise((resolve) => setTimeout(resolve, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 950));
  await act(node.action);
  busy = false;
  $("map").classList.remove("busy");
}

async function act(actionId) {
  const before = lastView;
  const result = await post("/api/action", { state: state, action: actionId });
  if (result.ok) {
    state = result.data.state;
    writeSave(state);       // saved after every accepted action
    showError("");
    render(result.data.view);
    soundsFor(before, result.data.view);
  } else if (result.status === 409) {
    // Not allowed: nothing changed, show why.
    render(result.data.view);
    showError(result.data.error);
  } else {
    showError(result.data.error || "Something went wrong. Please try again.");
    if (lastView) placeToken(lastView);
  }
}

function askToStartOver() {
  // Ask first only when there is progress that would be lost.
  const needsConfirm = Boolean(readSave()) && !(lastView && lastView.status === "ended");
  if (needsConfirm) {
    show("start", false);
    show("game", false);
    show("confirm", true);
  } else {
    startNewGame();
  }
}

$("resume-btn").addEventListener("click", resume);
$("new-btn").addEventListener("click", askToStartOver);
$("restart-btn").addEventListener("click", askToStartOver);
$("confirm-yes").addEventListener("click", startNewGame);
$("confirm-no").addEventListener("click", () => {
  show("confirm", false);
  if (state) {
    show("game", true);   // cancel: back to the game, nothing changed
  } else {
    showStart();
  }
});
$("mute-btn").addEventListener("click", () => setMuted(!muted));

setMuted(muted);
showStart();
