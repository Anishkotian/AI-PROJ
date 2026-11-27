// renderer.js - draws the game state onto the canvas.
// It READS the grid and entities but never changes them.

import { TILE } from "./grid.js";

export const TILE_SIZE = 56;
const S = TILE_SIZE;

const COLORS = {
  background: "#0d0b12",
  floorA: "#2a2535",
  floorB: "#252030",
  gridLine: "rgba(0, 0, 0, 0.25)",
  wallFace: "#352e45",
  wallTop: "#4a4160",
  wallEdge: "#1a1624",
  door: "#8a5a2b",
  doorDark: "#5a3a1a",
  iron: "#b8b0c8",
  obstacle: "#6b6478",
  obstacleEdge: "#3d3848",
  heroMarker: "#e63950",
  villainMarker: "#b44cff",
  player: "#2fb8c4",
  playerDark: "#14444a",
  villainCape: "#5b1f8f",
  villainSkin: "#d8cce6",
  villainEyes: "#ff3b4e",
  heroArmor: "#c9d3e0",
  heroArmorDark: "#7e8a9c",
  heroPlume: "#e63950",
  healthBack: "#1a1624",
  healthFill: "#b44cff",
  explored: "rgba(80, 140, 255, 0.22)",
  pathNew: "#3ddc84",
  pathOld: "#ff9f43",
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  resizeFor(grid) {
    this.canvas.width = grid.width * S;
    this.canvas.height = grid.height * S;
  }

  // entities: { player, villain, hero }
  // view: { time, explored, path, prevPath, hover, tool, range, player, status }
  draw(grid, entities = {}, view = {}) {
    const ctx = this.ctx;
    this.time = view.time || 0;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Layer 1: the map
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        this.drawTile(grid.getTile(x, y), x, y);
      }
    }

    // Layer 2: markers and AI overlays
    this.drawMarker(grid.spawns.hero, COLORS.heroMarker);
    this.drawMarker(grid.spawns.villain, COLORS.villainMarker);
    this.drawExplored(view.explored);
    this.drawRange(grid, view);
    this.drawRoute(view.prevPath, COLORS.pathOld, true, entities.hero);
    this.drawRoute(view.path, COLORS.pathNew, false, entities.hero);
    this.drawHover(view.hover);

    // Layer 3: characters
    if (entities.villain) this.drawVillain(entities.villain);
    if (entities.hero) this.drawHero(entities.hero);
    if (entities.player) this.drawPlayer(entities.player);
  }

  // ---------- Map tiles ----------
  drawTile(type, x, y) {
    const px = x * S;
    const py = y * S;

    if (type === TILE.WALL) {
      this.drawWall(px, py);
      return;
    }
    this.drawFloor(x, y, px, py);

    switch (type) {
      case TILE.DOOR_OPEN:   this.drawDoorOpen(px, py);   break;
      case TILE.DOOR_CLOSED: this.drawDoorClosed(px, py); break;
      case TILE.TRAP:        this.drawTrap(px, py);       break;
      case TILE.OBSTACLE:    this.drawObstacle(px, py);   break;
    }
  }

  drawFloor(x, y, px, py) {
    const ctx = this.ctx;
    ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
    ctx.fillRect(px, py, S, S);
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, S - 1, S - 1);
  }

  drawWall(px, py) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.wallFace;
    ctx.fillRect(px, py, S, S);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(px + 3, py + 3, S - 6, S - 12);
    ctx.strokeStyle = COLORS.wallEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, S - 2, S - 2);
  }

  drawDoorOpen(px, py) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(px + 4, py + 4, 8, S - 8);
    ctx.fillRect(px + S - 12, py + 4, 8, S - 8);
  }

  drawDoorClosed(px, py) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.door;
    ctx.fillRect(px + 4, py + 4, S - 8, S - 8);
    ctx.strokeStyle = COLORS.doorDark;
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      const lx = px + 4 + ((S - 8) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(lx, py + 4);
      ctx.lineTo(lx, py + S - 4);
      ctx.stroke();
    }
    ctx.strokeStyle = COLORS.iron;
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 4, py + 4, S - 8, S - 8);
  }

  // Trap: a red glow that pulses over time.
  drawTrap(px, py) {
    const ctx = this.ctx;
    const cx = px + S / 2;
    const cy = py + S / 2;
    const pulse = 0.75 + 0.25 * Math.sin(this.time * 4);

    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, S / 2);
    glow.addColorStop(0, `rgba(230, 57, 80, ${0.95 * pulse})`);
    glow.addColorStop(1, "rgba(230, 57, 80, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(px, py, S, S);

    ctx.fillStyle = "#ffd0d6";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();
  }

  drawObstacle(px, py) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.obstacle;
    ctx.strokeStyle = COLORS.obstacleEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + S / 2, py + S / 2, S * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawMarker(pos, color) {
    if (!pos) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(pos.x * S + 6, pos.y * S + 6, S - 12, S - 12);
    ctx.restore();
  }

  // ---------- AI overlays ----------
  // Explored nodes: a blue wash over every tile the search examined.
  drawExplored(explored) {
    if (!explored || explored.length === 0) return;
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.explored;
    for (const t of explored) {
      ctx.fillRect(t.x * S + 2, t.y * S + 2, S - 4, S - 4);
    }
  }

  // Faint purple wash on the tiles the player can reach with the current tool.
  drawRange(grid, view) {
    if (!view.player || !view.range || !view.tool || view.status !== "playing") return;
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(180, 76, 255, 0.07)";
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const d = Math.abs(x - view.player.x) + Math.abs(y - view.player.y);
        if (d <= view.range && grid.getTile(x, y) !== TILE.WALL) {
          ctx.fillRect(x * S, y * S, S, S);
        }
      }
    }
  }

  // A line through tile centres, starting at the hero.
  drawRoute(path, color, dashed, hero) {
    if (!path || path.length === 0 || !hero) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = dashed ? 3 : 4;
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.9;
    if (dashed) ctx.setLineDash([8, 6]);

    ctx.beginPath();
    ctx.moveTo(hero.x * S + S / 2, hero.y * S + S / 2);
    for (const t of path) ctx.lineTo(t.x * S + S / 2, t.y * S + S / 2);
    ctx.stroke();

    if (!dashed) {
      ctx.setLineDash([]);
      for (const t of path) {
        ctx.beginPath();
        ctx.arc(t.x * S + S / 2, t.y * S + S / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawHover(hover) {
    if (!hover) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = hover.ok ? "#3ddc84" : "#ff4d5e";
    ctx.fillStyle = hover.ok ? "rgba(61, 220, 132, 0.18)" : "rgba(255, 77, 94, 0.18)";
    ctx.lineWidth = 3;
    ctx.fillRect(hover.x * S, hover.y * S, S, S);
    ctx.strokeRect(hover.x * S + 2, hover.y * S + 2, S - 4, S - 4);
    ctx.restore();
  }

  // ---------- Characters ----------
  drawShadow(cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlayer(player) {
    const ctx = this.ctx;
    const cx = (player.drawX ?? player.x) * S + S / 2;
    const cy = (player.drawY ?? player.y) * S + S / 2;

    this.drawShadow(cx, cy);

    ctx.save();
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16);
    ctx.lineTo(cx + 15, cy + 18);
    ctx.lineTo(cx - 15, cy + 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = COLORS.playerDark;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
    ctx.fill();

    const ex = player.facing.dx * 2;
    const ey = player.facing.dy * 2;
    ctx.fillStyle = "#ffe14d";
    ctx.beginPath();
    ctx.arc(cx - 4 + ex, cy - 8 + ey, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4 + ex, cy - 8 + ey, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawVillain(villain) {
    const ctx = this.ctx;
    const tx = villain.drawX ?? villain.x;
    const ty = villain.drawY ?? villain.y;
    const cx = tx * S + S / 2;
    const cy = ty * S + S / 2 + Math.sin(this.time * 2) * 1.5; // gentle hover

    this.drawShadow(cx, ty * S + S / 2);

    ctx.save();
    ctx.shadowColor = COLORS.villainMarker;
    ctx.shadowBlur = 14;
    ctx.fillStyle = COLORS.villainCape;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 4);
    ctx.lineTo(cx + 8, cy - 4);
    ctx.lineTo(cx + 18, cy + 18);
    ctx.lineTo(cx - 18, cy + 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#2b1140";
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 12);
    ctx.lineTo(cx - 13, cy - 25);
    ctx.lineTo(cx - 3, cy - 16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 9, cy - 12);
    ctx.lineTo(cx + 13, cy - 25);
    ctx.lineTo(cx + 3, cy - 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.villainSkin;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = COLORS.villainEyes;
    ctx.shadowBlur = 6;
    ctx.fillStyle = COLORS.villainEyes;
    ctx.beginPath();
    ctx.arc(cx - 3.5, cy - 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 3.5, cy - 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // health bar
    const barW = S - 16;
    const barX = tx * S + 8;
    const barY = ty * S + S - 7;
    ctx.fillStyle = COLORS.healthBack;
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = COLORS.healthFill;
    ctx.fillRect(barX, barY, barW * (villain.health / villain.maxHealth), 4);
  }

  drawHero(hero) {
    const ctx = this.ctx;
    const cx = (hero.drawX ?? hero.x) * S + S / 2;
    const cy = (hero.drawY ?? hero.y) * S + S / 2;

    this.drawShadow(cx, cy);

    // sword
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#e8eef7";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 15, cy + 12);
    ctx.lineTo(cx + 15, cy - 16);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "#d4a537";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 11, cy + 8);
    ctx.lineTo(cx + 19, cy + 8);
    ctx.stroke();

    // body armour
    ctx.fillStyle = COLORS.heroArmor;
    ctx.strokeStyle = COLORS.heroArmorDark;
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 11, cy - 2, 22, 21);
    ctx.strokeRect(cx - 11, cy - 2, 22, 21);

    // helmet
    ctx.fillStyle = COLORS.heroArmor;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1a1624";
    ctx.fillRect(cx - 6, cy - 10, 12, 3);

    ctx.fillStyle = COLORS.heroPlume;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 17);
    ctx.lineTo(cx + 3, cy - 17);
    ctx.lineTo(cx, cy - 26);
    ctx.closePath();
    ctx.fill();

    // stunned: floating "Z Z"
    if (hero.stun > 0) {
      ctx.save();
      ctx.fillStyle = "#ffd0d6";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Z z", cx + 2, cy - 30 + Math.sin(this.time * 5) * 2);
      ctx.restore();
    }
  }
}
