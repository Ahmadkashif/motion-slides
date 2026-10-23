# Architecture: motion-slides

A living overview, arc42-lite with C4 diagrams. Keep each section to what a new engineer (or agent)
needs on day one. Detailed decisions live in `docs/adr/`; feature designs live in `specs/*/design.md`.

## 1. Goals and constraints

- Top three quality goals, in priority order (e.g. correctness, latency, operability):
- Hard constraints (platform, regulation, budget, team skills, deadlines):

## 2. Context (C4 level 1)

Who and what talks to the system.

```mermaid
flowchart LR
  user([User]) --> sys[motion-slides]
  sys --> ext[(External system)]
```

## 3. Containers (C4 level 2)

The deployable or runnable pieces (apps, services, databases, queues, workers) and how they talk.

```mermaid
flowchart LR
  web[Web app] -->|HTTPS/JSON| api[API]
  api -->|SQL| db[(Database)]
```

| Container | Technology | Responsibility | Owner |
|-----------|------------|----------------|-------|
|           |            |                |       |

## 4. Solution strategy

Five to ten bullets: the key ideas that shape the code (e.g. "hexagonal core, adapters at the edge",
"event-sourced orders", "server-rendered with progressive enhancement").

## 5. Building blocks

The main modules inside each container, their interfaces, and the dependency direction.

## 6. Runtime and deployment

Where it runs, how it is deployed, how it scales, how it is rolled back. Link the runbook.

## 7. Cross-cutting concepts

Auth, error handling, logging and telemetry, configuration, internationalization, caching.

## 8. Quality scenarios

Concrete, testable scenarios: "When 1,000 users submit at once, p95 stays under 500 ms."

## 9. Risks and technical debt

| Risk or debt | Impact | Plan |
|--------------|--------|------|
|              |        |      |

## 10. Glossary

The ubiquitous language. Use these exact terms in code, specs and conversations.

| Term | Meaning |
|------|---------|
| brief | The Markdown storyboard a requester supplies: per scene the narration (one caption per line, verbatim), on-screen actions and exact numbers, plus brand, pronunciations, figures table, banned terms, disclaimer, length target, audience, sign-off request and delivery paths. Real briefs live outside the repository and are passed by path. |
| idea | The idea file (`idea.json`) of one video: the single source of truth for every caption, narration line, number and timing knob. Compiled from a brief (005), read by every other step. |
| video folder | One folder per video holding the idea, the scene page, `out/` (deliverables, schedule, log, stills), `build/` (stems, voice cache, voice manifest) and `verify/` (gate reports, arithmetic file, contact sheet). |
| scene | One section of a video with its own composition of components; an ordered list of beats. |
| beat | The unit of timing: one beat is one caption is one clip. A beat may override its spoken text so the caption keeps the real spelling. |
| cue | An animation anchored to a beat (beat start plus an offset in seconds), never to an absolute time. |
| stage | The 1920x1080 page on which scenes are drawn, driven by one paused animation timeline that is seeked frame by frame for capture. |
| schedule | The measured timing of every scene, beat, caption fade and cue (`schedule.json`), computed from clip lengths and the timing knobs; it drives animation, narration placement and caption files. |
| clip | The synthesised audio of one beat after trimming and resampling to 48 kHz; cached by a hash of its spoken text and every voice setting. |
| voice manifest | The record of every beat's clip (`voice-manifest.json`): spoken text, settings hash, length and speech onset. Written by the voice-only pass. |
| stem | An intermediate full-length audio track before the final mix, for example the narration stem (all clips placed by the schedule) and the pad stem. |
| pad | The quiet generated synth bed under the narration, mixed at `audio.pad_volume` (0.05). |
| opener, lead, gap, hold, tail | Pauses: before the first beat; before the first beat of each later scene; between beats in a scene; extra time after a beat's narration; the end hold after the last beat. |
| cap, floor | The maximum video length; the minimum a pause or hold may shrink to when the video is over the cap. |
| respelling | A spoken form that makes the voice say a word correctly (for example SAML spoken as "Sammel"); from the pronunciation map or a beat override. |
| preview | A silent render timed by a reading-time estimate, watermarked and never deliverable. |
| gate | The verify gate (003): every automated check from the verification bar; exits non-zero on any failure and never only warns. |
| contact sheet | One image grid of 12 to 19 labelled frames from the final MP4 covering every scene, every counter landing and the end result, for a human reviewer. A stills contact sheet does the same for layout stills. |
| figures table | The brief's named numbers, each with a value, an optional formula over other figures and a display format; every number on screen refers to it. |
| disclosure | The "AI narration" text every video carries on its close card, in its metadata and in its .vtt. |
| sign-off | Approval of the script (captions and spoken text) by a named person, required only when the brief asks; lapses if the script changes. |
| profile | A hardware profile: a named host class with minimum CPU, RAM, disk and OS and an expected render time, marked VERIFIED or NOT VERIFIED. |
| R1, R2, R3 | The three reference videos described in the registry issue. Only these labels are used in the repository. |
| VERIFIED, NOT VERIFIED, NOT RUN | Every check's status: proven with evidence; checked and failed or not provable; not executed because it waits on the user (with the exact command to finish it). |

