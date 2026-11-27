// villain.js - the character the player must protect.
export class Villain {
  constructor(x, y, maxHealth = 3) {
    this.x = x;
    this.y = y;
    this.drawX = x; // smoothed position used only by the renderer
    this.drawY = y;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  takeDamage(amount = 1) {
    this.health = Math.max(0, this.health - amount);
  }

  isAlive() {
    return this.health > 0;
  }
}
