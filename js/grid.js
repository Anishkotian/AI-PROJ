// grid.js - the dungeon map as DATA. No drawing, no AI, no DOM here.

export const TILE = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  DOOR_OPEN: 2,
  DOOR_CLOSED: 3,
  TRAP: 4,
  OBSTACLE: 5,
});

export class Grid {
  constructor(layout) {
    this.height = layout.length;
    this.width = layout[0].length;
    this.spawns = { hero: null, villain: null, player: null };
    this.tiles = [];

    for (let y = 0; y < this.height; y++) {
      if (layout[y].length !== this.width) {
        throw new Error(
          `Row ${y} has length ${layout[y].length}, expected ${this.width}`
        );
      }
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(this.parseChar(layout[y][x], x, y));
      }
      this.tiles.push(row);
    }
  }

  parseChar(ch, x, y) {
    switch (ch) {
      case "#": return TILE.WALL;
      case ".": return TILE.FLOOR;
      case "D": return TILE.DOOR_OPEN;
      case "d": return TILE.DOOR_CLOSED;
      case "H": this.spawns.hero = { x, y };    return TILE.FLOOR;
      case "V": this.spawns.villain = { x, y }; return TILE.FLOOR;
      case "P": this.spawns.player = { x, y };  return TILE.FLOOR;
      default:
        throw new Error(`Unknown map character "${ch}" at (${x}, ${y})`);
    }
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x, y) {
    if (!this.inBounds(x, y)) return TILE.WALL;
    return this.tiles[y][x];
  }

  setTile(x, y, type) {
    if (this.inBounds(x, y)) this.tiles[y][x] = type;
  }

  isWalkable(x, y) {
    const t = this.getTile(x, y);
    return t === TILE.FLOOR || t === TILE.DOOR_OPEN || t === TILE.TRAP;
  }
}
