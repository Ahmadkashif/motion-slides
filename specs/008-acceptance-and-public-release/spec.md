---
feature: 008-acceptance-and-public-release
title: "Acceptance and public release"
status: draft   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 1 week   # proposed; the user sets the final appetite in grill
created: 2026-10-23
---

# Acceptance and public release

Source of truth: research-registery issue #17 (origin notes on source transfer and company content, done
criterion 8, and the Registry commitment "Working PoC, published publicly", which overrides anything
that conflicts with it).

## Problem

The registry item is not done until a working proof of concept runs end to end, is proven with captured
evidence, and is published as a public repository with a README, the evidence and a licence. Two pulls
work against each other: acceptance means reproducing R1, R2 and R3 (the three reference videos described
in the registry issue), but those are company content that must never become public; and the
repository (Ahmadkashif/motion-slides) has been public since 2026-10-21, when it was created with the
DevBox scaffold, so every push is already public. Some steps also wait on the user (the voice weights
download, listening by ear, a Mac to run on), and the commitment says to build everything around such a
step, mark it NOT RUN, and give the exact commands to finish it.

## Outcome

The three reference videos are reproduced from their briefs and pass the gate, locally only, with nothing
of them committed. One fresh, made-up brief goes end to end and is the only video that goes public. The
repository has a README that states what was VERIFIED and what was NOT RUN (with commands), the evidence,
an MIT licence and third-party notices, and it passes secret, private-term and host-identity scans over
its full history before every push. The research facility's findings link the public repository and the
verified commit, and issue #17 gets a closing comment once the user approves it.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| The user | When the product is finished, I want proof that it reproduces the three videos we shipped, so I can trust it with the next one. |
| Public visitor | When I find the repository, I want to see what it does, run it, and see honest evidence, so I can judge it in minutes. |
| The user | When anything is pushed, I want no company content, secrets or host details in it, so publishing is safe. |
| Research registry | When the item closes, I want findings that link the public repo and the verified commit, so the record is complete. |

## User stories

### US1 (P1): Reproduce R1, R2 and R3 locally

As the user, I want the three reference videos rebuilt from their briefs and passing the gate, so that
the product is proven on real work.

[NEEDS CLARIFICATION: The briefs for R1, R2 and R3 are not on this machine, and the user says there is no source on the Mac to transfer. Will the three briefs be supplied (and from where), or does reproducing R1 to R3 leave acceptance, so that done criterion 8 rests on the made-up sample alone?]

- AC1.1 Given the R1 brief (8 scenes, about 112 s), when it goes through `new --through`, then the gate
  passes every automated check.
- AC1.2 Given the R2 brief (10 scenes, 176.9 s, with a running dollar counter and a static calculator
  panel), when it goes through `new --through`, then the gate passes every automated check.
- AC1.3 Given the R3 brief (103 s, with a before/after calculator), when it goes through `new --through`,
  then the gate passes every automated check.
- AC1.4 THE SYSTEM SHALL reproduce each video with zero changes to product code and zero hand edits to
  the generated idea or scene page, and record each reproduction's duration next to the original's.
- AC1.5 THE SYSTEM SHALL keep the reference briefs, figures, outputs, private pronunciation maps and
  private banned-term lists outside the repository, and record in the repository only the line "R<n>:
  gate VERIFIED on <date> at commit <sha>" with no content from the video.

### US2 (P1): One made-up video, end to end, in public

As a public visitor, I want one complete sample made from a fictional brief, so that I can see what the
product does without any company content.

- AC2.1 Given a fresh brief with a made-up organisation, brand, people and figures, flagged as a made-up
  sample, when it goes through `new --through` on the Linux profile, then the gate passes every
  automated check.
- AC2.2 THE SYSTEM SHALL use in the sample at least the running counter, a flying chip, a calculator
  panel (before/after), a gender-neutral figure, a flow diagram, cards, the title and close cards, the
  disclaimer and the AI-narration disclosure.
