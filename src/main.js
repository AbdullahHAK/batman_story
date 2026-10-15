import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { pointer, finePointer, initCursor } from "./fx/cursor.js";
import { Bats } from "./fx/bats.js";
import { Rain } from "./fx/rain.js";
import { Score } from "./fx/score.js";
import { scramble, garble } from "./fx/scramble.js";
import { splitChars, splitWords } from "./fx/split.js";
import { runPreloader } from "./fx/preloader.js";

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

history.scrollRestoration = "manual";
scrollTo(0, 0);

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- effects ---------- */
const bats = new Bats($("#bats"));
const rain = new Rain($("#rain"));
const score = new Score();
const entered = new Set(); // chapters that already played their opening braam
initCursor();

$$(".title-line, [data-split]").forEach(splitChars);
$$(".quote p, .dawn-text p, .florence-speech p").forEach(splitWords);
$$("[data-scramble]").forEach((el) => (el.textContent = garble(el.dataset.scramble)));

/* ---------- sound ---------- */
const soundBtn = $(".sound");
const setSoundUI = (on) => {
  soundBtn.setAttribute("aria-pressed", String(on));
  $(".sound-text").textContent = on ? "SOUND ON" : "SOUND OFF";
};
soundBtn.addEventListener("click", () => setSoundUI(score.toggle()));

/* ---------- click anywhere: scatter bats ---------- */
addEventListener("pointerdown", (e) => {
  if (e.target.closest("a, button, .twoface, .flare")) return;
  bats.burst(e.clientX, e.clientY, 18);
  score.flutter();
});

/* ---------- anchor links through Lenis ---------- */
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const target = $(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { duration: 2.4 }) : target.scrollIntoView();
  })
);

if (reduceMotion) {
  // Content is fully visible via CSS; keep only the theme colours.
  $("#preloader").remove();
  $$("[data-scramble]").forEach((el) => (el.textContent = el.dataset.scramble));
  $$("[data-accent]").forEach((sec) =>
    ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: (s) => s.isActive && setTheme(sec) })
  );
} else {
  buildScenes();
  document.body.classList.add("is-loading");
  lenis.stop();
  runPreloader((withSound) => {
    if (withSound) {
      setSoundUI(score.toggle(true));
      score.braam(1.2);
    }
    document.body.classList.remove("is-loading");
    lenis.start();
    playIntro();
  });
  addEventListener("load", () => ScrollTrigger.refresh());
}

/* ---------- chapter theming ---------- */
function setTheme(sec) {
  gsap.to(document.documentElement, {
    "--bg": sec.dataset.bg,
    "--ink": sec.dataset.ink,
    "--accent": sec.dataset.accent,
    duration: 1,
    ease: "power2.out",
  });
  bats.setGlow(sec.dataset.bg === "#0b0b0c");
  score.setMood(sec.dataset.mood);
  // a braam the first time each chapter opens
  if (sec.classList.contains("chapter") && !entered.has(sec.id)) {
    entered.add(sec.id);
    score.braam(0.9);
  }
  rain.setActive(sec.id === "vengeance");
  $$(".chapters a").forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + sec.id));
}

function playIntro() {
  gsap.timeline()
    .from(".title .char", { yPercent: 115, rotate: 6, duration: 1.5, ease: "expo.out", stagger: 0.045 }, 0.2)
    .from(".eyebrow, .intro-hint, .scroll-cue", { opacity: 0, y: 24, duration: 1.2, stagger: 0.12, ease: "power3.out" }, 0.8)
    .from(".hud, .chapters, .depth", { opacity: 0, duration: 1.2 }, 1);
  setTimeout(() => bats.burst(innerWidth / 2, innerHeight * 0.45, 45), 500);
}

