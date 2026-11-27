// player.js - the villain's assistant (the character YOU control).
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.drawX = x;
    this.drawY = y;
    this.facing = { dx: 0, dy: 1 };
    this.steps = 0;
  }

  // Try to move one tile. Returns true if the move happened.
  tryMove(grid, dx, dy, isOccupied = () => false) {
    this.facing = { dx, dy };
    const newX = this.x + dx;
    const newY = this.y + dy;

    if (!grid.isWalkable(newX, newY)) return false;
    if (isOccupied(newX, newY)) return false;

    this.x = newX;
    this.y = newY;
    this.steps++;
    return true;
  }
}