- AC2.3 THE SYSTEM SHALL publish the sample's brief, MP4, `captions.srt`, `captions.vtt`, poster,
  contact sheet, verify report and render log as evidence, with the MP4 committed if it is at most 25 MB
  and otherwise attached to a release that the user approves.
- AC2.4 WHERE the voice weights have not been approved by the user THE SYSTEM SHALL publish the silent
  preview as interim evidence, mark narration, mix, loudness, sync and pronunciation as NOT RUN, and give
  the exact commands that finish them.
- AC2.5 WHERE a manual check (contact-sheet review, pronunciation by ear) has no recorded human verdict
  THE SYSTEM SHALL report it as NOT VERIFIED in the README.

### US3 (P1): README, evidence and licences

As a public visitor, I want to know what the product is, how to run it and exactly what was verified, so
that I can trust the claims.

- AC3.1 THE SYSTEM SHALL include a README that says what the product is, how to install and run it with
  exact commands, the hardware profiles, and a table of every acceptance item marked VERIFIED, NOT
  VERIFIED or NOT RUN, each linked to its evidence file or followed by the exact command that finishes it.
- AC3.2 THE SYSTEM SHALL include an MIT `LICENSE` for the product's own code.
- AC3.3 THE SYSTEM SHALL include third-party notices for every dependency and asset with its licence,
  including GSAP under its "Standard no-charge license" (not MIT, installed as a package, never copied
  into the repository) and Supertonic (MIT code; OpenRAIL-M weights with use restrictions, never
  redistributed here).
- AC3.4 THE SYSTEM SHALL commit no model weights, browser binaries or ffmpeg binaries.
- AC3.5 THE SYSTEM SHALL state in the README that every video carries an "AI narration" disclosure and
  that no cloud speech, voice cloning or macOS voices are used.

### US4 (P1): Publish-safety scans before every push

As the user, I want every push scanned for secrets, private terms and host details across the full
history, so that nothing unsafe reaches the public repository.

- AC4.1 THE SYSTEM SHALL scan the working tree and every commit in the history for secrets and tokens and
  block the push on any finding.
- AC4.2 THE SYSTEM SHALL scan every file in every commit, every commit message and every branch and tag
  name against the private banned-terms list (passed by path from outside the repository) and block the
  push on any match, reporting matches by list position only.
- AC4.3 THE SYSTEM SHALL scan the same scope for this box's host name, its IP addresses and the absolute
  path of the user's home folder, and block the push on any match.
- AC4.4 THE SYSTEM SHALL run these scans before every push to the public repository (it is already
  public), not only at release.
- AC4.5 IF a scan finds something already pushed THEN THE SYSTEM SHALL stop and ask the user, because
  rewriting published history needs their explicit approval.

### US5 (P1): Release and registry closure, owned by the user

As the user, I want to approve the release and every outward message, so that nothing is announced
without my OK.

- AC5.1 WHEN acceptance evidence is complete THE SYSTEM SHALL prepare the release (README, evidence,
  notices, a version tag proposal) and wait for the user's approval before pushing the tag or creating a
  release.
- AC5.2 WHEN the user approves THE SYSTEM SHALL write `findings.md` in the research facility's
  `research/motion-slides/` folder linking the public repository URL and the verified commit SHA, with
  the VERIFIED and NOT RUN lists.
- AC5.3 THE SYSTEM SHALL draft the closing comment for issue #17 (repository URL, verified commit,
  VERIFIED and NOT RUN summary) and post it only after the user approves the text.
- AC5.4 THE SYSTEM SHALL mention R1, R2 and R3 in every public text only by those labels, with no
  company, product, people or figures from them.

### US6 (P2): Profiles backed by evidence

As a requester, I want the hardware profiles to show measured numbers where they exist, so that render
time estimates are honest.

- AC6.1 THE SYSTEM SHALL record the Linux profile's measured capture rate and render time from the
  acceptance renders as VERIFIED, with the evidence file.
