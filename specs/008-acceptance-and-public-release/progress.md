# Progress: Acceptance and public release

Append-only log for `008-acceptance-and-public-release`. Newest entries at the bottom. Every agent session that
touches this feature adds an entry before it ends. This file is how a fresh session (or a human)
picks up where the last one stopped, so write for a reader with zero context.

Entry format:

```
## YYYY-MM-DD HH:MM  <phase>  <task id or gate>
Did: what changed, in one to three lines.
Evidence: commands run and their result (tests, verify, screenshots, URLs).
Decisions: anything decided that is not already in spec.md or an ADR.
Next: the single next step.
```

## 2026-10-23  specify  created

Did: feature scaffolded with `devbox feature`.
Next: write spec.md (/devbox:spec).

## 2026-10-23 15:43  specify  spec drafted

Did: wrote spec.md from research-registery issue #17 and the user's feature breakdown (relayed by session
devbox-e6): 7 stories (6 P1), 27 acceptance criteria, edge cases, NFRs, scope, assumptions.
Evidence: specs only, no code. Every issue requirement is mapped to an AC in docs/architecture.md section 12
(cross-checked by script: all AC IDs exist). Clarification markers in this spec: 1.
Decisions: 2 open choices logged as "Proposed" in the Decisions log, pending grill. Not committed;
the user reviews with git diff and commits.
Next: /devbox:grill (resolve the clarification on the R1 to R3 briefs, then the proposed decisions).

## 2026-10-23 22:30  critique  design and tasks (Stage 0 and Stage 1)

Did: devbox:linus reviewed the 001 design and tasks and the 008 publish-scan design (Slice 1) in four passes.
Passes 1 to 3 returned THROW AWAY; every finding was fixed in the docs. Pass 4 returned GO with one fail-closed
MAJOR (the bundled font tripping a short-term rule) and minors, all folded in before approval.
Evidence: verdicts held in the session; key fixes are in design.md (no build step, header CSP, exact-match file
map, FontFace weight range, immediateRender false, BT.709 tags, frame count, run folder; scan fails closed,
user-owned baseline and allowed binaries, hook in the git common dir, pushed ids scanned, --text mode).
Decisions: two 001 spec amendments (lead and gap at least 0.12 s; previews under out/preview/) decided under the
build plan's delegation, flagged for the user at the PR. 008 approval covers Slice 1 (publish scan) only;
the release slice is designed in Stage 8.
Next: build 001 T001, then 008 T001, then the Stage 0 gate (001 T013).