## 11. Roadmap

Build order. Each feature lives in `specs/NNN-name/`. Done criteria refer to the eight "What the product
must add" items of research-registery issue #17.

| Order | Feature | Delivers | Done criteria | Depends on |
|-------|---------|----------|---------------|------------|
| 001 | Render engine: idea to MP4 | Idea contract and validation, schedule, frame capture by seeking one paused timeline, encode and mux, burned-in captions, poster, schedule and log, length-cap fitting, stills, silent preview, offline renders. | 1, 7, output spec | none |
| 002 | Local narration and audio | Binding local voice, no-download weights handling, seeded per-line synthesis, trim, resample, hash cache, pronunciation map and overrides, numbers as words, voice-only pass, listening pack, pad, mix to -16 LUFS with peak margin, .srt and .vtt. | 3 | 001 (schedule) |
| 003 | Verify gate | Every automated check of the verification bar, arithmetic file, checksums, disclosure check, honest report and exit code, contact sheet from the final MP4. | 4 | 001, 002 |
| 004 | Scene component library and brand theming | The component library, brand theme, title and close cards, disclaimer and disclosure, chip and dense-scene rules, layout check, made-up gallery. | 2 | 001 |
| 005 | Storyboard brief compiler | Documented brief format and template, deterministic brief-to-idea-and-scene compiler with line-numbered errors, in-repository guard. | 1, 2 | 001, 004 |
| 006 | Production workflow CLI | `motion-slides new, voice, stills, render, verify, deliver, doctor`, straight-through runs, optional sign-off, per-scene re-render, delivery with checksums, Artifact page folder. | 1, 5, 6 (process steps 1 to 8) | 001 to 005 |
| 007 | Install and hardware profiles | User-space idempotent installer, consent-gated weights, Mac and Linux profiles with minimums, doctor and smoke test. | 7 | 006 (doctor command) |
| 008 | Acceptance and public release | R1 to R3 reproduced locally (optional), the made-up public sample, README, evidence, MIT licence, notices, pre-push scans, release and registry closure. | 8, registry commitment | 001 to 007 |

No open questions remain. On 2026-10-23 the user accepted every proposed decision with the build plan
and made reproducing R1 to R3 optional (008 US1), so acceptance rests on the made-up sample.

## 12. Requirement coverage

Every requirement in research-registery issue #17 mapped to the feature and acceptance criteria that cover
it. Feature numbers are the `specs/` folders; AC IDs are the spec's IDs.

### Origin notes

| Requirement | Feature | AC |
|-------------|---------|----|
| Source still on the Mac, pending transfer | 008 | US1 (optional since 2026-10-23); AC1.1, AC1.2, AC1.3 apply only if the briefs arrive; AC7.1 (source is reference only) |
| Untested host: check the real hardware, assume no GPU | 007 | AC3.2, AC3.4 (decision: no NVIDIA GPU on the box) |
| Company content stays private; reproduce R1 to R3 locally; publish only the made-up sample | 008, 005 | 008 AC1.5, AC2.1, AC5.4; 005 AC7.2, AC7.3 |
| No model pulls without the user's explicit yes (weights, any ASR model) | 002, 007 | 002 AC2.1, AC2.2; 007 AC2.1, AC2.4 |
| Never touch the user's Ollama | 002, 007 | 002 AC2.3; 007 AC2.4 |

### Intent

| Requirement | Feature | AC |
|-------------|---------|----|
| Playable videos instead of documents: a brief comes in, a verified MP4 comes out | 006 | AC1.1, AC1.2 |
| On any host that meets a stated profile | 007 | AC3.3, AC4.3 |
| Proven route: HTML/SVG scene with a paused GSAP timeline, seeked frame by frame, encoded by ffmpeg, local voice | 001, 002 | 001 AC3.2, AC4.1 (route in 001 Assumptions); 002 AC1.4 |
| Remotion and Manim rejected | 007 | AC6.1, AC6.2 |
| Code expected: Node, Python for voice and verification, ffmpeg | 007 | AC1.1 (language split decided in design) |
| The three videos were never listened to by ear | 002, 003 | 002 AC8.2, AC8.3, AC8.4; 003 AC9.3 |

