---
feature: 003-verify-gate
title: "Verify gate"
status: approved   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 1 week   # accepted by the user on 2026-10-23
created: 2026-10-23
---

# Verify gate

Source of truth: research-registery issue #17 (Process steps 6 and 7, Verification bar, `caption-qa`
and `verify-final` in the Engine layout, Binding constraint "Honest reporting") and done criterion 4.

## Problem

R1, R2 and R3 were all VERIFIED objectively, but by hand: someone ran a stream probe, a loudness scan, a
silence scan, a frame-by-frame caption check and a sync check, read the numbers, grepped for banned
words, re-did the arithmetic in a text file and looked at a dozen frames. Each step is easy to skip or
misread, and a check that only prints a warning is a check that gets ignored. The requester needs to
trust that every delivered video meets the bar without re-checking it themselves.

## Outcome

One gate runs every automated check from the verification bar on any rendered video folder, prints each
check as VERIFIED or NOT VERIFIED with its evidence, exits non-zero if any automated check fails, and
produces a contact sheet of key frames from the final MP4 for a human. Delivery (006) refuses any file
the gate has not passed.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| Producer | When a render finishes, I want one command that checks everything, so I can fix problems before anyone sees them. |
| Reviewer | When I review a video, I want the evidence for each check and a contact sheet, so I can sign off in minutes. |
| Requester | When I receive a video, I want to know it met the bar, so I can share it without re-checking. |
| Scripts and CI | When the gate runs unattended, I want an exit code and a JSON report, so a failure stops the pipeline. |

## User stories

### US1 (P1): Format and duration

As a requester, I want the container, streams and length checked against the output spec and the cap,
so that the file plays everywhere and fits its slot.

- AC1.1 THE SYSTEM SHALL confirm the file is MP4 with exactly one H.264 High video stream at 1920x1080,
  square pixels, constant 30 fps, and exactly one AAC-LC audio stream at 48 kHz with 2 channels, and
  fail naming each property that differs.
- AC1.2 THE SYSTEM SHALL fail IF the duration exceeds the idea's `timing.cap` or is zero, reporting the
  duration and the cap.
- AC1.3 THE SYSTEM SHALL fail IF the audio and video stream durations differ by more than one frame
  (33.4 ms).
- AC1.4 THE SYSTEM SHALL fail IF the MP4 is marked as a preview (001 AC2.4), stating that previews are
  never deliverable.

### US2 (P1): Loudness, peak and narration presence

As a requester, I want the loudness on target, no clipping and narration actually present, so that the
video sounds right on every device.

- AC2.1 THE SYSTEM SHALL measure integrated loudness of the final MP4 (ITU-R BS.1770 / EBU R 128) and fail
  IF it is more than 0.5 LU from `audio.target_lufs` (-16 LUFS).
- AC2.2 THE SYSTEM SHALL measure true peak of the final MP4 and fail IF it is above `audio.true_peak_db`
  (-1.5 dBTP).
- AC2.3 THE SYSTEM SHALL fail IF the final MP4's mean volume is below -35 dBFS (narration missing).
- AC2.4 THE SYSTEM SHALL fail IF, for any beat, the final audio's level during that beat's clip is less
  than 10 dB above the pad-only level measured in the end hold (that beat has no audible narration).

### US3 (P1): No long silences

As a viewer, I want no dead air, so that the video never seems stuck.

- AC3.1 THE SYSTEM SHALL scan the narration stem for silence at -50 dBFS and fail IF any silence is longer
  than 2.0 s, except the opener (before the first beat) and the end hold (after the last beat).
- AC3.2 THE SYSTEM SHALL report every silence over 1.0 s with its start time and the scene and beat
  around it, whether or not it fails.
- AC3.3 THE SYSTEM SHALL confirm the narration stem's length matches the MP4's audio length within one
  frame, so the stem it scans is the one that was mixed.

### US4 (P1): Caption sync

As a viewer, I want each caption to appear just before its words are spoken, so that reading and
listening line up.

- AC4.1 THE SYSTEM SHALL measure each beat's speech onset from the narration stem (first audio above
  -50 dBFS after the beat's start) independently of the voice manifest.
- AC4.2 THE SYSTEM SHALL fail IF any caption cue starts after its speech onset, or more than 0.10 s
  before it, and SHALL report the median lead (expected about 0.024 s).
- AC4.3 THE SYSTEM SHALL fail IF the cues in `captions.srt` and `captions.vtt` differ from
  `schedule.json` in count, order, text or timing (more than 1 ms).

### US5 (P1): Caption overlap and fades on every frame

As a viewer, I want never to see two captions at once or a half-faded caption hanging around, so that
the captions read cleanly.

