---
feature: 004-scene-component-library-and-brand-theming
title: "Scene component library and brand theming"
status: draft   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 1 week   # proposed; the user sets the final appetite in grill
created: 2026-10-23
---

# Scene component library and brand theming

Source of truth: research-registery issue #17 (Process steps 4 and 6, Binding constraint "Look", Lessons
learned on chips, dense scenes and captions) and done criterion 2.

## Problem

In the hand-run pipeline every scene was drawn by hand for its video. R2 needed a running dollar counter
and a static calculator panel; R3 needed a before/after calculator. Each scene was built from scratch,
and the same layout mistakes came back: "+$x" chips started on top of the
figure they came from and landed over the counter's digits, dense scenes (four lanes of tags) went by
too fast, and overlaps and clipped text were found only by looking at stills. The look must also stay
true to each brand (its own colours, fonts and wordmark) while staying flat and stylised, never
photoreal, with gender-neutral people unless the brief asks otherwise.

## Outcome

A library of reusable, themable scene components covers everything the three reference videos needed.
An idea names components and their parameters, a theme from the brief styles them, every animation is
anchored to narration beats, and the lessons learned (chip placement, dense-scene pacing, one-line
captions) are built into the components so they cannot be got wrong again. An automatic layout check
catches overlaps, clipping and missing glyphs before any frame is captured.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| Producer | When I build a scene, I want to pick a component and give it figures, so I can skip drawing and timing by hand. |
| Brand owner (via the brief) | When a video carries our name, I want our colours, fonts and wordmark used exactly, so it looks like ours. |
| Viewer | When a figure lands or a chip flies, I want to see clearly where it came from and where it went, so I can follow the numbers. |
| Brief compiler (005) | When I turn a brief into an idea, I want a documented, finite set of components, so every brief maps to them with no custom code. |

## Components

The library ships these components (each with documented parameters, cues and an example): running
counter, calculator or price panel (static and before/after), flying chip, gender-neutral figure,
funnel, flow or sequence diagram, cards, title card, close card, disclaimer, captions.

## User stories

### US1 (P1): Components addressable from the idea

As the brief compiler, I want every component usable by name with documented parameters, so that no
video needs custom scene code.

- AC1.1 THE SYSTEM SHALL document every component with its name, parameters (type, default, limits), the
  cue actions it accepts, and a made-up example.
- AC1.2 IF the idea names an unknown component, parameter or cue action THEN THE SYSTEM SHALL reject it,
  listing the valid names.
- AC1.3 THE SYSTEM SHALL animate components only through cues anchored to beats (beat plus offset), never
  at absolute times, so re-voicing a line re-times its animations.
- AC1.4 Given the same idea and theme, when a scene is rendered twice, then every frame is pixel-identical.

### US2 (P1): Brand theme from the brief

As a brand owner, I want the video styled with our colours, fonts and wordmark only, so that it looks
like ours.

- AC2.1 THE SYSTEM SHALL style every component from the idea's theme: colours as `#RRGGBB` hex for the
  roles background, text and accent (required) and surface, positive and negative (optional, derived
  from the required colours when absent); fonts as local font files for headings, body and numbers; and
  a wordmark text.
- AC2.2 IF a colour is not valid hex, a required role is missing, or a font file is missing THEN THE
  SYSTEM SHALL reject the theme naming the entry.
- AC2.3 WHERE a logo file (SVG or PNG) is supplied THE SYSTEM SHALL show it on the title and close cards;
  otherwise THE SYSTEM SHALL show the wordmark as text in the heading font, and SHALL never fetch,
  generate or invent a logo.
- AC2.4 IF caption or body text has contrast below 4.5:1 against its background, or large text and key
  graphics below 3:1 (WCAG 2.2 AA), THEN THE SYSTEM SHALL reject the theme naming the colour pair and
  ratio.
- AC2.5 Given the same scene with two different themes, when both are rendered, then only colours,
  fonts and wordmark differ between them.

### US3 (P1): Title card, close card, disclaimer and disclosure

As the user, I want every video to open with its title and close with its wordmark, disclaimer and the
AI-narration disclosure, so that viewers know what they watched and how it was voiced.

- AC3.1 THE SYSTEM SHALL show the title card (kicker, title, subtitle, wordmark or logo) for the whole
  opener.
- AC3.2 THE SYSTEM SHALL show the close card (footer, wordmark or logo) for the whole end hold, with the
  disclosure text visible on it for at least 3 s.
- AC3.3 WHERE the idea has a disclaimer THE SYSTEM SHALL show it for at least its reading time at 155
  words per minute and never less than 3 s.
- AC3.4 IF the idea's disclosure text is empty THEN THE SYSTEM SHALL reject the idea.

### US4 (P1): Running counter

As a viewer, I want a counter that counts up to the exact figure and stays readable, so that I can see a
total build.

- AC4.1 WHEN a counter cue fires THE SYSTEM SHALL count from the start value to the end value over the
  cue's duration and show exactly the end value, in the figure's format (currency symbol, separators,
  decimals), from the landing frame on.