### Process as it runs today

| Requirement | Feature | AC |
|-------------|---------|----|
| 1. Brief in: Markdown storyboard (narration one caption per line, actions, exact numbers, brand colours, fonts, pronunciations, disclaimer, length target, audience, delivery paths) | 005 | AC1.1, AC2.2, AC2.3 |
| 2. Script sign-off only when asked; straight through by default; never hold for an OK already given | 006 | AC2.1, AC2.3, AC2.5, AC1.1 |
| 3. idea.json is the single source of truth | 005, 001 | 005 AC2.4; 001 AC1.5 |
| 4. scene.html: 1920x1080 stage, one paused timeline, animations on beats at measured times | 001, 005 | 001 AC3.1, AC3.2, AC4.1; 005 AC2.1 |
| 5. Voice-only pass: synthesise and cache, measure, report pronunciation problems | 002 | AC7.1, AC7.3, AC4.2 |
| 6. Layout stills; fix overlaps, clipping and wrong numbers; contact sheet for the reviewer | 001, 004, 006, 003 | 001 AC7.1; 004 AC11.1; 006 AC4.2, AC4.3; 003 AC7.3 |
| 7. Full render, then verify | 006, 003 | 006 AC1.1; 003 AC9.2 |
| 8a. MP4, .srt, .vtt and poster go to `out/` | 006, 001 | 006 AC5.2; 001 AC4.3 |
| 8b. Optional copy elsewhere with a matching checksum | 006, 003 | 006 AC5.3; 003 AC8.2 |
| 8c. Optional private claude.ai Artifact with the MP4 | 006 | AC6.1, AC6.2, AC6.3 |
| 8d. Notify the requester with the path and duration | 006 | AC5.4 (sending is out of scope) |

### Engine layout: idea.json fields

| Requirement | Feature | AC |
|-------------|---------|----|
| `kicker`, `title`, `subtitle`, `footer` | 001, 004 | 001 AC1.1; 004 AC3.1, AC3.2 |
| `voice.engine` (supertonic, not say) | 002 | AC1.1 |
| `voice.supertonic.model` supertonic-3 | 002 | AC1.2 |
| `voice.supertonic.voice` M3 | 002 | AC1.2 |
| `voice.supertonic.lang` en | 002 | AC1.3 |
| `voice.supertonic.steps` 32 | 002 | AC1.2 |
| `voice.supertonic.speed` 0.75 | 002 | AC1.2 |
| `voice.supertonic.seed` 1234 | 002 | AC1.2, AC3.2 |
| `voice.supertonic.mode` batch | 002 | AC1.2, AC3.1 |
| `voice.supertonic.python` path | 002 | AC2.4 |
| `voice.supertonic.pronunciation` map | 002 | AC5.1, AC5.3, AC5.4 |
| `voice.trim.threshold_db` -50 | 002 | AC3.3 |
| `voice.trim.keep_start` 0.02 | 002 | AC3.3 |
| `voice.trim.keep_end` 0.06 | 002 | AC3.3 |
| `audio.target_lufs` -16 | 002, 003 | 002 AC9.3; 003 AC2.1 |
| `audio.true_peak_db` -1.5 | 002, 003 | 002 AC9.4; 003 AC2.2 |
| `audio.pad_volume` 0.05 | 002 | AC9.2 |
| `timing.opener` | 001 | AC3.1, AC6.1 |
| `timing.lead` | 001 | AC3.1, AC6.1 |
| `timing.gap` | 001 | AC3.1, AC6.1 |
| `timing.tail` | 001 | AC3.1, AC6.1 |
| `scenes[].beats[]`: one beat = one caption = one clip | 001, 005, 002 | 001 AC1.3; 005 AC2.2; 002 AC7.1 |
| Beat override of `speak_supertonic` / `speak` (caption keeps the real spelling) | 002, 001 | 002 AC5.2; 001 AC5.4 |

### Engine layout: files, tools and flags

