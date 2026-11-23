"use strict";

// The game progress is saved in the player's own browser (localStorage).
// The server only checks the rules and sends back the new state.
const SAVE_KEY = "fortnite-llama-escape-save";

const $ = (id) => document.getElementById(id);
let state = null;   // current game state (what gets saved)
let status = null;  // "in_progress" or "ended"

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

function render(view) {
  show("start", false);
  show("confirm", false);
  show("game", true);
  status = view.status;

  $("scene-name").textContent = view.scene_name;
  $("scene-text").textContent = view.text;
  // At an ending the ending text is shown instead of the last message.
  const message = view.status === "ended" ? "" : view.message;
  $("message").textContent = message || "";
  show("message", Boolean(message));
  $("inventory").textContent = view.inventory.length ? view.inventory.join(", ") : "empty";

  const actions = $("actions");
  actions.replaceChildren();
  view.actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => act(action.id));
    actions.appendChild(button);
  });

  const ended = view.status === "ended";
  show("ending", ended);
  show("review", ended);
  if (ended) {
    $("ending-code").textContent = "ENDING " + view.ending.code;
    $("ending-title").textContent = view.ending.title;
    $("scene-text").textContent = view.ending.text;
    const list = $("review-list");
    list.replaceChildren();
    view.review.decisions.forEach((d) => {
      const li = document.createElement("li");
      li.textContent = d.question + " \u2192 " + d.answer;
      list.appendChild(li);
    });
    const hazards = document.createElement("li");
    hazards.textContent = "Dangers survived: " + view.review.hazards_survived;
    list.appendChild(hazards);
  }
}

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
}

async function act(actionId) {
  const result = await post("/api/action", { state: state, action: actionId });
  if (result.ok) {
    state = result.data.state;
    writeSave(state);       // saved after every accepted action
    showError("");
    render(result.data.view);
  } else if (result.status === 409) {
    // Not allowed: nothing changed, show why.
    render(result.data.view);
    showError(result.data.error);
  } else {
    showError(result.data.error || "Something went wrong. Please try again.");
  }
}

function askToStartOver() {
  // Ask first only when there is progress that would be lost.
  const needsConfirm = Boolean(readSave()) && status !== "ended";
  if (needsConfirm) {
    show("start", false);
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

showStart();
