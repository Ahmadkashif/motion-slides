---
feature: 001-render-engine-idea-to-mp4
title: "Render engine: idea to MP4"
status: draft   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 1 week   # proposed; the user sets the final appetite in grill
created: 2026-10-23
---

# Render engine: idea to MP4

Source of truth: research-registery issue #17 (Process steps 3, 4 and 7, Engine layout, Output spec,
Lessons learned) and done criteria 1 and 7. Where this spec says "R1, R2, R3" it means the three
reference videos described in the registry issue.

## Problem

Today a narrated explainer video is produced by hand: someone writes a one-off animated page, hand-tunes
timings against the narration, and runs capture and encoding scripts that were edited for that one video
and that one machine. Three videos (R1, R2, R3) shipped this way and passed objective checks, but every
new video means editing engine code, and the scripts have already bitten us: inserting the video's text
into the page with a pattern-based replace turned "$1,000" into a replacement pattern, and the old route
assumed a host profile that this Linux box does not match.

The requester communicates ideas asynchronously and wants a playable video instead of a document. They
need the engine to be a fixed, tested piece that takes one description of a video and turns it into an
MP4 the same way every time, on any host that meets a stated profile.

## Outcome

Given one idea file (the single source of truth for every caption, narration line, number and timing
knob), the engine produces a 1920x1080, 30 fps MP4 with burned-in one-line captions, a poster image, a
measured schedule and a render log, with no edits to engine code, no network access, and timing driven
by the measured length of each narration clip. When no narration exists yet, it can produce a clearly
marked silent preview so layout and pacing can be reviewed early.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| Requester | When I have an idea to explain, I want a playable video instead of a document, so I can communicate asynchronously. |
| Producer (a person or a Claude session running the product) | When an idea file is ready, I want one render step that turns it into a correct MP4, so I never edit engine code per video. |
| Producer | When the voice is not available yet, I want a silent preview timed by an estimate, so I can review layout and pacing before narration exists. |
| Reviewer | When a video is rendered, I want stills, a schedule and a log, so I can check what happened without re-running it. |
| Later features (narration, verify gate, CLI) | When they run, they want a stable schedule and folder layout, so they can place audio, check the output and deliver it. |

## The idea contract

The idea file (`idea.json`, one per video folder) is the product's input contract. The fields below are
the issue's list; rows marked "added" are additions this spec proposes (see Decisions log). The engine
reads every field; features 002 to 006 own the meaning of the fields marked with their number.

| Field | Meaning | Value rule |
|-------|---------|------------|
| `kicker`, `title`, `subtitle`, `footer` | Text for the title and close cards. | Strings; `title` required. |
| `voice.engine` | Narration engine. | Only `supertonic` (002). |
| `voice.supertonic.model`, `.voice`, `.lang`, `.steps`, `.speed`, `.seed`, `.mode` | Voice settings. | Binding values `supertonic-3`, `M3`, `en`, `32`, `0.75`, `1234`, `batch` (002, constitution P1). |
| `voice.supertonic.python` | Interpreter that runs the voice tool. | Optional path; default comes from the install (002, 007). |
| `voice.supertonic.pronunciation` | Per-project map from written word to spoken respelling. | Object of strings (002). |
| `voice.trim.threshold_db`, `.keep_start`, `.keep_end` | Silence trimming of each clip. | Defaults `-50`, `0.02`, `0.06` (002). |
| `audio.target_lufs`, `.true_peak_db`, `.pad_volume` | Loudness target, peak ceiling, pad level. | Defaults `-16`, `-1.5`, `0.05` (002). |
| `timing.opener`, `.lead`, `.gap`, `.tail` | Pauses in seconds (see Glossary in `docs/architecture.md`). | Non-negative numbers. |
| `timing.cap` (added) | Maximum video length in seconds. | Required positive number. |
| `timing.floors` (added) | Minimum each pause or hold may shrink to under the cap. | Optional; defaults in AC6.5. |
| `scenes[]` | Ordered scenes; each has an id, its components (004) and beats. | At least one scene. |
| `scenes[].gap`, `scenes[].dense` (added) | Per-scene gap override; dense-scene flag (004). | Optional. |
| `scenes[].beats[]` | One beat = one caption = one clip. | At least one beat per scene. |
| `beats[].caption` | The on-screen caption, real spelling, one line. | Non-empty string. |
| `beats[].speak_supertonic`, `beats[].speak` | Override of the spoken text, so the caption keeps the real spelling while the voice reads a respelling (002). | Optional strings. |
| `beats[].hold` (added) | Extra seconds the beat's visuals stay after its narration ends. | Optional, non-negative. |
| `beats[].cues[]` (added) | Animations anchored to the beat: component, action, offset in seconds from the beat start. | Optional. |
| `theme` (added, 004) | Brand colours, fonts, wordmark or logo. | See 004. |
| `figures`, `banned_terms` (added, 003, 005) | The brief's figures table and banned terms. | See 003. |
| `signoff`, `delivery` (added, 006) | Sign-off request and delivery paths from the brief. | See 006. |
| `audience`, `source` (added, 005) | The brief's audience note; the brief's file name and hash. | See 005. |
| `disclosure` (added, 004) | The "AI narration" disclosure text. | Defaults to "AI narration"; cannot be empty. |

