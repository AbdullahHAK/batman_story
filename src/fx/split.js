// Tiny replacements for SplitText: wrap characters or words in spans so they can animate.

export function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  for (const ch of text) {
    if (ch === " ") {
      el.append(" ");
      continue;
    }
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = ch;
    el.append(span);
  }
  return el.querySelectorAll(".char");
}

export function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = word;
    el.append(span);
    if (i < words.length - 1) el.append(" ");
  });
  return el.querySelectorAll(".word");
}
