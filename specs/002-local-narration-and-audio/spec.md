---
feature: 002-local-narration-and-audio
title: "Local narration and audio"
status: draft   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 1 week   # proposed; the user sets the final appetite in grill
created: 2026-10-23
---

# Local narration and audio

Source of truth: research-registery issue #17 (Process step 5, Engine layout `voice`, `audio`, the
voice tools, Output spec loudness, Verification bar "Audio" and "Pronunciation", Binding constraints,
Lessons learned on peak margin, pronunciations, seeds and numbers) and done criterion 3.

## Problem

Narration is what turns an animation into an explainer, and it is where the rules are strictest. The
voice must be local (no cloud or API speech of any kind, not even free tiers, no voice cloning), the
licensed voice is fixed (Supertonic 3, male voice M3, 32 steps, speed 0.75, seed 1234), and macOS `say`
voices are licensed for personal, non-commercial use only. In the hand-run pipeline, renders without a
seed came out different every time, a limiter set at the peak ceiling still overshot after encoding
(-1.5 dB became -1.3 dB), and acronyms needed hand-made respellings. Synthesis is also the slowest
repeatable step, so re-voicing unchanged lines wastes time.

The voice weights (about 0.4 GB) are not on this machine yet and must not be downloaded without the
user's explicit yes. The voice library downloads weights on first use by default, so an innocent first
run would break that rule.

## Outcome

Every beat is voiced locally by M3 with the binding settings, the same input always gives the same
samples, unchanged lines are never re-synthesised, acronyms are spoken correctly through a per-project
pronunciation map while captions keep the real spelling, and the final mix sits at -16 LUFS integrated
with true peak at or below -1.5 dBTP. A voice-only pass reports problems before any frame is rendered,
and a listening pack lets a human confirm pronunciations without any speech-recognition model.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| Producer | When the script is ready, I want every line voiced and measured in one pass, so I can see timing and pronunciation problems before rendering. |
| Producer | When I change one line, I want only that line re-voiced, so I can iterate in seconds. |
| Reviewer | When a respelling is used, I want to hear it next to the right and wrong readings, so I can confirm the pronunciation by ear. |
| Requester | When I watch the video, I want clear narration at a consistent loudness that matches the captions, so I can follow it on any device. |
| The user (owner of the machine) | When anything needs model weights, I want to be asked first, so nothing large is downloaded behind my back. |

## User stories

### US1 (P1): Only the binding local voice

As the user, I want the voice settings locked to the binding values, so that no video ever goes out
with a different, cloud or unlicensed voice.

- AC1.1 IF `voice.engine` is anything other than `supertonic` THEN THE SYSTEM SHALL reject the idea,
  and for `say` the message SHALL state that macOS voices are licensed for personal, non-commercial
  use only.
- AC1.2 IF any of `model`, `voice`, `steps`, `speed`, `seed` or `mode` differs from `supertonic-3`, `M3`,
  `32`, `0.75`, `1234`, `batch` THEN THE SYSTEM SHALL reject the idea naming the field, its value, the
  binding value and constitution article P1.
- AC1.3 IF `voice.supertonic.lang` is not `en` THEN THE SYSTEM SHALL reject the idea.
- AC1.4 THE SYSTEM SHALL synthesise narration with no network connection available and SHALL open no
  network connection while doing so.
- AC1.5 THE SYSTEM SHALL offer no input that accepts reference audio, a speaker sample or any other
  voice-cloning source.

### US2 (P1): Never download weights, never touch Ollama, use the installed tool

As the user, I want model downloads to happen only after my explicit yes, so that nothing large or
licensed is fetched without consent.

- AC2.1 IF the voice weights are missing or incomplete THEN THE SYSTEM SHALL stop before synthesising
  any line, download nothing, exit non-zero with the message "voice weights missing" and print the
  exact consent-gated install command (feature 007).
- AC2.2 THE SYSTEM SHALL never download model weights during the voice pass, render, verify or deliver;
  only the installer may, and only with the consent flag (007).
- AC2.3 THE SYSTEM SHALL never read, write, start, stop or call the user's Ollama installation or its
  network port.
- AC2.4 WHERE `voice.supertonic.python` is set THE SYSTEM SHALL run the voice tool with that interpreter,
  and otherwise with the one recorded by the installer (007); IF that interpreter is missing or cannot
  load the voice tool THEN THE SYSTEM SHALL fail naming the path and pointing to `doctor`.

