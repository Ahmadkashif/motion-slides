---
feature: 006-production-workflow-cli
title: "Production workflow CLI"
status: approved   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 4 days   # accepted by the user on 2026-10-23
created: 2026-10-23
---

# Production workflow CLI

Source of truth: research-registery issue #17 (Process steps 1 to 8, Engine layout flags and
`build-artifact`) and done criteria 1, 5 and 6.

## Problem

The hand-run pipeline is a set of scripts run in the right order by someone who knows the order: compile
the brief by hand, voice, check stills, render, verify, copy, build an Artifact page, tell the requester.
Steps get skipped or run against a stale file, a whole video is re-rendered to fix one scene, and a
render is sometimes held for a script OK that was already given elsewhere. The requester wants one tool
that takes a brief and delivers a verified MP4, pausing for approval only when the brief asks.

## Outcome

One command-line tool, `motion-slides`, with the subcommands `new`, `voice`, `stills`, `render`,
`verify`, `deliver` and `doctor`, takes a Markdown storyboard brief to a delivered MP4, .srt, .vtt and
poster with no hand-editing of engine code. By default it runs straight through; it pauses for script
sign-off only when the brief asks and never when the OK was already given. One scene can be re-rendered
without redoing the others, and delivery refuses anything the gate did not pass.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| Producer (a person or a Claude session) | When a brief arrives, I want one command to take it to a delivered video, so I can hand back a link instead of running scripts. |
| Script approver | When the brief asks for sign-off, I want to read the script before anything is rendered in full, so I approve exactly what will be spoken. |
| Producer | When one scene is wrong, I want to re-render only that scene, so I can fix it in minutes. |
| Requester | When the video is ready, I want its path and duration and the proof it passed, so I can share it with confidence. |
| Scripts and CI | When the tool runs unattended, I want stable exit codes and JSON output, so I can chain it. |

## Commands

| Command | Does |
|---------|------|
| `motion-slides new <brief>` | Compiles a brief into a video folder (005). With `--through`, continues with voice, render, verify and deliver in one pass. |
| `motion-slides voice [<folder>]` | Voice-only pass and script sheet (002). |
| `motion-slides stills [<folder>] [<scene>-<beat>+<sec> ...]` | Layout stills and a stills contact sheet (001, 004). |
| `motion-slides render [<folder>]` | Full render, or `--scene <n>` for one scene, `--preview` for a silent preview, `--name <name>` (001). |
| `motion-slides verify [<folder>]` | The verify gate (003). |
| `motion-slides deliver [<folder>]` | Delivers verified outputs, optional copies and Artifact page. |
| `motion-slides doctor` | Checks the install and hardware profile (007). |

## User stories

### US1 (P1): Brief to delivered video in one pass

As a producer, I want one command that takes a brief all the way to a delivered video, so that no step
is skipped or run against a stale file.

- AC1.1 WHEN `new <brief> --through` runs and the brief asks for no sign-off THE SYSTEM SHALL compile,
  voice, render, verify and deliver in that order, stopping at the first failure with a non-zero exit
  and the failing step named.
- AC1.2 Given the shipped made-up example brief on a complete install, when `new <brief> --through`
  runs, then the video folder's `out/` holds the MP4, `captions.srt`, `captions.vtt` and `poster.jpg`,
  the gate passed, and no file of the product changed.
- AC1.3 THE SYSTEM SHALL let each step also run on its own (`voice`, `stills`, `render`, `verify`,
  `deliver`) on an existing video folder, defaulting to the current directory.
- AC1.4 WHEN any step runs THE SYSTEM SHALL check that its inputs are current (idea versus brief, voice
  manifest versus idea, verify report versus MP4) and refuse a step whose inputs are stale, naming the
  step to run first.

### US2 (P1): Optional script sign-off

As a script approver, I want the tool to pause for my OK only when the brief asks for it, and never
when the OK was already given, so that approval is neither skipped nor demanded twice.

- AC2.1 WHERE the brief asks for sign-off and none is recorded THE SYSTEM SHALL, during `--through`,
  stop after the voice pass, print the script sheet (002 AC7.5) and exit with a distinct "awaiting
  sign-off" exit code, without rendering in full.