- AC5.1 THE SYSTEM SHALL check every frame of the video (each 1/30 s from start to end) and fail IF any
  frame shows more than one caption with non-zero opacity, naming the frame time and the beats.
- AC5.2 THE SYSTEM SHALL fail IF any caption is partly transparent for longer than its fade (0.18 s in,
  0.12 s out) plus one frame.
- AC5.3 THE SYSTEM SHALL fail IF the number of frames it checked differs from the MP4's frame count.

### US6 (P1): Banned terms

As the user, I want no banned word anywhere in a delivered video's text, so that nothing private or
off-brand slips out.

- AC6.1 THE SYSTEM SHALL search, case-insensitively and as whole words or phrases, every caption, every
  spoken text, every text on the stage at every beat, the title fields, `captions.srt`, `captions.vtt`,
  the MP4 metadata and the output file names, and fail on any match.
- AC6.2 THE SYSTEM SHALL use the idea's `banned_terms` list and, WHERE a private list file is passed by
  path, that list as well.
- AC6.3 WHEN a term from a private list matches THE SYSTEM SHALL report its list position and location
  but SHALL never print the term itself.
- AC6.4 IF a private list path is given but the file is missing or empty THEN THE SYSTEM SHALL fail
  rather than skip the check.

### US7 (P1): Arithmetic against the figures table

As a requester, I want every number on screen to match the brief's figures, so that the video never
states a wrong figure.

- AC7.1 THE SYSTEM SHALL re-derive every figure in the idea's figures table that has a formula, from the
  other figures, and write one line per figure to `verify/arithmetic.txt` (name, formula, computed value,
  stated value, OK or MISMATCH).
- AC7.2 THE SYSTEM SHALL fail IF a computed value differs from its stated value after rounding to the
  figure's displayed precision.
- AC7.3 THE SYSTEM SHALL fail IF any value shown on screen that refers to a figure (counter end values,
  panel values, chip amounts, figures in captions) differs from that figure's formatted value.
- AC7.4 THE SYSTEM SHALL fail IF a caption contains a currency amount or percentage that equals no
  figure in the table (an unsourced figure).
- AC7.5 WHERE the brief's path is known THE SYSTEM SHALL fail IF the idea's figures table differs from
  the brief's.

### US8 (P1): Checksums on every copy

As a requester, I want any copy of the video to be provably the same file, so that what I share is what
was verified.

- AC8.1 THE SYSTEM SHALL record the SHA-256 of the MP4, `captions.srt`, `captions.vtt` and `poster.jpg`
  in the report.
- AC8.2 WHEN copies exist (for example a delivery copy, 006) THE SYSTEM SHALL recompute each copy's
  SHA-256 and fail on any mismatch, naming the copy.

### US9 (P1): Honest report and exit code

As a script or reviewer, I want each check reported as VERIFIED or NOT VERIFIED with its evidence and a
failing exit code on any failure, so that nothing passes on a warning.

- AC9.1 THE SYSTEM SHALL report every check as VERIFIED or NOT VERIFIED with the measured values, the
  threshold and the command or method used, in human-readable form and as JSON under `verify/`.
- AC9.2 THE SYSTEM SHALL exit 0 only when every automated check is VERIFIED, and non-zero otherwise; it
  SHALL have no warn-only mode.
- AC9.3 THE SYSTEM SHALL list the manual checks (contact-sheet review, pronunciation by ear) separately
  as NOT VERIFIED until a human records a verdict, without changing the exit code.
- AC9.4 THE SYSTEM SHALL record in the report the SHA-256 of the exact MP4 it checked, so delivery can
  prove it delivers the verified file.
- AC9.5 THE SYSTEM SHALL run every check fresh on each invocation (no cached passes).

### US10 (P1): Contact sheet from the final MP4

As a reviewer, I want 12 to 19 key frames from the final file in one sheet, so that I can see every
scene, every counter landing and the end result at a glance.

- AC10.1 THE SYSTEM SHALL extract frames from the final MP4 (never from the stage) at: one settled moment
  per scene (the end of its last beat), each counter's landing (one frame after it lands) and the last
  frame of the video.
- AC10.2 WHEN the required moments are fewer than 12 THE SYSTEM SHALL add evenly spaced frames to reach
  12.
- AC10.3 WHEN the required moments exceed 19 THE SYSTEM SHALL keep every required moment and split them
  over numbered sheets of at most 19 frames.
- AC10.4 THE SYSTEM SHALL label each frame with its time, scene and beat, and write the sheet and the
  individual frames under `verify/`.
- AC10.5 WHEN a reviewer records that they viewed the sheet THE SYSTEM SHALL report "Frames: VERIFIED
  (human)" with name and date tied to the MP4's SHA-256.

### US11 (P2): Disclosure present

