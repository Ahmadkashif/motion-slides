---
feature: 005-storyboard-brief-compiler
title: "Storyboard brief compiler"
status: approved   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite: 4 days   # accepted by the user on 2026-10-23
created: 2026-10-23
---

# Storyboard brief compiler

Source of truth: research-registery issue #17 (Process steps 1, 3 and 4, Intent, Binding constraint
"Templatise", Lesson learned on template injection) and done criteria 1 and 2.

## Problem

Briefs already arrive as Markdown storyboards (the storyboards for R2 and R3 came that way from another
session): per scene, the narration (one caption per line, verbatim), the on-screen actions and the exact
numbers, plus brand colours, fonts, pronunciations, a disclaimer, a length target, the audience and
delivery paths. Today a person or a Claude session reads that storyboard and hand-writes the idea file
and the scene page for each video. That step is slow, easy to get subtly wrong (a caption reworded, a
figure retyped, a dollar sign mangled by a pattern-based replace) and different every time.

## Outcome

A documented brief format and a blank template exist. Given a brief, the compiler produces the idea file
and the scene page built only from library components (004), with every caption verbatim and every
number taken from the brief's figures table. It is deterministic and free to run: the same brief always
gives byte-identical output, with no model calls and no network. Malformed briefs fail with line numbers.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
| Brief author (a person or another Claude session) | When I storyboard a video, I want a documented format and a template, so I can write a brief that compiles first time. |
| Producer | When a brief arrives, I want one step that turns it into an idea and a scene page, so I never hand-write either. |
| Reviewer | When I compare a video to its brief, I want captions and numbers carried over exactly, so I only review what the brief says. |

## What a brief must be able to express

The format (syntax decided in design) must carry, and the compiler must map into the idea contract (001):

- Header: title, kicker, subtitle, footer, audience, length target (the cap), sign-off request
  (none, required, or already given by whom and when), delivery paths, disclaimer, an optional
  disclosure override, and a flag marking a made-up sample.
- Brand: colours as hex per role, fonts (file paths or bundled open-licence font names), wordmark text,
  optional logo path.
- Pronunciations: written form and spoken respelling, per project.
- Figures table: name, value, optional formula over other figures, display format.
- Banned terms.
- Optional timing knobs (opener, lead, gap, tail, floors) overriding the defaults.
- Scenes in order, each with: a title, an optional dense flag, the narration lines (one caption per
  line, verbatim, each with an optional spoken override), and the on-screen actions (component, its
  parameters, figure references by name, and the narration line and offset each action is anchored to).

## User stories

### US1 (P1): Documented brief format and template

As a brief author, I want a written format, a blank template and a full made-up example, so that I can
write a valid brief without reading code.

- AC1.1 THE SYSTEM SHALL document the brief format: every section, its syntax, which parts are required,
  the defaults, and how each part maps to the idea contract.
- AC1.2 THE SYSTEM SHALL ship a blank template brief with every section and inline guidance, and a
  complete made-up example brief that uses every component (the gallery of 004 AC13.1).
- AC1.3 Given the shipped made-up example brief, when it is compiled, then compilation succeeds with no
  errors and the result renders and passes the gate (003).

### US2 (P1): Brief to idea and scene page

As a producer, I want one step from brief to idea file and scene page, so that I never hand-write either.

- AC2.1 WHEN a valid brief is compiled THE SYSTEM SHALL write `idea.json` and `scene.html` into the
  target video folder, composing scenes only from library components (004).
- AC2.2 THE SYSTEM SHALL turn each narration line into exactly one beat, in order, whose caption is
  byte-identical to the line after removing the list marker and surrounding whitespace.
- AC2.3 THE SYSTEM SHALL copy the brand, pronunciations, figures table, banned terms, disclaimer,
  disclosure, length target, audience, sign-off request, delivery paths and timing knobs into the
  matching idea fields, and record the brief's file name and SHA-256 in the idea.
- AC2.4 THE SYSTEM SHALL keep every caption, narration line, number and timing value in `idea.json` only,
  so that changing one of them in the idea changes the render without editing `scene.html`.
- AC2.5 WHERE the brief sets no timing knobs THE SYSTEM SHALL use opener 2.0 s, lead 0.80 s, gap 0.25 s
  (0.40 s in dense scenes) and tail 4.0 s.

### US3 (P1): Text survives exactly

As a reviewer, I want every character of the brief's text to arrive unchanged, so that "$1,000" never
turns into something else.