### US3 (P1): Repeatable per-line synthesis

As a producer, I want every line synthesised the same way every time, so that renders are
sample-identical and re-runs are trustworthy.

- AC3.1 WHEN the voice pass runs THE SYSTEM SHALL load the voice model once per run and synthesise
  every uncached beat in that one process.
- AC3.2 THE SYSTEM SHALL reset the voice's random source to seed 1234 immediately before each line, so a
  line's audio does not depend on its position or on which other lines were cached.
- AC3.3 THE SYSTEM SHALL trim each clip's leading and trailing audio below `trim.threshold_db` (-50 dBFS),
  keeping `trim.keep_start` (0.02 s) before the first sound and `trim.keep_end` (0.06 s) after the last.
- AC3.4 THE SYSTEM SHALL resample every clip to 48 kHz.
- AC3.5 Given the same spoken text and settings on the same host with the same tool versions, when a
  line is synthesised twice with the cache cleared in between, then the two clips are sample-identical.

### US4 (P1): Hash-cached clips

As a producer, I want unchanged lines never re-synthesised, so that iterating on one line takes seconds.

- AC4.1 THE SYSTEM SHALL key each cached clip by a hash of the final spoken text and every setting that
  affects the audio (engine and its version, model, voice, language, steps, speed, seed, trim settings,
  sample rate).
- AC4.2 WHEN the voice pass runs with no changes THE SYSTEM SHALL synthesise zero lines and report
  "0 synthesised, N cached".
- AC4.3 WHEN one beat's spoken text changes THE SYSTEM SHALL synthesise only that beat.
- AC4.4 IF a cached clip is unreadable or fails its content check THEN THE SYSTEM SHALL discard it,
  synthesise it again and log that it did.

### US5 (P1): Pronunciations without changing captions

As a reviewer, I want acronyms and names spoken correctly while the caption keeps the real spelling, so
that viewers both hear and read the right thing.

- AC5.1 THE SYSTEM SHALL apply the pronunciation map to each beat's spoken text as whole-word,
  case-sensitive replacements, longest key first (so "OpenID Connect" wins over shorter keys), and
  SHALL leave the caption unchanged.
- AC5.2 WHERE a beat sets `speak_supertonic` THE SYSTEM SHALL speak it verbatim; otherwise WHERE it sets
  `speak` THE SYSTEM SHALL speak that verbatim; otherwise it SHALL speak the caption after the map and
  number rules.
- AC5.3 THE SYSTEM SHALL ship a public default map with exactly these entries: IdP -> "I D P",
  OpenID Connect -> "Open ID Connect", SAML -> "Sammel", Okta -> "Octa", ROI -> "R O I". Entries in the
  idea's map override default entries with the same key.
- AC5.4 WHERE a private pronunciation map file is passed by path THE SYSTEM SHALL merge it over the
  idea's map, and SHALL never copy its contents into the repository or into any published output other
  than the audio itself.

### US6 (P1): Numbers spoken as words, figures shown exactly

As a viewer, I want numbers read naturally while the screen shows the exact figure, so that the
narration sounds human and the captions stay precise.

- AC6.1 WHEN a beat without a spoken override has a caption containing integers, decimals, thousands
  separators, currency amounts or percentages THE SYSTEM SHALL speak them as English words (for example
  "$1,000" as "one thousand dollars", "12.5%" as "twelve point five percent") and keep the caption's
  figure unchanged.
- AC6.2 IF a numeric token cannot be converted unambiguously (for example "1/2", "3-5", "v3.1", "Q4")
  THEN THE SYSTEM SHALL fail the voice pass naming the beat and token and asking for a spoken override.
- AC6.3 IF the final spoken text of any beat still contains a digit or one of the symbols `$ % & # @ / +`
  THEN THE SYSTEM SHALL fail the voice pass naming the beat.

### US7 (P1): Voice-only pass and manifest

As a producer, I want to voice and measure every line before rendering, so that I can fix timing and
pronunciation first.

- AC7.1 WHEN the voice-only pass runs THE SYSTEM SHALL synthesise or reuse every beat's clip, render no
  frames, and write `build/voice-manifest.json` listing per beat: caption, final spoken text, settings
  hash, clip file, clip length, speech onset and end offsets within the clip, and the totals.
