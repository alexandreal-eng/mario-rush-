import { LEVEL_H, TILE } from "./constants";

export const T = {
  EMPTY: 0,
  GRASS: 1,
  DIRT: 2,
  BRICK: 3,
  QCOIN: 4,
  QPOWER: 5,
  SLOPE_UP: 6,
  SLOPE_DOWN: 7,
  SPIKE: 8,
  BOOST: 9,
  STONE: 10,
  USED: 11,
} as const;

export const isSolid = (t: number) =>
  t === T.GRASS ||
  t === T.DIRT ||
  t === T.BRICK ||
  t === T.QCOIN ||
  t === T.QPOWER ||
  t === T.STONE ||
  t === T.USED;

export const isBumpable = (t: number) => t === T.BRICK || t === T.QCOIN || t === T.QPOWER;
export const isSlope = (t: number) => t === T.SLOPE_UP || t === T.SLOPE_DOWN;

export type Mode = "adventure" | "race";
export type EnemyType = "goomba" | "spiky" | "flyer";

export interface EnemySpawn {
  type: EnemyType;
  x: number;
  y: number;
}
export interface CoinSpawn {
  x: number;
  y: number;
}

export interface Level {
  mode: Mode;
  index: number;
  name: string;
  theme: number;
  w: number;
  h: number;
  tiles: Uint8Array;
  surface: Float32Array; // ground surface y (px) per column, -1 = pit
  startX: number;
  startY: number;
  goalX: number;
  enemies: EnemySpawn[];
  coins: CoinSpawn[];
  timeLimit: number;
}

class RNG {
  private s: number;
  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }
  next() {
    let x = this.s;
    x ^= (x << 13) >>> 0;
    x ^= x >>> 17;
    x ^= (x << 5) >>> 0;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  int(a: number, b: number) {
    return a + Math.floor(this.next() * (b - a + 1));
  }
  chance(p: number) {
    return this.next() < p;
  }
}

class Builder {
  w: number;
  h = LEVEL_H;
  tiles: Uint8Array;
  enemies: EnemySpawn[] = [];
  coins: CoinSpawn[] = [];

  constructor(w: number) {
    this.w = w;
    this.tiles = new Uint8Array(w * LEVEL_H);
  }
  set(x: number, y: number, t: number) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    this.tiles[y * this.w + x] = t;
  }
  get(x: number, y: number) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return T.EMPTY;
    return this.tiles[y * this.w + x];
  }
  ground(x0: number, len: number, top: number) {
    for (let i = 0; i < len; i++) {
      const x = x0 + i;
      this.set(x, top, T.GRASS);
      for (let y = top + 1; y < this.h; y++) this.set(x, y, T.DIRT);
    }
  }
  /** Rising slope (left -> right). `top` = ground row before the slope. */
  slopeUp(x0: number, len: number, top: number) {
    for (let i = 0; i < len; i++) {
      const x = x0 + i;
      const row = top - 1 - i;
      this.set(x, row, T.SLOPE_UP);
      for (let y = row + 1; y < this.h; y++) this.set(x, y, T.DIRT);
    }
    return top - len;
  }
  /** Falling slope (left -> right). `top` = ground row before the slope. */
  slopeDown(x0: number, len: number, top: number) {
    for (let i = 0; i < len; i++) {
      const x = x0 + i;
      const row = top + i;
      this.set(x, row, T.SLOPE_DOWN);
      for (let y = row + 1; y < this.h; y++) this.set(x, y, T.DIRT);
    }
    return top + len;
  }
  platform(x0: number, len: number, row: number, t: number = T.STONE) {
    for (let i = 0; i < len; i++) this.set(x0 + i, row, t);
  }
  coin(x: number, y: number) {
    this.coins.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 });
  }
  coinRow(x0: number, y: number, n: number) {
    for (let i = 0; i < n; i++) this.coin(x0 + i, y);
  }
  coinArc(x0: number, y: number, n: number, h = 3) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const dy = Math.sin(t * Math.PI) * h;
      this.coin(x0 + i, Math.round(y - dy));
    }
  }
  enemy(type: EnemyType, x: number, groundRow: number) {
    this.enemies.push({ type, x: x * TILE + TILE / 2, y: groundRow * TILE });
  }
  spikes(x0: number, n: number, top: number) {
    for (let i = 0; i < n; i++) this.set(x0 + i, top - 1, T.SPIKE);
  }
  boost(x0: number, n: number, top: number) {
    for (let i = 0; i < n; i++) this.set(x0 + i, top - 1, T.BOOST);
  }
}

type SegCtx = { b: Builder; rng: RNG; diff: number };
type Seg = (c: SegCtx, x: number, top: number) => { x: number; top: number };

// ---------------------------------------------------------------- adventure
const segFlat: Seg = (c, x, top) => {
  const len = c.rng.int(10, 16);
  c.b.ground(x, len, top);
  if (c.rng.chance(0.7)) c.b.coinRow(x + 3, top - 3, Math.min(5, len - 6));
  const n = c.rng.chance(0.55 + c.diff * 0.25) ? c.rng.int(1, 1 + c.diff) : 0;
  for (let i = 0; i < n; i++) {
    const t: EnemyType = c.rng.chance(0.18 + c.diff * 0.1) ? "spiky" : "goomba";
    c.b.enemy(t, x + 4 + i * 5, top);
  }
  return { x: x + len, top };
};

