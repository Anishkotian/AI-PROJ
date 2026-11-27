// main.js - entry point. Creates the game and connects it to the UI.
import { Game } from "./game.js";
import { LEVELS } from "./levels.js";
import * as ui from "./ui.js";

const { settings } = ui;

ui.initUI();

const game = new Game(document.getElementById("game-canvas"));

// ---------- Game -> UI ----------
function refresh() {
  const g = game;
  const r = g.hero.lastResult;
  const stunned = g.hero.stun > 0;

  ui.updateHud({
    turn: g.turn,
    countdown: g.level.countdown,
    turnsLeft: g.level.countdown - g.turn,
    actions: `${g.actionsLeft} / ${g.level.actionsPerTurn}`,
    traps: g.resources.traps,
    obstacles: g.resources.obstacles,
    doors: g.resources.doors,
    health: g.villain.health,
    maxHealth: g.villain.maxHealth,
    algorithm: g.algorithm,
    tool: g.tool,
  });

  ui.updateAiPanel({
    algorithm: g.algorithm,
    hero: `(${g.hero.x}, ${g.hero.y})`,
    target: `(${g.villain.x}, ${g.villain.y})`,
    state: stunned ? `stuck in trap (${g.hero.stun} turns)` : r && r.found ? "following path" : "no route",
    nodes: r ? r.nodesExplored : 0,
    length: r && r.found ? r.pathLength : "-",
    cost: r && r.found ? r.totalCost : "-",
    recalculations: g.recalculations,
    path: r && r.found && g.hero.path.length
      ? g.hero.path.map((p) => `(${p.x},${p.y})`).join(" → ")
      : "-",
  });

  ui.renderComparison(g.comparison);
}

game.onUpdate = refresh;
game.onMessage = ui.setStatus;
game.onFps = ui.setFps;
game.onEnd = (status) => {
  if (status === "victory") {
    ui.showOverlay({
      kind: "win",
      title: "VICTORY",
      text: `The countdown hit zero. The villain survived with ${game.villain.health} health!`,
      canNext: game.hasNextLevel(),
    });
  } else {
    ui.showOverlay({
      kind: "lose",
      title: "DEFEAT",
      text: "The hero defeated the villain. Try a different strategy.",
      canNext: false,
    });
  }
};

// ---------- Starting levels ----------
function startLevel(index) {
  game.algorithm = settings.ai;
  game.showExplored = settings.showExplored;
  game.tool = "trap";
  game.loadLevel(index);
  ui.setSelectedLevel(index);
  ui.setLevelTitle(`Level ${index + 1}: ${game.level.name}`);
  ui.hideOverlay();
}

ui.initLevelSelect(LEVELS.map((l) => l.name), startLevel);

ui.onScreenChange((screenName) => {
  if (screenName === "game") {
    ui.syncGameControls();
    startLevel(0);
    game.start();
  } else {
    game.stop();
  }
});

// ---------- UI -> Game ----------
ui.onMoveKey((dx, dy) => game.movePlayer(dx, dy));
ui.onShortcuts({ endTurn: () => game.endTurn(), tool: (t) => game.setTool(t) });
ui.onEndTurn(() => game.endTurn());
ui.onReset(() => startLevel(game.levelIndex));
ui.onToolSelect((tool) => game.setTool(tool));
ui.onAlgorithmSelect((name) => game.setAlgorithm(name));
ui.onCompare(() => game.compare());
ui.onExploredToggle((value) => { game.showExplored = value; game.render(); });
ui.onOverlayButtons({
  next: () => startLevel(game.levelIndex + 1),
  retry: () => startLevel(game.levelIndex),
});

// Mouse: convert canvas fractions into tile coordinates.
function tileAt(fx, fy) {
  return { x: Math.floor(fx * game.grid.width), y: Math.floor(fy * game.grid.height) };
}
ui.onCanvasPointer({
  click: (fx, fy) => {
    if (!game.grid) return;
    const t = tileAt(fx, fy);
    game.clickTile(t.x, t.y);
  },
  move: (fx, fy) => {
    if (!game.grid) return;
    const t = tileAt(fx, fy);
    game.hover = game.previewTile(t.x, t.y);
  },
  leave: () => { game.hover = null; },
});

// For testing from the browser Console.
window.game = game;
