# Creative direction and architecture

## The concept: one specimen, sectioned five ways

The site is a single object, a growth specimen, and the visitor's scroll is a
sequence of laboratory sections cut through it. Everything on screen comes from
**one scalar field** over the ground plane:

> r(p) = distance from the pith, measured in domain-warped space

- Seen **from above**, its isolines are **tree rings**.
- Its height is terraced, so seen **from the side** the same rings read as
  **sedimentary strata**.
- The cursor adds a **point charge**: a 1/r potential is added to the field,
  so the contour lines bend around the pointer exactly the way **equipotential
  lines** bend around a charge. Spores (particles) are pushed away from it.
- In the laboratory act the rings relax into the **interference of three
  circular waves**: the superposition behind phased arrays.
- At the end the specimen flattens into a **woodcut print on paper**, like the
  vintage cross-section plates in the references.

### Light (revision 2.1)

The first pass read as a matte contour map. The look is now built on light:

- **The air is cool, the light is warm.** A painted, mottled atmosphere
  (deep green, lichen blue-gray, a little madder) after the dark painted
  reference, with a mist band at the horizon. The terrain fades *into* this
  same atmosphere, so distance has colour instead of going black.
- **Filaments.** ~9,000 hairline strands of light flow along the contour lines
  just above the surface (sap along rings; current along equipotentials).
  Near the cursor the contours curl into circles, so the strands visibly
  swirl around it. Stateless and GPU-only: each strand re-traces the field's
  tangent from a spawn point every life cycle.
- **Silk, not ink.** No hard isolines on the landscape; strata read through
  darker risers and dense, smooth, fading fibres. The heartwood glows.
- **A lens.** Bloom, faint chromatic fringing, film grain and a vignette
  (`@react-three/postprocessing`), easing off on the paper print. Out-of-focus
  spores become faint bokeh. Low-tier devices skip post-processing.

So the organic forms and the engineering ideas are not two layers (pretty
background + technical content). They are the same mathematics, seen from
different angles. That is the identity: *technology expressed through organic
form, with the physics actually computed.*

### Reading the references

| Reference | What it gave the design |
| --- | --- |
| Olive textures of fine flowing strands | the "fiber" line layer: dense, wobbly isolines at 7× ring frequency |
| Layered sage / blue-gray formations | domain warp; the lichen blue-gray seams in some bands |
| Illustrated geological cross-section | terraced height, per-band pigment variation, bright earlywood/dark latewood |
| Dark grainy painted surface | the dark "loam" ground, film grain, vignette |
| Warm tree rings | copper heartwood around the pith |
| Vintage woodcut tree section | Act V: ink disc on parchment, broken light ring lines, radial check crack |

## The journey

| Act | Section | Camera | Field |
| --- | --- | --- | --- |
| I | Introduction | oblique aerial, mound to the right of the headline | growth rings, strong terraces |
| II | Coursework | drops to grazing height; terraces read as strata | rings, full terraces |
| III | Projects | rises; looks across the plain | interference of three sources |
| IV | Research | high and wide, nearly plan view | half rings, half waves (network layer planned) |
| V | Archive | straight down; print on paper | flat woodcut, light theme |

The camera moves on a Catmull-Rom path through five poses with smootherstep
easing, so it **settles** at each act (zero velocity) instead of sliding past.
Each act's arrival point is the moment its section's top edge reaches the top
of the viewport, so the camera stays in step with the text however long the
text gets.

What the visitor controls: scroll (where in the journey), pointer (parallax +
charge), the index (jump anywhere), and motion on/off.

## Architecture

```
src/
  data/site.ts            ← all homepage text, nav, links (edit this)
  pages/index.astro       ← page structure; renders data/site.ts
  layouts/Base.astro      ← <head>, meta, motion preference before first paint
  components/
    RingsFallback.astro   ← build-time SVG of the specimen (no WebGL / no JS)
  scripts/interface.ts    ← DOM side: scroll → act, gauge, index, loader, intro
  styles/                 ← tokens.css (palette, type scale), global.css
  experience/             ← the 3D world; knows nothing about content
    Experience.tsx        ← R3F <Canvas>, WebGL check, error boundary, input
    components/           ← Specimen, Spores, CameraRig (thin R3F wrappers)
    shaders/              ← GLSL as TS strings: common (noise, field), specimen, spores
    core/
      acts.ts             ← the five camera/field poses (the "look" of each act)
      cameraPath.ts       ← pose interpolation
      field.ts            ← CPU port of the field (pith finder, readout, fallback)
      store.ts            ← tiny shared mutable store (DOM ↔ 3D)
      quality.ts          ← device tiers, WebGL detection
      palette.ts, uniforms.ts, ringsSvg.ts
```

Key decisions:

- **Astro owns the page, React owns only the canvas.** All text is real HTML,
  server-rendered, readable and indexable with JS off. The 3D world is one
  `client:only` island fixed behind the content.