- AC7.2 THE SYSTEM SHALL report the estimated video length (clips plus timing knobs) against the cap.
- AC7.3 THE SYSTEM SHALL list for review every all-caps token of two or more letters that has no map
  entry, and every clip whose speech rate is outside 130 to 180 words per minute.
- AC7.4 IF a clip contains no sound above the trim threshold or is shorter than 0.3 s THEN THE SYSTEM
  SHALL fail the pass naming the beat.
- AC7.5 THE SYSTEM SHALL print a script sheet (every beat's caption and spoken text side by side, with
  clip lengths) in human-readable form and as JSON.

### US8 (P2): Pronunciation listening pack, no speech recognition

As a reviewer, I want each respelling next to right and wrong reference readings by the same voice, so
that I can confirm pronunciations by ear without any extra model.

- AC8.1 WHEN a pronunciation check is requested THE SYSTEM SHALL produce, for every map entry used in the
  video and every beat with a spoken override, three M3 clips: the beat's clip in context, the right
  reference (the respelling alone) and the wrong reference (the written form read as-is).
- AC8.2 THE SYSTEM SHALL write a listening page and a JSON report that pair the three clips per item and
  hold a verdict field per item, and SHALL make no automatic judgement.
- AC8.3 WHILE any item has no recorded verdict THE SYSTEM SHALL report "Pronunciation: NOT VERIFIED".
- AC8.4 WHEN a reviewer records verdicts for every item THE SYSTEM SHALL report "Pronunciation: VERIFIED
  (human)" with the reviewer's name and date, tied to the clip hashes, and IF a clip later changes THEN
  that item's verdict SHALL lapse.
- AC8.5 THE SYSTEM SHALL use no speech-recognition model and no model other than the voice for this
  check.

### US9 (P1): Mix to the loudness target with peak margin

As a requester, I want the narration placed on time over a quiet pad at a standard loudness, so that the
video sounds consistent and never clips.

- AC9.1 THE SYSTEM SHALL place each clip in the narration stem at its scheduled start (from the schedule
  in 001), accurate to one sample at 48 kHz, with the same signal on both stereo channels.
- AC9.2 THE SYSTEM SHALL generate a quiet synth pad (no third-party samples) spanning the whole video and
  mix it at a linear gain of `audio.pad_volume` (0.05).
- AC9.3 THE SYSTEM SHALL normalise the mix to `audio.target_lufs` (-16 LUFS integrated, ITU-R BS.1770 /
  EBU R 128), and the final MP4's measured integrated loudness SHALL be within 0.5 LU of the target.
- AC9.4 THE SYSTEM SHALL limit true peak at `audio.true_peak_db` minus 1.0 dB (-2.5 dBTP), so the final
  encoded MP4 measures at or below -1.5 dBTP.
- AC9.5 IF the encoded audio misses AC9.3 or AC9.4 THEN THE SYSTEM SHALL fail the render with the
  measured values.

### US10 (P1): Caption files from the schedule

As a viewer, I want sidecar caption files that match the burned-in captions, so that players and
editors can use them.

- AC10.1 THE SYSTEM SHALL write `out/captions.srt` and `out/captions.vtt` with one cue per beat, in
  order, whose text is the beat's caption (real spelling).
- AC10.2 THE SYSTEM SHALL give each cue the beat's start and its narration clip's end from
  `schedule.json`, to the millisecond.
- AC10.3 THE SYSTEM SHALL escape caption text per each format so `<`, `&` and `-->` display literally.
- AC10.4 THE SYSTEM SHALL put the disclosure text in a NOTE block at the top of the .vtt file.

### US11 (P1): Sample-identical audio end to end

As a reviewer, I want the same inputs to give the same audio, so that a re-render never silently changes
what was approved.

- AC11.1 Given the same idea, the same host and the same tool versions, when the video is rendered twice
  from an empty cache, then the decoded audio streams of the two MP4s are sample-identical.

## Edge cases and failure modes

- The voice process crashes mid-batch: clips finished before the crash stay cached; a re-run synthesises
  only the rest.
- Two voice passes on the same video folder at once: the second refuses (shared lock with 001).
- A map key that is a substring of another word ("ROI" inside "ROIL"): not replaced (whole words only).
- A map that maps a word to itself, or two keys that overlap: allowed; longest key wins, applied once
  (no recursive replacement).