- AC4.2 THE SYSTEM SHALL change the shown value monotonically, never outside the start-to-end range and
  never with more decimals than the format allows.
- AC4.3 THE SYSTEM SHALL use fixed-width digits so the counter's width changes only when the number of
  characters changes.
- AC4.4 WHEN a counter is linked to chips THE SYSTEM SHALL add each chip's amount on the chip's landing
  frame (a running total).
- AC4.5 THE SYSTEM SHALL record each counter landing time in the schedule (used by the contact sheet in
  003).

### US5 (P1): Calculator or price panel, static and before/after

As a viewer, I want a panel of line items and a total, and a clear before/after comparison, so that I
can see how a figure is made up and what changed.

- AC5.1 THE SYSTEM SHALL show a static panel of labelled rows and a total, right-aligned on the decimal
  point, with every value taken from a named figure.
- AC5.2 WHEN a before/after cue fires THE SYSTEM SHALL change each row from its before value to its after
  value, highlight the rows that changed in the accent colour and show each row's difference with its
  sign.
- AC5.3 IF a panel's total does not equal the sum of its rows (per the figures table) THEN THE SYSTEM
  SHALL reject the idea (the gate in 003 re-checks it).
- AC5.4 THE SYSTEM SHALL support between 1 and 8 rows and reject more.

### US6 (P1): Flying chips placed correctly

As a viewer, I want each "+$x" chip to start beside its source and land above the counter, so that I can
see where the money came from without it covering any figure.

- AC6.1 THE SYSTEM SHALL start each chip beside its source figure: the chip's box SHALL NOT intersect the
  source figure's box and SHALL be within 24 px of it.
- AC6.2 THE SYSTEM SHALL land each chip above the counter's digits: on and after the landing frame the
  chip's box SHALL be entirely above the digits' box and SHALL NOT intersect it.
- AC6.3 THE SYSTEM SHALL keep the source figure and the counter digits fully visible (not covered by any
  chip) on every frame of the flight.
- AC6.4 THE SYSTEM SHALL take each chip's amount from a named figure.

### US7 (P1): Gender-neutral flat figures

As a viewer, I want people drawn as neutral flat figures, so that nobody is excluded and nothing looks
photoreal.

- AC7.1 THE SYSTEM SHALL draw people from one neutral flat silhouette with no gender markers (no
  gendered hair, clothing or body-shape cues), coloured from the theme.
- AC7.2 WHERE the brief requests a specific presentation for a figure THE SYSTEM SHALL use the requested
  variant for that figure only.
- AC7.3 THE SYSTEM SHALL support at least these poses: standing, pointing and seated at a desk.

### US8 (P1): Funnel, flow and sequence diagrams

As a viewer, I want processes and drop-offs shown as simple diagrams revealed step by step, so that I
can follow a process as it is narrated.

- AC8.1 THE SYSTEM SHALL draw a funnel of 2 to 6 labelled stages, each with an optional value from a named
  figure, revealing one stage per cue.
- AC8.2 THE SYSTEM SHALL draw a flow diagram of 2 to 8 nodes joined by arrows, revealing nodes and arrows
  in cue order.
- AC8.3 THE SYSTEM SHALL draw a sequence diagram of 2 to 5 lanes (actors) with up to 12 messages,
  revealing one message per cue.
- AC8.4 IF a diagram exceeds these limits THEN THE SYSTEM SHALL reject the idea naming the limit.

### US9 (P1): Cards

As a viewer, I want short points shown as cards that appear in step with the narration, so that each
point is on screen when it is spoken.

- AC9.1 THE SYSTEM SHALL show 1 to 6 cards per scene, each with a title and an optional one-line body,
  revealing them in cue order.
- AC9.2 IF a card's text would overflow its card at the theme's sizes THEN THE SYSTEM SHALL fail the
  layout check (US11) naming the card.

### US10 (P1): Dense scenes get time and staging

As a viewer, I want busy scenes slowed down and revealed in stages, so that I can actually read them.

- AC10.1 WHERE a scene is dense THE SYSTEM SHALL use a gap of at least 0.40 s between its lines,
  including under the length cap (001 AC6.5).
- AC10.2 WHERE a scene is dense THE SYSTEM SHALL reveal its items in stages tied to beats, at most one
  group per beat, and hold each reveal at least 0.5 s after its line ends.
- AC10.3 THE SYSTEM SHALL treat a scene as dense when the idea marks it so, or when it shows 4 or more
  lanes or more than 12 items, and SHALL say in the render log which rule applied.

### US11 (P1): Flat, brand-true and laid out cleanly

As the user, I want overlaps, clipping, off-palette colours and missing glyphs caught automatically,
so that stills only need a human for taste, not for mistakes.

- AC11.1 At each beat's end and each cue's end, THE SYSTEM SHALL fail IF any text overflows its
  container, extends outside the 1920x1080 stage, or overlaps another text or the caption area, naming
  the scene, beat and elements.
- AC11.2 IF the theme's fonts lack a glyph used in any text THEN THE SYSTEM SHALL fail naming the
  character and where it is used.