- **Content never touches the renderer.** `src/experience/` imports nothing
  from `src/data/`. The only bridge is `store.ts` (scroll position, pointer,
  motion flag, ready flag). Phase 3 adds Astro content collections the same
  way: pages render them; the 3D layer receives a list of anchors at most.
- **No React state in the frame loop.** Scroll and pointer live in a plain
  mutable store read inside `useFrame`; React never re-renders while you scroll.
- **The GPU does the geometry.** The terrain is a flat grid displaced in the
  vertex shader (heights and normals computed there), so quality tiers only
  change grid resolution, and nothing is stored or uploaded per frame.
- **One shared uniform set.** Every material references the same uniform
  objects; the camera rig writes them once per frame.
- **Shader logic is mirrored on the CPU** (`field.ts`) so the DOM can point at
  things in the 3D scene (the pith annotation), and the no-WebGL fallback is
  drawn from the real field, not a stock image.
- **Fonts are self-hosted** WOFF2 Latin subsets (OFL): Newsreader (display
  serif, optical sizes), Hanken Grotesk (text), IBM Plex Mono (annotations).

## Performance and degradation

| Situation | Behaviour |
| --- | --- |
| Desktop GPU | 340² grid, 9000 filaments, 1400 spores, bloom + lens (2× MSAA), DPR up to 1.5 |
| Mid / touch devices | 230² grid, 5000 filaments, 800 spores, bloom + lens (2× MSAA), DPR ≤ 1.25 |
| Low (small touch, ≤2 cores, ≤2 GB) | 150² grid, 1800 filaments, 380 spores, DPR 0.75–1, 2 noise octaves, no post-processing |
| Frame rate too low | `Governor` steps *down* a quality ladder (resolution in ¼ steps → lens effects off → half the strands), only during a pause in scrolling, never back up |
| `?quality=low|medium|high` | force a tier, for testing |
| Reduced motion (OS or toggle) | render on demand only; no time, sway or parallax; camera cuts between acts instead of travelling; intro animations skipped |
| No WebGL2 / context lost / shader error | static SVG woodcut of the same field; all content unaffected |
| No JavaScript | full content + SVG specimen; loader hidden |

Known costs: each vertex evaluates the field three times (finite-difference
normals), ~30 value-noise lookups per vertex. That is the main lever if a
device struggles; tiers already trade it off. The three.js + R3F bundle is
~245 KB gzipped and loads in parallel with the HTML.

### Smoothness rules (learned the hard way)

- **Never oscillate resolution.** Each DPR change reallocates every render
  target and shows as a hitch; an up/down monitor on a borderline GPU produced
  repeated jolts. Quality only ever steps down, and only while not scrolling.
- **Keep per-pixel work per-pixel.** Low-frequency noise (the fibre wobble) is
  computed per vertex; the painted atmosphere is rendered once per frame at
  half size into a texture shared by the backdrop and the terrain fog.
- **Branch on uniforms.** Landscape and print shading sit behind `uPrint`
  branches, so neither is paid for when it is invisible; fully faded strands
  and spores are not drawn at all.
- **Tone-map before grain.** Overlapping additive strands exceed 1.0; the
  grain's soft-light blend turned those pixels into flickering blue noise.
  A neutral tone-mapping step (identity below ~0.76) now runs first.
- **Anything tied to the camera updates every frame** (the pith annotation),
  and nothing reads layout inside the frame callback.
- **Damp inputs that drive the whole field.** The cursor charge has a speed
  limit and ignores far grazing hits, since every strand re-routes when it moves.
- **Wheel scrolling is smoothed** (Lenis, on the GSAP ticker that also drives
  ScrollTrigger) so text and camera move together; off with reduced motion.
- **No CSS `filter` on elements that move over the canvas.**

## Roadmap

**Phase 2 (this branch), complete:** full-screen procedural specimen, contour
and fiber line work, terraces, lighting and fog, grain, cursor charge with
equipotential bending, spores, scroll-driven camera through all five acts,
field morphs (rings → waves → print), loader + one opening sequence, depth
gauge, live readout, pith annotation, index menu, motion toggle, quality tiers,
SVG fallback, GitHub Pages workflow.

**Phase 3, next:** content collections (`projects`, `research`,
`coursework`) with zod schemas; `/projects/[slug]` and `/research/[slug]`
detail pages (stable URLs, readable, no 3D required); semester entries rendered
in Act II; project markers in Act III placed by the field (each project becomes
a source in the interference field, clickable, linked to its page); the index
pointing to real pages.

**Phase 4:** the research network layer (branching lines grown over the field
in Act IV); click-to-focus camera moves on markers; a page-transition from the
3D marker into the case study; the "still growing" outermost ring drawing itself.

**Phase 5:** Lighthouse/axe passes, cross-browser (Safari WebGL quirks), real
device testing on low-end Android, image pipeline for project photos, OG image.
