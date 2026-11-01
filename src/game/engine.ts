import {
  ACCEL,
  AIR_ACCEL,
  AIR_DRAG,
  BOOST_MAX,
  COYOTE,
  FRICTION,
  GRAVITY,
  JUMP_BUFFER,
  JUMP_HOLD_MULT,
  JUMP_V,
  LEVEL_PX,
  MAX_FALL,
  RACE_MAX,
  RUN_MAX,
  STEP,
  THEMES,
  TILE,
  WALK_MAX,
  approach,
  clamp,
  lerp,
} from "./constants";
import {
  T,
  buildLevel,
  isBumpable,
  isSolid,
  isSlope,
  type EnemyType,
  type Level,
  type Mode,
} from "./level";
import {
  ATLAS_SCALE,
  MARIO,
  RIVAL_PALETTES,
  buildTileAtlas,
  drawBush,
  drawCloud,
  drawCoin,
  drawFinishGate,
  drawFlag,
  drawFlyer,
  drawGoomba,
  drawMushroom,
  drawPlayer,
  drawSpiky,
} from "./sprites";
import { audio } from "./audio";

const AT = TILE * ATLAS_SCALE;

export type Phase =
  | "menu"
  | "ready"
  | "playing"
  | "paused"
  | "dead"
  | "clear"
  | "finished"
  | "gameover"
  | "victory";

export interface Snapshot {
  phase: Phase;
  mode: Mode;
  levelIndex: number;
  levelName: string;
  score: number;
  coins: number;
  lives: number;
  placement: number;
  raceTime: number;
  bestTime: number | null;
  totalScore: number;
  racers: { name: string; time: number | null; place: number }[];
}

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: number;
  big: boolean;
  invuln: number;
  runT: number;
  squashX: number;
  squashY: number;
  jumpHeld: boolean;
  coyote: number;
  jumpBuf: number;
  boostT: number;
  boostCd: number;
  combo: number;
  deadT: number;
  clearT: number;
  slope: number;
  lastSafeX: number;
  spin: number;
}

interface Enemy {
  type: EnemyType;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  dir: number;
  dead: boolean;
  squish: number;
  t: number;
  x0: number;
  y0: number;
  onGround: boolean;
}

interface Item {
  type: "mushroom";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: number;
  w: number;
  h: number;
  t: number;
  onGround: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
  kind: 0 | 1 | 2 | 3 | 4; // 0 dust, 1 spark, 2 debris, 3 flame, 4 coin
  rot: number;
  vr: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Rival {
  name: string;
  palette: number;
  x: number;
  y: number;
  vy: number;
  base: number;
  speed: number;
  runT: number;
  jumpCd: number;
  phase: number;
  finished: boolean;
  time: number;
  place: number;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  cssW = 960;
  cssH = 540;
  aspect = 16 / 9;
  baseW = 960;
  zoom = 1;
  viewW = 960;
  viewH = 540;

  level!: Level;
  atlas!: HTMLCanvasElement;
  phase: Phase = "menu";
  mode: Mode = "adventure";
  levelIndex = 0;
  score = 0;
  totalScore = 0;
  coins = 0;
  lives = 3;
  timeLeft = 200;
  elapsed = 0;
  bestTime: number | null = null;

  player!: Player;
  enemies: Enemy[] = [];
  items: Item[] = [];
  coinTaken: Uint8Array = new Uint8Array(0);
  particles: Particle[] = [];
  popups: Popup[] = [];
  bumps = new Map<number, number>();
  rivals: Rival[] = [];
  cam = { x: 0, y: 0, shake: 0, shakeT: 0 };
  hitstop = 0;
  time = 0;
  countdown = 0;
  phaseT = 0;
  flash = 0;
  slowmo = 0;

  private raf = 0;
  private last = 0;
  private acc = 0;
  private prevJump = false;
  private onSnapshot: (s: Snapshot) => void;
  private onCommand: (c: "pause" | "restart" | "mute") => void;
  private grad: CanvasGradient | null = null;
  private gradTheme = -1;
  private detachFns: (() => void)[] = [];

  input = { left: false, right: false, jump: false, run: false, down: false };

  constructor(
    canvas: HTMLCanvasElement,
    onSnapshot: (s: Snapshot) => void,
    onCommand: (c: "pause" | "restart" | "mute") => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.onSnapshot = onSnapshot;
    this.onCommand = onCommand;
    this.bindKeys();
    this.resize();
    this.level = buildLevel("adventure", 0);
    this.atlas = buildTileAtlas(THEMES[0]);
    this.spawnPlayer();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ------------------------------------------------------------- lifecycle
  destroy() {
    cancelAnimationFrame(this.raf);
    this.detachFns.forEach((f) => f());
    audio.stopMusic();
  }

  private bindKeys() {
    const keys = new Set<string>();
    const apply = () => {
      this.input.left = keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ");
      this.input.right = keys.has("ArrowRight") || keys.has("KeyD");
      this.input.jump = keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW") || keys.has("KeyZ") || keys.has("KeyK");
      this.input.run = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyX") || keys.has("KeyJ");
      this.input.down = keys.has("ArrowDown") || keys.has("KeyS");
    };
    const down = (e: KeyboardEvent) => {
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Space",
          "KeyA",
          "KeyD",
          "KeyW",
          "KeyS",
          "KeyQ",
          "KeyZ",
          "KeyX",
        ].includes(e.code)
      )
        e.preventDefault();
      if (e.repeat) return;
      keys.add(e.code);
      apply();
      audio.unlock();
      if (e.code === "Escape" || e.code === "KeyP") this.onCommand("pause");
      if (e.code === "KeyR") this.onCommand("restart");
      if (e.code === "KeyM") this.onCommand("mute");
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
      apply();
    };
    const blur = () => {
      keys.clear();
      apply();
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    this.detachFns.push(() => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    });
  }

  setTouch(k: "left" | "right" | "jump" | "run" | "down", v: boolean) {
    this.input[k] = v;
    if (v) audio.unlock();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, r.width);
    this.cssH = Math.max(1, r.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    this.aspect = this.cssW / this.cssH;
    this.baseW = clamp(LEVEL_PX * this.aspect, 560, 1150);
    this.grad = null;
  }

  private computeView() {
    this.viewW = this.baseW / this.zoom;
    this.viewH = this.viewW / this.aspect;
    this.cam.y = LEVEL_PX - this.viewH;
  }

  // ------------------------------------------------------------ game setup
  start(mode: Mode, index: number) {
    this.mode = mode;
    this.levelIndex = index;
    this.level = buildLevel(mode, index);
    this.atlas = buildTileAtlas(THEMES[this.level.theme % THEMES.length]);
    this.gradTheme = -1;
    this.score = 0;
    this.totalScore = 0;
    this.coins = 0;
    this.lives = 3;
    this.bestTime = readBest(mode, index);
    this.loadLevel();
    audio.unlock();
    audio.startMusic(mode === "race" ? 1 : this.level.theme);
  }