const segBlocks: Seg = (c, x, top) => {
  const len = 13;
  c.b.ground(x, len, top);
  const row = top - 4;
  const start = x + 3;
  c.b.set(start, row, T.QCOIN);
  c.b.set(start + 1, row, c.rng.chance(0.45) ? T.QPOWER : T.BRICK);
  c.b.set(start + 2, row, T.BRICK);
  c.b.set(start + 3, row, T.QCOIN);
  c.b.platform(start, 4, row - 3, T.EMPTY);
  c.b.coinRow(start, row - 3, 4);
  if (c.rng.chance(0.5)) c.b.enemy("goomba", x + 9, top);
  if (c.diff > 0 && c.rng.chance(0.4)) c.b.enemy("spiky", x + 11, top);
  return { x: x + len, top };
};

const segPit: Seg = (c, x, top) => {
  const gap = 3 + c.rng.int(0, Math.min(1, c.diff));
  c.b.ground(x, 6, top);
  const px = x + 6;
  // one clean, readable jump with a coin arc to trace the ideal trajectory
  c.b.coinArc(px - 1, top - 2, gap + 2, 3);
  if (c.rng.chance(0.4 + c.diff * 0.15)) c.b.enemy("goomba", x + 2, top);
  const after = px + gap;
  c.b.ground(after, 7, top);
  return { x: after + 7, top };
};

const segStairs: Seg = (c, x, top) => {
  const up = 3;
  c.b.ground(x, 4, top);
  const cx = x + 4;
  for (let i = 0; i < up; i++) {
    const col = cx + i;
    for (let y = 0; y < c.b.h; y++) c.b.set(col, y, T.EMPTY);
    for (let y = top - 1 - i; y <= top; y++) c.b.set(col, y, T.STONE);
  }
  c.b.coinRow(cx, top - 3 - up, up);
  const nx = cx + up;
  c.b.ground(nx, 7, top - up);
  if (c.rng.chance(0.6)) c.b.enemy("goomba", nx + 3, top - up);
  return { x: nx + 7, top: top - up };
};

const segHill: Seg = (c, x, top) => {
  const up = c.rng.int(2, 3);
  const down = up;
  c.b.ground(x, 4, top);
  let t = c.b.slopeUp(x + 4, up, top);
  const plateau = c.rng.int(3, 5);
  c.b.ground(x + 4 + up, plateau, t);
  c.b.coinRow(x + 5 + up, t - 3, Math.min(3, plateau - 1));
  t = c.b.slopeDown(x + 4 + up + plateau, down, t);
  c.b.ground(x + 4 + up + plateau + down, 6, t);
  if (c.rng.chance(0.5)) c.b.enemy("goomba", x + 4 + up + plateau + down + 2, t);
  return { x: x + 4 + up + plateau + down + 6, top: t };
};

const segSpikes: Seg = (c, x, top) => {
  const len = 14;
  c.b.ground(x, len, top);
  const n = c.rng.int(2, 3);
  c.b.spikes(x + 5, n, top);
  c.b.platform(x + 4, n + 2, top - 3, T.STONE);
  c.b.coinRow(x + 4, top - 4, n + 2);
  return { x: x + len, top };
};

const segFlyers: Seg = (c, x, top) => {
  const gap = 4 + c.rng.int(0, 1);
  c.b.ground(x, 5, top);
  const gx = x + 5;
  c.b.enemies.push({ type: "flyer", x: (gx + 2) * TILE, y: (top - 4) * TILE });
  c.b.coinArc(gx, top - 2, gap, 2);
  const after = gx + gap;
  c.b.ground(after, 7, top);
  if (c.diff > 0 && c.rng.chance(0.6)) c.b.enemy("goomba", after + 2, top);
  return { x: after + 7, top };
};

const ADV_SEGS: Seg[] = [segFlat, segBlocks, segPit, segStairs, segHill, segSpikes, segFlyers];

// --------------------------------------------------------------------- race
const rStraight: Seg = (c, x, top) => {
  const len = c.rng.int(16, 24);
  c.b.ground(x, len, top);
  if (c.rng.chance(0.75)) c.b.boost(x + c.rng.int(4, len - 6), 2, top);
  if (c.rng.chance(0.7)) c.b.coinRow(x + 4, top - 3, c.rng.int(4, 7));
  return { x: x + len, top };
};

const rHill: Seg = (c, x, top) => {
  const up = c.rng.int(3, 4);
  c.b.ground(x, 4, top);
  let t = c.b.slopeUp(x + 4, up, top);
  const plateau = c.rng.int(4, 7);
  c.b.ground(x + 4 + up, plateau, t);
  if (c.rng.chance(0.6)) c.b.boost(x + 5 + up, 2, t);
  c.b.coinRow(x + 5 + up, t - 3, Math.min(4, plateau - 1));
  t = c.b.slopeDown(x + 4 + up + plateau, up, t);
  c.b.ground(x + 4 + up + plateau + up, 8, t);
  return { x: x + 4 + up + plateau + up + 8, top: t };
};

