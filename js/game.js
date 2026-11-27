// game.js - the controller. Owns the state, runs turns and rules.

import { Grid, TILE } from "./grid.js";
import { LEVELS } from "./levels.js";
import { Renderer } from "./renderer.js";
import { Player } from "./player.js";
import { Villain } from "./villain.js";
import { Hero } from "./hero.js";
import { findPath } from "./pathfinding.js";
import { TOOLS, evaluate, tryPlace } from "./traps.js";

const sameTile = (a, b) => a.x === b.x && a.y === b.y;
function samePath(a, b) {
  if (a.length !== b.length) return false;
  return a.every((tile, i) => sameTile(tile, b[i]));
}

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);

    // Hooks that main.js fills in (the game never touches the DOM itself).
    this.onUpdate = () => {};
    this.onMessage = () => {};
    this.onEnd = () => {};
    this.onFps = () => {};

    this.algorithm = "astar";
    this.showExplored = true;
    this.tool = "trap";
    this.hover = null;

    this.levelIndex = 0;
    this.level = null;
    this.grid = null;
    this.player = null;
    this.villain = null;
    this.hero = null;

    this.turn = 0;
    this.status = "playing"; // "playing" | "victory" | "defeat"
    this.actionsLeft = 0;
    this.resources = { traps: 0, obstacles: 0, doors: 0 };
    this.recalculations = 0;
    this.prevPath = [];
    this.comparison = null;

    this.running = false;
    this.fpsFrames = 0;
    this.fpsTime = 0;
  }

  // ---------- Level setup ----------
  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.grid = new Grid(this.level.layout);

    const { player, villain, hero } = this.grid.spawns;
    this.player = new Player(player.x, player.y);
    this.villain = new Villain(villain.x, villain.y, this.level.villainHealth);
    this.hero = new Hero(hero.x, hero.y);

    this.turn = 0;
    this.status = "playing";
    this.actionsLeft = this.level.actionsPerTurn;
    this.resources = { ...this.level.resources };
    this.recalculations = 0;
    this.prevPath = [];
    this.comparison = null;
    this.hover = null;

    this.renderer.resizeFor(this.grid);
    this.replan("start");
    this.onMessage(this.level.tip);
    this.render();
    this.onUpdate();
  }

  reset() {
    this.loadLevel(this.levelIndex);
  }

  hasNextLevel() {
    return this.levelIndex < LEVELS.length - 1;
  }

  // ---------- Helpers ----------
  isOccupiedByCharacter(x, y) {
    return (
      (this.villain.x === x && this.villain.y === y) ||
      (this.hero.x === x && this.hero.y === y)
    );
  }

  placementContext() {
    return {
      isOccupied: (x, y) =>
        this.isOccupiedByCharacter(x, y) || (this.player.x === x && this.player.y === y),
      hero: this.hero,
      villain: this.villain,
    };
  }

  inRange(x, y) {
    return Math.abs(x - this.player.x) + Math.abs(y - this.player.y) <= this.level.range;
  }

  // ---------- AI ----------
  // reason: "start" | "turn" (silent) | "player" | "switch" (counted when the route changes)
  replan(reason) {
    const old = this.hero.path.slice();
    const result = this.hero.planPath(this.grid, this.villain, this.algorithm, {
      trapCost: this.level.trapCost,
    });
    const counts = reason === "player" || reason === "switch";
    if (counts && old.length > 0 && !samePath(old, result.path)) {
      this.recalculations++;
      this.prevPath = old; // so the renderer can show old vs new route
    }
    return result;
  }

  setAlgorithm(name) {
    this.algorithm = name;
    if (this.grid && this.status === "playing") {
      this.replan("switch");
      this.render();
      this.onUpdate();
    }
  }

  // Runs both algorithms on the CURRENT map from the hero's CURRENT tile.
  compare() {
    if (!this.grid) return null;
    const options = { trapCost: this.level.trapCost };
    const rows = ["astar", "greedy"].map((name) => {
      const r = findPath(this.grid, this.hero, this.villain, name, options);
      return {
        algorithm: name,
        found: r.found,
        nodesExplored: r.nodesExplored,
        pathLength: r.pathLength,
        totalCost: r.totalCost,
        // share of explored nodes that ended up on the path (higher = more efficient)
        efficiency: r.found && r.nodesExplored > 0 ? r.pathLength / r.nodesExplored : null,
      };
    });
    this.comparison = rows;
    this.onUpdate();
    return rows;
  }

  // ---------- Player actions ----------
  setTool(tool) {
    this.tool = tool;
    this.onUpdate();
  }

  movePlayer(dx, dy) {
    if (!this.grid || this.status !== "playing") return false;
    const moved = this.player.tryMove(this.grid, dx, dy, (x, y) =>
      this.isOccupiedByCharacter(x, y)
    );
    this.render();
    return moved;
  }

  // Preview for the hover highlight.
  previewTile(x, y) {
    if (!this.grid || this.status !== "playing" || !TOOLS[this.tool]) return null;
    if (!this.grid.inBounds(x, y)) return null;
    const res = this.resources[TOOLS[this.tool].resource];
    if (this.actionsLeft <= 0 || res <= 0 || !this.inRange(x, y)) return { x, y, ok: false };
    return { x, y, ok: evaluate(this.grid, this.tool, x, y, this.placementContext()).ok };
  }

  clickTile(x, y) {
    if (!this.grid || this.status !== "playing") return false;
    if (!TOOLS[this.tool]) return false;

    if (this.actionsLeft <= 0) {
      this.onMessage("No actions left this turn. Press End Turn.");
      return false;
    }
    const key = TOOLS[this.tool].resource;
    if (this.resources[key] <= 0) {
      this.onMessage(`You have no ${key} left.`);
      return false;
    }
    if (!this.inRange(x, y)) {
      this.onMessage(`Too far away. Walk closer (range ${this.level.range}).`);
      return false;
    }

    const result = tryPlace(this.grid, this.tool, x, y, this.placementContext());
    if (!result.ok) {
      this.onMessage(result.reason);
      return false;
    }

    this.resources[key]--;
    this.actionsLeft--;

    const before = this.recalculations;
    this.replan("player");
    const rerouted = this.recalculations > before;
    this.onMessage(
      rerouted
        ? "The hero recalculated and chose a new route."
        : "Placed. The hero's route is unchanged."
    );
    this.render();
    this.onUpdate();
    return true;
  }

  // ---------- Turn loop ----------
  endTurn() {
    if (!this.grid || this.status !== "playing") return null;

    this.prevPath = [];
    const hero = this.hero;
    let event = "";

    // Hero phase
    if (hero.stun > 0) {
      hero.stun--;
      event = "The hero is stuck in a trap and loses the turn.";
    } else if (!hero.lastResult.found) {
      event = "The hero can't find any route.";
    } else if (hero.path.length === 1) {
      // The next tile is the villain's: attack instead of moving.
      this.villain.takeDamage(1);
      event = `The hero attacks the villain! Health ${this.villain.health}/${this.villain.maxHealth}.`;
    } else {
      hero.stepAlong();
      if (this.grid.getTile(hero.x, hero.y) === TILE.TRAP) {
        this.grid.setTile(hero.x, hero.y, TILE.FLOOR); // trap is used up
        hero.stun = this.level.trapDelay;
        event = `The hero stepped on a trap and loses ${hero.stun} turns!`;
      } else {
        event = `The hero moves. ${hero.path.length} steps to go.`;
      }
      this.replan("turn"); // refresh explored nodes from the new position
    }

    this.turn++;
    this.actionsLeft = this.level.actionsPerTurn;

    if (!this.villain.isAlive()) this.status = "defeat";
    else if (this.turn >= this.level.countdown) this.status = "victory";

    this.onMessage(event);
    this.render();
    this.onUpdate();
    if (this.status !== "playing") this.onEnd(this.status);
    return { event, status: this.status };
  }

  // ---------- Drawing + animation loop ----------
  render(time = 0) {
    if (!this.grid) return;
    const r = this.hero.lastResult;
    this.renderer.draw(
      this.grid,
      { player: this.player, villain: this.villain, hero: this.hero },
      {
        time,
        explored: this.showExplored && r ? r.explored : [],
        path: this.hero.path,
        prevPath: this.prevPath,
        hover: this.hover,
        tool: this.tool,
        range: this.level.range,
        player: this.player,
        status: this.status,
      }
    );
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.animate(dt);
      this.render(now / 1000);

      this.fpsFrames++;
      this.fpsTime += dt;
      if (this.fpsTime >= 0.5) {
        this.onFps(Math.round(this.fpsFrames / this.fpsTime));
        this.fpsFrames = 0;
        this.fpsTime = 0;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
  }

  // Slide the drawn positions toward the real ones (time-based, so it
  // looks the same at 60 or 144 FPS).
  animate(dt) {
    if (!this.grid) return;
    const k = Math.min(1, dt * 12);
    for (const e of [this.player, this.villain, this.hero]) {
      e.drawX += (e.x - e.drawX) * k;
      e.drawY += (e.y - e.drawY) * k;
    }
  }
}