  loadLevel() {
    const L = this.level;
    this.coinTaken = new Uint8Array(L.coins.length);
    this.enemies = L.enemies.map((e) => this.makeEnemy(e.type, e.x, e.y));
    this.items = [];
    this.particles = [];
    this.popups = [];
    this.bumps.clear();
    this.timeLeft = L.timeLimit;
    this.elapsed = 0;
    this.spawnPlayer();
    this.cam.x = 0;
    this.hitstop = 0;
    this.flash = 0;
    if (this.mode === "race") {
      const names = ["Luigi", "Toad", "Peach"];
      this.rivals = names.map((n, i) => ({
        name: n,
        palette: i,
        x: L.startX - (i + 1) * 40,
        y: L.startY,
        vy: 0,
        base: [366, 390, 414][i],
        speed: [366, 390, 414][i],
        runT: Math.random() * 5,
        jumpCd: 0,
        phase: i * 2.1,
        finished: false,
        time: 0,
        place: i + 2,
      }));
    } else this.rivals = [];
    this.countdown = this.mode === "race" ? 3.2 : 1.1;
    this.phase = "ready";
    this.phaseT = 0;
    audio.startMusic(this.mode === "race" ? 1 : this.level.theme);
    this.emit();
  }

  private makeEnemy(type: EnemyType, x: number, y: number): Enemy {
    const w = type === "flyer" ? 30 : 30;
    const h = type === "flyer" ? 22 : 28;
    return {
      type,
      x,
      y,
      w,
      h,
      vx: 0,
      vy: 0,
      dir: -1,
      dead: false,
      squish: 0,
      t: Math.random() * 4,
      x0: x,
      y0: y,
      onGround: false,
    };
  }

  private spawnPlayer() {
    const L = this.level;
    this.player = {
      x: L.startX,
      y: L.startY,
      w: 22,
      h: 30,
      vx: 0,
      vy: 0,
      onGround: true,
      facing: 1,
      big: false,
      invuln: 0,
      runT: 0,
      squashX: 1,
      squashY: 1,
      jumpHeld: false,
      coyote: 0,
      jumpBuf: 0,
      boostT: 0,
      boostCd: 0,
      combo: 0,
      deadT: 0,
      clearT: 0,
      slope: 0,
      lastSafeX: L.startX,
      spin: 0,
    };
  }

  restart() {
    if (this.phase === "menu") return;
    this.score = 0;
    this.lives = 3;
    this.loadLevel();
    audio.startMusic(this.mode === "race" ? 1 : this.level.theme);
  }

  /** Continue to the next track / level from a result screen. */
  advance() {
    if (this.phase !== "finished" && this.phase !== "victory" && this.phase !== "clear") return;
    this.nextLevel();
  }

  pause() {
    if (this.phase === "playing" || this.phase === "ready") {
      this.phase = "paused";
      audio.stopMusic();
      this.emit();
    }
  }

  resume() {
    if (this.phase === "paused") {
      this.phase = this.countdown > 0 ? "ready" : "playing";
      audio.startMusic(this.mode === "race" ? 1 : this.level.theme);
      this.emit();
    }
  }

  toMenu() {
    this.phase = "menu";
    audio.stopMusic();
    this.emit();
  }

  private emit() {
    const racers = [
      { name: "MARIO", time: this.phase === "finished" ? this.elapsed : null, place: 1 },
      ...this.rivals.map((r) => ({ name: r.name, time: r.finished ? r.time : null, place: r.place })),
    ];
    racers.sort((a, b) => {
      if (a.time !== null && b.time !== null) return a.time - b.time;
      if (a.time !== null) return -1;
      if (b.time !== null) return 1;
      return 0;
    });
    const placement = racers.findIndex((r) => r.name === "MARIO") + 1;
    this.onSnapshot({
      phase: this.phase,
      mode: this.mode,
      levelIndex: this.levelIndex,
      levelName: this.level.name,
      score: this.score,
      coins: this.coins,
      lives: this.lives,
      placement,
      raceTime: this.elapsed,
      bestTime: this.bestTime,
      totalScore: this.totalScore + this.score,
      racers,
    });
  }

  // ------------------------------------------------------------- main loop
  private loop(t: number) {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.last) this.last = t;
    let dt = (t - this.last) / 1000;
    this.last = t;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    this.time += dt;

    if (this.input.jump && !this.prevJump) this.player.jumpBuf = JUMP_BUFFER;
    this.prevJump = this.input.jump;

    if (this.phase === "menu") {
      // slow scenic pan behind the title screen
      const max = Math.max(0, this.level.w * TILE - this.viewW);
      this.cam.x += dt * 46;
      if (this.cam.x > max) this.cam.x = 0;
      this.updateParticles(dt);
      this.draw();
      return;
    }
    if (this.phase === "paused") {
      this.draw();
      return;
    }

    const scale = this.slowmo > 0 ? 0.35 : 1;
    if (this.slowmo > 0) this.slowmo -= dt;
    this.acc += dt * scale;
    let steps = 0;
    while (this.acc >= STEP && steps < 8) {
      this.step(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps >= 8) this.acc = 0;
    this.draw();
  }

  private step(dt: number) {
    const p = this.player;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.updateCamera(dt);
      this.updateParticles(dt * 0.35);
      return;
    }
    this.phaseT += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

    if (this.countdown > 0) {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const after = Math.ceil(this.countdown);
      if (after !== before && after >= 0) audio.play(after === 0 ? "power" : "countdown");
      this.updateParticles(dt);
      this.updateCamera(dt);
      if (this.countdown <= 0) {
        this.phase = "playing";
        this.phaseT = 0;
        this.emit();
      }
      return;
    }

