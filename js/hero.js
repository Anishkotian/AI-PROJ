// hero.js - the AI-controlled enemy.
// It asks pathfinding.js for a route and walks it one tile at a time.

import { findPath } from "./pathfinding.js";

export class Hero {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.drawX = x;
    this.drawY = y;
    this.facing = { dx: 1, dy: 0 };
    this.path = [];          // tiles still to walk; path[0] is the next step
    this.lastResult = null;  // full result of the latest search (for the AI panel)
    this.stun = 0;           // turns still lost because of a trap
  }

  // PLAN: search from the hero's tile to `goal` and remember the answer.
  planPath(grid, goal, algorithm, options = {}) {
    const result = findPath(grid, this, goal, algorithm, options);
    this.lastResult = result;
    this.path = result.path.slice();
    return result;
  }

  // ACT: one step along the path. Returns true if the hero moved.
  stepAlong(isBlocked = () => false) {
    if (this.path.length === 0) return false;
    const next = this.path[0];
    if (isBlocked(next.x, next.y)) return false;

    this.facing = {
      dx: Math.sign(next.x - this.x),
      dy: Math.sign(next.y - this.y),
    };
    this.x = next.x;
    this.y = next.y;
    this.path.shift();
    return true;
  }
}
