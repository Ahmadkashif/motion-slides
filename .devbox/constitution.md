# Constitution

The non-negotiable engineering principles for this project. Specs, designs, plans and reviews are
checked against these articles. An exception is allowed only when it is written down in the feature's
`design.md` (Constitution check table) with a reason and a simpler alternative that was rejected.

Version 1.1.0 · Adopted 2026-10-21 · Amended 2026-10-23 · Amend by PR, bump the version, and log the change at the bottom.

## Article I. Specification before code

No feature work starts without an approved `spec.md` that says what and why, with testable acceptance
criteria and explicit non-goals. Patch-lane work is exempt but must start from a reproduction.

## Article II. Test first

No production code without a failing test that demands it. Red, green, refactor, one behavior at a time.
Tests exercise public interfaces and real code paths; mocks only at system boundaries. Spikes are allowed
when labelled as spikes and thrown away before real work begins.

## Article III. Small vertical slices

Work is cut into thin end-to-end slices that each deliver something verifiable. Changes stay small enough
to review in one sitting and are integrated into main at least daily. Long-lived branches are a smell.

## Article IV. Simplicity

Build only what the current spec needs (YAGNI). Prefer deep modules with small interfaces. Wait for the
third duplicate before abstracting. Every new dependency, layer, service or pattern must earn its place in
`design.md`. A simple system that works comes before a complex one (Gall's law).

## Article V. Evidence over assertion

"Done" means verified: the verify gates pass, every cited acceptance criterion has evidence (test output,
screenshot, log, URL) recorded in `progress.md`. No claim of success without the command that proves it.

## Article VI. Secure by default

Least privilege everywhere. Validate input at every trust boundary, encode output, fail closed. Secrets live
in a secret manager or environment, never in code, logs or prompts. Threat-model anything that touches auth,
money, personal data or untrusted input.

## Article VII. Observable and operable

Anything that runs in production emits structured logs, metrics and traces, has an owner, and has a way to
roll back in minutes. Config lives in the environment. Migrations are backward compatible.

## Article VIII. Decisions are recorded

Significant or hard-to-reverse decisions get an ADR in `docs/adr/` with the options considered. Accepted ADRs
are never edited, only superseded.

## Article IX. Humans own the irreversible

Agents may propose but never perform, without explicit human approval: merging to a protected branch,
deploying to production, deleting or migrating real data, spending money, rotating shared credentials, or
communicating outside the team.

## Article X. Leave it better

Every change leaves code, tests and docs at least as healthy as it found them. Lessons learned go into
`AGENTS.md` so the next session does not repeat the mistake.

## Project-specific articles

These come from the binding constraints in research-registery issue #17 and the user's privacy rules.

### P1. Local voice only

Narration uses Supertonic 3, voice M3, steps 32, speed 0.75, seed 1234, synthesised on the machine that
renders. No cloud or API speech of any kind, not even free tiers (ElevenLabs, OpenAI, Azure, edge-tts,
Hugging Face Spaces). No voice cloning. Never macOS `say` for anything shared: its voices are licensed
for personal, non-commercial use only. Every video carries an "AI narration" disclosure.

### P2. No model pulls without the user's yes

The Supertonic weights, any speech-recognition model and any other model are downloaded only after the
user's explicit yes, and only by the installer behind a consent flag. Product code never downloads
weights. Never read, change, start or stop the user's Ollama.

### P3. The brief is the source of truth

Each video's idea file holds every caption, narration line, number and timing knob. A new video never
needs engine code edits. Nothing is tuned to one host.

### P4. Cut pauses, never content

Over the length cap, shrink pauses and holds only. Never drop content and never change the voice speed.

### P5. Brand-true and flat

Use the brief's colours and fonts. Show logos only when supplied, otherwise text wordmarks. Flat,
stylised SVG, never photoreal. Figures are gender-neutral unless the brief says otherwise.

### P6. Company content never enters the repository

Only made-up samples are committed. Real briefs, figures, private pronunciation maps, private banned-term
lists and outputs live outside the repository and are passed by path. In anything committed, the three
reference videos are named only R1, R2 and R3. The repository is public, so this holds for every push.

### P7. Honest reporting

Every check reports VERIFIED or NOT VERIFIED with its evidence. The gate fails the build; it never only
warns. Where a step waits on the user, build everything around it, mark that step NOT RUN, and give the
exact commands that finish it.

## Amendments

| Version | Date | Change | Reason |
|---------|------|--------|--------|
| 1.0.0 | 2026-10-21 | Adopted DevBox defaults | Initial |
| 1.1.0 | 2026-10-23 | Added project articles P1 to P7 | Binding constraints of research-registery issue #17 and the user's privacy rules |
