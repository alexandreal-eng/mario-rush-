import { TILE, THEMES, type Theme } from "./constants";
import { T } from "./level";

export const ATLAS_SCALE = 2;
const AT = TILE * ATLAS_SCALE;

type Ctx = CanvasRenderingContext2D;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// ---------------------------------------------------------------- tile atlas
export function buildTileAtlas(theme: Theme): HTMLCanvasElement {
  const n = 12;
  const cv = document.createElement("canvas");
  cv.width = n * AT;
  cv.height = AT;
  const ctx = cv.getContext("2d")!;
  const S = ATLAS_SCALE;

  const slot = (id: number) => ({ x: id * AT });

  const draw = (id: number, fn: (c: Ctx) => void) => {
    const { x } = slot(id);
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(S, S);
    fn(ctx);
    ctx.restore();
  };

  const dirt = (c: Ctx) => {
    c.fillStyle = theme.ground;
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = theme.groundDark;
    for (let i = 0; i < 7; i++) {
      const px = ((i * 11) % 28) + 2;
      const py = ((i * 17) % 24) + 4;
      c.fillRect(px, py, 4, 3);
    }
    c.fillStyle = "rgba(255,255,255,0.07)";
    c.fillRect(0, 0, 32, 3);
    c.strokeStyle = "rgba(0,0,0,0.18)";
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, 31, 31);
  };

  draw(T.DIRT, dirt);

  draw(T.GRASS, (c) => {
    dirt(c);
    c.fillStyle = theme.grass;
    c.fillRect(0, 0, 32, 11);
    c.fillStyle = theme.grassDark;
    c.fillRect(0, 9, 32, 3);
    c.fillStyle = theme.grass;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.arc(i * 8 + 4, 11, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "rgba(255,255,255,0.22)";
    c.fillRect(0, 0, 32, 2);
  });

  draw(T.BRICK, (c) => {
    c.fillStyle = "#c8642c";
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = "#e08a4a";
    c.fillRect(1, 1, 30, 6);
    c.fillRect(1, 17, 14, 6);
    c.fillRect(17, 17, 14, 6);
    c.fillStyle = "#8a3f18";
    c.fillRect(0, 8, 32, 2);
    c.fillRect(0, 24, 32, 2);
    c.fillRect(15, 8, 2, 9);
    c.fillRect(0, 15, 32, 2);
    c.fillRect(7, 24, 2, 8);
    c.fillRect(23, 24, 2, 8);
    c.strokeStyle = "rgba(0,0,0,0.25)";
    c.lineWidth = 1;
    c.strokeRect(0.5, 0.5, 31, 31);
  });

  const qblock = (c: Ctx, accent: string, glyph: string) => {
    const g = c.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, "#ffd24a");
    g.addColorStop(1, "#e59a12");
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = "#8a5a06";
    for (const [x, y] of [
      [3, 3],
      [26, 3],
      [3, 26],
      [26, 26],
    ])
      c.fillRect(x, y, 3, 3);
    c.strokeStyle = "rgba(120,70,0,0.6)";
    c.lineWidth = 2;
    c.strokeRect(1, 1, 30, 30);
    c.fillStyle = accent;
    c.font = "bold 20px system-ui, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(glyph, 16, 18);
  };

  draw(T.QCOIN, (c) => qblock(c, "#7a4a00", "?"));
  draw(T.QPOWER, (c) => qblock(c, "#b5202a", "!"));

  draw(T.SLOPE_UP, (c) => {
    c.fillStyle = theme.ground;
    c.beginPath();
    c.moveTo(0, 32);
    c.lineTo(32, 0);
    c.lineTo(32, 32);
    c.closePath();
    c.fill();
    c.strokeStyle = theme.grass;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(-2, 34);
    c.lineTo(34, -2);
    c.stroke();
    c.strokeStyle = theme.grassDark;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(2, 36);
    c.lineTo(36, 0);
    c.stroke();
  });

  draw(T.SLOPE_DOWN, (c) => {
    c.fillStyle = theme.ground;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(32, 32);
    c.lineTo(0, 32);
    c.closePath();
    c.fill();
    c.strokeStyle = theme.grass;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(-2, -2);
    c.lineTo(34, 34);
    c.stroke();
    c.strokeStyle = theme.grassDark;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-4, 0);
    c.lineTo(32, 36);
    c.stroke();
  });

  draw(T.SPIKE, (c) => {
    c.fillStyle = "#2b2b3d";
    c.fillRect(0, 26, 32, 6);
    c.fillStyle = "#9aa3b8";
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(i * 11 + 1, 27);
      c.lineTo(i * 11 + 5.5, 2);
      c.lineTo(i * 11 + 10, 27);
      c.closePath();
      c.fill();
    }
    c.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 3; i++) c.fillRect(i * 11 + 4, 8, 1.5, 14);
  });

  draw(T.BOOST, (c) => {
    c.fillStyle = "rgba(20,24,60,0.55)";
    c.fillRect(0, 22, 32, 10);
    c.fillStyle = "#38e0ff";
    for (let i = 0; i < 2; i++) {
      const y = 24 + i * 5;
      c.beginPath();
      c.moveTo(2, y + 4);
      c.lineTo(10, y);
      c.lineTo(10, y + 2.5);
      c.lineTo(20, y + 4);
      c.lineTo(10, y + 5.5);
      c.lineTo(10, y + 8);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(20, y + 4);
      c.lineTo(27, y);
      c.lineTo(27, y + 8);
      c.closePath();
      c.fill();
    }
  });

  draw(T.STONE, (c) => {
    c.fillStyle = "#8f97b0";
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = "#b6bdd2";
    c.fillRect(2, 2, 28, 10);
    c.fillStyle = "#6a7189";
    c.fillRect(2, 20, 28, 10);
    c.strokeStyle = "rgba(30,34,50,0.5)";
    c.lineWidth = 2;
    c.strokeRect(1, 1, 30, 30);
  });

  draw(T.USED, (c) => {
    c.fillStyle = "#9a6a3a";
    c.fillRect(0, 0, 32, 32);
    c.fillStyle = "#7a5028";
    c.fillRect(3, 3, 26, 26);
    c.strokeStyle = "rgba(0,0,0,0.25)";
    c.lineWidth = 2;
    c.strokeRect(1, 1, 30, 30);
  });

  return cv;
}