function buildScenes() {
  /* --- CHAOS horizontal gallery: created first because its pin adds page height --- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const track = $(".h-track");
    const distance = () => track.scrollWidth - innerWidth;
    const slide = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: ".h-wrap",
        start: "top top",
        end: () => "+=" + distance(),
        pin: true,
        scrub: 1,
        refreshPriority: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    gsap.fromTo(".coin", { rotateY: 0, rotateX: 14 }, {
      rotateY: 1980, rotateX: -6, ease: "none",
      scrollTrigger: { trigger: ".panel--coin", containerAnimation: slide, start: "left right", end: "center center", scrub: 1 },
    });
    $$(".panel-img").forEach((frame) =>
      gsap.fromTo(frame.querySelectorAll("img"), { scale: 1.25 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: frame, containerAnimation: slide, start: "left right", end: "right left", scrub: true },
      })
    );
  });
  mm.add("(max-width: 900px)", () => {
    gsap.fromTo(".coin", { rotateY: 0 }, {
      rotateY: 1980, ease: "none",
      scrollTrigger: { trigger: ".panel--coin", start: "top bottom", end: "center center", scrub: 1 },
    });
  });

  /* --- theme per chapter --- */
  $$("[data-accent]").forEach((sec) =>
    ScrollTrigger.create({
      trigger: sec,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (s) => s.isActive && setTheme(sec),
    })
  );

  /* --- depth meter: falls until the pit, then climbs back to zero --- */
  const depthValue = $(".depth-value");
  const depthState = $(".depth-state");
  let riseAt = 1;
  ScrollTrigger.addEventListener("refresh", () => {
    riseAt = $(".pit").getBoundingClientRect().top + scrollY + innerHeight * 2.2;
  });
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate(self) {
      const y = self.scroll();
      const rising = y > riseAt;
      const depth = rising ? 1200 * (1 - (y - riseAt) / Math.max(1, self.end - riseAt)) : (1200 * y) / riseAt;
      depthValue.textContent = "-" + String(Math.max(0, Math.round(depth))).padStart(4, "0") + " M";
      depthState.textContent = rising ? "RISING" : "FALLING";
    },
  });

  /* --- PROLOGUE: spotlight that follows the cursor --- */
  const intro = $("#intro");
  const lit = $(".intro-bg--lit");
  const spot = { x: innerWidth / 2, y: innerHeight * 0.45 };
  let introOn = true;
  ScrollTrigger.create({
    trigger: intro, start: "top bottom", end: "bottom top",
    onToggle: (s) => { introOn = s.isActive; bats.ambient = s.isActive ? 1.5 : 0; },
  });
  bats.ambient = 1.5;
  // The mask repaints a full-screen layer, so only touch it when the spot or scroll actually moved.
  let lastKey = "";
  gsap.ticker.add((t) => {
    if (!introOn) return;
    const auto = !finePointer || !pointer.active;
    const tx = auto ? innerWidth * (0.5 + Math.sin(t * 0.5) * 0.3) : pointer.x;
    const ty = auto ? innerHeight * (0.42 + Math.sin(t * 0.8) * 0.16) : pointer.y;
    spot.x += (tx - spot.x) * 0.08;
    spot.y += (ty - spot.y) * 0.08;
    const key = `${Math.round(spot.x)},${Math.round(spot.y)},${Math.round(scrollY)}`;
    if (key === lastKey) return;
    lastKey = key;
    const r = lit.getBoundingClientRect();
    lit.style.setProperty("--mx", spot.x - r.left + "px");
    lit.style.setProperty("--my", spot.y - r.top + "px");
  });
  gsap.timeline({ scrollTrigger: { trigger: intro, start: "top top", end: "bottom top", scrub: true } })
    .to(".intro-content", { yPercent: -35, scale: 1.12, opacity: 0, ease: "none" }, 0)
    .to(".intro-bg", { yPercent: 10, scale: 1.08, ease: "none" }, 0)
    .to(".scroll-cue", { opacity: 0, ease: "none", duration: 0.3 }, 0);

  /* --- INDEX: rows rise in; hovering a row floats that film's frame beside the cursor --- */
  gsap.from(".index-head > *", {
    opacity: 0, y: 40, duration: 1.2, ease: "expo.out", stagger: 0.1,
    scrollTrigger: { trigger: ".index", start: "top 70%" },
  });
  gsap.from(".index-list li, .index-fact", {
    opacity: 0, y: 60, duration: 1.2, ease: "expo.out", stagger: 0.09,
    scrollTrigger: { trigger: ".index-list", start: "top 80%" },
  });
  if (finePointer) {
    const list = $(".index-list");
    const preview = $(".index-preview");
    const previewImg = preview.querySelector("img");
    const px = gsap.quickTo(preview, "x", { duration: 0.7, ease: "power3" });
    const py = gsap.quickTo(preview, "y", { duration: 0.7, ease: "power3" });
    const index = $(".index");
    // the frame lives in the left column (whose heading dims) and only tracks the cursor vertically,
    // so it never covers the row being read
    list.addEventListener("pointermove", (e) => {
      const head = $(".index-head").getBoundingClientRect();
      px(head.left + Math.min(head.width - preview.offsetWidth, 40));
      py(Math.min(innerHeight - preview.offsetHeight - 24, Math.max(24, e.clientY - preview.offsetHeight / 2)));
    });
    $$(".index-list a").forEach((a) =>
      a.addEventListener("pointerenter", () => {
        previewImg.src = a.dataset.img;
        index.classList.add("is-previewing");
        gsap.to(preview, { opacity: 1, scale: 1, rotate: gsap.utils.random(-4, 4), duration: 0.6, ease: "expo.out" });
      })
    );
    list.addEventListener("pointerleave", () => index.classList.remove("is-previewing"));
    list.addEventListener("pointerleave", () => gsap.to(preview, { opacity: 0, scale: 0.85, duration: 0.4, ease: "power2.in" }));
  }

  /* --- SCENES: pinned film moments narrated line by line (the well is the first) --- */
  $$(".well").forEach((scene) => {
    const isWell = !scene.classList.contains("scene");
    const lines = scene.querySelectorAll(".well-line");
    gsap.set(lines, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scene, start: "top top", end: "bottom bottom", scrub: 1,
        onUpdate: isWell ? (s) => score.setFall(s.progress) : undefined,
        onLeave: () => {
          if (isWell) {
            bats.burst(innerWidth / 2, innerHeight + 30, 70, "up");
            score.setFall(0);
          }
          score.impact(isWell ? 1.3 : 0.9);
        },
        onLeaveBack: isWell ? () => score.setFall(0) : undefined,
      },
    });
    const img = scene.querySelector(".well-img");
    if (img) tl.fromTo(img, { scale: isWell ? 1 : 1.12 }, { scale: isWell ? 3.4 : 1.45, ease: isWell ? "power1.in" : "none", duration: 1 }, 0);
    tl.fromTo(scene.querySelector(".well-shade"), { opacity: isWell ? 0.1 : 0.45 }, { opacity: isWell ? 1 : 0.85, ease: "power1.in", duration: 1 }, 0);
    lines.forEach((line, i) => {
      const at = 0.06 + i * 0.3;
      tl.fromTo(line, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1 }, at);
      if (i < lines.length - 1) tl.to(line, { opacity: 0, y: -50, duration: 0.1 }, at + 0.2);
    });

    // Crime Alley: the pearls break and scatter as the second line lands
    const pearls = scene.querySelector(".pearls");
    if (pearls) {
      for (let i = 0; i < 46; i++) {
        const p = document.createElement("i");
        p.style.setProperty("--s", (4 + Math.random() * 7).toFixed(1) + "px");
        pearls.append(p);
      }
      const dots = pearls.querySelectorAll("i");
      tl.fromTo(dots,
        { x: 0, y: 0, opacity: 0 },
        {
          x: () => gsap.utils.random(-0.46, 0.46) * innerWidth,
          y: () => gsap.utils.random(0.3, 0.52) * innerHeight,
          rotate: () => gsap.utils.random(-360, 360),
          opacity: 1, duration: 0.22, ease: "power2.in", stagger: { amount: 0.06, from: "random" },
        }, 0.34);
    }
  });

  /* --- chapter headers --- */
  $$(".chapter-head").forEach((head) => {
    const chars = head.querySelectorAll(".chapter-word .char");
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: "top 75%" } });
    tl.from(head.querySelector(".chapter-meta"), { opacity: 0, x: -30, duration: 1, ease: "power3.out" });
    if (chars.length) tl.from(chars, { yPercent: 100, scaleY: 1.8, opacity: 0, duration: 1.4, ease: "expo.out", stagger: 0.07 }, "<.1");
    gsap.to(head.querySelector(".chapter-num"), {
      yPercent: 35, ease: "none",
      scrollTrigger: { trigger: head, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* --- FEAR: the cave opens and the swarm rises --- */
  gsap.timeline({
    scrollTrigger: {
      trigger: ".cave", start: "top bottom", end: "bottom top", scrub: true,
      onUpdate: (s) => {
        const p = (s.progress - 0.2) / 0.6;
        bats.swarm = p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0;
      },
      onLeave: () => (bats.swarm = 0),
      onLeaveBack: () => (bats.swarm = 0),
    },
  })
    .fromTo(".cave-frame", { scale: 0.62 }, { scale: 1, ease: "power2.out", duration: 0.5 }, 0)
    .fromTo(".cave-frame img", { yPercent: -16 }, { yPercent: 0, ease: "none", duration: 1 }, 0);

  /* --- quotes light up word by word --- */
  $$(".quote, .dawn-text, .florence-speech").forEach((q) =>
    gsap.to(q.querySelectorAll(".word"), {
      opacity: 1, stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: q, start: "top 80%", end: "bottom 50%", scrub: true },
    })
  );

  /* --- morals --- */
  $$(".moral").forEach((m) =>
    gsap.from(m.children, {
      opacity: 0, y: 50, duration: 1.2, ease: "power3.out", stagger: 0.12,
      scrollTrigger: { trigger: m, start: "top 85%" },
    })
  );

  /* --- CHAOS --- */
  gsap.timeline({ scrollTrigger: { trigger: ".serious", start: "top bottom", end: "bottom top", scrub: true } })
    .fromTo(".serious img", { scale: 1.3 }, { scale: 1, ease: "none" }, 0)
    .fromTo(".glitch", { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, ease: "power2.out", duration: 0.45 }, 0);

  const twoFace = $(".twoface");
  twoFace.addEventListener("pointermove", (e) => {
    const r = twoFace.getBoundingClientRect();
    twoFace.style.setProperty("--split", (((e.clientX - r.left) / r.width) * 100).toFixed(2) + "%");
  });

  /* --- RISE: three attempts to climb out of the pit --- */
  const stage = $(".pit-stage");
  const label = $(".attempt-label");
  const state = $(".attempt-state");
  const STEPS = [
    [0, "Attempt 01", "With the rope"],
    [0.25, "Attempt 01", "Fell"],
    [0.36, "Attempt 02", "With the rope"],
    [0.55, "Attempt 02", "Fell"],
    [0.64, "Attempt 03", "No rope"],
    [0.86, "Attempt 03", "Risen"],
  ];
  let step = 0;
  const setStep = (progress) => {
    let next = 0;
    STEPS.forEach(([at], i) => { if (progress >= at) next = i; });
    if (next === step) return;
    step = next;
    const [, l, s] = STEPS[step];
    label.textContent = l;
    scramble(state, s.toUpperCase(), { duration: 0.6 });
    if (s === "Fell") {
      gsap.fromTo(stage, { x: -14 }, { x: 0, duration: 0.6, ease: "elastic.out(1, .25)" });
      score.impact(1.1);
    }
    if (s === "Risen") {
      bats.burst(innerWidth / 2, innerHeight * 0.2, 40);
      score.braam(1.2);
    }
  };

  gsap.set(".pit-bruce", { xPercent: -50, yPercent: 70, x: 0, y: 0 });
  gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: ".pit", start: "top top", end: "bottom bottom", scrub: 1, onUpdate: (s) => { setStep(s.progress); score.setRise(s.progress); }, onLeave: () => score.setRise(0), onLeaveBack: () => score.setRise(0) },
  })
    .to(".pit-bg", { scale: 1, duration: 1 }, 0)
    .fromTo(".pit-shade", { opacity: 0.7 }, { opacity: 0.4, duration: 1 }, 0)
    .to(".pit-light", { scale: 0.65, duration: 0.64 }, 0)
    .to(".pit-light", { scale: 3.2, duration: 0.3, ease: "power2.in" }, 0.64)
    .to(".chant-row:nth-child(odd)", { xPercent: -28, duration: 1 }, 0)
    .fromTo(".chant-row:nth-child(even)", { xPercent: -28 }, { xPercent: 0, duration: 1 }, 0)
    .to(".chant-row", { color: "rgba(242,239,233,.12)", duration: 0.3 }, 0.6)
    .to(".pit-bruce", { yPercent: 25, duration: 0.2 }, 0.05)
    .to(".pit-bruce", { yPercent: 78, duration: 0.05, ease: "power4.in" }, 0.25)
    .to(".pit-bruce", { yPercent: 15, duration: 0.17 }, 0.38)
    .to(".pit-bruce", { yPercent: 78, duration: 0.05, ease: "power4.in" }, 0.55)
    .to(".pit-bruce", { yPercent: -6, scale: 1.08, duration: 0.22, ease: "power1.out" }, 0.66)
    .to(".pit-rise", { scaleY: 1, duration: 0.12, ease: "expo.out" }, 0.86);

  $$(".c-item").forEach((item) =>
    gsap.to(item, {
      yPercent: Number(item.dataset.speed), ease: "none",
      scrollTrigger: { trigger: ".collage", start: "top bottom", end: "bottom top", scrub: true },
    })
  );

  /* --- VENGEANCE --- */
  gsap.fromTo(".head-bg", { yPercent: -8, scale: 1.15 }, {
    yPercent: 8, scale: 1, ease: "none",
    scrollTrigger: { trigger: ".chapter-head--poster", start: "top bottom", end: "bottom top", scrub: true },
  });
  $$("[data-scramble]").forEach((el) =>
    ScrollTrigger.create({
      trigger: el,
      start: el.classList.contains("riddle-answer") ? "top 65%" : "top 80%",
      once: true,
      onEnter: () => scramble(el, el.dataset.scramble, { duration: 1.8 }),
    })
  );
  // images slide up inside their frames (transform only: no clip-path repaints)
  $$(".shot img").forEach((img, i) => {
    gsap.set(img, { y: 0, yPercent: 101 });
    gsap.to(img, {
      yPercent: 0, duration: 1.4, ease: "expo.out", delay: (i % 3) * 0.12,
      scrollTrigger: { trigger: img.parentElement, start: "top 88%" },
    });
  });

  // the flare light is a moving element (transform), not a repainted gradient
  const flare = $(".flare");
  const flareLight = $(".flare-light");
  const flareX = gsap.quickTo(flareLight, "x", { duration: 0.6, ease: "power3" });
  const flareY = gsap.quickTo(flareLight, "y", { duration: 0.6, ease: "power3" });
  gsap.set(flareLight, { x: innerWidth / 2, y: innerHeight * 0.6 });
  flare.addEventListener("pointermove", (e) => {
    const r = flare.getBoundingClientRect();
    flareX(e.clientX - r.left);
    flareY(e.clientY - r.top);
  });

  /* --- SIGNAL --- */
  const signal = $("#signal");
  const sigStage = $(".signal-stage");
  const beam = $(".beam");
  const beamPoly = $(".beam polygon");
  const spotEl = $(".spot");
  const aim = { x: innerWidth / 2, y: innerHeight * 0.28 };
  let litUp = false;
  let signalOn = false;
  ScrollTrigger.create({ trigger: signal, start: "top bottom", end: "bottom top", onToggle: (s) => (signalOn = s.isActive) });

  gsap.set(".answer > *", { y: 30 });
  $(".ignite").addEventListener("click", () => {
    if (litUp) return;
    litUp = true;
    signal.classList.add("is-lit");
    score.braam(1.5);
    const r = sigStage.getBoundingClientRect();
    bats.burst(r.left + r.width * 0.18, r.bottom - 20, 35);
    gsap.timeline()
      .to(".signal-ui", { opacity: 0, y: -20, duration: 0.5, pointerEvents: "none" })
      .to([beam, spotEl], { opacity: 1, duration: 0.06, repeat: 7, yoyo: true, ease: "none" })
      .to([beam, spotEl], { opacity: 1, duration: 0.4 })
      .to(".answer > *", { opacity: 1, y: 0, duration: 1.6, ease: "expo.out", stagger: 0.6 }, "+=0.2");
  });

  gsap.ticker.add((t) => {
    if (!litUp || !signalOn) return;
    const r = sigStage.getBoundingClientRect();
    const auto = !finePointer || !pointer.active;
    const tx = auto ? r.width * (0.55 + Math.sin(t * 0.4) * 0.22) : pointer.x - r.left;
    const ty = auto ? r.height * 0.26 : Math.min(pointer.y - r.top, r.height * 0.55);
    aim.x += (tx - aim.x) * 0.06;
    aim.y += (ty - aim.y) * 0.06;
    spotEl.style.transform = `translate(${aim.x}px, ${aim.y}px)`;

    const sx = r.width * 0.18;
    const sy = r.height + 10;
    const dx = aim.x - sx;
    const dy = aim.y - sy;
    const len = Math.hypot(dx, dy) || 1;
    const rad = spotEl.offsetWidth * 0.4;
    const px = (-dy / len) * rad;
    const py = (dx / len) * rad;
    beamPoly.setAttribute(
      "points",
      `${sx - 8},${sy} ${aim.x + px},${aim.y + py} ${aim.x - px},${aim.y - py} ${sx + 8},${sy}`
    );
  });

  /* --- DAWN --- */
  gsap.fromTo(".dawn-shade", { opacity: 0.7 }, {
    opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".dawn", start: "top bottom", end: "bottom bottom", scrub: true },
  });
  gsap.fromTo(".dawn-img", { scale: 1.35 }, {
    scale: 1, ease: "none",
    scrollTrigger: { trigger: ".dawn", start: "top bottom", end: "bottom bottom", scrub: true },
  });

  /* --- end credits roll in, one line at a time --- */
  gsap.from(".credits-title, .credits-roll div, .credits-last", {
    opacity: 0, y: 70, duration: 1.6, ease: "expo.out", stagger: 0.18,
    scrollTrigger: { trigger: ".credits", start: "top 70%" },
  });
  gsap.from(".florence-coda", {
    opacity: 0, y: 30, duration: 2, ease: "power2.out",
    scrollTrigger: { trigger: ".florence-coda", start: "top 85%" },
  });

  /* --- footer --- */
  gsap.from(".footer-big", {
    yPercent: 40, opacity: 0, duration: 1.6, ease: "expo.out",
    scrollTrigger: { trigger: ".footer", start: "top 85%" },
  });
}