| Requirement | Feature | AC |
|-------------|---------|----|
| scene.html: the stage and timeline | 005, 001 | 005 AC2.1; 001 AC3.2 |
| render: narration, measure, frames, encode, loudness-normalise, mux, captions | 006, 001, 002 | 006 AC1.1; 001 AC3.4; 002 AC9.3, AC10.1 |
| `--voice-only` | 002, 006 | 002 AC7.1 (the `voice` command, 006 AC1.3) |
| `--stills <scene>-<beat>+<sec>` | 001, 006 | 001 AC7.1; 006 AC4.1 |
| `--name` | 001 | AC9.3, AC9.4 |
| `out/`: MP4, poster.jpg, captions.srt/.vtt, schedule.json, render.log | 001, 002 | 001 AC4.3, AC4.4, AC9.1, AC9.2; 002 AC10.1 |
| `build/`: stems, tts-cache, voice-manifest.json | 001, 002 | 001 AC4.3; 002 AC7.1 |
| voice tool: per-line synth, trim, resample to 48 kHz, cache by hash of text and settings | 002 | AC3.3, AC3.4, AC4.1 |
| batch helper: loads the model once, seeds each line | 002 | AC3.1, AC3.2 |
| caption-qa: every frame, never two captions, no lingering half-faded caption | 003 | AC5.1, AC5.2 |
| verify-final: streams, loudness, silences, caption cues against speech onsets | 003 | AC1.1, AC2.1, AC3.1, AC4.2 |
| netcache: cached network requests, local woff2 fonts | 001 | AC8.1, AC8.2 |
| build-artifact: Artifact page with live scene player and MP4 | 006 | AC6.1 |
| Requirements: node, Playwright, Chrome, ffmpeg, Supertonic uv tool; cairo and pkg-config only for Manim | 007 | AC1.1, AC6.2 |

### Output spec

| Requirement | Feature | AC |
|-------------|---------|----|
| MP4 container | 001, 003 | 001 AC4.1; 003 AC1.1 |
| H.264 High | 001, 003 | 001 AC4.1; 003 AC1.1 |
| AAC-LC 48 kHz stereo | 001, 003 | 001 AC4.2; 003 AC1.1 |
| 1920x1080 | 001, 003 | 001 AC4.1; 003 AC1.1 |
| 30 fps | 001, 003 | 001 AC4.1; 003 AC1.1 |
| -16 LUFS integrated | 002, 003 | 002 AC9.3; 003 AC2.1 |
| True peak at or below -1.5 dB | 002, 003 | 002 AC9.4; 003 AC2.2 |
| Captions burned in | 001 | AC5.1, AC5.2 |
| Captions also written as .srt and .vtt | 002 | AC10.1, AC10.2 |
| Mac M-series: a 3-minute video in about 4 to 6 minutes, capture about 17 fps | 007 | AC3.1 |

### Verification bar

| Requirement | Feature | AC |
|-------------|---------|----|
| Format: format, resolution, fps, codecs and duration against the cap | 003 | AC1.1, AC1.2 |
| Audio: loudness and true peak on target | 003 | AC2.1, AC2.2 |
| Audio: narration present | 003 | AC2.3, AC2.4 |
| Silence: none over 2 s except the opener and the end hold | 003 | AC3.1 |
| Caption sync: cues lead speech onset by about 0.024 s | 003 | AC4.1, AC4.2 |
| Fades: caption check passes over all frames | 003 | AC5.1, AC5.2, AC5.3 |
| Frames: 12 to 19 frames from the final MP4 covering every scene, every counter landing and the end results | 003 | AC10.1, AC10.2, AC10.3 |
| Content: arithmetic re-derived into verify/arithmetic.txt | 003 | AC7.1, AC7.2, AC7.3 |
| Content: grep for banned terms | 003 | AC6.1, AC6.2 |
| Content: checksums match on any copy | 003, 006 | 003 AC8.2; 006 AC5.3 |
| Pronunciation: respelling against right and wrong references voiced by M3, no ASR | 002 | AC8.1, AC8.5 |

### Binding constraints

| Requirement | Feature | AC |
|-------------|---------|----|
| Voice: Supertonic 3, male voice M3 | 002 | AC1.2 |
| MIT code, OpenRAIL-M weights, commercial use with use restrictions | 008, 007 | 008 AC3.3; 007 AC2.2 |
| Steps 32, speed 0.75 (about 151 to 159 wpm), seed 1234, sample-identical renders | 002 | AC1.2, AC3.5, AC11.1 |
| CPU via ONNX, about 0.4 GB: `uv tool install supertonic==1.3.1`, then download only with the user's yes | 007 | AC1.1, AC2.1, AC2.2 |
| Every video carries an "AI narration" disclosure | 004, 003, 001, 002 | 004 AC3.2; 003 AC11.1; 001 AC9.5; 002 AC10.4 |
| No cloud or API TTS of any kind, not even free tiers | 002 | AC1.4 |
| Local open source or OS-native only | 002 | AC1.1 |
| No voice cloning | 002 | AC1.5 |
| macOS `say` voices are personal, non-commercial only: never for shared output | 002 | AC1.1 |
| Templatise: swap the idea JSON, keep the engine | 001, 005 | 001 AC1.5; 005 AC2.4 |
| Don't tune to one host | 005, 007 | 005 AC4.3; 007 AC3.3, AC3.4 |
| Over the length cap: cut pauses and holds, never content and never voice speed | 001 | AC6.1, AC6.2, AC6.3 |
| Look: the brand's own colours and fonts | 004 | AC2.1, AC2.5 |
| Logos only if supplied, otherwise text wordmarks | 004 | AC2.3 |
| Gender-neutral figures unless the brief says otherwise | 004 | AC7.1, AC7.2 |
| Flat stylised SVG, never photoreal | 004 | AC11.3 |
| Honest reporting: VERIFIED or NOT VERIFIED | 003, 007, 008 | 003 AC9.1; 007 AC4.1; 008 AC3.1 |

