---
feature: 007-install-and-hardware-profiles
title: "Install and hardware profiles"
status: draft   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 3 days   # proposed; the user sets the final appetite in grill
created: 2026-10-23
---

# Install and hardware profiles

Source of truth: research-registery issue #17 (Engine layout "Requirements", Output spec render time,
Binding constraint "Don't tune to one host", the voice install steps, origin notes on the untested host
and on model pulls) and done criterion 7.

## Problem

The pipeline has only ever run on one Mac (M-series, 16 GB), where a 3-minute video renders in about 4
to 6 minutes with capture at about 17 frames per second. The handoff assumed a Linux box "with an RTX
4000"; the real Linux box has no NVIDIA GPU at all (Intel UHD 630 only). Tools were installed by hand,
per machine, and nobody wrote down what a host needs. This box also has no passwordless sudo, so
anything installed must live in the user's space. The voice weights (about 0.4 GB) must never be pulled
without the user's explicit yes, and the user's Ollama must never be touched.

## Outcome

One idempotent, user-space installer sets up everything the product needs once per host (shared by every
video), downloads the voice weights only with an explicit consent flag, and `motion-slides doctor`
tells you in seconds whether a host is ready and which hardware profile it meets. Two profiles exist with
stated minimums and honest evidence: Mac M-series 16 GB (from the hand-run pipeline, NOT VERIFIED with
this code until run on a Mac) and Linux x86_64 CPU-only (measured on this box).

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| Producer on a new host | When I set up a machine, I want one command that installs everything without root, so I can render the same day. |
| The user (owner of the machine) | When a model download is needed, I want to be asked explicitly and told its size and licence, so nothing large is fetched without my yes. |
| Producer | When something fails, I want one check that tells me what is missing, so I can fix the host instead of debugging a render. |
| Requester | When I ask for a video, I want to know how long it will take on this host, so I can plan. |

## User stories

### US1 (P1): One shared, user-space, idempotent install

As a producer, I want one command that installs every tool in my home folder, so that any host I control
can render without root access.

- AC1.1 WHEN the installer runs THE SYSTEM SHALL install or confirm, under the user's home folder and
  without root: the product's own packages (including the animation library and the browser
  automation), a pinned headless Chrome for capture, ffmpeg and ffprobe with the H.264 and AAC encoders
  and the ebur128, loudnorm, silencedetect, volumedetect and alimiter filters, the bundled open-licence
  fonts, uv, and the voice tool pinned at `supertonic==1.3.1`.
- AC1.2 THE SYSTEM SHALL install once per host and share it across every video folder; video folders
  SHALL hold no copies of tools.
- AC1.3 WHEN the installer runs on a host where everything is already installed THE SYSTEM SHALL change
  nothing, report each item as already installed with its version, and exit 0.
- AC1.4 THE SYSTEM SHALL never call `sudo` or write outside the user's home folder, and IF a step would
  need root THEN THE SYSTEM SHALL stop and explain what is needed.
- AC1.5 THE SYSTEM SHALL install pinned versions and verify every downloaded tool archive against a
  recorded SHA-256 before using it.

### US2 (P1): Voice weights only with explicit consent

As the user, I want the voice weights downloaded only when I say yes, so that a 0.4 GB licensed model is
never fetched behind my back.

- AC2.1 WHERE the installer is run without the explicit weights-consent flag THE SYSTEM SHALL download no
  weights and report "voice weights: NOT RUN (needs your yes)" with the exact command that would
  download them.
- AC2.2 WHEN the consent flag is given THE SYSTEM SHALL first print the size (about 0.4 GB), the
  destination folder and the licence (OpenRAIL-M, with use restrictions), then download and verify the
  weights.
- AC2.3 IF a weights download is interrupted or fails verification THEN THE SYSTEM SHALL leave no
  partial weights that the voice step could load, and report how to retry.
- AC2.4 THE SYSTEM SHALL never download a speech-recognition model or any model other than the voice
  weights, and SHALL never read, change, start or stop the user's Ollama installation.

### US3 (P1): Hardware profiles with minimum specs

As a requester, I want named host profiles with minimums and expected render times, so that I know
whether a host can render and how long it will take.

- AC3.1 THE SYSTEM SHALL define the profile "Mac M-series 16 GB" (Apple silicon, 16 GB RAM, 10 GB free
  disk) with expected performance "a 3-minute video in about 4 to 6 minutes, capture about 17 fps",
  marked NOT VERIFIED with this code until it is run on a Mac.
- AC3.2 THE SYSTEM SHALL define the profile "Linux x86_64 CPU-only" (x86_64, at least 4 cores, 8 GB RAM,
  10 GB free disk, no GPU), with expected performance measured on the reference box (8 cores and 16
  threads, 31 GB RAM, integrated graphics only) and recorded with its evidence.
- AC3.3 THE SYSTEM SHALL state for each profile its minimum CPU, RAM, free disk and operating system, its
  expected capture rate and render time for a 180 s video, and whether that figure is VERIFIED or NOT
  VERIFIED.
- AC3.4 THE SYSTEM SHALL require no GPU on any profile and SHALL produce identical output whether or
  not a GPU is present.

### US4 (P1): Doctor

As a producer, I want one command that checks the host, so that I fix a missing tool before a render
fails.

- AC4.1 WHEN `motion-slides doctor` runs THE SYSTEM SHALL check every installed item against its pinned
  or minimum version and report each as VERIFIED or NOT VERIFIED with the version found.
