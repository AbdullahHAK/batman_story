const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?!#%&*+=<>/\\";
const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

export function garble(text) {
  return [...text].map((c) => (c === " " ? " " : randomGlyph())).join("");
}

// Riddler-style decode: letters resolve left to right with some randomness.
export function scramble(el, text, { duration = 1.6 } = {}) {
  cancelAnimationFrame(el._scramble);
  const chars = [...text];
  const revealAt = chars.map((_, i) => (i / chars.length) * 0.65 + Math.random() * 0.35);
  const start = performance.now();

  return new Promise((resolve) => {
    const frame = (now) => {
      const t = (now - start) / 1000 / duration;
      el.textContent = chars
        .map((c, i) => (c === " " || t >= revealAt[i] ? c : randomGlyph()))
        .join("");
      if (t < 1) el._scramble = requestAnimationFrame(frame);
      else {
        el.textContent = text;
        resolve();
      }
    };
    el._scramble = requestAnimationFrame(frame);
  });
}