const rRamp: Seg = (c, x, top) => {
  const up = 3;
  const gap = c.rng.int(3, 5);
  c.b.ground(x, 6, top);
  const t = c.b.slopeUp(x + 6, up, top);
  c.b.ground(x + 6, up, top); // solid base under ramp
  c.b.boost(x + 3, 2, top); // launch help
  const after = x + 6 + up + gap;
  // forgiving downhill landing instead of a knife-edge wall
  const lt = c.b.slopeDown(after, 2, t);
  c.b.ground(after + 2, 10, lt);
  c.b.coinArc(x + 6 + up, t - 3, gap, 4);
  if (c.rng.chance(0.5)) c.b.boost(after + 5, 2, lt);
  return { x: after + 12, top: lt };
};

const rBoostRun: Seg = (c, x, top) => {
  const len = 22;
  c.b.ground(x, len, top);
  c.b.boost(x + 3, 2, top);
  c.b.boost(x + 10, 2, top);
  c.b.boost(x + 17, 2, top);
  c.b.coinRow(x + 5, top - 3, 12);
  if (c.rng.chance(0.6)) c.b.spikes(x + 13, 2, top);
  return { x: x + len, top };
};

const rSpikes: Seg = (c, x, top) => {
  const len = 18;
  c.b.ground(x, len, top);
  c.b.spikes(x + 4, 3, top);
  c.b.spikes(x + 11, 2, top);
  c.b.coinArc(x + 3, top - 4, 5, 2);
  return { x: x + len, top };
};

const rWaves: Seg = (c, x, top) => {
  c.b.ground(x, 4, top);
  let t = top;
  let cx = x + 4;
  for (let i = 0; i < 2; i++) {
    t = c.b.slopeUp(cx, 2, t);
    c.b.ground(cx + 2, 3, t);
    c.b.coin(cx + 3, t - 2);
    t = c.b.slopeDown(cx + 5, 2, t);
    c.b.ground(cx + 7, 3, t);
    cx += 10;
  }
  return { x: cx, top: t };
};

const RACE_SEGS: Seg[] = [rStraight, rHill, rRamp, rBoostRun, rSpikes, rWaves];

// -------------------------------------------------------------------- build
const ADV_NAMES = ["Plaines Champêtres", "Coteaux au Soleil", "Bastion Nocturne"];
const RACE_NAMES = ["Circuit Prairie", "Circuit Canyon", "Circuit Étoilé"];

export function buildLevel(mode: Mode, index: number): Level {
  const rng = new RNG(mode === "adventure" ? 1337 + index * 9771 : 7777 + index * 6131);
  const isRace = mode === "race";
  const width = isRace ? [300, 330, 370][index] ?? 320 : [220, 240, 260][index] ?? 230;
  const b = new Builder(width);
  const diff = index;
  let top = 13;
  let x = 0;

  const startLen = isRace ? 18 : 14;
  const startRow = top;
  b.ground(0, startLen, top);
  b.coinRow(5, top - 3, 4);
  x = startLen;

  const segs = isRace ? RACE_SEGS : ADV_SEGS;
  const endPad = isRace ? 26 : 20;

  let guard = 0;
  while (x < width - endPad && guard++ < 200) {
    const seg = segs[rng.int(0, segs.length - 1)];
    const r = seg({ b, rng, diff }, x, top);
    x = Math.min(r.x, width - endPad);
    top = Math.max(6, Math.min(14, r.top));
  }

  // ---- finish zone
  b.ground(x, width - x, top);
  if (!isRace) {
    // small victory staircase
    for (let i = 0; i < 4; i++) {
      for (let y = top - 1 - i; y <= top; y++) b.set(x + 8 + i, y, T.STONE);
    }
  } else {
    b.boost(x + 4, 3, top);
  }
  b.coinRow(x + 2, top - 3, 4);

  const goalX = (width - 8) * TILE;
  const startX = 3 * TILE;
  const startY = startRow * TILE - 2;

  // ground surface map (for rival racers)
  const surface = new Float32Array(width);
  for (let col = 0; col < width; col++) {
    let found = -1;
    for (let row = 0; row < LEVEL_H; row++) {
      const t = b.get(col, row);
      if (isSolid(t)) {
        found = row * TILE;
        break;
      }
      if (isSlope(t)) {
        found = (row + 0.5) * TILE;
        break;
      }
    }
    surface[col] = found;
  }

  return {
    mode,
    index,
    name: isRace ? RACE_NAMES[index] ?? "Circuit" : ADV_NAMES[index] ?? "Niveau",
    theme: isRace ? index : index,
    w: width,
    h: LEVEL_H,
    tiles: b.tiles,
    surface,
    startX,
    startY,
    goalX,
    enemies: b.enemies,
    coins: b.coins,
    timeLimit: isRace ? 120 : 200,
  };
}

export const ADV_LEVELS = 3;
export const RACE_LEVELS = 3;
