import gsap from "gsap";
import { pointer } from "./cursor.js";

const TAU = Math.PI * 2;
const REPEL_RADIUS = 170;
const MIN_SPEED = 160;
const MAX_SPEED = 900;

// Front-facing clipart bats. Each is split at the shoulders into left wing, body and
// right wing so the wings can rotate like a real wingbeat. Measurements are fractions
// of the image: body centre (cx), shoulder height (shoulderY), half body width (body).
// `swing` is the wing angle range and `rest` its centre (radians); bats drawn with
// wings already raised rest lower. `headTop` (optional) is where the head starts:
// anything above it belongs to the wings, even inside the body strip.
// Side-view bats can't hinge convincingly, so they aren't used.
const SPRITES = [
  { src: "/images/bats/bat-2.webp", cx: 0.509, shoulderY: 0.36, body: 0.1, swing: 0.65, rest: 0.05 },
  { src: "/images/bats/bat-3.webp", cx: 0.499, shoulderY: 0.5, body: 0.088, swing: 0.65, rest: 0.05 },
  { src: "/images/bats/bat-4.webp", cx: 0.389, shoulderY: 0.7, body: 0.12, swing: 0.5, rest: -0.22, headTop: 0.46 },
];
const SPRITE_W = 160; // pre-rendered width of each glow sprite
const GLOW_PAD = 26;
const GLOW = "rgba(242,239,233,.5)"; // bone
const MAX_BATS = 150;

// Pre-render each bat (optionally with a glow) and split it into wings and body.
// Blurring per frame would be far too slow, so this happens once at load.
function buildSprites(images, glow) {
  return images.map((img, i) => {
    const spec = SPRITES[i];
    const h = (img.height / img.width) * SPRITE_W;
    const c = document.createElement("canvas");
    c.width = SPRITE_W + GLOW_PAD * 2;
    c.height = h + GLOW_PAD * 2;
    const g = c.getContext("2d");
    if (glow) {
      g.shadowColor = glow;
      g.shadowBlur = 16;
    }
    g.drawImage(img, GLOW_PAD, GLOW_PAD, SPRITE_W, h);

    const cx = GLOW_PAD + spec.cx * SPRITE_W;
    const bw = spec.body * SPRITE_W;
    const top = spec.headTop ? GLOW_PAD + spec.headTop * h : 0;

    // body = the middle strip, feathered at the sides so the wing joints blend
    const body = composite(c, stripMask(c, cx, bw * 1.6, 0.25, top), "destination-in");
    // wings = everything except the body core, so rotating wings carry no head/ears
    const wings = composite(c, stripMask(c, cx, bw, 0.15, top), "destination-out");

    return { canvas: wings, body, cx, bw, sy: GLOW_PAD + spec.shoulderY * h, swing: spec.swing, rest: spec.rest };
  });
}

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

// A flock of bats on a full-screen canvas. Wings rotate around the shoulders.
export class Bats {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.list = [];
    this.swarm = 0; // 0..1, set by scroll (Fear chapter)
    this.ambient = 0; // bats per second drifting through
    this.spawnDebt = 0;
    this.glowOn = true;
    this.sprites = null;
    this.glowSprites = null;
    this.plainSprites = null;
    this.dirty = true;
    this.resize();
    addEventListener("resize", () => this.resize());
    gsap.ticker.add((time, deltaMs) => this.tick(Math.min(deltaMs, 50) / 1000));