    switch (this.phase) {
      case "playing":
        this.timeLeft -= dt;
        this.elapsed += dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.kill(true);
        }
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateItems(dt);
        this.updateCoins();
        if (this.mode === "race") this.updateRivals(dt);
        break;
      case "dead":
        p.deadT += dt;
        p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
        p.y += p.vy * dt;
        p.spin += dt * 6;
        if (p.deadT > 1.5) {
          if (this.lives <= 0) {
            this.phase = "gameover";
            audio.stopMusic();
            this.emit();
          } else this.loadLevel();
        }
        break;
      case "clear":
        p.clearT += dt;
        this.updatePlayer(dt, true);
        this.updateEnemies(dt);
        if (p.clearT > 2.3) this.nextLevel();
        break;
      case "finished":
        this.updatePlayer(dt, true);
        this.updateRivals(dt);
        break;
      case "gameover":
      case "victory":
        break;
    }

    this.updateParticles(dt);
    this.updatePopups(dt);
    this.updateCamera(dt);
  }

  private nextLevel() {
    const total = this.mode === "race" ? 3 : 3;
    this.totalScore += this.score;
    if (this.levelIndex + 1 >= total) {
      this.phase = "victory";
      this.emit();
      return;
    }
    this.levelIndex++;
    this.level = buildLevel(this.mode, this.levelIndex);
    this.atlas = buildTileAtlas(THEMES[this.level.theme % THEMES.length]);
    this.gradTheme = -1;
    this.bestTime = readBest(this.mode, this.levelIndex);
    this.score = 0;
    this.loadLevel();
  }

  // -------------------------------------------------------------- tile utils
  private tileAt(col: number, row: number): number {
    const L = this.level;
    if (col < 0 || col >= L.w) return T.STONE;
    if (row < 0 || row >= L.h) return T.EMPTY;
    return L.tiles[row * L.w + col];
  }
  private setTile(col: number, row: number, t: number) {
    const L = this.level;
    if (col < 0 || col >= L.w || row < 0 || row >= L.h) return;
    L.tiles[row * L.w + col] = t;
  }

  private surfaceAt(x: number): number {
    const L = this.level;
    const col = clamp(Math.floor(x / TILE), 0, L.w - 1);
    return L.surface[col];
  }

  // ---------------------------------------------------------------- player
  private updatePlayer(dt: number, auto = false) {
    const p = this.player;
    const race = this.mode === "race";
    const inp = this.input;
    let dir = auto ? 1 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (this.phase === "dead") dir = 0;

    if (auto) p.facing = 1;
    else if (dir !== 0) p.facing = dir;

    const maxSpeed = race ? RACE_MAX : inp.run ? RUN_MAX : WALK_MAX;
    // running downhill lets you carry a little extra speed
    const downhill =
      p.slope !== 0 && ((p.slope === T.SLOPE_UP && dir < 0) || (p.slope === T.SLOPE_DOWN && dir > 0));
    const hardMax = (p.boostT > 0 ? BOOST_MAX : maxSpeed) * (downhill && p.onGround ? 1.16 : 1);

    if (dir !== 0) {
      const acc = p.onGround ? ACCEL : AIR_ACCEL;
      const sameDir = p.vx * dir > 0;
      if (!sameDir) {
        // skid / turn around
        p.vx += dir * acc * (p.onGround ? 1.8 : 1.2) * dt;
      } else if (Math.abs(p.vx) < hardMax) {
        let a = acc;
        if (p.onGround && p.slope !== 0) a *= downhill ? 1.75 : 0.72;
        p.vx += dir * a * dt;
      }
      if (Math.abs(p.vx) > hardMax)
        p.vx = approach(p.vx, Math.sign(p.vx) * hardMax, (p.onGround ? 1100 : 620) * dt);
    } else if (!auto) {
      const f = p.onGround ? FRICTION : AIR_DRAG;
      p.vx = approach(p.vx, 0, f * dt);
    }

    // ---- jump
    p.jumpBuf = Math.max(0, p.jumpBuf - dt);
    p.coyote = Math.max(0, p.coyote - dt);
    if (p.jumpBuf > 0 && (p.onGround || p.coyote > 0)) {
      const speedBonus = Math.min(Math.abs(p.vx) * 0.07, 55);
      p.vy = JUMP_V - speedBonus;
      p.onGround = false;
      p.coyote = 0;
      p.jumpBuf = 0;
      p.jumpHeld = true;
      p.squashX = 0.84;
      p.squashY = 1.2;
      audio.play("jump");
      this.puff(p.x, p.y, 8, "#ffffff");
      this.cam.shake = Math.max(this.cam.shake, 2);
    }
    if (!inp.jump) p.jumpHeld = false;

    const g = p.jumpHeld && p.vy < 0 ? GRAVITY * JUMP_HOLD_MULT : GRAVITY;
    let grav = g;
    if (inp.down && !p.onGround) grav = GRAVITY * 1.7;
    p.vy = Math.min(p.vy + grav * dt, MAX_FALL);

    // ---- horizontal move + collide
    const wasGround = p.onGround;
    p.onGround = false;
    p.slope = 0;
    p.x += p.vx * dt;
    this.collideX(p);

    // ---- vertical move + collide
    p.y += p.vy * dt;
    this.collideY(p);

    // ---- slopes
    this.slopeCheck(p);

    if (p.onGround) {
      p.coyote = COYOTE;
      p.combo = 0;
      if (!wasGround) {
        const impact = clamp(p.vy / 400, 0, 1.6);
        p.squashX = 1 + impact * 0.22;
        p.squashY = 1 - impact * 0.2;
        if (impact > 0.4) {
          this.puff(p.x, p.y, Math.round(4 + impact * 6), "#e8dcc8");
          this.cam.shake = Math.max(this.cam.shake, impact * 3);
        }
      }
      if (Math.abs(p.vx) > 300) {
        if (Math.random() < 0.25) this.spark(p.x - p.facing * 10, p.y, "#ffffff", 0.35);
      }
      if (p.onGround && this.surfaceAt(p.x) >= 0 && this.noGapAhead(p.x)) p.lastSafeX = p.x;
    }

    // ---- boost pads
    p.boostCd = Math.max(0, p.boostCd - dt);
    if (p.boostT > 0) p.boostT -= dt;
    const bcol = Math.floor(p.x / TILE);
    const brow = Math.floor((p.y - 8) / TILE);
    if (this.tileAt(bcol, brow) === T.BOOST || this.tileAt(bcol, Math.floor((p.y - 26) / TILE)) === T.BOOST) {
      if (p.boostCd <= 0) {
        p.boostCd = 0.6;
        p.boostT = 1.15;
        p.vx = Math.max(p.vx, p.facing * BOOST_MAX * 0.8);
        if (p.facing < 0) p.vx = Math.min(p.vx, p.facing * BOOST_MAX * 0.8);
        p.vy = Math.min(p.vy, -120);
        audio.play("boost");
        this.cam.shake = Math.max(this.cam.shake, 7);
        this.flash = 0.35;
        for (let i = 0; i < 16; i++) this.spark(p.x, p.y - 10, i % 2 ? "#38e0ff" : "#a8f4ff", 0.8);
        this.popup(p.x, p.y - 60, "BOOST!", "#38e0ff");
      }
    }

    // ---- squash / anim
    p.squashX = lerp(p.squashX, 1, 1 - Math.exp(-dt * 12));
    p.squashY = lerp(p.squashY, 1, 1 - Math.exp(-dt * 12));
    p.runT += dt * (0.4 + Math.abs(p.vx) / 150);
    if (p.invuln > 0) p.invuln -= dt;

    // ---- boost trail
    if (p.boostT > 0 && Math.random() < 0.9) {
      this.particles.push({
        x: p.x - p.facing * 14 + (Math.random() - 0.5) * 8,
        y: p.y - 14 - Math.random() * 16,
        vx: -p.facing * (80 + Math.random() * 120),
        vy: (Math.random() - 0.5) * 40,
        life: 0.4,
        max: 0.4,
        size: 6 + Math.random() * 7,
        color: Math.random() < 0.5 ? "#38e0ff" : "#ffe066",
        grav: 0,
        kind: 3,
        rot: 0,
        vr: 0,
      });
    } else if (Math.abs(p.vx) > 420 && Math.random() < 0.4) {
      this.spark(p.x - p.facing * 16, p.y - 12 - Math.random() * 14, "#ffffff", 0.3);
    }

    // ---- hazards / fall
    const hazardRow = Math.floor((p.y - 6) / TILE);
    const hcol = Math.floor(p.x / TILE);
    if (this.tileAt(hcol, hazardRow) === T.SPIKE && p.invuln <= 0) this.hurt();
    if (p.y > LEVEL_PX + 120) {
      if (this.mode === "race") this.respawn();
      else this.kill(false);
    }

    // ---- goal
    if (p.x >= this.level.goalX) {
      if (this.mode === "race") this.finishRace();
      else if (this.phase === "playing") this.clearLevel();
    }
  }

  private noGapAhead(x: number) {
    return this.surfaceAt(x - 40) >= 0 && this.surfaceAt(x + 40) >= 0;
  }

  /**
   * A solid tile that sits directly underneath a slope tile is the slope's own
   * fill: it must never block horizontal movement, otherwise runners jam at the
   * foot of every hill.
   */
  private blocksX(col: number, row: number, dir: number) {
    if (!isSolid(this.tileAt(col, row))) return false;
    if (isSlope(this.tileAt(col, row - 1))) return false; // slope fill
    if (dir > 0 && isSlope(this.tileAt(col - 1, row))) return false; // crest of an ascending slope
    if (dir < 0 && isSlope(this.tileAt(col + 1, row))) return false; // crest when running left
    return true;
  }

  private collideX(e: { x: number; y: number; w: number; h: number; vx: number; facing?: number }) {
    const top = e.y - e.h;
    const bot = e.y - 2;
    const r0 = Math.floor(top / TILE);
    const r1 = Math.floor(bot / TILE);
    if (e.vx > 0) {
      const col = Math.floor((e.x + e.w / 2) / TILE);
      for (let r = r0; r <= r1; r++) {
        if (this.blocksX(col, r, 1)) {
          e.x = col * TILE - e.w / 2 - 0.01;
          e.vx = 0;
          return true;
        }
      }
    } else if (e.vx < 0) {
      const col = Math.floor((e.x - e.w / 2) / TILE);
      for (let r = r0; r <= r1; r++) {
        if (this.blocksX(col, r, -1)) {
          e.x = (col + 1) * TILE + e.w / 2 + 0.01;
          e.vx = 0;
          return true;
        }
      }
    }
    return false;
  }

  private collideY(p: Player) {
    const c0 = Math.floor((p.x - p.w / 2 + 1) / TILE);
    const c1 = Math.floor((p.x + p.w / 2 - 1) / TILE);
    if (p.vy >= 0) {
      const row = Math.floor(p.y / TILE);
      for (let c = c0; c <= c1; c++) {
        if (isSolid(this.tileAt(c, row))) {
          p.y = row * TILE;
          p.vy = 0;
          p.onGround = true;
          return true;
        }
      }
    } else {
      const row = Math.floor((p.y - p.h) / TILE);
      let best = -1;
      let bestD = 1e9;
      for (let c = c0; c <= c1; c++) {
        const t = this.tileAt(c, row);
        if (isSolid(t)) {
          const d = Math.abs(c * TILE + TILE / 2 - p.x);
          if (d < bestD) {
            bestD = d;
            best = c;
          }
        }
      }
      if (best >= 0) {
        p.y = (row + 1) * TILE + p.h;
        p.vy = 0;
        this.bumpBlock(best, row);
        return true;
      }
    }
    return false;
  }

  private slopeCheck(p: Player) {
    const col = Math.floor(p.x / TILE);
    const r0 = Math.floor((p.y - p.h) / TILE);
    const r1 = Math.floor((p.y + 4) / TILE);
    for (let r = r0; r <= r1; r++) {
      const t = this.tileAt(col, r);
      if (!isSlope(t)) continue;
      const u = clamp((p.x - col * TILE) / TILE, 0, 1);
      const surf = t === T.SLOPE_UP ? (r + 1 - u) * TILE : (r + u) * TILE;
      if (p.vy >= 0 && p.y >= surf - 3 && p.y - surf < 26) {
        p.y = surf;
        p.vy = 0;
        p.onGround = true;
        p.slope = t;
        return;
      }
    }
  }

  private bumpBlock(col: number, row: number) {
    const t = this.tileAt(col, row);
    if (!isBumpable(t)) return;
    const idx = row * this.level.w + col;
    this.bumps.set(idx, 0.001);
    const cx = col * TILE + TILE / 2;
    const cy = row * TILE + TILE / 2;
    if (t === T.QCOIN) {
      this.setTile(col, row, T.USED);
      this.coins++;
      this.score += 200;
      audio.play("coin");
      this.popup(cx, cy - 20, "+200", "#ffd83d");
      for (let i = 0; i < 10; i++) this.spark(cx, cy, "#ffd83d", 0.7);
      this.floatingCoin(cx, row * TILE - 10);
    } else if (t === T.QPOWER) {
      this.setTile(col, row, T.USED);
      audio.play("power");
      this.items.push({
        type: "mushroom",
        x: cx,
        y: row * TILE - 6,
        vx: 0,
        vy: -140,
        dir: 1,
        w: 26,
        h: 26,
        t: 0,
        onGround: false,
      });
      for (let i = 0; i < 12; i++) this.spark(cx, cy, "#ff8a8a", 0.8);
    } else if (t === T.BRICK) {
      if (this.player.big) {
        this.setTile(col, row, T.EMPTY);
        this.score += 50;
        audio.play("break");
        this.cam.shake = Math.max(this.cam.shake, 9);
        this.hitstop = 0.05;
        for (let i = 0; i < 14; i++) {
          this.particles.push({
            x: cx + (Math.random() - 0.5) * 24,
            y: cy + (Math.random() - 0.5) * 24,
            vx: (Math.random() - 0.5) * 320,
            vy: -Math.random() * 320 - 60,
            life: 0.9,
            max: 0.9,
            size: 5 + Math.random() * 6,
            color: "#c8642c",
            grav: 900,
            kind: 2,
            rot: Math.random() * 6,
            vr: (Math.random() - 0.5) * 16,
          });
        }
      } else {
        audio.play("bump");
        this.cam.shake = Math.max(this.cam.shake, 3);
      }
    }
  }

  // -------------------------------------------------------------- entities
  private updateEnemies(dt: number) {
    const p = this.player;
    const camL = this.cam.x - 120;
    const camR = this.cam.x + this.viewW + 200;
    for (const e of this.enemies) {
      if (e.x < camL - 400 || e.x > camR + 600) continue;
      e.t += dt;
      if (e.dead) {
        e.squish = Math.max(0, e.squish - dt * 3);
        continue;
      }
      if (e.type === "flyer") {
        e.x = e.x0 + Math.sin(e.t * 1.1) * 90;
        e.y = e.y0 + Math.sin(e.t * 2.4) * 26;
        e.dir = Math.cos(e.t * 1.1) > 0 ? 1 : -1;
      } else {
        const spd = e.type === "spiky" ? 74 : 58;
        e.vx = e.dir * spd;
        e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
        e.x += e.vx * dt;
        if (this.collideX(e)) e.dir *= -1;
        e.y += e.vy * dt;
        const before = e.y;
        // ground check
        const row = Math.floor(e.y / TILE);
        const c0 = Math.floor((e.x - e.w / 2) / TILE);
        const c1 = Math.floor((e.x + e.w / 2) / TILE);
        let landed = false;
        for (let c = c0; c <= c1; c++) {
          if (isSolid(this.tileAt(c, row)) || isSlope(this.tileAt(c, row))) {
            e.y = row * TILE;
            e.vy = 0;
            landed = true;
            break;
          }
        }
        e.onGround = landed;
        if (before < e.y - 1) e.onGround = false;
        if (e.type === "spiky" && e.onGround) {
          const aheadCol = Math.floor((e.x + e.dir * (e.w / 2 + 6)) / TILE);
          const aheadRow = Math.floor((e.y + 6) / TILE);
          const t = this.tileAt(aheadCol, aheadRow);
          if (!isSolid(t) && !isSlope(t)) e.dir *= -1;
        }
        if (e.y > LEVEL_PX + 60) e.dead = true;
      }

      // player interaction
      if (this.phase !== "playing" && this.phase !== "clear") continue;
      if (p.invuln > 0) continue;
      const dx = Math.abs(p.x - e.x);
      const dy = p.y - e.y;
      if (dx < (p.w + e.w) / 2 - 4 && dy > -e.h - 6 && dy < 4) {
        const stomping = p.vy > 60 && p.y - p.h * 0.5 < e.y - e.h * 0.45;
        if (stomping && e.type !== "spiky") {
          e.dead = true;
          e.squish = 1;
          p.combo = Math.min(p.combo + 1, 5);
          const pts = 200 * Math.pow(2, p.combo - 1);
          this.score += pts;
          this.popup(e.x, e.y - e.h - 12, `+${pts}`, "#ffffff");
          p.vy = this.input.jump ? JUMP_V * 0.95 : JUMP_V * 0.62;
          p.squashX = 1.25;
          p.squashY = 0.75;
          audio.play("stomp");
          this.hitstop = 0.055;
          this.cam.shake = Math.max(this.cam.shake, 6);
          this.puff(e.x, e.y, 10, "#d8b48a");
          for (let i = 0; i < 8; i++) this.spark(e.x, e.y - 10, "#ffd83d", 0.6);
        } else if (p.invuln <= 0) {
          this.hurt();
        }
      }
    }
  }

  private updateItems(dt: number) {
    const p = this.player;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      it.vy = Math.min(it.vy + GRAVITY * dt, MAX_FALL);
      it.vx = it.dir * 78;
      it.x += it.vx * dt;
      if (this.collideX(it)) it.dir *= -1;
      it.y += it.vy * dt;
      const row = Math.floor(it.y / TILE);
      const c0 = Math.floor((it.x - it.w / 2) / TILE);
      const c1 = Math.floor((it.x + it.w / 2) / TILE);
      for (let c = c0; c <= c1; c++) {
        if (isSolid(this.tileAt(c, row)) || isSlope(this.tileAt(c, row))) {
          it.y = row * TILE;
          it.vy = 0;
          break;
        }
      }
      if (it.t > 0.4 && Math.abs(p.x - it.x) < 26 && Math.abs(p.y - it.y) < 40) {
        this.items.splice(i, 1);
        if (!p.big) {
          p.big = true;
          p.h = 42;
        }
        this.score += 1000;
        audio.play("power");
        this.popup(it.x, it.y - 40, "+1000", "#ff6b6b");
        this.flash = 0.5;
        for (let k = 0; k < 20; k++) this.spark(it.x, it.y - 14, k % 2 ? "#ff8a8a" : "#ffd83d", 0.9);
      } else if (it.y > LEVEL_PX + 80) this.items.splice(i, 1);
    }
  }

  private updateCoins() {
    const p = this.player;
    const L = this.level;
    for (let i = 0; i < L.coins.length; i++) {
      if (this.coinTaken[i]) continue;
      const c = L.coins[i];
      if (Math.abs(c.x - p.x) > 26 || c.y < p.y - 46 || c.y > p.y + 8) continue;
      this.coinTaken[i] = 1;
      this.coins++;
      this.score += 100;
      audio.play("coin");
      this.popup(c.x, c.y - 14, "+100", "#ffd83d");
      for (let k = 0; k < 7; k++) this.spark(c.x, c.y, "#ffe38a", 0.6);
      if (this.coins > 0 && this.coins % 25 === 0) {
        this.score += 1000;
        this.popup(p.x, p.y - 70, "BONUS!", "#7ef5a0");
        audio.play("checkpoint");
      }
    }
  }

  private updateRivals(dt: number) {
    const p = this.player;
    for (const r of this.rivals) {
      if (r.finished) continue;
      const band = clamp((p.x - r.x) / 900, -1, 1);
      r.speed = r.base * (1 + band * 0.16 + Math.sin(this.time * 1.3 + r.phase) * 0.06);
      r.x += r.speed * dt;
      r.runT += dt * (0.4 + r.speed / 150);
      r.jumpCd = Math.max(0, r.jumpCd - dt);
      const gy = this.surfaceAt(r.x);
      if (gy < 0) {
        r.vy += GRAVITY * 0.55 * dt;
        r.y += r.vy * dt;
        if (r.y > LEVEL_PX + 40) {
          const back = Math.max(0, r.x - 300);
          r.x = back;
          r.y = this.surfaceAt(back);
          if (r.y < 0) r.y = LEVEL_PX - 100;
          r.vy = 0;
        }
      } else if (r.y < gy - 6) {
        r.vy += GRAVITY * 0.6 * dt;
        r.y += r.vy * dt;
        if (r.y >= gy) {
          r.y = gy;
          r.vy = 0;
        }
      } else {
        const ahead = this.surfaceAt(r.x + 70);
        if ((ahead < 0 || ahead > gy + 46) && r.jumpCd <= 0) {
          r.vy = -440;
          r.jumpCd = 0.7;
          r.y -= 2;
        } else {
          r.y = gy;
          r.vy = 0;
        }
      }
      if (r.x >= this.level.goalX) {
        r.finished = true;
        r.time = this.elapsed;
      }
    }
    // placements
    const order = [
      { n: "MARIO", x: this.player.x, f: this.phase === "finished" },
      ...this.rivals.map((r) => ({ n: r.name, x: r.x, f: r.finished })),
    ];
    order.sort((a, b) => (a.f && b.f ? 0 : 0) || b.x - a.x);
    order.forEach((o, i) => {
      const r = this.rivals.find((rr) => rr.name === o.n);
      if (r) r.place = i + 1;
    });
  }

  // ------------------------------------------------------------- state ops
  private hurt() {
    const p = this.player;
    if (p.invuln > 0) return;
    if (this.mode === "race") {
      // racing: spin out instead of dying
      p.invuln = 1.1;
      p.spin = 0;
      p.vx *= 0.28;
      p.boostT = 0;
      audio.play("hurt");
      this.cam.shake = 9;
      this.hitstop = 0.07;
      this.puff(p.x, p.y - 14, 12, "#ffd83d");
      this.popup(p.x, p.y - 60, "AÏE !", "#ffd83d");
      return;
    }
    if (p.big) {
      p.big = false;
      p.h = 30;
      p.invuln = 2;
      audio.play("hurt");
      this.cam.shake = 10;
      this.hitstop = 0.09;
      this.puff(p.x, p.y - 14, 14, "#ffffff");
      this.popup(p.x, p.y - 60, "AÏE!", "#ff8a8a");
    } else this.kill(false);
  }

  private kill(timeout: boolean) {
    if (this.phase === "dead" || this.phase === "gameover") return;
    const p = this.player;
    this.lives--;
    this.phase = "dead";
    this.phaseT = 0;
    p.deadT = 0;
    p.vy = -540;
    p.vx = 0;
    p.spin = 0;
    this.slowmo = 0.5;
    this.cam.shake = 14;
    audio.play("die");
    audio.stopMusic();
    this.popup(p.x, p.y - 70, timeout ? "TEMPS !" : "PERDU !", "#ff6b6b");
    this.emit();
  }

  private respawn() {
    const p = this.player;
    let x = Math.max(this.level.startX, p.x - 220);
    for (let i = 0; i < 60; i++) {
      if (this.surfaceAt(x) >= 0) break;
      x -= TILE;
    }
    const surf = this.surfaceAt(x);
    p.x = x;
    p.y = surf >= 0 ? surf - 4 : 120;
    if (p.y < 40) p.y = 120;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1.4;
    this.cam.shake = 10;
    audio.play("hurt");
    this.puff(p.x, p.y, 16, "#ffffff");
  }

  private clearLevel() {
    const p = this.player;
    this.phase = "clear";
    p.clearT = 0;
    const bonus = Math.floor(this.timeLeft) * 50;
    this.score += bonus + 1000;
    audio.stopMusic();
    audio.play("finish");
    this.flash = 0.6;
    this.cam.shake = 8;
    for (let i = 0; i < 60; i++) this.confetti(p.x + (Math.random() - 0.5) * 300, p.y - 200 - Math.random() * 120);
    this.emit();
  }

  private finishRace() {
    if (this.phase === "finished") return;
    this.phase = "finished";
    this.phaseT = 0;
    const time = this.elapsed;
    if (this.bestTime === null || time < this.bestTime) {
      this.bestTime = time;
      writeBest(this.mode, this.levelIndex, time);
    }
    this.score += 2000 + Math.max(0, Math.floor(3000 - time * 30));
    audio.stopMusic();
    audio.play("finish");
    this.flash = 0.8;
    this.cam.shake = 12;
    const p = this.player;
    for (let i = 0; i < 90; i++) this.confetti(p.x + (Math.random() - 0.5) * 400, p.y - 220 - Math.random() * 140);
    this.emit();
  }

  // -------------------------------------------------------------- particles
  private puff(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 130;
      this.particles.push({
        x,
        y: y - 4,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.6 - 40,
        life: 0.45,
        max: 0.45,
        size: 4 + Math.random() * 7,
        color,
        grav: 220,
        kind: 0,
        rot: 0,
        vr: 0,
      });
    }
  }

  private spark(x: number, y: number, color: string, life: number) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 200;
    this.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 60,
      life,
      max: life,
      size: 2 + Math.random() * 4,
      color,
      grav: 340,
      kind: 1,
      rot: 0,
      vr: 0,
    });
  }

  private confetti(x: number, y: number) {
    const colors = ["#ff5c8a", "#ffd83d", "#38e0ff", "#7ef5a0", "#ffffff", "#c084fc"];
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 300,
      vy: -Math.random() * 200,
      life: 2.4,
      max: 2.4,
      size: 5 + Math.random() * 6,
      color: colors[(Math.random() * colors.length) | 0],
      grav: 420,
      kind: 2,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 14,
    });
  }

  private floatingCoin(x: number, y: number) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -320,
      life: 0.6,
      max: 0.6,
      size: 14,
      color: "#ffd83d",
      grav: 900,
      kind: 4,
      rot: 0,
      vr: 0,
    });
  }

  private updateParticles(dt: number) {
    const arr = this.particles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const q = arr[i];
      q.life -= dt;
      if (q.life <= 0) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        continue;
      }
      q.vy += q.grav * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.rot += q.vr * dt;
    }
    if (arr.length > 900) arr.splice(0, arr.length - 900);
  }

  private popup(x: number, y: number, text: string, color: string) {
    this.popups.push({ x, y, text, color, life: 1 });
    if (this.popups.length > 24) this.popups.shift();
  }

  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.y -= dt * 42;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const race = this.mode === "race";
    const lead = race ? 120 + Math.abs(p.vx) * 0.16 : 96;
    const target = clamp(p.x + p.facing * lead - this.viewW / 2, 0, Math.max(0, this.level.w * TILE - this.viewW));
    const k = 1 - Math.exp(-dt * (race ? 11 : 9));
    this.cam.x = lerp(this.cam.x, target, k);
    if (this.cam.shake > 0) {
      this.cam.shake = Math.max(0, this.cam.shake - dt * 26);
    }
    const targetZoom = p.boostT > 0 ? 0.88 : 1;
    this.zoom = lerp(this.zoom, targetZoom, 1 - Math.exp(-dt * 4));
    this.computeView();
  }

  // ------------------------------------------------------------------ draw
  private draw() {
    const ctx = this.ctx;
    this.computeView();
    const theme = THEMES[this.level.theme % THEMES.length];
    const scale = this.cssW / this.viewW;
    const s = this.dpr * scale;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawSky(theme);
    this.drawParallax(theme);

    const shake = this.cam.shake;
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake * 2 : 0;

    ctx.setTransform(s, 0, 0, s, -this.cam.x * s + sx * this.dpr, -this.cam.y * s + sy * this.dpr);

    this.drawTiles();
    this.drawGoal(theme);
    this.drawCoins();
    this.drawItems();
    this.drawEnemies();
    this.drawRivals();
    this.drawPlayer();
    this.drawParticles();
    this.drawPopups();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawSpeedLines();
    if (this.phase !== "menu") this.drawHud(theme);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }
    this.drawVignette();
  }

  private drawSky(theme: (typeof THEMES)[number]) {
    const ctx = this.ctx;
    if (!this.grad || this.gradTheme !== this.level.theme) {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, theme.sky[0]);
      g.addColorStop(1, theme.sky[1]);
      this.grad = g;
      this.gradTheme = this.level.theme;
    }
    ctx.fillStyle = this.grad;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    // sun / moon
    const cx = this.cssW * 0.78;
    const cy = this.cssH * 0.18;
    ctx.fillStyle = this.level.theme === 2 ? "rgba(230,235,255,0.9)" : "rgba(255,247,200,0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, this.cssH * 0.07, 0, 7);
    ctx.fill();
    if (this.level.theme === 2) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 40; i++) {
        const x = ((i * 137.5) % this.cssW + this.cssW - (this.cam.x * 0.02) % this.cssW) % this.cssW;
        const y = ((i * 79.3) % (this.cssH * 0.6)) + 6;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 2 + i));
        ctx.globalAlpha = tw;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawParallax(theme: (typeof THEMES)[number]) {
    const ctx = this.ctx;
    const horizon = this.cssH * (this.viewH > LEVEL_PX ? 0.62 : 0.66);
    // clouds
    const span = this.cssW + 700;
    for (let i = 0; i < 8; i++) {
      const x = (((i * 367 - this.cam.x * 0.18) % span) + span) % span - 260;
      const y = this.cssH * (0.08 + ((i * 13) % 5) * 0.055);
      drawCloud(ctx, x, y, 0.7 + ((i * 7) % 4) * 0.22, theme.cloud);
    }
    // far hills
    this.hillLayer(theme.hillFar, horizon - this.cssH * 0.06, 0.28, 0.0022, this.cssH * 0.12);
    this.hillLayer(theme.hillNear, horizon + this.cssH * 0.02, 0.5, 0.0034, this.cssH * 0.09);
    // bushes on the ground band
    const bspan = this.cssW + 400;
    for (let i = 0; i < 6; i++) {
      const x = (((i * 311 - this.cam.x * 0.75) % bspan) + bspan) % bspan - 150;
      drawBush(ctx, x, horizon + this.cssH * 0.075, 0.75 + ((i * 5) % 3) * 0.25, theme);
    }
  }

  private hillLayer(color: string, baseY: number, factor: number, freq: number, amp: number) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, this.cssH);
    const step = 24;
    for (let x = 0; x <= this.cssW + step; x += step) {
      const wx = (x + this.cam.x * factor) * freq * 6;
      const y = baseY - Math.sin(wx) * amp - Math.sin(wx * 2.3) * amp * 0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.cssW, this.cssH);
    ctx.closePath();
    ctx.fill();
  }

  private drawTiles() {
    const ctx = this.ctx;
    const L = this.level;
    const c0 = Math.max(0, Math.floor(this.cam.x / TILE) - 1);
    const c1 = Math.min(L.w - 1, Math.ceil((this.cam.x + this.viewW) / TILE) + 1);
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < L.h; r++) {
        const t = L.tiles[r * L.w + c];
        if (!t) continue;
        let oy = 0;
        const b = this.bumps.get(r * L.w + c);
        if (b !== undefined) {
          const nb = b + 1 / 60;
          this.bumps.set(r * L.w + c, nb);
          if (nb > 0.24) this.bumps.delete(r * L.w + c);
          oy = -Math.sin(Math.min(1, nb / 0.24) * Math.PI) * 9;
        }
        ctx.drawImage(this.atlas, t * AT, 0, AT, AT, c * TILE, r * TILE + oy, TILE, TILE);
      }
    }
  }

  private drawGoal(theme: (typeof THEMES)[number]) {
    const ctx = this.ctx;
    const gx = this.level.goalX;
    if (Math.abs(gx - this.cam.x - this.viewW / 2) > this.viewW) return;
    const gy = this.surfaceAt(gx);
    const groundY = gy >= 0 ? gy : LEVEL_PX - 32;
    if (this.mode === "race") drawFinishGate(ctx, gx, groundY, this.time);
    else drawFlag(ctx, gx, groundY, this.time);
    if (Math.abs(gx - this.cam.x - this.viewW / 2) > this.viewW) return;
    ctx.fillStyle = theme.grassDark;
  }

  private drawCoins() {
    const ctx = this.ctx;
    const L = this.level;
    const camL = this.cam.x - 40;
    const camR = this.cam.x + this.viewW + 40;
    for (let i = 0; i < L.coins.length; i++) {
      if (this.coinTaken[i]) continue;
      const c = L.coins[i];
      if (c.x < camL || c.x > camR) continue;
      drawCoin(ctx, c.x, c.y + Math.sin(this.time * 3 + i * 0.4) * 3, this.time + i * 0.3);
    }
  }

  private drawItems() {
    for (const it of this.items) drawMushroom(this.ctx, it.x, it.y, it.w, it.h);
  }

  private drawEnemies() {
    const ctx = this.ctx;
    const camL = this.cam.x - 80;
    const camR = this.cam.x + this.viewW + 80;
    for (const e of this.enemies) {
      if (e.x < camL || e.x > camR) continue;
      if (e.type === "flyer") drawFlyer(ctx, e.x, e.y - e.h / 2, e.t, e.dir);
      else if (e.type === "spiky") drawSpiky(ctx, e.x, e.y, e.w, e.h, e.t);
      else drawGoomba(ctx, e.x, e.y, e.w, e.h, e.t, e.dead ? e.squish : 0);
    }
  }

  private drawRivals() {
    const ctx = this.ctx;
    for (const r of this.rivals) {
      if (Math.abs(r.x - this.cam.x - this.viewW / 2) > this.viewW) continue;
      ctx.save();
      ctx.globalAlpha = 0.95;
      drawPlayer(
        ctx,
        {
          x: r.x,
          y: r.y,
          facing: 1,
          runT: r.runT,
          squashX: 1,
          squashY: 1,
          big: false,
          boosting: false,
          invuln: 0,
          time: this.time,
        },
        RIVAL_PALETTES[r.palette % RIVAL_PALETTES.length]
      );
      ctx.restore();
      // name tag
      const bob = Math.sin(this.time * 3 + r.phase) * 2;
      ctx.font = "bold 10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      const w = ctx.measureText(r.name).width + 10;
      rrPath(ctx, r.x - w / 2, r.y - 76 + bob, w, 16, 5);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(r.name, r.x, r.y - 64.5 + bob);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    if (this.phase === "menu") return;
    ctx.save();
    if (this.phase === "dead") {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.translate(-p.x, -p.y);
    }
    // shadow
    const gy = this.surfaceAt(p.x);
    if (gy >= 0 && gy > p.y) {
      const d = clamp(1 - (gy - p.y) / 220, 0.2, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.22 * d})`;
      ctx.beginPath();
      ctx.ellipse(p.x, gy - 3, 15 * d, 5 * d, 0, 0, 7);
      ctx.fill();
    }
    drawPlayer(
      ctx,
      {
        x: p.x,
        y: p.y,
        facing: p.facing,
        runT: p.runT,
        squashX: p.squashX,
        squashY: p.squashY,
        big: p.big,
        boosting: p.boostT > 0,
        invuln: p.invuln,
        time: this.time,
      },
      MARIO
    );
    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const q of this.particles) {
      const a = clamp(q.life / q.max, 0, 1);
      ctx.globalAlpha = a;
      if (q.kind === 1 || q.kind === 3) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = q.color;
        if (q.kind === 3) {
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.size * a, 0, 7);
          ctx.fill();
        } else {
          ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
        }
        ctx.globalCompositeOperation = "source-over";
      } else if (q.kind === 2) {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillStyle = q.color;
        ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size * 0.7);
        ctx.restore();
      } else if (q.kind === 4) {
        drawCoin(ctx, q.x, q.y, q.life * 6, q.size);
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.4 + a * 0.6), 0, 7);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups() {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    for (const p of this.popups) {
      const a = clamp(p.life, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = "bold 13px 'Press Start 2P', monospace";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawSpeedLines() {
    const p = this.player;
    if (p.boostT <= 0 && Math.abs(p.vx) < 480) return;
    const ctx = this.ctx;
    const strength = clamp((Math.abs(p.vx) - 380) / 420, 0, 1);
    ctx.globalAlpha = 0.28 * strength;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 14; i++) {
      const y = ((i * 97 + Math.floor(this.time * 900)) % this.cssH) | 0;
      const len = 60 + ((i * 53) % 120);
      const x = (this.cssW - ((this.time * 2200 + i * 211) % (this.cssW + 300))) | 0;
      ctx.fillRect(x, y, len, 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawVignette() {
    const ctx = this.ctx;
    if (!this.vignette) {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const g = c.getContext("2d")!;
      const rad = g.createRadialGradient(32, 32, 18, 32, 32, 40);
      rad.addColorStop(0, "rgba(0,0,0,0)");
      rad.addColorStop(1, "rgba(0,0,0,0.42)");
      g.fillStyle = rad;
      g.fillRect(0, 0, 64, 64);
      this.vignette = c;
    }
    ctx.drawImage(this.vignette, 0, 0, this.cssW, this.cssH);
  }
  private vignette: HTMLCanvasElement | null = null;

  private panel(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(14,18,42,0.62)";
    rrPath(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawHud(theme: (typeof THEMES)[number]) {
    const ctx = this.ctx;
    const small = this.cssW < 620;
    const fs = small ? 9 : 12;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // score panel
    this.panel(10, 10, small ? 150 : 210, small ? 54 : 62);
    ctx.font = `bold ${fs}px 'Press Start 2P', monospace`;
    ctx.fillStyle = "#9fb3ff";
    ctx.fillText("SCORE", 22, 30);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${small ? 12 : 16}px 'Press Start 2P', monospace`;
    ctx.fillText(String(this.score).padStart(6, "0"), 22, small ? 48 : 55);

    // coins
    drawCoin(ctx, small ? 118 : 162, small ? 42 : 48, this.time, 9);
    ctx.font = `bold ${small ? 10 : 13}px 'Press Start 2P', monospace`;
    ctx.fillStyle = "#ffd83d";
    ctx.textAlign = "left";
    ctx.fillText(`x${this.coins}`, small ? 132 : 176, small ? 47 : 54);

    // timer / level
    const tw = small ? 120 : 160;
    this.panel(this.cssW / 2 - tw / 2, 10, tw, small ? 54 : 62);
    ctx.textAlign = "center";
    ctx.font = `bold ${fs}px 'Press Start 2P', monospace`;
    ctx.fillStyle = "#9fb3ff";
    ctx.fillText(this.mode === "race" ? "TEMPS" : "TEMPS", this.cssW / 2, 30);
    const tv = this.mode === "race" ? this.elapsed : this.timeLeft;
    const m = Math.floor(tv / 60);
    const sec = Math.floor(tv % 60);
    const cs = Math.floor((tv * 100) % 100);
    const timeStr =
      this.mode === "race"
        ? `${m}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`
        : `${m}:${String(sec).padStart(2, "0")}`;
    ctx.fillStyle = this.mode === "race" ? "#7ef5a0" : this.timeLeft < 30 ? "#ff8080" : "#ffffff";
    ctx.font = `bold ${small ? 12 : 16}px 'Press Start 2P', monospace`;
    ctx.fillText(timeStr, this.cssW / 2, small ? 48 : 55);

    // lives / progress
    const rw = small ? 120 : 168;
    this.panel(this.cssW - rw - 10, 10, rw, small ? 54 : 62);
    ctx.textAlign = "right";
    ctx.font = `bold ${fs}px 'Press Start 2P', monospace`;
    ctx.fillStyle = "#9fb3ff";
    ctx.fillText(this.mode === "race" ? "CIRCUIT" : "VIES", this.cssW - 22, 30);
    if (this.mode === "race") {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${small ? 10 : 13}px 'Press Start 2P', monospace`;
      ctx.fillText(`${this.levelIndex + 1}/3 ${this.level.name.slice(0, 8)}`, this.cssW - 22, small ? 48 : 55);
    } else {
      for (let i = 0; i < Math.max(0, this.lives); i++) {
        drawMiniCap(ctx, this.cssW - 26 - i * (small ? 18 : 22), small ? 44 : 50, small ? 7 : 9);
      }
    }

    // race progress bar
    if (this.mode === "race") this.drawRaceBar();

    // center messages
    ctx.textAlign = "center";
    if (this.countdown > 0) {
      const n = Math.ceil(this.countdown);
      const frac = 1 - (this.countdown - Math.floor(this.countdown));
      const label = n <= 0 ? "GO!" : String(n);
      const size = (small ? 46 : 72) * (0.6 + 0.5 * Math.min(1, frac * 3));
      ctx.save();
      ctx.translate(this.cssW / 2, this.cssH * 0.42);
      ctx.scale(1 + 0.06 * Math.sin(this.time * 12), 1);
      ctx.font = `bold ${size}px 'Press Start 2P', monospace`;
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = n <= 0 ? "#7ef5a0" : "#ffd83d";
      ctx.fillText(label, 0, 0);
      ctx.restore();
      ctx.font = `bold ${small ? 9 : 12}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(this.level.name.toUpperCase(), this.cssW / 2, this.cssH * 0.42 + 44);
    } else if (this.phase === "ready") {
      ctx.font = `bold ${small ? 14 : 22}px 'Press Start 2P', monospace`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      const t = this.level.name.toUpperCase();
      ctx.strokeText(t, this.cssW / 2, this.cssH * 0.4);
      ctx.fillStyle = "#fff";
      ctx.fillText(t, this.cssW / 2, this.cssH * 0.4);
    }

    if (this.phase === "clear") {
      const a = clamp(this.phaseT * 2, 0, 1);
      ctx.globalAlpha = a;
      this.panel(this.cssW / 2 - 170, this.cssH * 0.3, 340, 120);
      ctx.font = `bold ${small ? 13 : 20}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "#ffd83d";
      ctx.fillText("NIVEAU TERMINÉ !", this.cssW / 2, this.cssH * 0.3 + 50);
      ctx.font = `bold ${small ? 9 : 12}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "#fff";
      ctx.fillText(`BONUS TEMPS +${Math.floor(this.timeLeft) * 50}`, this.cssW / 2, this.cssH * 0.3 + 84);
      ctx.globalAlpha = 1;
    }
    if (this.phase === "finished") {
      this.panel(this.cssW / 2 - 150, this.cssH * 0.28, 300, 110);
      ctx.font = `bold ${small ? 13 : 20}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "#7ef5a0";
      ctx.fillText("ARRIVÉE !", this.cssW / 2, this.cssH * 0.28 + 46);
      ctx.font = `bold ${small ? 9 : 12}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "#fff";
      ctx.fillText(
        this.bestTime && this.elapsed <= this.bestTime + 0.001 ? "NOUVEAU RECORD !" : "BEAU TEMPS !",
        this.cssW / 2,
        this.cssH * 0.28 + 80
      );
    }
    if (this.phase === "dead") {
      ctx.font = `bold ${small ? 14 : 22}px 'Press Start 2P', monospace`;
      ctx.fillStyle = "#ff8080";
      ctx.fillText("OOPS !", this.cssW / 2, this.cssH * 0.38);
    }
    ctx.textAlign = "left";
    void theme;
  }

  private drawRaceBar() {
    const ctx = this.ctx;
    const small = this.cssW < 620;
    const w = small ? this.cssW - 40 : 520;
    const x = (this.cssW - w) / 2;
    const y = this.cssH - (small ? 34 : 40);
    const total = this.level.goalX - this.level.startX;
    ctx.fillStyle = "rgba(10,14,32,0.6)";
    rrPath(ctx, x, y, w, 14, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    // player progress
    const pp = clamp((this.player.x - this.level.startX) / total, 0, 1);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#38e0ff");
    g.addColorStop(1, "#7ef5a0");
    ctx.fillStyle = g;
    rrPath(ctx, x + 2, y + 2, Math.max(4, (w - 4) * pp), 10, 5);
    ctx.fill();
    // rivals
    for (const r of this.rivals) {
      const rp = clamp((r.x - this.level.startX) / total, 0, 1);
      ctx.fillStyle = ["#22a84f", "#f2b117", "#d64fa8"][r.palette % 3];
      ctx.beginPath();
      ctx.arc(x + w * rp, y + 7, 5, 0, 7);
      ctx.fill();
    }
    // player marker
    ctx.fillStyle = "#e0342b";
    ctx.beginPath();
    ctx.moveTo(x + w * pp, y - 6);
    ctx.lineTo(x + w * pp - 6, y - 14);
    ctx.lineTo(x + w * pp + 6, y - 14);
    ctx.closePath();
    ctx.fill();
    // position label
    const place = this.rivals.filter((r) => r.x > this.player.x).length + 1;
    ctx.font = `bold ${small ? 12 : 16}px 'Press Start 2P', monospace`;
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${place}${["er", "e", "e", "e"][place - 1] ?? "e"} / 4`, this.cssW - 16, y - 6);
    ctx.textAlign = "left";
  }
}

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawMiniCap(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#f6c89a";
  ctx.beginPath();
  ctx.arc(x, y + r * 0.3, r * 0.75, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#e0342b";
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - r, y - r * 0.25, r * 1.9, r * 0.5);
}

// ------------------------------------------------------------- persistence
const BEST_KEY = "mario-rush-best";
export function readBest(mode: Mode, index: number): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, number>;
    const v = o[`${mode}-${index}`];
    return typeof v === "number" ? v : null;
  } catch {
    return null;
  }
}
export function writeBest(mode: Mode, index: number, t: number) {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const o = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    o[`${mode}-${index}`] = t;
    localStorage.setItem(BEST_KEY, JSON.stringify(o));
  } catch {
    /* ignore */
  }
}