- AC3.1 Given a brief whose captions, titles and figure labels contain `$1,000`, `$&`, `$1`, `` $` ``,
  `$$`, `<b>`, `&amp;`, quotes, backslashes, emoji and non-Latin letters, when it is compiled, then the
  idea holds each string byte-identical to the brief.
- AC3.2 THE SYSTEM SHALL insert text into the scene page only as data (never as markup or a replacement
  pattern), so the rendered frames show the same characters literally (001 AC5.5).
- AC3.3 THE SYSTEM SHALL resolve figure references by name to the figures table, and IF a referenced
  name does not exist THEN fail naming the line and the closest existing names.

### US4 (P1): Deterministic, free and offline

As the user, I want compilation to be repeatable and cost nothing, so that the same brief always gives
the same video and nothing leaves the machine.

- AC4.1 Given the same brief and the same product version, when it is compiled twice, then `idea.json`
  and `scene.html` are byte-identical.
- AC4.2 THE SYSTEM SHALL call no language model or other model and open no network connection while
  compiling.
- AC4.3 THE SYSTEM SHALL write no timestamps, user names, host names or absolute paths into the output
  (paths relative to the video folder only), so the output does not depend on the host.

### US5 (P1): Errors with line numbers

As a brief author, I want every mistake reported with its line, so that I can fix the brief in one pass.

- AC5.1 IF the brief is malformed THEN THE SYSTEM SHALL exit non-zero listing every error found (up to
  50) with the file name, line number, what was found and what was expected, and write no output.
- AC5.2 IF an on-screen action names an unknown component or parameter THEN THE SYSTEM SHALL report the
  line and list the valid components or parameters.
- AC5.3 IF a scene has no narration lines, or an action is anchored to a narration line that does not
  exist, THEN THE SYSTEM SHALL report the line.
- AC5.4 IF a required header or brand field (title, length target, background, text and accent colours,
  fonts) is missing THEN THE SYSTEM SHALL report which.
- AC5.5 IF the figures table has an unknown name in a formula, a cycle, or a duplicate name THEN THE
  SYSTEM SHALL report the lines involved.

### US6 (P2): Safe re-compiles

As a producer, I want re-compiling to never silently throw away hand changes, so that edits are not lost.

- AC6.1 IF `idea.json` or `scene.html` in the target folder changed since the compiler last wrote it
  THEN THE SYSTEM SHALL refuse to overwrite, listing the changed files, unless overwrite is forced.
- AC6.2 WHEN a later step (voice, render, verify) finds that the brief's SHA-256 no longer matches the
  one recorded in the idea THE SYSTEM SHALL report the idea as stale relative to its brief.

### US7 (P1): Company briefs stay out of the repository

As the user, I want real briefs and their outputs kept outside the product's repository, so that company
content never becomes public.

- AC7.1 THE SYSTEM SHALL read the brief by path and write the video folder to a path given by the user,
  defaulting to a folder next to the brief.
- AC7.2 IF the target video folder is inside the product's own repository and the brief is not flagged
  as a made-up sample THEN THE SYSTEM SHALL refuse.
- AC7.3 THE SYSTEM SHALL never copy a brief, its figures or its outputs into the product's repository.

## Edge cases and failure modes

- Empty brief file, or a brief with only a header: fails listing the missing scenes.
- A narration line that is blank or only punctuation: fails (a beat must have a caption).
- Duplicate scene titles: allowed; scenes are numbered in order.
- Windows line endings, a byte-order mark, tabs: accepted.
- A brief over 1 MB or over 200 scenes: rejected as out of range.
- A font path or logo path that does not exist: fails with the line (checked at compile time).
- A colour written as `#abc` (short form) or a CSS name: rejected; full `#RRGGBB` only.
- Markdown formatting inside a narration line (`**bold**`, links): kept literally as characters,
  never rendered as formatting (captions are plain text).
- A sign-off marked as given with no name or date: fails.

## Non-functional requirements

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Determinism | Byte-identical output for identical input and product version. | Compile twice, compare hashes. |
| Performance | A 20-scene brief compiles in under 2 s on the Linux profile. | Timed test. |
| Cost | Zero model calls, zero network. | Run in a network-less namespace; code review. |
| Privacy | Output contains no host names, user names or absolute paths; refuses to write company briefs into the repo. | Golden tests; AC7.2 test. |
| Usability | Every error names the file and line. | Golden tests over a set of broken briefs. |

## Success metrics

- The three reference briefs (if supplied, see 008) and the made-up sample compile with zero hand edits
  to the generated idea or scene page.
- Brief-to-first-preview time under 2 minutes for a new brief.

## Scope

In scope:
- The brief format and its documentation, a blank template, a made-up example, the compiler, error
  reporting, re-compile safety, the in-repository guard.

Out of scope (explicit non-goals, so nobody builds them):
- Writing or rewriting narration, choosing components or inventing figures (the brief decides; the
  compiler only maps).
- Any language-model step inside the product.
- Importing other formats (Word, Google Docs, slides).
- Custom scene code beyond the component library.

## Assumptions and dependencies

- The brief is written by a person or by a Claude session outside the product; the product itself never
  calls a model (that is where the "Claude writes the scene" step of the hand-run route moves to).
- 004 defines the component names and parameters the brief can use; 001 defines the idea contract.
- Real briefs live outside the repository and are passed by path (constitution P6).

## Decisions log

- Q: Should the compiler use a model to interpret free-form storyboards? -> A: no; a deterministic
  compiler over a documented format (same brief gives the same output, free to run, testable). (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Default timing knobs when the brief sets none? -> A: opener 2.0 s, lead 0.80 s, gap 0.25 s
  (0.40 s dense), tail 4.0 s. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: What if the user edited the generated files? -> A: refuse to overwrite unless forced. (Accepted by the user on 2026-10-23 with the build plan.)
- Q: Guard against compiling company briefs into the repo? -> A: refuse unless the brief is
  flagged as a made-up sample. (Accepted by the user on 2026-10-23 with the build plan.)
