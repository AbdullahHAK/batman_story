import gsap from "gsap";
import { scramble } from "./scramble.js";

const CRITICAL = ["images/intro/gotham-signal-skyline.webp", "images/fear/well-fall.webp"];

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
  });

// Counts to 100 while fonts + first images load, then opens the black shutters.
// `onReveal` fires as the shutters start moving so the intro can animate in underneath.
export async function runPreloader(onReveal) {
  const pre = document.getElementById("preloader");
  const count = pre.querySelector(".pre-count");
  const num = count.querySelector("span");
  const counter = { v: 0 };

  scramble(pre.querySelector(".pre-line"), "WHY DO WE FALL?", { duration: 2 });

  const assets = Promise.all([...CRITICAL.map(loadImage), document.fonts?.ready]);
  const timeout = new Promise((r) => setTimeout(r, 6000));

  await Promise.all([
    gsap.to(counter, {
      v: 100,
      duration: 2.3,
      ease: "power2.inOut",
      onUpdate() {
        const v = Math.round(counter.v);
        num.textContent = String(v).padStart(3, "0");
        count.style.setProperty("--p", v / 100);
      },
    }),
    Promise.race([assets, timeout]),
  ]);

  // Browsers only allow audio after a click, so the entrance doubles as the sound choice.
  const gate = pre.querySelector(".pre-enter");
  gsap.to(count, { opacity: 0, duration: 0.3 });
  gsap.fromTo(gate, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", onStart: () => (gate.hidden = false) });
  const withSound = await new Promise((resolve) =>
    gate.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => resolve(b.dataset.sound === "on"), { once: true })
    )
  );

  gsap.timeline({ onComplete: () => pre.remove() })
    .to(".pre-inner", { opacity: 0, scale: 0.96, duration: 0.45, ease: "power2.in" })
    .add(() => document.querySelector(".cursor")?.classList.remove("is-hover"))
    .add(() => onReveal(withSound))
    .to(".pre-top", { yPercent: -100, duration: 1.3, ease: "expo.inOut" }, "<")
    .to(".pre-bottom", { yPercent: 100, duration: 1.3, ease: "expo.inOut" }, "<");
}
