import gsap from "gsap";

// Wind-blown rain for the Vengeance chapter (black streaks on the red page).
// Drops are grouped into three depth layers so each frame is 3 strokes, not hundreds.
const LAYERS = [
  { alpha: 0.18, len: 12, speed: 750 },
  { alpha: 0.3, len: 22, speed: 1100 },
  { alpha: 0.45, len: 36, speed: 1550 },
];

export class Rain {
  constructor(canvas, perLayer = 60) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.on = false;
    this.visible = false;
    this.resize();
    this.layers = LAYERS.map((l) => ({
      ...l,
      drops: Array.from({ length: perLayer }, () => ({ x: Math.random() * (this.w + 200), y: Math.random() * this.h })),
    }));
    addEventListener("resize", () => this.resize());
    gsap.ticker.add((time, deltaMs) => this.tick(Math.min(deltaMs, 50) / 1000));
  }

  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  setActive(on) {
    if (on === this.on) return;
    this.on = on;
    if (on) this.visible = true;
    gsap.to(this.canvas, {
      opacity: on ? 1 : 0,
      duration: 1.2,
      onComplete: () => { if (!this.on) this.visible = false; },
    });
  }

  tick(dt) {
    if (!this.visible) return;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.lineWidth = 1;
    for (const layer of this.layers) {
      ctx.strokeStyle = `rgba(11,11,12,${layer.alpha})`;
      ctx.beginPath();
      for (const d of layer.drops) {
        d.y += layer.speed * dt;
        d.x -= layer.speed * 0.2 * dt;
        if (d.y - layer.len > this.h) {
          d.y = -40;
          d.x = Math.random() * (this.w + 200);
        }
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + layer.len * 0.2, d.y - layer.len);
      }
      ctx.stroke();
    }
  }
}