- AC4.2 THE SYSTEM SHALL report whether the voice weights are present and complete, and IF they are not
  THEN say "NOT RUN (needs your yes)" with the consent command.
- AC4.3 THE SYSTEM SHALL report which hardware profile the host meets, and fail IF it meets none,
  naming the shortfall (for example "RAM 6 GB, minimum 8 GB").
- AC4.4 THE SYSTEM SHALL exit non-zero IF any required item is missing, and offer `--json` output.
- AC4.5 THE SYSTEM SHALL make no network requests, download nothing and change nothing while checking.

### US5 (P2): Smoke test that measures the host

As a producer, I want a short offline test render that measures this host, so that the profile's numbers
come from evidence, not guesses.

- AC5.1 WHEN `doctor --smoke` runs THE SYSTEM SHALL render a built-in, made-up 5 s silent preview end to
  end with networking disabled, without the voice weights.
- AC5.2 THE SYSTEM SHALL report the measured capture rate and render time and the projected render time
  for a 180 s video on this host.
- AC5.3 THE SYSTEM SHALL write the measurement to a local file that the profile documentation cites as
  evidence, without host names or IP addresses.

### US6 (P2): Rejected tools stay out

As the user, I want the rejected tools kept out of the product, so that no licence or quality problem
creeps back in.

- AC6.1 THE SYSTEM SHALL fail its own test suite IF any dependency manifest of the product includes
  Remotion or Manim.
- AC6.2 THE SYSTEM SHALL not require cairo or pkg-config (they were needed only for Manim).

## Edge cases and failure modes

- Node missing or older than the minimum: the installer stops and explains how to install Node in user
  space; it does not install system packages.
- An older ffmpeg on PATH without the needed filters: the installer installs the pinned build in user
  space, and doctor reports which binary is used and why.
- System Chrome present but a different version: the pinned headless Chrome is used; a system Chrome is
  never modified.
- Disk full during install: the installer stops, removes partial downloads and reports free space needed.
- Offline host: the installer fails on the first download with a clear message; doctor still works.
- Host with an NVIDIA GPU: works the same (no GPU path).
- Installer run twice at once: the second waits or refuses with a lock message.
- Weights folder present but from another model version: doctor reports incomplete (AC4.2).

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Idempotence | A second install run changes no files. | Hash the install folders before and after. |
| Least privilege | No root, no writes outside the home folder. | Run as an unprivileged user with a read-only system; review. |
| Integrity | Every downloaded archive verified by SHA-256 before use. | Test with a tampered archive. |
| Doctor speed | `doctor` without `--smoke` finishes in under 5 s. | Timed test. |
| Supply chain | All versions pinned; licences recorded in the third-party notices (008). | Review. |
| Consent | No model download without the consent flag. | Test that the default install leaves the weights folder absent. |

## Success metrics

- A fresh Linux user account goes from nothing to a passing `doctor` (minus the weights) in under 15
  minutes.
- The Linux profile's expected render time is backed by a recorded measurement (VERIFIED) by the end of
  008.
- Zero model downloads without consent.

## Scope

In scope:
- The installer, the consent flag for weights, the two hardware profiles, doctor, the smoke test, the
  rejected-dependency guard.

Out of scope (explicit non-goals, so nobody builds them):
- Installing Node itself, system packages, drivers or anything needing root.
- GPU acceleration, Windows support, containers as the primary install path.
- Remotion, Manim, cairo, pkg-config.
- Running or verifying on a Mac within this feature (the Mac profile stays NOT VERIFIED until someone
  runs it there).

## Assumptions and dependencies

- Facts verified on the reference Linux box (2026-10-21 to 23): Dell Precision 3640, Intel i7-10700K (8
  cores, 16 threads), 31 GB RAM, Intel UHD 630, no NVIDIA GPU, Ubuntu 24.04, no passwordless sudo.
  Already installed there: Node 24.15 (through nvm, linked into the user's local bin), ffmpeg and ffprobe
  8.1 static builds with libx264, aac, ebur128, loudnorm, silencedetect, volumedetect and alimiter, uv
  0.13, supertonic 1.3.1 as a uv tool, Google Chrome 156, Playwright Chromium 1217, Docker 29. The voice
  weights are NOT downloaded.
- The issue's install route for the voice is `uv tool install supertonic==1.3.1` then the tool's
  download step, which needs the user's yes.
- The animation library is GSAP 3.15.0 under GSAP's "Standard no-charge license" (not MIT); it is
  installed as a package dependency and never copied into this repository.
- Prerequisites the installer does not provide: Node 24 or newer and a POSIX shell.

## Decisions log

- Q: Does the Linux box have the "RTX 4000" the handoff assumed? -> A: No; integrated Intel graphics
  only, so every profile is CPU-only (verified on the box).
- Q: Minimum specs for the Linux profile? -> Proposed: x86_64, 4 cores, 8 GB RAM, 10 GB free disk.
  Pending /devbox:grill.
- Q: Which Chrome? -> Proposed: a pinned headless Chrome installed by the browser automation tool, so
  renders do not change when the system Chrome updates. Pending /devbox:grill.
- Q: Is Node installed by the installer? -> Proposed: no; Node 24 or newer is a stated prerequisite.
  Pending /devbox:grill.
- Q: A smoke test in doctor? -> Proposed: yes, `doctor --smoke`, a 5 s silent preview that measures the
  host. Pending /devbox:grill.