- AC2.2 WHEN sign-off is given with `render --signed-off-by <name>` THE SYSTEM SHALL record the name, the
  date and the script's hash in the video folder and continue.
- AC2.3 WHERE the brief records the sign-off as already given (by whom and when) THE SYSTEM SHALL not
  pause.
- AC2.4 IF the script (any caption or spoken text) changes after sign-off THEN THE SYSTEM SHALL treat the
  sign-off as lapsed and pause again.
- AC2.5 WHERE the brief does not ask for sign-off THE SYSTEM SHALL never pause; previews and stills
  never need sign-off.

### US3 (P1): Per-scene re-render

As a producer, I want to re-render one scene, so that a fix costs minutes, not a full render.

- AC3.1 WHEN `render --scene <n>` runs after a full render THE SYSTEM SHALL capture only scene `n` and any
  scene whose frames depend on a change, reuse the other scenes' captured frames, and rebuild the MP4.
- AC3.2 Given the same inputs, the decoded frames and audio of the MP4 from a per-scene re-render SHALL be
  identical to those of a full render.
- AC3.3 THE SYSTEM SHALL log which scenes it re-captured and why (for example "scene 5: start time moved
  by 1.2 s").
- AC3.4 IF no reusable frames exist for the other scenes THEN THE SYSTEM SHALL do a full render and say
  so.

### US4 (P1): Stills and a stills contact sheet

As a producer, I want stills at chosen or default moments with a contact sheet, so that I can fix
overlaps, clipping and wrong numbers before the full render.

- AC4.1 WHEN `stills` runs with moments THE SYSTEM SHALL produce those stills (001 US7).
- AC4.2 WHEN `stills` runs without moments THE SYSTEM SHALL produce one still per scene at its last beat's
  end and one per counter landing.
- AC4.3 WHEN more than one still is produced THE SYSTEM SHALL also write a labelled contact sheet of them
  for the reviewer.

### US5 (P1): Deliver only what passed

As a requester, I want delivery to hand over exactly the verified files with checksums, so that what I
share is what was checked.

- AC5.1 IF the verify report is missing, failed, or records a different MP4 SHA-256 than the current MP4,
  or the MP4 is a preview, THEN `deliver` SHALL refuse and say which.
- AC5.2 WHEN `deliver` runs THE SYSTEM SHALL ensure the MP4, `captions.srt`, `captions.vtt` and
  `poster.jpg` are in `out/` and write a SHA-256 checksum file listing them.
- AC5.3 WHERE copy targets are given (the brief's delivery paths or `--copy-to <dir>`) THE SYSTEM SHALL
  copy the four files and the checksum file there, recompute every copy's SHA-256, and fail naming any
  mismatch.
- AC5.4 WHEN delivery succeeds THE SYSTEM SHALL print the MP4's absolute path and duration (minutes and
  seconds to 0.1 s) and a one-line message ready to send to the requester.
- AC5.5 THE SYSTEM SHALL list any manual checks still NOT VERIFIED (contact-sheet review, pronunciation
  by ear) in the delivery output.

### US6 (P2): Artifact page ready to publish

As a producer working in a Claude session, I want a self-contained page with a live scene player and the
MP4, so that the session can publish it as a private claude.ai Artifact.

- AC6.1 WHEN `deliver --artifact` runs THE SYSTEM SHALL write a page folder with one HTML page that plays
  the live scene with its narration and embeds the MP4 and poster, needing no network to play except
  pinned script libraries from a public CDN allowed by the host.
- AC6.2 THE SYSTEM SHALL not publish anything itself; it SHALL print the folder path and the files a
  Claude session should publish.
- AC6.3 IF the MP4 is larger than the host's per-file limit (15 MB for binary files when this spec was
  written) THEN THE SYSTEM SHALL build the page with the live player and poster only and say that the MP4
  was left out and why.

### US7 (P1): A well-behaved command-line tool

As a script author, I want predictable output, exit codes and help, so that I can use the tool both by
hand and unattended.

- AC7.1 THE SYSTEM SHALL lead each command's `--help` with examples, print a parseable `--version`, and
  document its exit codes (0 success, 1 failure, 2 usage error, a distinct code for awaiting sign-off).
