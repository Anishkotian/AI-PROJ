// ui.js - everything that touches the DOM (menus, panels, buttons, keyboard, mouse).
// Game rules and AI are NOT allowed in this file. It receives plain data and shows it.

// ---------- Settings (saved in the browser) ----------
const STORAGE_KEY = "save-the-villain-settings";

const defaultSettings = {
  ai: "astar",
  showExplored: true,
  showFps: false,
};

export const settings = { ...defaultSettings };

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) Object.assign(settings, saved);
  } catch (err) {
    console.warn("Could not load settings, using defaults.", err);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Could not save settings.", err);
  }
}

const $ = (id) => document.getElementById(id);
const AI_NAMES = { astar: "A* Search", greedy: "Greedy Best-First" };

// ---------- Screen switching ----------
const screenListeners = [];

export function onScreenChange(listener) {
  screenListeners.push(listener);
}

export function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  hideOverlay();
  screenListeners.forEach((listener) => listener(name));
}

export function setLevelTitle(text) {
  $("level-title").textContent = text;
}

export function setStatus(text) {
  $("game-status").textContent = text;
}

// ---------- Keyboard + mouse ----------
const KEY_DIRECTIONS = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
};

function gameScreenActive() {
  return $("screen-game").classList.contains("active");
}

export function onMoveKey(handler) {
  document.addEventListener("keydown", (event) => {
    if (!gameScreenActive()) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = event.target.tagName;
    if (tag === "SELECT" || tag === "INPUT") return; // let dropdowns use the arrows

    const direction = KEY_DIRECTIONS[event.key.toLowerCase()];
    if (!direction) return;
    event.preventDefault();
    handler(direction[0], direction[1]);
  });
}

// Keys: E = end turn, 1/2/3 = trap/obstacle/door tool.
export function onShortcuts({ endTurn, tool }) {
  document.addEventListener("keydown", (event) => {
    if (!gameScreenActive()) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const tag = event.target.tagName;
    if (tag === "SELECT" || tag === "INPUT") return;
    const k = event.key.toLowerCase();
    if (k === "e") endTurn();
    if (k === "1") tool("trap");
    if (k === "2") tool("obstacle");
    if (k === "3") tool("door");
  });
}

// Mouse over the canvas. Handlers get fractions 0..1 of the canvas, so
// this file does not need to know the grid size.
export function onCanvasPointer({ click, move, leave }) {
  const canvas = $("game-canvas");
  const frac = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  };
  canvas.addEventListener("click", (e) => click(...frac(e)));
  canvas.addEventListener("mousemove", (e) => move(...frac(e)));
  canvas.addEventListener("mouseleave", () => leave());
}

// ---------- Game screen controls ----------
export function onEndTurn(handler) {
  $("btn-end-turn").addEventListener("click", handler);
}

export function onReset(handler) {
  $("btn-reset").addEventListener("click", handler);
}

export function onToolSelect(handler) {
  document.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => handler(btn.dataset.tool));
  });
}

export function onAlgorithmSelect(handler) {
  $("game-ai").addEventListener("change", () => handler($("game-ai").value));
}

export function onCompare(handler) {
  $("btn-compare").addEventListener("click", handler);
}

export function onExploredToggle(handler) {
  $("ai-show-explored").addEventListener("change", () => {
    settings.showExplored = $("ai-show-explored").checked;
    $("setting-explored").checked = settings.showExplored;
    saveSettings();
    handler(settings.showExplored);
  });
}

