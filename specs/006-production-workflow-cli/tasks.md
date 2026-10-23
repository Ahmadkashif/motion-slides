---
feature: 006-production-workflow-cli
status: draft   # draft | approved   (approved = the critique gate returned GO)
created: 2026-10-23
---

# Tasks: Production workflow CLI

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

## Slice 1: straight through to a delivered video (build-plan Stage 6)

- [ ] T001 [AFK] Subcommands wired, `new <brief> --through`, freshness checks, CLI conventions and exit codes (US1: AC1.1, AC1.3, AC1.4; US7: AC7.1, AC7.2, AC7.3, AC7.4) after: none
      Verify: golden help and --json tests; exit-code table test; freshness tests
- [ ] T002 [AFK] Optional sign-off gate with lapse on script change (US2: AC2.1, AC2.2, AC2.3, AC2.4, AC2.5) after: T001
      Verify: sign-off tests (exit 10, --signed-off-by continues, changed caption lapses)
- [ ] T003 [AFK] Deliver: verified-only, SHA256SUMS, atomic copies with re-hash, path, duration and message, manual checks listed (US5: AC5.1, AC5.2, AC5.3, AC5.4, AC5.5) after: T001
      Verify: deliver tests (unverified refused, tampered MP4 refused, copy mismatch named, idempotent second run)
- [ ] T004 [AFK] Stills with default moments and a stills contact sheet (US4: AC4.1, AC4.2, AC4.3) after: T001
      Verify: `motion-slides stills` on the sample writes one still per scene and per counter landing plus a labelled sheet
- [ ] T005 [AFK] End-to-end: made-up sample brief through to a VERIFIED, delivered MP4 with no product file changed (US1: AC1.2) after: T002, T003, T004
      Verify: `npm run test:e2e` passes on this box; the delivered MP4, report and contact sheet are shown to the user

## Slice 2: after the PoC

- [ ] T006 [AFK] Per-scene re-render reusing captured frames (US3: AC3.1, AC3.2, AC3.3, AC3.4) after: T005
      Verify: decoded frames and audio identical to a full render; log names re-captured scenes
- [ ] T007 [AFK] Artifact page folder (US6: AC6.1, AC6.2, AC6.3) after: T005
      Verify: page folder written; MP4 left out with a message when over 15 MB

## Ship

- [ ] T008 [HITL] User watches the delivered sample and merges the PR after: T005
      Verify: PR approved by Ahmadkashif and merged by the user