- AC7.2 THE SYSTEM SHALL write results to stdout and progress, logs and errors to stderr, and offer
  `--json` on `voice`, `verify`, `deliver` and `doctor` with a documented, stable schema.
- AC7.3 THE SYSTEM SHALL never prompt when stdin is not a terminal, honour `NO_COLOR`, and show progress
  for any step longer than 1 s.
- AC7.4 WHEN interrupted with Ctrl-C THE SYSTEM SHALL stop child processes within 5 s, remove temporary
  files and leave previous outputs intact.

## Edge cases and failure modes

- `deliver` run twice: idempotent; the second run re-checks checksums and reports no change.
- Copy target missing, read-only or on a full disk: fail naming the target; the local `out/` stays valid.
- Copy target that is the same as `out/`: refused.
- `render --scene 0` or a scene number past the end: usage error listing the valid range.
- `new` pointed at a folder that already holds a video: refuses unless overwrite is forced (005 AC6.1).
- The brief changes between `new` and `render`: `render` refuses as stale (AC1.4).
- The voice weights are missing during `--through`: stops at the voice step with the consent command
  (002 AC2.1); a preview can still be made.
- Two `--through` runs on the same folder: the second refuses (render lock, 001 AC8.4).
- Running outside a video folder with no folder argument: usage error explaining how to pass one.

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Responsiveness | `--help`, `--version` and usage errors return in under 300 ms. | Timed test. |
| Per-scene speed (proposed budget) | Re-rendering one scene that is at most 20 percent of a 180 s video takes under 40 percent of a full render's time. | Timed run on the acceptance video. |
| Scriptability | Exit codes and `--json` schemas covered by golden tests and versioned with semver. | Golden tests. |
| Offline | No subcommand (including `doctor`) opens a network connection; only the installer (007) may download, and weights only with consent. | Run every subcommand in a network-less namespace. |
| Privacy | No telemetry. Delivery output and logs contain no secrets. | Code review; log review in 008. |

## Success metrics

- Every acceptance video in 008 goes from brief to delivered with only `motion-slides` commands.
- Zero renders held for an OK that was already given.
- Median time from brief to delivered for the made-up sample on the Linux profile is recorded and stays
  under the render budget plus 5 minutes.

## Scope

In scope:
- The seven subcommands, straight-through runs, the optional sign-off gate, stale-input checks, per-scene
  re-render, stills and their contact sheet, delivery with checksums and copies, the Artifact page folder,
  CLI conventions.

Out of scope (explicit non-goals, so nobody builds them):
- Sending notifications (email, chat, issue comments); the tool prints the message and a person or
  session sends it.
- Publishing the Artifact (a Claude session does that with its own tools).
- A graphical or web interface; a watch mode; parallel rendering of several videos as one job.
- Installing tools (007 owns installation; `doctor` only checks).

## Assumptions and dependencies

- 001 to 005 provide the steps; this feature orchestrates them and owns delivery.
- The Artifact host's limits (one page plus files, 15 MB per binary file, scripts only from approved
  CDNs with pinned versions) are as documented for claude.ai Artifacts on 2026-10-23 and are re-checked
  in design.
- The subcommand names are fixed by the user: new, voice, stills, render, verify, deliver, doctor.

## Decisions log

- Q: Command name? -> A: `motion-slides` with new, voice, stills, render, verify, deliver, doctor (the
  user's naming; replaces the issue's example `video`).
- Q: How does "straight through" work? -> A: `new <brief> --through` runs every step in one pass;
  each step also runs on its own. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: How is sign-off given? -> A: `render --signed-off-by <name>` records it against the script
  hash, or the brief records it as already given; a changed script makes it lapse. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Notifications? -> A: out of scope; deliver prints a ready-to-send message (no outward
  communication from the tool, constitution Article IX). (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Does deliver block on manual checks? -> A: no; it lists them as NOT VERIFIED. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: An MP4 too large for the Artifact host? -> A: page with the live player and poster only, and
  say so. (Accepted by the user on 2026-10-23 with the build plan.)