## User stories

### US1 (P1): Validate the idea before doing any work

As a producer, I want a malformed idea file rejected up front with exact reasons, so that I never wait
for a long render that was doomed from the start.

- AC1.1 WHEN a render, preview or still is requested THE SYSTEM SHALL validate the idea file against the
  idea contract before starting the browser or writing any output, and IF it is invalid THEN THE SYSTEM
  SHALL exit non-zero listing every invalid field by its path (for example `scenes[2].beats[0].caption`)
  with the reason.
- AC1.2 IF the idea file contains a field that is not in the idea contract THEN THE SYSTEM SHALL reject
  it, naming the field and the closest valid field name.
- AC1.3 IF the idea has no scenes, a scene has no beats, or a beat's caption is empty or only whitespace
  THEN THE SYSTEM SHALL reject it, naming the scene and beat.
- AC1.4 IF `timing.cap` is missing or not a positive number THEN THE SYSTEM SHALL reject the idea.
- AC1.5 Given two different valid idea files and the same installed product, when both are rendered,
  then both MP4s are produced and the product's own files are byte-identical before and after both runs
  (a new video never needs engine code edits).

### US2 (P1): Silent preview before the voice exists

As a producer, I want a silent preview timed by a reading-time estimate, so that I can review layout and
pacing before the voice weights are installed or any line is synthesised.

- AC2.1 WHEN a preview is requested THE SYSTEM SHALL time each beat by its spoken text's word count at
  155 words per minute (minimum 1.0 s per beat) and render without invoking the voice.
- AC2.2 THE SYSTEM SHALL burn the text "PREVIEW - NOT NARRATED" into a corner of every preview frame and
  name the file with a `-preview` suffix.
- AC2.3 THE SYSTEM SHALL give the preview MP4 a silent AAC-LC 48 kHz stereo track, so its container
  format matches a narrated render.
- AC2.4 THE SYSTEM SHALL record `timing_source: estimate` in the preview's schedule and render log and
  in the MP4 metadata, so later steps (verify, deliver) can identify and refuse it.

### US3 (P1): Narrated render timed by measured clips

As a producer, I want every beat timed by the measured length of its narration clip, so that animations
and captions land exactly on the narration without hand-tuning.

- AC3.1 Given a voice manifest with a clip length for every beat, when a render runs, then the schedule
  places the first beat at `opener`, each later beat in the same scene at the previous beat's end plus
  the previous beat's hold plus the scene's gap, the first beat of each later scene at the previous
  beat's end plus the previous beat's hold plus `lead`, and ends the video `tail` after the last beat's
  end plus the last beat's hold.
- AC3.2 Given a cue anchored to a beat with offset `t`, when the video is rendered, then the cue's
  animation starts on the frame nearest to that beat's start plus `t` (within one frame, 1/30 s).
- AC3.3 IF the voice manifest is missing, lacks a beat, or a beat's recorded spoken text or settings no
  longer match the idea THEN THE SYSTEM SHALL refuse the narrated render and name every stale or
  missing beat.
