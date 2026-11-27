// levels.js - level data only. No logic here.
//
// Map legend:
//   #  wall          .  floor
//   D  open door     d  closed door
//   H  hero start    V  villain
//   P  player (villain's assistant) start
//
// Tuning numbers (change them to rebalance a level):
//   countdown       turns the villain must survive
//   actionsPerTurn  how many placements the player may make each turn
//   range           placement range (Manhattan distance from the player)
//   trapDelay       turns the hero loses when he steps on a trap
//   trapCost        extra path cost the AI assigns to a trap tile
//   villainHealth   hero attacks needed to defeat the villain
//   resources       total traps / obstacles / door toggles for the level

export const LEVELS = [
  {
    name: "Beginner",
    tip: "Pick a tool, click a tile near you, then press End Turn. Try a trap in the doorway.",
    countdown: 20,
    actionsPerTurn: 3,
    range: 5,
    trapDelay: 2,
    trapCost: 3,
    villainHealth: 3,
    resources: { traps: 6, obstacles: 4, doors: 4 },
    layout: [
      "###########",
      "#H....#...#",
      "#.....#...#",
      "#.##..D...#",
      "#.##..#...#",
      "#.....#..V#",
      "#.....#..P#",
      "#.........#",
      "###########",
    ],
  },
  {
    name: "Intermediate",
    tip: "Three routes lead into the villain's chamber. Closing a door only makes the hero detour.",
    countdown: 20,
    actionsPerTurn: 2,
    range: 5,
    trapDelay: 2,
    trapCost: 3,
    villainHealth: 2,
    resources: { traps: 5, obstacles: 3, doors: 4 },
    layout: [
      "###############",
      "#H....#.......#",
      "#.....D.......#",
      "#.##..#..###..#",
      "#.##..#..DV#..#",
      "#.....#..#D#..#",
      "#.....D..P....#",
      "#.###.#..###..#",
      "#.....#.......#",
      "#.............#",
      "###############",
    ],
  },
  {
    name: "Advanced",
    tip: "Few resources, a maze of routes and a villain with 1 health. Save traps for chokepoints.",
    countdown: 22,
    actionsPerTurn: 2,
    range: 4,
    trapDelay: 3,
    trapCost: 3,
    villainHealth: 1,
    resources: { traps: 4, obstacles: 3, doors: 3 },
    layout: [
      "#################",
      "#H....#.....#...#",
      "#.....D.....D...#",
      "#.###.#.###.#.#.#",
      "#.#...#.#V#.#.#.#",
      "#.#.#.#.#D#.#.#.#",
      "#...#.......#...#",
      "#.#.#.#.#.#.#.#.#",
      "#...............#",
      "#.#####.#.#####.#",
      "#.......P.......#",
      "#...............#",
      "#################",
    ],
  },
];
