// pathfinding.js - pure AI code. No canvas, no DOM, no game rules.
// It READS a Grid and returns data. It never changes the grid.

import { TILE } from "./grid.js";

export const DEFAULT_TRAP_COST = 3;

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

// Manhattan distance: steps needed if there were no walls at all.
export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function keyOf(x, y) {
  return x + "," + y;
}

// Cost of ENTERING a tile.
function tileCost(grid, x, y, trapCost) {
  return grid.getTile(x, y) === TILE.TRAP ? 1 + trapCost : 1;
}

// Follow parent links from the goal back to the start. Start tile excluded.
function reconstructPath(goalNode) {
  const path = [];
  let current = goalNode;
  while (current.parent !== null) {
    path.push({ x: current.x, y: current.y });
    current = current.parent;
  }
  path.reverse();
  return path;
}

// Every algorithm returns the same shape.
function makeResult(algorithm, goalNode, explored) {
  if (goalNode === null) {
    return {
      algorithm,
      found: false,
      path: [],
      pathLength: 0,
      totalCost: null,
      explored,
      nodesExplored: explored.length,
    };
  }
  const path = reconstructPath(goalNode);
  return {
    algorithm,
    found: true,
    path,
    pathLength: path.length,
    totalCost: goalNode.g,
    explored,
    nodesExplored: explored.length,
  };
}

// ---------- A* Search: picks lowest f = g + h ----------
export function aStar(grid, start, goal, options = {}) {
  const trapCost = options.trapCost ?? DEFAULT_TRAP_COST;

  const startNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: manhattan(start, goal),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  const open = [startNode];
  const openLookup = new Map([[keyOf(start.x, start.y), startNode]]);
  const closed = new Set();
  const explored = [];

  while (open.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[i];
      const b = open[bestIndex];
      if (a.f < b.f || (a.f === b.f && a.h < b.h)) bestIndex = i;
    }
    const current = open.splice(bestIndex, 1)[0];
    const currentKey = keyOf(current.x, current.y);
    openLookup.delete(currentKey);

    closed.add(currentKey);
    explored.push({ x: current.x, y: current.y });

    if (current.x === goal.x && current.y === goal.y) {
      return makeResult("astar", current, explored);
    }

    for (const { dx, dy } of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!grid.isWalkable(nx, ny)) continue;

      const neighbourKey = keyOf(nx, ny);
      if (closed.has(neighbourKey)) continue;

      const tentativeG = current.g + tileCost(grid, nx, ny, trapCost);

      const existing = openLookup.get(neighbourKey);
      if (existing === undefined) {
        const h = manhattan({ x: nx, y: ny }, goal);
        const node = { x: nx, y: ny, g: tentativeG, h, f: tentativeG + h, parent: current };
        open.push(node);
        openLookup.set(neighbourKey, node);
      } else if (tentativeG < existing.g) {
        existing.g = tentativeG;
        existing.f = tentativeG + existing.h;
        existing.parent = current;
      }
    }
  }

  return makeResult("astar", null, explored);
}

// ---------- Greedy Best-First Search: picks lowest h only ----------
export function greedy(grid, start, goal, options = {}) {
  const trapCost = options.trapCost ?? DEFAULT_TRAP_COST;

  const startNode = { x: start.x, y: start.y, g: 0, h: manhattan(start, goal), parent: null };

  const open = [startNode];
  const seen = new Set([keyOf(start.x, start.y)]);
  const explored = [];

  while (open.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].h < open[bestIndex].h) bestIndex = i;
    }
    const current = open.splice(bestIndex, 1)[0];
    explored.push({ x: current.x, y: current.y });

    if (current.x === goal.x && current.y === goal.y) {
      return makeResult("greedy", current, explored);
    }

    for (const { dx, dy } of DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!grid.isWalkable(nx, ny)) continue;

      const key = keyOf(nx, ny);
      if (seen.has(key)) continue;
      seen.add(key);

      open.push({
        x: nx,
        y: ny,
        g: current.g + tileCost(grid, nx, ny, trapCost),
        h: manhattan({ x: nx, y: ny }, goal),
        parent: current,
      });
    }
  }

  return makeResult("greedy", null, explored);
}

// ---------- The switcher: the hero only ever calls this ----------
export function findPath(grid, start, goal, algorithm = "astar", options = {}) {
  switch (algorithm) {
    case "astar":  return aStar(grid, start, goal, options);
    case "greedy": return greedy(grid, start, goal, options);
    default:
      throw new Error(`Unknown algorithm "${algorithm}"`);
  }
}
