import gsap from "gsap";

// Shared pointer position (viewport px). Effects read this every frame.
export const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };

addEventListener(
  "pointermove",
  (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  },
  { passive: true }
);

export const finePointer = matchMedia("(pointer: fine)").matches;

export function initCursor() {
  if (!finePointer) return;
  document.body.classList.add("has-cursor");

  const root = document.querySelector(".cursor");
  const ring = root.querySelector(".cursor-ring");
  const dot = root.querySelector(".cursor-dot");
  const label = root.querySelector(".cursor-label");

  const ringX = gsap.quickTo(ring, "x", { duration: 0.55, ease: "power3" });
  const ringY = gsap.quickTo(ring, "y", { duration: 0.55, ease: "power3" });
  const dotX = gsap.quickTo(dot, "x", { duration: 0.08 });
  const dotY = gsap.quickTo(dot, "y", { duration: 0.08 });

  addEventListener("pointermove", (e) => {
    ringX(e.clientX);
    ringY(e.clientY);
    dotX(e.clientX);
    dotY(e.clientY);
  });

  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("[data-cursor]");
    // also clears a hover state left behind when its element was removed (e.g. the entry gate)
    if (!t) return root.classList.remove("is-hover");
    root.classList.add("is-hover");
    label.textContent = t.dataset.cursor;
  });
  document.addEventListener("pointerout", (e) => {
    const t = e.target.closest("[data-cursor]");
    if (t && !t.contains(e.relatedTarget)) root.classList.remove("is-hover");
  });

  // magnetic controls: they lean toward the cursor, then spring back
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const mx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" });
    const my = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.3);
      my((e.clientY - r.top - r.height / 2) * 0.3);
    });
    el.addEventListener("pointerleave", () => {
      mx(0);
      my(0);
    });
  });

  addEventListener("pointerdown", () => gsap.to(ring, { scale: 0.75, duration: 0.2 }));
  addEventListener("pointerup", () => gsap.to(ring, { scale: 1, duration: 0.5, ease: "elastic.out(1, .4)" }));
}