- AC3.4 THE SYSTEM SHALL mux the mixed narration track (feature 002) for that same schedule, and the
  audio and video streams of the MP4 SHALL differ in duration by at most one frame (33.4 ms).

### US4 (P1): Output that meets the output spec

As a requester, I want every MP4 in one known format, so that it plays everywhere and passes the gate.

- AC4.1 THE SYSTEM SHALL write an MP4 whose video stream is H.264 High profile, 4:2:0, 1920x1080, square
  pixels, constant 30 fps.
- AC4.2 THE SYSTEM SHALL write the audio stream as AAC-LC, 48 kHz, 2 channels.
- AC4.3 THE SYSTEM SHALL lay out each video folder as `out/` (the MP4, `poster.jpg`, `captions.srt`,
  `captions.vtt`, `schedule.json`, `render.log`, `stills/`) and `build/` (stems, `tts-cache/`,
  `voice-manifest.json`), creating missing folders and never writing outside the video folder.
- AC4.4 THE SYSTEM SHALL write `poster.jpg` as a 1920x1080 JPEG of the frame at the end of the opener
  (title card fully shown).

### US5 (P1): Captions burned in, one at a time

As a viewer, I want one readable caption at a time that matches the narration, so that I can follow
with the sound off.

- AC5.1 THE SYSTEM SHALL start each beat's caption at the beat's start and fade it in over 0.18 s.
- AC5.2 THE SYSTEM SHALL start the caption's fade-out at the end of the beat's narration clip, fade it
  out over 0.12 s, and on every frame at most one caption SHALL have non-zero opacity (the old caption
  is gone before the next appears).
- AC5.3 IF a caption does not fit on one line inside the caption area at the theme's caption size THEN
  THE SYSTEM SHALL fail before capture, naming the scene, beat and the overflow in pixels (it never
  wraps or shrinks text).
- AC5.4 THE SYSTEM SHALL show the beat's `caption` exactly as written (real spelling), never the
  spoken respelling.
