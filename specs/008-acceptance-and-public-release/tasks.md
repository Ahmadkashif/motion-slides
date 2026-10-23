---
feature: 008-acceptance-and-public-release
status: approved   # draft | approved   (approved = the critique gate returned GO)
created: 2026-10-23
---

# Tasks: Acceptance and public release

<!--
Task line format (parsed by `devbox`, keep it exact; TNNN is a three digit id such as T001):

  - [ ] TNNN [AFK|HITL] Short imperative title (US1: AC1.1, AC1.2) after: <ids or none>
        Verify: <the command or observable check that proves this task is done>

  e.g. - [ ] T003 [AFK] Reject expired tokens at the API edge (US2: AC2.1) after: T001

  [ ] open   [x] done   [!] blocked (write the reason in progress.md)
  [AFK]  an agent can finish and merge it with no human input
  [HITL] needs a human (a decision, credentials, a design review, a manual test)
  after: the task IDs this one depends on

Rules:
- Each task is a vertical slice: a thin, complete path through every layer it touches
  (schema, logic, interface, tests), demoable or verifiable on its own. Never "all the models", then
  "all the endpoints".
- Each task fits one focused agent session and one reviewable commit or small PR.
- Every acceptance criterion in spec.md maps to at least one task.
- Order by dependency, then by priority (P1 stories first), so the first tasks form the MVP.
- The first task is a walking skeleton when the feature or project is new: the thinnest end-to-end
  path, runnable, with CI green.
- The last task before shipping is usually HITL: a human reviews docs, release notes and rollout.
-->

## Slice 1: publish-safety scan from the first commit (build-plan Stage 0)

- [x] T001 [AFK] Publish-safety scan over the working tree and every object in history (secrets, private terms, host identity, opaque binaries), labels instead of values, keyed fingerprints, fail closed, in-history stop-and-ask with a user-owned baseline and user-owned allowed binaries, pushed commit ids scanned, `--text` mode and the AGENTS.md rule for text posted to GitHub, hook installed executable in the git common dir by `prepare` and checked byte for byte, CI secrets-only mode before `npm ci` on a full clone (US4: AC4.1, AC4.2, AC4.3, AC4.4, AC4.5) after: 001 T001
      Verify: `npm test -- test/integration/publish-scan` passes every case in design.md, with planted values built at run time and absent from all output; after `npm ci`, `git config core.hooksPath` is the absolute hooks folder in the git common dir and `test -x` passes on its `pre-push`; `node scripts/publish-scan.mjs` exits 0 on this repository's full history with the real private list (only the summary line goes in progress.md); CI runs `node scripts/publish-scan.mjs --ci` before `npm ci` with `fetch-depth: 0`; AGENTS.md carries the `--text` rule, the summary-only evidence rule, and lists changes to `scripts/publish-scan*`, `scripts/install-hooks.mjs` and `.githooks/` as ask-first

## Slice 2: release (build-plan Stage 8, after the PoC)

<!-- README, LICENSE, notices, sample evidence, release proposal, findings, closing comment: sliced in Stage 8 -->
