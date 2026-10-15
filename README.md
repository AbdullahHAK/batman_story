# Why Do We Fall?

A scroll-driven fan tribute to Batman: four films, four falls, one rise. Each chapter has its own colour, motion and lesson.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

## How it's put together

```
index.html            all content and structure (semantic sections)
src/main.js           every scroll scene, wired with GSAP ScrollTrigger
src/style.css         design tokens, layout, responsive + reduced-motion rules
src/fx/bats.js        canvas bat flock (sprites, flees the cursor)
src/fx/rain.js        canvas rain for the Vengeance chapter
src/fx/score.js       synthesised, scroll-driven score (Web Audio)
src/fx/scramble.js    Riddler-style text decode
src/fx/split.js       splits text into chars/words for animation
src/fx/cursor.js      shared pointer state + custom cursor
src/fx/preloader.js   loading counter and shutter reveal
public/images/        optimised WebP images, one folder per chapter
assets-src/           original downloads (not shipped)
```

## Decisions

| Decision | Why | Alternatives considered | Trade-off |
|---|---|---|---|
| **Vite + vanilla JS** | One page, no routing, no backend. Smallest bundle and full control over every frame. | Next.js, React | No component model; fine at this size, would not scale to a large app. |
| **GSAP + ScrollTrigger** | Industry standard for scrubbed, pinned scroll scenes; handles pinning, horizontal scroll and timelines. | Framer Motion, CSS scroll-timeline | Extra ~70 KB of JS. |
| **Lenis smooth scroll** | Gives the weighted, cinematic scroll feel and syncs with ScrollTrigger. | Native scroll | Must respect `prefers-reduced-motion` (it is disabled there). |
| **Canvas for bats and rain** | Hundreds of moving shapes at 60fps; DOM elements would be too slow. | DOM/SVG elements, video | Not accessible to screen readers, so it is purely decorative (`aria-hidden`). |
| **Bat sprites with hinged wings** | Three front-facing clipart bats are split into left wing, body and right wing at load time; the wings rotate around the shoulders and foreshorten, so they really flap. A glow in the chapter colour is baked once per chapter, not per frame. | Squash-scaling the whole sprite, video loop, frame-by-frame sprite sheet | Only front-facing bats can hinge, so side-view clipart is not used. |
| **Synthesised score (Web Audio)** | An original score generated live and driven by scroll: drone, heartbeat, pulses, war drums, a Shepard-tone riser for the climb, braams on each chapter, all through a generated reverb, compressor and limiter. No files to download, no licensed music. An entrance gate asks for sound because browsers block audio until a click. | Licensed film score (not allowed), royalty-free MP3 stems | Synth timbres are less rich than a recorded orchestra. |
| **WebP images at 1920px max** | ~5–10× smaller than the original JPG/PNG, so the page loads fast. | Original JPGs | Needs a conversion step (done once with `sharp`). |
| **CSS custom properties for theming** | Each chapter tweens `--accent` and `--bg`, so the whole page re-colours in one place. | Separate CSS per section | — |

## Accessibility

- `prefers-reduced-motion`: smooth scroll, pins, particles and reveals are switched off; all content is shown statically.
- The custom cursor only appears on mouse/trackpad devices; touch devices use normal scrolling, and the spotlight and signal animate on their own.
- Decorative layers are `aria-hidden`; images have alt text.

## Credits

Non-commercial fan tribute. Not affiliated with DC, Warner Bros. Discovery or Rocksteady. Film stills © Warner Bros.; *Batman: Arkham Knight* screenshots © WB Games / Rocksteady; fan wallpapers belong to their original artists.

## Design system

- **Type:** Clash Display for headlines (wide and sharp; set tight with extra word spacing), Gambetta for quotes and Roman numerals (cinematic serif that stays legible on every background), Satoshi for small UI labels. All three from Fontshare (free for commercial use). Chosen by rendering candidates side by side on black, bone and red pages; Bodoni Moda was rejected because its hairlines vanish on red.
- **Colour:** three colours only: black `#0B0B0C`, warm white `#F2EFE9`, blood red `#C8102E`. Text is only ever white or black; labels sit at 60% opacity behind a short accent rule. Red never colours body text: it is reserved for rules, one emphasised word, and the giant RISE. Each chapter swaps which colour is background, text and accent; red imagery sits on a red page with black type rather than adding new hues.

## Performance notes

- Canvases render at 1x device pixels; the flock is capped at 150 bats; rain is batched into 3 strokes per frame.
- Only `transform` and `opacity` are animated while scrolling. Images are darkened with an overlay's opacity instead of animated CSS filters, and reveals slide images instead of animating `clip-path`.
- No `mix-blend-mode` or blur filters; the grain overlay is static; the intro spotlight only repaints when the cursor or scroll moves.
- Bat sprites (with and without glow) are baked once at load, so chapter changes don't re-render them.