- AC5.5 Given captions or any idea text containing `$1,000`, `$&`, `$1`, `` $` ``, `<b>bold</b>` or
  `&amp;`, when the video is rendered, then the frames show those characters literally and no markup or
  replacement pattern is interpreted (template-injection lesson).

### US6 (P1): Fit the length cap without cutting content

As a requester, I want an over-length video brought under the cap by trimming pauses only, so that no
line is lost and the voice never speeds up.

- AC6.1 IF the natural duration exceeds `timing.cap` THEN THE SYSTEM SHALL shrink every opener, lead,
  gap, hold and tail by one common factor, none below its floor, until the duration is at or under the
  cap.
- AC6.2 WHILE shrinking THE SYSTEM SHALL keep every beat, every caption's text and every clip's audio
  and length exactly as measured (voice speed and content never change).
- AC6.3 IF the duration with every pause at its floor still exceeds the cap THEN THE SYSTEM SHALL fail
  without writing an MP4 and report the natural duration, the floor duration, the cap and the overrun
  in seconds.
- AC6.4 WHEN shrinking was applied THE SYSTEM SHALL record the factor and the before and after
  durations in `schedule.json` and `render.log`.
- AC6.5 WHERE the idea sets no floors THE SYSTEM SHALL use opener 1.0 s, lead 0.30 s, gap 0.20 s,
  hold 0 s and tail 3.0 s (or the disclaimer's reading time from 004 AC3.3 if longer), and SHALL never
  shrink the gap of a dense scene below 0.40 s or the tail below 3.0 s, whatever the idea sets.

### US7 (P2): Layout stills at key moments

As a producer, I want stills of chosen moments without a full render, so that I can catch overlaps,
clipping and wrong numbers early.

- AC7.1 WHEN a still is requested as `<scene>-<beat>+<sec>` (1-based scene and beat numbers, seconds
  after that beat's start) THE SYSTEM SHALL write a 1920x1080 PNG of that moment, including the
  caption state at that moment, to `out/stills/` named after the moment.
- AC7.2 THE SYSTEM SHALL accept several moments in one request and produce them without capturing the
  full video.
- AC7.3 IF a moment names a scene or beat that does not exist, or falls after the end of the video,
  THEN THE SYSTEM SHALL fail naming the moment and the valid range.
- AC7.4 THE SYSTEM SHALL time stills from the current voice manifest when one exists and from the
  reading-time estimate otherwise, adding `-preview` to the file name in the second case.

### US8 (P1): Offline, atomic and exclusive

As a producer, I want a render that needs no network, never leaves half-written outputs and cannot
collide with another render, so that results are trustworthy and repeatable.

- AC8.1 THE SYSTEM SHALL complete a render with networking disabled, and IF the stage requests any
  resource that is not on the local machine THEN THE SYSTEM SHALL block it and fail naming the URL.
- AC8.2 THE SYSTEM SHALL load fonts only from local font files named by the theme, and IF a named font
  file is missing THEN THE SYSTEM SHALL fail naming it (no silent fallback font).
- AC8.3 IF a render fails or is interrupted THEN no file SHALL exist under the final MP4 name from that
  run, any previous outputs SHALL remain unchanged, and `render.log` SHALL record the failure.
- AC8.4 IF another render is already running on the same video folder THEN THE SYSTEM SHALL refuse to
  start and name the running process.

### US9 (P2): Logs, schedule and naming

As a reviewer, I want a complete schedule and log and a predictable file name, so that I can audit a
render without re-running it.

- AC9.1 THE SYSTEM SHALL write `schedule.json` with, per scene and per beat: start, end, clip length,
  hold, caption fade-in start and fade-out end, every cue's time, the total duration and the timing
  source (measured or estimate).
- AC9.2 THE SYSTEM SHALL write `render.log` with the product version, every external tool's version,
  a hash of the idea file, the wall time of each phase (schedule, capture, encode, mux), frames
  captured and the average capture rate in frames per second.
- AC9.3 WHEN a name is given THE SYSTEM SHALL use it as the MP4 file name, and otherwise SHALL derive it
  from the idea's title (lowercase letters, digits and hyphens).
- AC9.4 IF a given name contains a path separator, `..`, or characters outside letters, digits, `-`
  and `_` THEN THE SYSTEM SHALL reject it.
- AC9.5 THE SYSTEM SHALL write the idea's title and the disclosure text into the MP4 metadata (title
  and comment fields).

## Edge cases and failure modes

- Idea file is not valid JSON, is empty, or is huge (over 1 MB): rejected with the parse position, no
  browser started.
- Duplicate scene ids: rejected naming both scenes.
- A beat whose spoken override is empty while its caption is not: rejected (a beat must speak).
- A video with one scene and one beat: valid; lead never applies.
- Unicode, emoji and right-to-left text in captions: rendered with the theme font; a glyph the font
  lacks is reported by the layout check in 004.
- Clip lengths of zero or longer than 60 s in the manifest: rejected as a corrupt manifest.
- Chrome crashes or hangs mid-capture: the render fails after a 60 s stall with no partial MP4 (AC8.3).
- Disk fills during capture or encode: the render fails, temporary files are removed, previous outputs
  stay (AC8.3).
- Ctrl-C: the browser and encoder processes stop within 5 s and temporary files are removed.
- The video folder is read-only: fail before capture with the path.
- Two renders of different video folders at the same time: allowed; each has its own lock.
- `timing.cap` shorter than the opener plus tail floors alone: fails as in AC6.3.

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Determinism | Two renders of the same idea and voice manifest on the same host produce byte-identical `schedule.json` and sample-identical decoded audio. | Render twice, compare hashes. |
| Offline | Zero outbound network connections during a render. | Run inside a network-less namespace; render succeeds (AC8.1). |
| Performance (proposed budget) | On the Linux CPU-only profile (007), a 180 s video renders end to end in at most 15 minutes, and `render.log` reports the capture rate. | Timed run recorded in progress.md; replaced by the measured figure once 008 runs. |
| Memory | Peak resident memory of the whole render under 4 GB on a 180 s video. | `/usr/bin/time -v` on the acceptance render. |
| Disk | Working space for a 180 s video under 5 GB, released after the render except caches in `build/`. | Measure `build/` and temp space during the acceptance render. |
| Privacy | No idea content leaves the machine; no telemetry. | Offline run (above) plus code review. |
| Security | Idea text is treated as data: never executed, never interpreted as markup or a pattern. | AC5.5 tests plus a test with `<script>` in a caption that must render literally and not run. |

## Success metrics

- A new video needs zero engine code edits (count of engine diffs per new video stays at 0 across the
  acceptance videos in 008).
- First-render success rate: a valid idea renders on the first attempt in every acceptance run.
- Time from idea file to MP4 on the Linux profile is logged for every render and trends down, not up.

## Scope

In scope:
- Validating the idea contract, the schedule, frame capture by seeking one paused timeline, encoding,
  muxing, burned-in captions, poster, schedule, render log, folder layout, length-cap fitting, stills,
  naming, silent preview, offline operation.

Out of scope (explicit non-goals, so nobody builds them):
- Synthesising or mixing narration and writing .srt/.vtt (feature 002).
- Checking the output against the verification bar (feature 003).
- The scene components and theming (feature 004) and compiling a brief into an idea (feature 005).
- The command-line surface, sign-off and delivery (feature 006); installation (feature 007).
- Remotion and Manim (rejected in the issue), resolutions other than 1920x1080, frame rates other than
  30 fps, vertical video, live streaming, GPU-accelerated encoding.

## Assumptions and dependencies

- Binding constraints from the issue: the proven route stays (an HTML/SVG stage animated by one paused
  GSAP timeline, seeked frame by frame by Playwright driving Chrome, encoded by ffmpeg). Design notes,
  not requirements on the wording above: GSAP is consumed through npm under GSAP's "Standard no-charge
  license" and is never copied into this repository.
- The voice manifest format is defined jointly with 002; 001 tests use fixture clips (generated tones),
  so this feature does not need the voice weights.
- Host facts verified 2026-10-21 to 23 on the Linux box: 8 cores and 16 threads, 31 GB RAM, Intel UHD 630,
  no NVIDIA GPU; Node 24.15, ffmpeg and ffprobe 8.1 with libx264 and aac, Chrome 156, Playwright Chromium
  1217. The issue's "RTX 4000" does not apply to this box; nothing here may assume a GPU.
- The theme (fonts, colours, caption style) comes from 004; until 004 lands, a built-in neutral theme
  with an open-licence font is used.

## Decisions log

- Q: Product and command name? -> A: `motion-slides` (the user's choice; replaces the issue's slug and
  its example command).
- Q: Is the idea contract the issue's list? -> A: Yes, exactly, with the additions marked "added" above
  (user's breakdown).
- Q: Preview without voice? -> Proposed: a silent preview timed at 155 words per minute (the middle of
  the measured 151 to 159), watermarked, refused by deliver (lets 001 ship and be reviewed before the
  weights download is approved). Pending /devbox:grill.
- Q: What do opener, lead, gap and tail mean exactly? -> Proposed: as in AC3.1 (opener before the first
  beat, lead before each later scene's first beat, gap between beats in a scene, tail after the last
  beat) plus a per-beat hold. Pending /devbox:grill.
- Q: How is the cap met? -> Proposed: one common shrink factor over all pauses and holds, floored by
  `timing.floors` with the defaults in AC6.5 (keeps the rhythm; never touches content or speed, per P4).
  Pending /devbox:grill.
- Q: Unknown fields in idea.json? -> Proposed: rejected (catches typos that would otherwise silently do
  nothing). Pending /devbox:grill.
- Q: Network during render? -> Proposed: block every non-local request and fail, instead of the
  hand-run pipeline's request cache (stronger guarantee, same goal: repeatable offline renders).
  Pending /devbox:grill.
- Q: Which frame is the poster? -> Proposed: the end of the opener, title card fully shown. Pending
  /devbox:grill.
- Q: Caption too long for one line? -> Proposed: fail and name the beat; the brief splits the line
  (one line on screen is a lesson learned; auto-shrinking would break the brand type scale). Pending
  /devbox:grill.
- Q: Still addressing? -> Proposed: 1-based scene and beat numbers, `<scene>-<beat>+<sec>` as in the
  issue. Pending /devbox:grill.