- AC6.2 THE SYSTEM SHALL keep the Mac profile marked NOT VERIFIED with this code, with the exact commands
  to verify it on a Mac.

### US7 (P1): Clean provenance

As the user, I want every published file written for this project or made up for it, so that no code
from a private repository becomes public.

- AC7.1 THE SYSTEM SHALL contain no file copied from a private repository; IF the hand-run pipeline's
  source ever arrives, it SHALL be used as a reference only, and any file taken from it SHALL be listed
  in the pre-release provenance review with the user's explicit approval recorded in progress.md.

## Edge cases and failure modes

- The reference briefs never arrive: see the clarification above; acceptance then rests on the sample
  and the README says so.
- The user does not approve the weights download before release: the release ships with the preview as
  interim evidence and narration-related items NOT RUN (AC2.4).
- A reproduction fails the gate because the original video broke a rule the gate enforces (for example
  a silence over 2 s): the brief is corrected outside the repository and the change is noted locally;
  the gate is never weakened.
- The sample MP4 is over 25 MB: attached to a user-approved release instead of committed (AC2.3).
- A scan false positive (a banned term that is also a common word): the user decides; the list is
  edited outside the repository, never the scan.
- A private term is found in an already-pushed commit: stop and ask (AC4.5).

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Privacy | Zero private terms, host names, IP addresses or home-folder paths in the full public history. | AC4.2 and AC4.3 scans, output attached to progress.md. |
| Security | Zero secrets or tokens in the full public history. | AC4.1 scan. |
| Honesty | Every README claim links evidence or is marked NOT VERIFIED or NOT RUN with a command. | Review against the evidence folder. |
| Reproducibility | A visitor following the README on a matching Linux host reproduces the sample's gate pass. | Fresh-user run recorded in progress.md. |
| Licensing | Every third-party item listed with its licence; nothing vendored against its licence. | Review of notices against the dependency list. |

## Success metrics

- Done means: `findings.md` links the public repository URL and the verified commit (registry
  commitment).
- The gate passes on the made-up sample at the tagged commit, and on R1 to R3 if their briefs arrive.
- Zero privacy findings in any public commit, ever.

## Scope

In scope:
- Local reproduction of R1 to R3 (subject to the clarification), the made-up sample end to end, the
  README, evidence, licence and notices, the pre-push scans, the release proposal, `findings.md` and the
  draft closing comment.

Out of scope (explicit non-goals, so nobody builds them):
- Publishing anything from R1, R2 or R3 (briefs, figures, frames, audio, durations beyond the line in
  AC1.5).
- Making the repository public (it already is) or changing its visibility.
- Posting outward messages or creating releases without the user's approval.
- Running on a Mac (the Mac profile stays NOT VERIFIED until someone does).

## Assumptions and dependencies

- Features 001 to 007 are shipped before this one starts.
- The repository Ahmadkashif/motion-slides was created public on 2026-10-21 with only the DevBox
  scaffold; later commits are the user's to push after review.
- The private banned-terms list and private pronunciation maps live outside the repository and are
  passed by path.
- The registry commitment's original command (`gh repo create ... --public`) has already been
  satisfied by that creation.

## Decisions log

- Q: Which video goes public? -> A: only the fresh made-up sample (origin note and registry commitment).
- Q: Is the repository created? -> A: yes, public since 2026-10-21; scans therefore run before every push,
  not only at release.
- Q: Product and repository name? -> A: `motion-slides`, Ahmadkashif/motion-slides (user's naming).
- Q: How are the reference videos named in public? -> A: R1, R2, R3 only (user's privacy rule).
- Q: Where does a large sample MP4 go? -> Proposed: committed if at most 25 MB, otherwise a
  user-approved release asset. Pending /devbox:grill.
- Q: What if the weights are never approved? -> Proposed: ship with the preview as interim evidence and
  narration items NOT RUN, with commands (registry commitment). Pending /devbox:grill.
