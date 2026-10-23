---
feature: 003-verify-gate
status: draft   # draft | approved   (approved = the critique gate returned GO)
created: 2026-10-23
---

# Tasks: Verify gate

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

## Slice 1: gate skeleton with format and honest report (build-plan Stage 3)

- [ ] T001 [AFK] Gate skeleton, report and exit code, format and duration checks, checksums, fail-closed inputs, `motion-slides verify` (US1: AC1.1, AC1.2, AC1.3, AC1.4; US8: AC8.1, AC8.2; US9: AC9.1, AC9.2, AC9.3, AC9.4, AC9.5; US12: AC12.1, AC12.2) after: none
      Verify: integration tests: clean fixture VERIFIED exit 0; preview MP4, over-cap, missing stem and changed copy each NOT VERIFIED with exit 1

## Slice 2: audio checks

- [ ] T002 [AFK] Loudness, true peak, mean volume, per-beat narration presence, silences, caption sync (US2: AC2.1, AC2.2, AC2.3, AC2.4; US3: AC3.1, AC3.2, AC3.3; US4: AC4.1, AC4.2, AC4.3) after: T001
      Verify: planted defects fail (2.5 s silence, early cue, hot mix, peak, muted beat); clean fixture passes; median lead reported

## Slice 3: text and figures

- [ ] T003 [AFK] Caption fades per frame, banned terms (private by position only), arithmetic file, disclosure (US5: AC5.1, AC5.2, AC5.3; US6: AC6.1, AC6.2, AC6.3, AC6.4; US7: AC7.1, AC7.2, AC7.3, AC7.4, AC7.5; US11: AC11.1) after: T002
      Verify: planted overlap, banned word, private term (text absent from all output), wrong total and missing disclosure each fail; arithmetic.txt written

## Slice 4: contact sheet

- [ ] T004 [AFK] Contact sheet from the final MP4 with labels and manual verdict recording (US10: AC10.1, AC10.2, AC10.3, AC10.4, AC10.5) after: T001
      Verify: 12 to 19 labelled frames per sheet from a fixture MP4; `verify --record frames --by <name>` ties the verdict to the MP4 SHA-256

## Ship

- [ ] T005 [HITL] User reviews the contact sheet of the sample and merges the PR after: T004
      Verify: PR approved by Ahmadkashif and merged by the user