As the user, I want the AI-narration disclosure checked on every video, so that no narrated video goes
out without it.

- AC11.1 THE SYSTEM SHALL fail IF the disclosure text is missing from the close card's on-screen text,
  the MP4 metadata comment or the .vtt NOTE block.

### US12 (P2): Any rendered folder, missing inputs fail closed

As a producer, I want to verify any rendered video folder, including one rendered elsewhere, so that the
gate does not depend on the session that rendered it.

- AC12.1 THE SYSTEM SHALL verify a video folder using only that folder's idea, outputs and stems plus the
  installed tools.
- AC12.2 IF an input a check needs is missing (for example the narration stem) THEN THE SYSTEM SHALL mark
  that check NOT VERIFIED, name the missing input and exit non-zero.

## Edge cases and failure modes

- Truncated or corrupt MP4: format check fails with the probe's error; other checks are NOT VERIFIED.
- Variable frame rate, extra subtitle or data streams: format check fails.
- Duration exactly equal to the cap: passes.
- Figures with rounding (displayed "$1.2M" from 1,234,567): compared at displayed precision; the
  display format comes from the figures table.
- Negative values, ranges and percentages with decimals in the figures table: supported; a formula that
  divides by zero fails the arithmetic check.
- A banned term inside a longer word (a term "lan" inside "plan"): not a match (whole words only).
- A banned term split by a line break or extra spaces in the stage text: matched (whitespace is
  normalised before matching).
- Private list file outside the repo with Windows line endings or a trailing blank line: handled.
- A video with one scene and no counters: 12 frames from 2 required moments plus evenly spaced fill.
- Very long video (over 10 minutes): the frame check still covers every frame; the report states the
  run time.

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Performance (proposed budget) | The gate finishes a 180 s video in under 5 minutes on the Linux CPU-only profile. | Timed run on the acceptance videos. |
| Honesty | No warn-only path exists; every check yields VERIFIED or NOT VERIFIED and any automated failure exits non-zero. | Golden tests with one failing fixture per check. |
| Machine-readable output | The JSON report schema is documented and stable; changes follow semver. | Golden test on the JSON. |
| Privacy | Private banned terms never appear in any report, log or console output. | Test with a private list containing a known match. |
| Offline | No network access during verification. | Run in a network-less namespace. |

## Success metrics

- Every video delivered by the product has a passing report tied to its SHA-256 (100 percent).
- Each check has a fixture that makes it fail, and each fixture is caught (one per check).
- Reviewer time per video (contact sheet plus listening pack) stays under 10 minutes.

## Scope

In scope:
- All automated checks in the verification bar, the arithmetic file, the contact sheet, checksums on
  copies, the disclosure check, the report and exit codes, recording human verdicts for the manual checks.

Out of scope (explicit non-goals, so nobody builds them):
- Judging pronunciation automatically or with speech recognition (002 produces the listening pack).
- Judging aesthetics, brand fit or layout taste (the contact sheet is for a human; layout checks are 004).
- Fixing anything; the gate only reports.
- Optical character recognition of frames.

## Assumptions and dependencies

- The verification bar from the issue is the threshold list: format, audio, silence over 2 s, caption
  sync about 0.024 s, fades on all frames, 12 to 19 frames from the final MP4, arithmetic, banned terms,
  checksums, pronunciation.
- 001 provides `schedule.json`, the stage for the frame-by-frame caption check and preview marking; 002
  provides the narration stem and the .srt and .vtt; 005 copies the brief's figures table and banned
  terms into the idea.
- Design notes: ffprobe, ffmpeg's ebur128, volumedetect and silencedetect filters cover the measurements
  (all present in ffmpeg 8.1 on this box).

## Decisions log

- Q: Loudness tolerance? -> A: within 0.5 LU of -16 LUFS. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Where is silence measured, given the pad means the mix is never silent? -> A: on the
  narration stem at -50 dBFS, with a check that the stem matches the mixed audio length. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Caption sync tolerance? -> A: fail if a cue starts after the speech onset or more than
  0.10 s before it; report the median lead. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: How is "narration present" decided? -> A: mean volume at least -35 dBFS overall and every
  beat at least 10 dB above the pad-only level. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: What counts as an arithmetic failure? -> A: formula mismatch at displayed precision, an
  on-screen figure that differs from its table value, or an unsourced currency or percentage in a
  caption. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: What if more than 19 frames are required? -> A: keep all required moments over several
  numbered sheets. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Do manual checks fail the gate? -> A: no; they are listed as NOT VERIFIED until a human
  records a verdict, so the gate stays automatable. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Private banned terms in reports? -> A: never printed; reported by list position only. (Accepted by the user on 2026-10-23 with the build plan.)