- A very long line (clip over 20 s): allowed but listed for review, since one caption is one line.
- Disk full while writing the cache: fail, partial clip removed, earlier clips intact.
- Weights present but from a different model version: treated as incomplete (AC2.1).
- Pad generation must not add audible energy in the silence check band: the silence check in 003 runs on
  the narration stem, not the mix.

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Determinism | Sample-identical clips and decoded MP4 audio for identical inputs on one host. | AC3.5 and AC11.1 tests. |
| Loudness | Integrated -16 LUFS within 0.5 LU; true peak at or below -1.5 dBTP after encoding. | EBU R 128 measurement of the final MP4. |
| Speech rate | Speed 0.75 gives about 151 to 159 words per minute; lines outside 130 to 180 are listed. | Voice-pass report. |
| Performance (proposed budget) | Voicing a 180 s script from an empty cache takes under 5 minutes on the Linux CPU-only profile; a fully cached pass under 5 s. | Timed runs logged in progress.md once the weights are approved. |
| Offline | Zero network connections during voice and mix. | Run in a network-less namespace. |
| Privacy | Private pronunciation maps and company text never enter the repository or logs that are published. | 008 history scan plus log review. |
| Licensing | Supertonic code is MIT and its weights OpenRAIL-M with use restrictions; weights are never committed or redistributed. | 008 licence review. |

## Success metrics

- Zero cloud or API speech calls, ever (no such code path exists).
- Re-voicing after a one-line change takes under 10 s on the Linux profile.
- No pronunciation complaints from the requester on the acceptance videos once human verdicts are in.

## Scope

In scope:
- Binding voice settings, weights handling, per-line synthesis with seeding, trim, resample, cache,
  pronunciation map and overrides, numbers spoken as words, voice-only pass and manifest, listening pack,
  narration stem, pad, mix, loudness and peak, .srt and .vtt, determinism.

Out of scope (explicit non-goals, so nobody builds them):
- macOS `say` and every other voice engine; cloud or API speech of any kind, including free tiers
  (ElevenLabs, OpenAI, Azure, edge-tts, Hugging Face Spaces).
- Voice cloning, custom voices, speaker adaptation.
- Speech recognition of any kind (it would need a model download).
- Music beds other than the generated pad; sound effects.
- Languages other than English.

## Assumptions and dependencies

- Binding: Supertonic 3, voice M3, steps 32, speed 0.75, seed 1234, running on CPU through ONNX. The tool
  is installed as `supertonic==1.3.1` (installed on this box as a uv tool); the weights are about
  0.4 GB and are NOT downloaded yet. Design notes: the library's loader downloads weights by default and
  its command-line tool downloads on first run, so the design must load with auto-download turned off;
  the voice's randomness comes from the numerical library's global generator, so seeding that generator
  with 1234 before each line is what makes clips repeatable. The upstream Python repository is archived,
  so the pinned version is final.
- Voices available are M1 to M5 and F1 to F5; only M3 is allowed.
- The schedule (start times) comes from 001; 002 supplies 001 with clip lengths through the manifest.
- ffmpeg 8.1 on this box has the filters needed for measurement and limiting (ebur128, loudnorm,
  silencedetect, volumedetect, alimiter).

## Decisions log

- Q: Which voice and settings? -> A: Supertonic 3, M3, steps 32, speed 0.75, seed 1234, batch mode
  (binding constraint from the user).
- Q: Can the idea change the voice settings? -> Proposed: no; the fields exist for clarity but must
  hold the binding values, and changing them needs a constitution amendment (P1). Pending /devbox:grill.
- Q: How is the pronunciation check done? -> Proposed: an A/B listening pack for a human, with no
  automatic judgement (an acoustic-distance score was considered and deferred; any recogniser would
  need a model download). Pending /devbox:grill.
- Q: Are numbers converted automatically? -> Proposed: yes, deterministic number-to-words for plain
  numbers, currency and percentages when a beat has no override; anything ambiguous fails and asks for
  an override. Pending /devbox:grill.
- Q: Do manual checks block delivery? -> Proposed: no; they report NOT VERIFIED until a human records a
  verdict, and deliver prints them (see 006). Pending /devbox:grill.
- Q: Where do company pronunciations live? -> A: in private per-project map files outside the
  repository, passed by path (user's privacy rule).
- Q: Loudness tolerance? -> Proposed: 0.5 LU around -16 LUFS. Pending /devbox:grill.