export const ATLAS_TILE_SRC = (id: number) => ({ sx: id * AT, sy: 0, sw: AT, sh: AT });

// ------------------------------------------------------------------ entities
export interface DrawPlayerState {
  x: number;
  y: number;
  facing: number;
  runT: number;
  squashX: number;
  squashY: number;
  big: boolean;
  boosting: boolean;
  invuln: number;
  time: number;
}

export function drawPlayer(ctx: Ctx, p: DrawPlayerState, palette = MARIO) {
  const k = p.big ? 1.22 : 1;
  const blink = p.invuln > 0 && Math.floor(p.time * 18) % 2 === 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing * p.squashX, p.squashY);
  if (blink) ctx.globalAlpha = 0.35;

  const run = Math.sin(p.runT * 13);
  const air = Math.abs(p.squashY - 1) > 0.02;
  const legSwing = air ? 0 : run * 6 * k;
  const bodyBob = air ? 0 : Math.abs(run) * 1.2 * k;

  // shadowy feet
  ctx.fillStyle = "#3a2412";
  rr(ctx, -10 * k, -8 * k + legSwing * 0.2, 9 * k, 8 * k, 3 * k);
  ctx.fill();
  rr(ctx, 1 * k, -8 * k - legSwing * 0.2, 9 * k, 8 * k, 3 * k);
  ctx.fill();

  // legs
  ctx.fillStyle = palette.pants;
  rr(ctx, -8 * k, -20 * k + legSwing * 0.5, 7 * k, 14 * k, 3 * k);
  ctx.fill();
  rr(ctx, 1 * k, -20 * k - legSwing * 0.5, 7 * k, 14 * k, 3 * k);
  ctx.fill();

  // torso / overalls
  ctx.fillStyle = palette.shirt;
  rr(ctx, -11 * k, -34 * k + bodyBob, 22 * k, 16 * k, 5 * k);
  ctx.fill();
  ctx.fillStyle = palette.pants;
  rr(ctx, -10 * k, -26 * k + bodyBob, 20 * k, 11 * k, 3 * k);
  ctx.fill();
  // straps
  ctx.fillStyle = palette.pants;
  ctx.fillRect(-8 * k, -34 * k + bodyBob, 3.5 * k, 9 * k);
  ctx.fillRect(4.5 * k, -34 * k + bodyBob, 3.5 * k, 9 * k);
  // buttons
  ctx.fillStyle = "#ffd94a";
  ctx.beginPath();
  ctx.arc(-6 * k, -25 * k + bodyBob, 1.8 * k, 0, 7);
  ctx.arc(6 * k, -25 * k + bodyBob, 1.8 * k, 0, 7);
  ctx.fill();

  // arms
  ctx.fillStyle = palette.skin;
  const armA = air ? -0.7 : run * 0.5;
  ctx.save();
  ctx.translate(9 * k, -30 * k + bodyBob);
  ctx.rotate(armA);
  rr(ctx, -3 * k, 0, 6 * k, 11 * k, 3 * k);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(-9 * k, -30 * k + bodyBob);
  ctx.rotate(-armA);
  rr(ctx, -3 * k, 0, 6 * k, 11 * k, 3 * k);
  ctx.fill();
  ctx.restore();

  // gloves
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(9 * k + Math.sin(armA) * 9 * k, -19 * k + bodyBob + Math.cos(armA) * 9 * k, 3.4 * k, 0, 7);
  ctx.fill();

  // head
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(1 * k, -41 * k + bodyBob, 10 * k, 0, 7);
  ctx.fill();
  // ear
  ctx.beginPath();
  ctx.arc(-7 * k, -40 * k + bodyBob, 3 * k, 0, 7);
  ctx.fill();

  // cap
  ctx.fillStyle = palette.cap;
  ctx.beginPath();
  ctx.arc(1 * k, -43 * k + bodyBob, 10.5 * k, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-9 * k, -44 * k + bodyBob, 20 * k, 4 * k);
  rr(ctx, 4 * k, -43 * k + bodyBob, 14 * k, 4.5 * k, 2 * k);
  ctx.fill();
  // cap emblem
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, -47 * k + bodyBob, 3.4 * k, 0, 7);
  ctx.fill();
  ctx.fillStyle = palette.cap;
  ctx.font = `bold ${5 * k}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("M", 0, -46.6 * k + bodyBob);

  // eye
  ctx.fillStyle = "#241608";
  ctx.beginPath();
  ctx.ellipse(5 * k, -41 * k + bodyBob, 1.6 * k, 2.4 * k, 0, 0, 7);
  ctx.fill();
  // moustache
  ctx.fillStyle = "#3a2412";
  rr(ctx, 1 * k, -36.5 * k + bodyBob, 9 * k, 3.4 * k, 1.6 * k);
  ctx.fill();
  // nose
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(10 * k, -39.5 * k + bodyBob, 3.6 * k, 0, 7);
  ctx.fill();

  ctx.restore();
}

export interface Palette {
  cap: string;
  shirt: string;
  pants: string;
  skin: string;
}
export const MARIO: Palette = { cap: "#e0342b", shirt: "#e0342b", pants: "#2a56d6", skin: "#f6c89a" };
export const RIVAL_PALETTES: Palette[] = [
  { cap: "#22a84f", shirt: "#22a84f", pants: "#f0f0f0", skin: "#f6c89a" },
  { cap: "#f2b117", shirt: "#f2b117", pants: "#3a3a4a", skin: "#f6c89a" },
  { cap: "#d64fa8", shirt: "#d64fa8", pants: "#2b2b3d", skin: "#f6c89a" },
];

export function drawGoomba(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, squish: number) {
  ctx.save();
  ctx.translate(x, y);
  const sq = squish > 0 ? 1 + squish * 0.8 : 1;
  ctx.scale(sq, 1 / sq);
  const wob = Math.sin(t * 9) * 1.6;
  ctx.fillStyle = "#5a3418";
  rr(ctx, -w * 0.42, -h * 0.22, w * 0.3, h * 0.22 + wob * 0.2, 3);
  ctx.fill();
  rr(ctx, w * 0.12, -h * 0.22, w * 0.3, h * 0.22 - wob * 0.2, 3);
  ctx.fill();
  ctx.fillStyle = "#8a4d21";
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.2);
  ctx.quadraticCurveTo(-w * 0.5, -h, 0, -h);
  ctx.quadraticCurveTo(w * 0.5, -h, w / 2, -h * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f2d6a8";
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.22, w * 0.38, h * 0.12, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-w * 0.16, -h * 0.5, w * 0.12, h * 0.13, 0, 0, 7);
  ctx.ellipse(w * 0.16, -h * 0.5, w * 0.12, h * 0.13, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(-w * 0.13, -h * 0.5, w * 0.055, h * 0.07, 0, 0, 7);
  ctx.ellipse(w * 0.13, -h * 0.5, w * 0.055, h * 0.07, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, -h * 0.66);
  ctx.lineTo(-w * 0.06, -h * 0.58);
  ctx.moveTo(w * 0.28, -h * 0.66);
  ctx.lineTo(w * 0.06, -h * 0.58);
  ctx.stroke();
  ctx.restore();
}

export function drawSpiky(ctx: Ctx, x: number, y: number, w: number, h: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(t * 7) * 1.5;
  ctx.fillStyle = "#7b3fa0";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI + (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.22) * w * 0.42, -h * 0.5 + bob + Math.sin(a - 0.22) * h * 0.42);
    ctx.lineTo(Math.cos(a) * w * 0.75, -h * 0.5 + bob + Math.sin(a) * h * 0.75);
    ctx.lineTo(Math.cos(a + 0.22) * w * 0.42, -h * 0.5 + bob + Math.sin(a + 0.22) * h * 0.42);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#a45ad0";
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.5 + bob, w * 0.46, h * 0.44, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-w * 0.15, -h * 0.5 + bob, w * 0.11, h * 0.12, 0, 0, 7);
  ctx.ellipse(w * 0.15, -h * 0.5 + bob, w * 0.11, h * 0.12, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(-w * 0.13, -h * 0.48 + bob, w * 0.05, h * 0.06, 0, 0, 7);
  ctx.ellipse(w * 0.13, -h * 0.48 + bob, w * 0.05, h * 0.06, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#f5e0a0";
  rr(ctx, -w * 0.16, -h * 0.36 + bob, w * 0.32, h * 0.1, 3);
  ctx.fill();
  ctx.restore();
}

export function drawFlyer(ctx: Ctx, x: number, y: number, t: number, dir: number) {
  ctx.save();
  ctx.translate(x, y);
  const flap = Math.sin(t * 16);
  ctx.fillStyle = "#4b3f8f";
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.rotate(flap * 0.4);
    ctx.beginPath();
    ctx.moveTo(6, -6);
    ctx.quadraticCurveTo(22, -14 + flap * 6, 30, -2 + flap * 4);
    ctx.quadraticCurveTo(20, -2, 6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#6b5cc4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 11, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-4 * dir, -2, 3.4, 4, 0, 0, 7);
  ctx.ellipse(4 * dir, -2, 3.4, 4, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#1a1a2a";
  ctx.beginPath();
  ctx.arc(-4 * dir, -2, 1.6, 0, 7);
  ctx.arc(4 * dir, -2, 1.6, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#f0c040";
  ctx.beginPath();
  ctx.moveTo(-3 * dir, 4);
  ctx.lineTo(3 * dir, 4);
  ctx.lineTo(0, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawCoin(ctx: Ctx, x: number, y: number, t: number, r = 11) {
  const sx = Math.abs(Math.cos(t * 3.4));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.14, sx), 1);
  ctx.fillStyle = "#c98a05";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#ffd83d";
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.6, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff3a8";
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.22, r * 0.34, -0.5, 0, 7);
  ctx.fill();
  ctx.restore();
}

export function drawMushroom(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f6e6c8";
  rr(ctx, -w * 0.24, -h * 0.45, w * 0.48, h * 0.45, 4);
  ctx.fill();
  ctx.fillStyle = "#e33b30";
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, -h * 0.4);
  ctx.quadraticCurveTo(-w * 0.5, -h, 0, -h);
  ctx.quadraticCurveTo(w * 0.5, -h, w * 0.5, -h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-w * 0.22, -h * 0.66, w * 0.1, 0, 7);
  ctx.arc(w * 0.2, -h * 0.6, w * 0.13, 0, 7);
  ctx.arc(0, -h * 0.86, w * 0.09, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#2a1a10";
  ctx.beginPath();
  ctx.arc(-w * 0.1, -h * 0.2, 1.6, 0, 7);
  ctx.arc(w * 0.1, -h * 0.2, 1.6, 0, 7);
  ctx.fill();
  ctx.restore();
}

export function drawFlag(ctx: Ctx, x: number, groundY: number, t: number) {
  const h = 190;
  ctx.save();
  ctx.translate(x, groundY);
  // base
  ctx.fillStyle = "#2f8f43";
  rr(ctx, -26, -14, 52, 14, 4);
  ctx.fill();
  ctx.fillStyle = "#54c25e";
  rr(ctx, -26, -14, 52, 5, 3);
  ctx.fill();
  // pole
  ctx.fillStyle = "#d8dde8";
  ctx.fillRect(-4, -h, 8, h - 12);
  ctx.fillStyle = "#9aa3b8";
  ctx.fillRect(1, -h, 3, h - 12);
  ctx.beginPath();
  ctx.arc(0, -h - 6, 7, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#ffd83d";
  ctx.beginPath();
  ctx.arc(0, -h - 6, 4, 0, 7);
  ctx.fill();
  // flag
  const wave = Math.sin(t * 4) * 6;
  ctx.fillStyle = "#e0342b";
  ctx.beginPath();
  ctx.moveTo(4, -h + 6);
  ctx.quadraticCurveTo(40, -h + 18 + wave, 74, -h + 10 + wave);
  ctx.lineTo(74, -h + 52 + wave);
  ctx.quadraticCurveTo(40, -h + 44 + wave, 4, -h + 56);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", 38, -h + 31 + wave * 0.6);
  ctx.restore();
}

export function drawFinishGate(ctx: Ctx, x: number, groundY: number, t: number) {
  ctx.save();
  ctx.translate(x, groundY);
  // checkered arch
  ctx.fillStyle = "#1c2140";
  rr(ctx, -14, -170, 28, 170, 6);
  ctx.fill();
  const cells = 8;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#f4f6ff" : "#e0342b";
      ctx.fillRect(-10 + j * 10, -166 + i * 20, 10, 20);
    }
  }
  // banner
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  ctx.fillStyle = `rgba(255,216,61,${0.75 + pulse * 0.25})`;
  rr(ctx, -70, -215, 140, 42, 8);
  ctx.fill();
  ctx.fillStyle = "#2a1a10";
  ctx.font = "bold 20px 'Press Start 2P', system-ui, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ARRIVÉE", 0, -193);
  ctx.restore();
}

export function drawBush(ctx: Ctx, x: number, y: number, s: number, theme: Theme) {
  ctx.fillStyle = theme.grassDark;
  ctx.beginPath();
  ctx.arc(x, y, 14 * s, 0, 7);
  ctx.arc(x + 18 * s, y - 6 * s, 18 * s, 0, 7);
  ctx.arc(x + 38 * s, y, 14 * s, 0, 7);
  ctx.fill();
  ctx.fillStyle = theme.grass;
  ctx.beginPath();
  ctx.arc(x + 4 * s, y - 6 * s, 10 * s, 0, 7);
  ctx.arc(x + 20 * s, y - 12 * s, 13 * s, 0, 7);
  ctx.arc(x + 35 * s, y - 5 * s, 10 * s, 0, 7);
  ctx.fill();
}

export function drawCloud(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, 7);
  ctx.arc(x + 22 * s, y - 8 * s, 24 * s, 0, 7);
  ctx.arc(x + 48 * s, y + 2 * s, 18 * s, 0, 7);
  ctx.arc(x + 26 * s, y + 10 * s, 20 * s, 0, 7);
  ctx.fill();
}

export const themeAt = (i: number) => THEMES[i % THEMES.length];
