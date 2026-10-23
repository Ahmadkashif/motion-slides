---
feature: 004-scene-component-library-and-brand-theming
status: draft   # draft | approved
created: 2026-10-23
---

# Design: Scene component library and brand theming

Build-plan Stage 4. The PoC set is title and close cards, counter, panel, chips, neutral figure, flow and
cards. Funnel, sequence, themed-caption polish and the gallery come after the PoC.

## Approach

- **Components** are browser-side ES modules in `src/stage/components/`. They are plain JavaScript with
  JSDoc types, type-checked by `tsc --checkJs`.
- **Parameter schemas** live on the Node side in `src/components/registry.ts` (zod). This lets idea
  validation reject an unknown component, parameter or action before Chrome starts (AC1.2). The registry
  also generates `docs/components.md` (AC1.1).
- **The component contract.** Each component exports:

  ```js
  export const name = 'counter';
  /** mount builds DOM with createElement/textContent only and returns cue handlers */
  export function mount(host, params, ctx) {
    // ctx: { theme, figures (formatted), tl (the one paused timeline), registerBox }
    return { actions: { run(at, opts) { /* add tweens to ctx.tl at `at` */ } }, landings: [] };
  }
  ```

  The runtime calls each action at the beat start plus the cue offset. That is the only way a component
  animates (AC1.3).
- **Counter.** It tweens a proxy number on the timeline, and `onUpdate` writes
  `formatFigure(value, format)`, clamped and monotonic (AC4.1, AC4.2). It uses
  `font-variant-numeric: tabular-nums` (AC4.3). Landing times are returned to the renderer and written
  into `schedule.json` (AC4.5).
- **Chips.**
  - The start position is computed from the source element's box, placed beside it with an 8 px gap,
    trying right, left, above and below in that order. The first position that does not intersect the
    source and stays within the stage wins (AC6.1).
  - The landing spot is centred 16 px above the counter digits' box.
  - During the flight a chip passes over neither the source nor the digits. When a straight line would
    cross them, the path arcs above.
- **Neutral figure.** One SVG silhouette (a round head and a rounded-rectangle body) with three poses:
  standing, pointing and seated at a desk. It is filled with theme colours only (AC7).
- **Theme.**
  - `src/components/theme.ts` validates the hex values and derives the optional roles (surface is the
    background mixed 6 % toward the text; positive and negative are fixed hues adjusted to the accent's
    lightness).
  - It computes WCAG contrast ratios and rejects pairs below the limits (AC2.4).
  - It emits CSS custom properties.
  - Fonts load through the `FontFace` API from `/fonts/<id>`, mapped to local files in the 001 static
    file map, and each must reach `status === 'loaded'` (001 design).
  - Requester font and logo files are checked in Node before render (type by magic bytes, size limit;
    fonts `woff2`, `ttf`, `otf`; logos `svg` or `png` shown through `<img>`), per ADR 0003.
  - The built-in neutral theme uses the bundled Inter font from 001 (OFL 1.1, `src/stage/fonts/`).
- **Layout check (in the browser, before capture).** At every beat end and cue end it seeks and walks
  the text elements:
  - overflow: `scrollWidth > clientWidth`;
  - outside the stage: box beyond 1920x1080;
  - text overlapping text or the caption area: box intersection;
  - missing glyphs: for each unique character, a canvas width comparison between the theme font and
    two different fallback-only fonts (`document.fonts.check` is not used: it reports success for fonts
    that were never declared);
  - off-palette colours: the computed `color`, `background-color`, `fill` and `stroke` must be theme
    colours or their tints.
  It returns findings, and the renderer fails with them (AC11).
- **Dense scenes.** The rule lives in the 001 schedule:
  - a scene counts as dense when it is flagged, or has 4 or more lanes, or more than 12 items (counted
    from component params);
  - a dense scene gets a gap floor of 0.40 s and a hold of at least 0.5 s on beats with reveals.
  The render log records which rule applied (AC10).

## Modules

| Module | Interface | Hides | New / changed |
|--------|-----------|-------|---------------|
| `components/registry` | `componentSchemas`, `validateComponents(idea): IdeaError[]`, `isDense(scene)` | per-component zod params, limits (panel 1 to 8 rows, cards 1 to 6, flow 2 to 8 nodes, funnel 2 to 6, sequence 2 to 5 lanes and 12 messages), action names | new |
| `components/theme` | `resolveTheme(theme, baseDir): Result<ResolvedTheme>`, `contrast(a, b)` | hex parsing, derived roles, WCAG maths, font file checks | new |
| `stage/components/*` | `mount(host, params, ctx)` | DOM, SVG, tweens, chip pathing | new |
| `stage/layout-check` | `__ms.layoutCheck(): Finding[]` | box maths, glyph and palette checks | new |

## Testing strategy

- **Unit:** theme validation and contrast (known pairs), derived roles, registry limits, dense rule.
- **Integration** (Chrome, made-up ideas):
  - counter frames read back from `stage-text.jsonl` are monotonic and land on the exact formatted value;
  - chip boxes are checked against the AC6 rules at start, mid-flight and landing;
  - the panel's before/after differences are correct;
  - planted overlap and overflow ideas fail the layout check by name;
  - a disallowed colour fails;
  - two renders of the same scene are pixel-identical (hash of the frames);
  - two themes differ only in colours and fonts (the same element boxes, given the same font metrics).

## Security

Components never use `innerHTML`. Every text comes from the idea through `textContent`, and SVG is built
with `createElementNS`. The logo is served only from the video folder through the allowlist. The theme
is CSS custom properties whose values are validated hex, so no CSS from the idea is injected raw.

## Constitution check

| Principle | Pass? | Note |
|-----------|-------|------|
| P5 Brand-true and flat | yes | theme-only colours checked, no raster except supplied logo, neutral figure |
| P3 Brief is the source of truth | yes | every number from a named figure |
| VI Secure by default | yes | no innerHTML; validated theme values only |
