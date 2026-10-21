# Constitution

The non-negotiable engineering principles for this project. Specs, designs, plans and reviews are
checked against these articles. An exception is allowed only when it is written down in the feature's
`design.md` (Constitution check table) with a reason and a simpler alternative that was rejected.

Version 1.0.0 · Adopted 2026-10-21 · Amend by PR, bump the version, and log the change at the bottom.

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

<!-- Add articles that are true for this project only, e.g. "All money is integer minor units",
"Offline first: every screen works without network", "Public API is frozen until v2". -->

## Amendments

| Version | Date | Change | Reason |
|---------|------|--------|--------|
| 1.0.0 | 2026-10-21 | Adopted DevBox defaults | Initial |