### Lessons already learned

| Requirement | Feature | AC |
|-------------|---------|----|
| Template injection: "$1,000" must not become a replacement pattern | 001, 005 | 001 AC5.5; 005 AC3.1, AC3.2 |
| Peak margin: limiter 1 dB below the ceiling | 002 | AC9.4 |
| Chips start beside their source figure and land above the counter's digits | 004 | AC6.1, AC6.2, AC6.3 |
| Caption fades: in 0.18 s, out 0.12 s; the old caption is gone before the next appears | 001, 003 | 001 AC5.1, AC5.2; 003 AC5.2 |
| Dense scenes: more time, a 0.40 s gap between lines, staged reveals | 004, 001 | 004 AC10.1, AC10.2, AC10.3; 001 AC6.5 |
| Remotion needs `--concurrency=2 --timeout=120000` (not applicable: Remotion is excluded) | 007 | AC6.1 |
| Proven pronunciations: the five public entries ship in the default map; company entries go in private maps | 002 | AC5.3, AC5.4 |
| Seeds: without one every render differs; use 1234 | 002 | AC3.2, AC3.5 |
| Captions: one line on screen | 001 | AC5.3 |
| Narration writes numbers out in words; the screen shows exact figures | 002 | AC6.1, AC6.2, AC6.3 |

### What the product must add (done criteria)

| Requirement | Feature | AC |
|-------------|---------|----|
| 1. One CLI taking a Markdown brief to MP4, .srt/.vtt and poster, no hand-editing of engine code | 006 | AC1.1, AC1.2 |
| 2. Brief to idea.json and scene.html from reusable, brand-themable components | 005, 004 | 005 AC2.1; 004 AC1.1, AC2.1 |
| 3. Local voice only, per-project pronunciation map, hash-cached clips | 002 | AC1.1, AC1.2, AC4.1, AC5.4 |
| 4. Automated verify gate failing on cap, loudness or peak, silence, sync, overlap or fades, banned term, arithmetic; contact sheet | 003 | AC1.2, AC2.1, AC2.2, AC3.1, AC4.2, AC5.1, AC6.1, AC7.2, AC9.2, AC10.1 |
| 5. Optional sign-off gate, straight through by default | 006 | AC2.1, AC2.2, AC2.3, AC2.4, AC2.5 |
| 6. Per-scene re-render | 006 | AC3.1, AC3.2 |
| 7. One shared install with hardware profiles and minimum specs; Mac proven, Linux to prove, check the real box | 007, 008 | 007 AC1.1, AC1.2, AC3.1, AC3.2; 008 AC6.1 |
| 8. Reproduce R1 to R3 locally and pass the gate; one fresh made-up video end to end, the only public one | 008 | AC1.1, AC1.2, AC1.3, AC2.1 |

### Registry commitment

| Requirement | Feature | AC |
|-------------|---------|----|
| Working PoC end to end, proven with captured evidence | 008 | AC2.1, AC2.3 |
| Where a step waits on the user: build around it, mark it NOT RUN, give the exact commands | 008, 007 | 008 AC2.4; 007 AC2.1 |
| Published as a public repository | 008 | AC5.1 (repository already public since 2026-10-21) |
| README: what it is, how to run it, what was verified and what was NOT RUN | 008 | AC3.1 |
| The evidence | 008 | AC2.3 |
| LICENSE, MIT | 008 | AC3.2 |
| No secrets or tokens | 008 | AC4.1 |
| No company data; only the made-up sample | 008 | AC1.5, AC4.2 |
| No private-repository code | 008 | AC7.1 |
| No host names or IP addresses of this box | 008 | AC4.3 |
| Scan the tree before pushing | 008 | AC4.4 |
| Done means findings.md links the public repository URL and the verified commit | 008 | AC5.2 |
| Closing comment on the registry issue | 008 | AC5.3 |
