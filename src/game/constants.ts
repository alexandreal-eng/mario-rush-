// Core shared constants for the game engine.

export const TILE = 32;
export const LEVEL_H = 17; // tiles (544px)
export const LEVEL_PX = TILE * LEVEL_H;

// Physics (px / s)
export const GRAVITY = 2250;
export const MAX_FALL = 1150;
export const JUMP_V = -575;
export const JUMP_HOLD_MULT = 0.55;

export const WALK_MAX = 262;
export const RUN_MAX = 400;
export const RACE_MAX = 360;
export const BOOST_MAX = 700;

export const ACCEL = 1500;
export const AIR_ACCEL = 1000;
export const FRICTION = 1900;
export const AIR_DRAG = 500;

export const COYOTE = 0.09;
export const JUMP_BUFFER = 0.12;

export const STEP = 1 / 120;

// Themes
export const THEMES = [
  {
    name: "Plaines",
    sky: ["#5ec8f7", "#bdf0ff"],
    hillFar: "#8ad6a0",
    hillNear: "#4fb878",
    ground: "#c9793a",
    groundDark: "#8b4a1e",
    grass: "#54c25e",
    grassDark: "#2f8f43",
    cloud: "rgba(255,255,255,0.92)",
    tint: "rgba(255,255,255,0)",
  },
  {
    name: "Coucher",
    sky: ["#3b2a6b", "#ff9f5a"],
    hillFar: "#8b6bb0",
    hillNear: "#5c4384",
    ground: "#a35c33",
    groundDark: "#6b3520",
    grass: "#d1753f",
    grassDark: "#8f4a24",
    cloud: "rgba(255,214,170,0.85)",
    tint: "rgba(255,140,60,0.10)",
  },
  {
    name: "Nuit",
    sky: ["#0d1030", "#2b2a63"],
    hillFar: "#2a2b57",
    hillNear: "#191a3c",
    ground: "#5d5a86",
    groundDark: "#3a3860",
    grass: "#7a6bd0",
    grassDark: "#4a3f9a",
    cloud: "rgba(190,200,255,0.35)",
    tint: "rgba(60,40,140,0.18)",
  },
];

export type Theme = (typeof THEMES)[number];

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const approach = (a: number, b: number, amount: number) =>
  a < b ? Math.min(a + amount, b) : Math.max(a - amount, b);
