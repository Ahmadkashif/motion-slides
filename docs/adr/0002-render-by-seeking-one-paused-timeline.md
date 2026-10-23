---
status: accepted
date: 2026-10-23
decision-makers: the user (build plan approval), Claude (design)
---

# 0002. Render by seeking one paused timeline, and run TypeScript without a build step

## Context and problem statement

Every video must be frame-exact, repeatable and produced offline from one idea file, with no engine
edits per video. The issue fixes the route: an HTML stage, one paused GSAP timeline, Playwright driving
Chrome, ffmpeg. Open questions were how frames are captured and how the code is built.

## Decision drivers

- Frame N must look the same however it is reached (determinism, parallel capture).
- No stale build output may ever be tested or served.
- Few moving parts (Article IV).

## Considered options

- Seek one paused timeline per frame and screenshot, with parallel workers writing JPEG frames to a
  private run folder, then encode with ffmpeg.
- Pipe screenshots straight into one ffmpeg process.
- Chrome's `HeadlessExperimental.beginFrame` deterministic mode.
- Build TypeScript with `tsc` into `dist/`, or bundle the stage with esbuild.

## Decision outcome

Chosen: seek and screenshot with parallel workers into a fresh run folder per render. The timeline is
created with `defaults: {immediateRender: false}`, every tween is a `fromTo`, and each element gets its
starting state when it is created, so each frame is a function of time alone, whatever was seeked
before (with gsap 3.15.0 a default `fromTo` fade-out renders its start value at build time and breaks
this). TypeScript runs directly on Node 24 (type
stripping, erasable syntax only, `tsc --noEmit` as the checker), and the browser stage is plain
JavaScript ES modules with JSDoc types, importing GSAP by absolute path from the route.

### Consequences

- Good: capture parallelises across cores; a 1-worker and a 4-worker capture give identical frames.
- Good: tests always run against the source; nothing can go stale; no bundler.
- Bad: about 1.6 GB of frames per 180 s render while it runs (deleted on publish).
- Bad: source must avoid non-erasable TypeScript (enums, namespaces, parameter properties).
- Bad: Node refuses to strip types under `node_modules`, so the product runs from a git clone (linked
  or started by a launcher script), never as a copied package (`npm i -g` from a tarball, `npx`). The
  007 installer follows this.

### Confirmation

The frame-hash test (001 T005), the ffprobe tests (001 T006) and the typecheck gate.