    Promise.all(SPRITES.map((s) => loadImage(s.src))).then((imgs) => {
      if (!imgs.every(Boolean)) return; // keep the drawn fallback
      // Both variants are baked once; switching chapters just swaps the reference.
      this.glowSprites = buildSprites(imgs, GLOW);
      this.plainSprites = buildSprites(imgs, null);
      this.setGlow(this.glowOn);
    });
  }

  // 1x resolution: bats are small and blurry-edged anyway, and this is 4x fewer pixels on retina.
  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  // Glow keeps black bats visible on black; on red or bone pages they read without it.
  setGlow(on) {
    this.glowOn = on;
    if (this.glowSprites) this.sprites = on ? this.glowSprites : this.plainSprites;
  }

  add(x, y, vx, vy, size) {
    if (this.list.length >= MAX_BATS) return;
    this.list.push({
      x, y, vx, vy, size,
      kind: (Math.random() * SPRITES.length) | 0,
      phase: Math.random() * TAU,
      flap: 13 + Math.random() * 9,
      wobble: Math.random() * TAU,
      life: 0,
      maxLife: 4 + Math.random() * 3,
    });
  }

  // Explode outward from a point. direction "up" sends them skyward from a bottom edge.
  burst(x, y, count = 30, direction = "out") {
    for (let i = 0; i < count; i++) {
      const angle = direction === "up"
        ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6
        : Math.random() * TAU;
      const speed = 220 + Math.random() * 520;
      const px = direction === "up" ? Math.random() * this.w : x;
      this.add(px, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5 + Math.random() * (direction === "up" ? 26 : 14));
    }
  }

  spawnFromEdge() {
    const big = Math.random() < 0.12;
    this.add(
      Math.random() * this.w,
      this.h + 40,
      (Math.random() - 0.5) * 260,
      -(180 + Math.random() * 320),
      big ? 26 + Math.random() * 22 : 5 + Math.random() * 12
    );
  }

  tick(dt) {
    this.spawnDebt += (this.swarm * 32 + this.ambient) * dt;
    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      this.spawnFromEdge();
    }

    const { ctx } = this;
    if (!this.list.length) {
      if (this.dirty) ctx.clearRect(0, 0, this.w, this.h);
      this.dirty = false;
      return;
    }
    this.dirty = true;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = "#020203";
    ctx.strokeStyle = this.glowOn ? GLOW : "rgba(0,0,0,0)";
    ctx.lineWidth = 1;

    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];

      // wander
      b.wobble += dt * 2.2;
      b.vx += Math.cos(b.wobble) * 60 * dt;
      b.vy += Math.sin(b.wobble * 1.3) * 60 * dt;

      // flee the cursor
      const dx = b.x - pointer.x;
      const dy = b.y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (pointer.active && d < REPEL_RADIUS && d > 0.1) {
        const force = (1 - d / REPEL_RADIUS) * 2600 * dt;
        b.vx += (dx / d) * force;
        b.vy += (dy / d) * force;
      }

      // drag, but bats never hover: keep speed between MIN and MAX
      b.vx *= 1 - 0.35 * dt;
      b.vy *= 1 - 0.35 * dt;
      const speed = Math.hypot(b.vx, b.vy) || 1;
      const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
      b.vx *= clamped / speed;
      b.vy *= clamped / speed;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += b.flap * dt;
      b.life += dt;

      const m = 120;
      const fade = b.maxLife + 1 - b.life;
      if (fade <= 0 || b.x < -m || b.x > this.w + m || b.y < -m || b.y > this.h + m * 2) {
        this.list.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.min(1, fade);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.max(-0.6, Math.min(0.6, b.vx * 0.0012)));
      if (this.sprites) {
        const scale = (b.size * 2.4) / SPRITE_W;
        ctx.scale(scale, scale);
        drawWingedBat(ctx, this.sprites[b.kind], b.phase);
      } else {
        drawBat(ctx, b.size, Math.sin(b.phase));
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

function makeCanvas(like) {
  const c = document.createElement("canvas");
  c.width = like.width;
  c.height = like.height;
  return c;
}

// Opaque vertical strip centred on cx (half-width `half`), feathered at the sides
// over `feather` of its width, and starting below `top` (0 = full height).
function stripMask(like, cx, half, feather, top) {
  const m = makeCanvas(like);
  const g = m.getContext("2d");
  const h = g.createLinearGradient(cx - half, 0, cx + half, 0);
  h.addColorStop(0, "rgba(0,0,0,0)");
  h.addColorStop(feather, "#000");
  h.addColorStop(1 - feather, "#000");
  h.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = h;
  g.fillRect(0, 0, m.width, m.height);
  if (top > 0) {
    const v = g.createLinearGradient(0, top - 6, 0, top + 6);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "#000");
    g.globalCompositeOperation = "destination-in";
    g.fillStyle = v;
    g.fillRect(0, 0, m.width, m.height);
  }
  return m;
}

function composite(source, mask, op) {
  const out = makeCanvas(source);
  const g = out.getContext("2d");
  g.drawImage(source, 0, 0);
  g.globalCompositeOperation = op;
  g.drawImage(mask, 0, 0);
  return out;
}

// Draw a sprite bat centred on 0,0 with its wings rotated around the shoulders.
// Upstroke: wings swing up and foreshorten; downstroke: body lifts slightly.
export function drawWingedBat(ctx, s, phase) {
  const W = s.canvas.width;
  const H = s.canvas.height;
  const beat = Math.sin(phase); // 1 = wings up, -1 = wings down
  const angle = beat * s.swing + s.rest;
  const foreshorten = 1 - 0.25 * Math.abs(beat);

  ctx.translate(-W / 2, -H / 2 + beat * H * 0.03);

  // left wing hinges at the left shoulder
  ctx.save();
  ctx.translate(s.cx - s.bw, s.sy);
  ctx.rotate(angle);
  ctx.scale(foreshorten, 1);
  ctx.drawImage(s.canvas, 0, 0, s.cx, H, -(s.cx - s.bw), -s.sy, s.cx, H);
  ctx.restore();

  // right wing hinges at the right shoulder
  ctx.save();
  ctx.translate(s.cx + s.bw, s.sy);
  ctx.rotate(-angle);
  ctx.scale(foreshorten, 1);
  ctx.drawImage(s.canvas, s.cx, 0, W - s.cx, H, -s.bw, -s.sy, W - s.cx, H);
  ctx.restore();

  ctx.drawImage(s.body, 0, 0);
}

// Fallback silhouette (used until the sprites load). `flap` in -1..1 moves the wingtips.
function drawBat(ctx, s, flap) {
  const wy = -flap * s * 0.75;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.28);
  ctx.lineTo(s * 0.1, -s * 0.42);
  ctx.lineTo(s * 0.14, -s * 0.22);
  ctx.quadraticCurveTo(s * 0.55, -s * 0.32 + wy * 0.4, s * 1.15, wy - s * 0.12);
  ctx.quadraticCurveTo(s * 0.92, wy * 0.6 + s * 0.12, s * 0.78, wy * 0.5 + s * 0.26);
  ctx.quadraticCurveTo(s * 0.55, wy * 0.3 + s * 0.08, s * 0.32, s * 0.3);
  ctx.lineTo(0, s * 0.48);
  ctx.lineTo(-s * 0.32, s * 0.3);
  ctx.quadraticCurveTo(-s * 0.55, wy * 0.3 + s * 0.08, -s * 0.78, wy * 0.5 + s * 0.26);
  ctx.quadraticCurveTo(-s * 0.92, wy * 0.6 + s * 0.12, -s * 1.15, wy - s * 0.12);
  ctx.quadraticCurveTo(-s * 0.55, -s * 0.32 + wy * 0.4, -s * 0.14, -s * 0.22);
  ctx.lineTo(-s * 0.1, -s * 0.42);
  ctx.closePath();
}