export function initLevelSelect(names, handler) {
  const select = $("game-level");
  select.innerHTML = "";
  names.forEach((name, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Level ${i + 1}: ${name}`;
    select.appendChild(option);
  });
  select.addEventListener("change", () => handler(Number(select.value)));
}

export function setSelectedLevel(index) {
  $("game-level").value = String(index);
}

// Put the saved settings into the in-game controls.
export function syncGameControls() {
  $("game-ai").value = settings.ai;
  $("ai-show-explored").checked = settings.showExplored;
  $("fps").classList.toggle("hidden", !settings.showFps);
}

export function setFps(value) {
  if (settings.showFps) $("fps").textContent = value + " FPS";
}

// ---------- Panels (plain data in, text out) ----------
export function updateHud(info) {
  $("hud-turn").textContent = `${info.turn} / ${info.countdown}`;
  $("hud-left").textContent = info.turnsLeft;
  $("hud-actions").textContent = info.actions;
  $("hud-traps").textContent = info.traps;
  $("hud-obstacles").textContent = info.obstacles;
  $("hud-doors").textContent = info.doors;
  $("hud-health").textContent = "♥".repeat(info.health) + "♡".repeat(info.maxHealth - info.health);
  $("hud-algo").textContent = AI_NAMES[info.algorithm];
  $("game-ai").value = info.algorithm;

  document.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.tool === info.tool);
  });
}

export function updateAiPanel(info) {
  $("ai-algo").textContent = AI_NAMES[info.algorithm];
  $("ai-hero").textContent = info.hero;
  $("ai-target").textContent = info.target;
  $("ai-state").textContent = info.state;
  $("ai-nodes").textContent = info.nodes;
  $("ai-length").textContent = info.length;
  $("ai-cost").textContent = info.cost;
  $("ai-recalc").textContent = info.recalculations;
  $("ai-path").textContent = info.path;
}

export function renderComparison(rows) {
  const box = $("compare-result");
  if (!rows) {
    box.innerHTML = '<p class="hint">Runs both algorithms on the current map from the hero\'s current tile.</p>';
    return;
  }
  const fmt = (v) => (v === null || v === undefined ? "-" : v);
  const eff = (v) => (v === null ? "-" : (v * 100).toFixed(1) + "%");
  const head = "<tr><th></th>" + rows.map((r) => `<th>${AI_NAMES[r.algorithm]}</th>`).join("") + "</tr>";
  const line = (label, get) =>
    `<tr><td>${label}</td>` + rows.map((r) => `<td>${get(r)}</td>`).join("") + "</tr>";
  box.innerHTML =
    "<table class='compare'>" +
    head +
    line("Route found", (r) => (r.found ? "yes" : "no")) +
    line("Nodes explored", (r) => fmt(r.nodesExplored)) +
    line("Path length", (r) => (r.found ? r.pathLength : "-")) +
    line("Total cost", (r) => fmt(r.totalCost)) +
    line("Efficiency*", (r) => eff(r.efficiency)) +
    "</table><p class='hint'>*path length ÷ nodes explored</p>";
}

// ---------- Victory / defeat overlay ----------
export function showOverlay({ title, text, kind, canNext }) {
  $("overlay-title").textContent = title;
  $("overlay-text").textContent = text;
  $("overlay-box").className = "overlay-box " + kind;
  $("btn-overlay-next").classList.toggle("hidden", !canNext);
  $("overlay").classList.remove("hidden");
}

export function hideOverlay() {
  $("overlay").classList.add("hidden");
}

export function onOverlayButtons({ next, retry }) {
  $("btn-overlay-next").addEventListener("click", next);
  $("btn-overlay-retry").addEventListener("click", retry);
}

// ---------- Settings screen wiring ----------
function initSettingsScreen() {
  const aiSelect = $("setting-ai");
  const exploredBox = $("setting-explored");
  const fpsBox = $("setting-fps");
  const savedMsg = $("settings-saved");

  aiSelect.value = settings.ai;
  exploredBox.checked = settings.showExplored;
  fpsBox.checked = settings.showFps;

  aiSelect.addEventListener("change", () => {
    settings.ai = aiSelect.value;
    saveSettings();
    savedMsg.textContent = "Saved.";
  });
  exploredBox.addEventListener("change", () => {
    settings.showExplored = exploredBox.checked;
    saveSettings();
    savedMsg.textContent = "Saved.";
  });
  fpsBox.addEventListener("change", () => {
    settings.showFps = fpsBox.checked;
    saveSettings();
    savedMsg.textContent = "Saved.";
  });
}

export function initUI() {
  loadSettings();

  document.querySelectorAll("[data-target]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.target));
  });

  initSettingsScreen();
}
