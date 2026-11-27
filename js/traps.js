// traps.js - placing traps, obstacles and toggling doors.
// Pure rules on a Grid. No drawing, no DOM.
// A placement that would completely seal the villain in is REFUSED
// (A* itself is used as the validator).

import { TILE } from "./grid.js";
import { findPath } from "./pathfinding.js";

// Which resource each tool spends.
export const TOOLS = {
  trap:     { label: "Trap",     resource: "traps" },
  obstacle: { label: "Obstacle", resource: "obstacles" },
  door:     { label: "Door",     resource: "doors" },
};

const fail = (reason) => ({ ok: false, reason, to: null });
const ok = (to) => ({ ok: true, reason: "", to });

// Checks a placement WITHOUT changing the grid (it changes and restores it).
// ctx = { isOccupied(x, y), hero, villain }
export function evaluate(grid, tool, x, y, ctx) {
  if (!TOOLS[tool]) return fail("Select a tool first.");
  if (!grid.inBounds(x, y)) return fail("Outside the map.");

  const from = grid.getTile(x, y);
  let to;

  if (tool === "trap") {
    if (from !== TILE.FLOOR) return fail("Traps can only go on plain floor.");
    to = TILE.TRAP;
  } else if (tool === "obstacle") {
    if (from !== TILE.FLOOR) return fail("Obstacles can only go on plain floor.");
    to = TILE.OBSTACLE;
  } else {
    if (from === TILE.DOOR_OPEN) to = TILE.DOOR_CLOSED;
    else if (from === TILE.DOOR_CLOSED) to = TILE.DOOR_OPEN;
    else return fail("Click a door to open or close it.");
  }

  if (ctx.isOccupied(x, y)) return fail("A character is standing there.");

  // Traps never block the hero. Obstacles and closed doors might seal the villain in.
  if (to === TILE.OBSTACLE || to === TILE.DOOR_CLOSED) {
    grid.setTile(x, y, to);
    const result = findPath(grid, ctx.hero, ctx.villain, "astar");
    grid.setTile(x, y, from); // always restore
    if (!result.found) return fail("That would seal the villain in. Leave the hero a route.");
  }

  return ok(to);
}

// Same check, then really changes the grid when allowed.
export function tryPlace(grid, tool, x, y, ctx) {
  const result = evaluate(grid, tool, x, y, ctx);
  if (result.ok) grid.setTile(x, y, result.to);
  return result;
}