- AC11.3 THE SYSTEM SHALL use no raster images other than a supplied logo, and no photographic textures.
- AC11.4 THE SYSTEM SHALL use only theme colours and their tints in the stage, and fail naming any
  other colour found.
- AC11.5 THE SYSTEM SHALL run this layout check before stills and before capture, and record its result
  in the render log.

### US12 (P2): Themed captions

As a viewer, I want captions in the brand's type on a plate that is always readable, so that captions
look like part of the video.

- AC12.1 THE SYSTEM SHALL draw captions in one fixed caption area at the bottom of the stage, in the
  theme's body font, on a plate whose contrast with the caption text is at least 4.5:1.
- AC12.2 THE SYSTEM SHALL keep the caption area clear of all other components (the layout check fails
  any overlap).

### US13 (P2): A made-up component gallery

As a developer, I want one made-up sample idea that uses every component, so that tests, docs and
reviews have a shared reference.

- AC13.1 THE SYSTEM SHALL ship a gallery idea, with made-up text, figures and brand, that uses every
  component and every cue action at least once and renders with the layout check passing.
- AC13.2 THE SYSTEM SHALL ship the gallery's stills in the docs, regenerated by one command.

## Edge cases and failure modes

- A counter whose start equals its end: shows the value with no count animation.
- A counter with negative values or counting down: supported; monotonic in its direction.
- Very large numbers (over 12 characters formatted): rejected by the layout check if they overflow.
- A chip whose source figure is at the stage edge with no room beside it: the chip starts on the side
  with room; if no side has room, the layout check fails naming the chip.
- Two chips in flight at once to the same counter: allowed if they do not overlap each other; otherwise
  the layout check fails.
- A logo PNG with low resolution (under 400 px wide) or an SVG with scripts: rejected.
- A theme with the same colour for text and background: rejected by contrast (AC2.4).
- Right-to-left or CJK text in a theme font without those glyphs: rejected by AC11.2.
- A scene with no components (captions only): valid.

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Accessibility | Caption and body text contrast at least 4.5:1, large text and key graphics at least 3:1 (WCAG 2.2 AA). | AC2.4 contrast computation in tests. |
| Determinism | Same idea and theme give pixel-identical frames. | Render twice and compare frame hashes. |
| Look | Flat vector only; no photoreal or raster content except a supplied logo. | AC11.3 check plus human review of the gallery. |
| Inclusivity | Figures are gender-neutral unless the brief asks otherwise. | Human review of the gallery figures. |
| Licensing | Every bundled font and asset has an open licence recorded in the third-party notices. | 008 licence review. |

## Success metrics

- R1, R2 and R3 are reproduced in 008 using only library components (zero custom scene code).
- Zero chip-placement or caption-overlap defects found by the gate or by reviewers across the acceptance
  videos.

## Scope

In scope:
- The listed components, the theme, the title and close cards, disclaimer and disclosure, dense-scene
  rules, chip rules, the layout check, themed captions, the made-up gallery.

Out of scope (explicit non-goals, so nobody builds them):
- Photoreal imagery, stock photos, raster illustration, 3D.
- Logo generation or fetching logos from the web.
- Custom per-video scene code (any new visual need becomes a new library component through a spec).
- Charts beyond the listed components (bar, line and pie charts are a candidate for a later feature).
- Caption timing and fade behaviour (owned by 001).

## Assumptions and dependencies

- Binding look constraints from the issue: brand colours and fonts, logos only if supplied (else text
  wordmarks), gender-neutral figures unless the brief says otherwise, flat stylised SVG, never photoreal.
- 001 owns timing, capture and caption fades; 004 owns what is drawn and where.
- The brief supplies font files (or names one of the bundled open-licence fonts); the product never
  downloads fonts.
- The figures table (003, 005) supplies every value a component shows.

## Decisions log

- Q: Which components? -> A: running counter, calculator or price panel (static and before/after),
  flying chip, gender-neutral figure, funnel, flow or sequence diagram, cards, title card, close card,
  disclaimer, captions (done criterion 2).
- Q: How is "beside" and "above" made testable for chips? -> Proposed: no box intersection, within 24 px
  of the source at the start, entirely above the digits at landing. Pending /devbox:grill.
- Q: When is a scene dense? -> Proposed: marked by the idea, or automatically at 4 or more lanes or more
  than 12 items; dense scenes get a 0.40 s gap and at least 0.5 s hold per staged reveal. Pending
  /devbox:grill.
- Q: Should low-contrast brand colours be rejected? -> Proposed: yes for captions and body text (WCAG 2.2
  AA), naming the pair. Pending /devbox:grill.
- Q: Where is the disclosure shown? -> Proposed: on the close card for at least 3 s, plus the MP4
  metadata (001) and the .vtt NOTE (002). Pending /devbox:grill.
- Q: Component limits (rows, nodes, lanes, cards)? -> Proposed: as in AC5.4, AC8.1 to AC8.3 and AC9.1.
  Pending /devbox:grill.
