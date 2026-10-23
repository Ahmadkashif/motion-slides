---
feature: 002-local-narration-and-audio
status: draft   # draft | approved   (approved = the critique gate returned GO)
created: 2026-10-23
---

# Tasks: Local narration and audio

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

## Slice 1: spoken text and binding settings (build-plan Stage 2)

- [ ] T001 [AFK] Binding voice settings in idea validation, spoken text (overrides, pronunciation maps, numbers to words, leftover check) (US1: AC1.1, AC1.2, AC1.3, AC1.5; US5: AC5.1, AC5.2, AC5.3, AC5.4; US6: AC6.1, AC6.2, AC6.3) after: none
      Verify: `npx vitest run test/unit/voice` table-driven tests pass; settings rejections name field, value, binding value and P1

## Slice 2: voice pass

- [ ] T002 [HITL] Voice weights installed with the user's consent via `scripts/install.sh --with-voice-weights` (US2: AC2.1, AC2.2) after: T001
      Verify: weights present in ~/.cache/supertonic3 at the pinned revision; a run without them exits 3 with "voice weights missing" and the install command
- [ ] T003 [AFK] Voice pass: Python batch helper (offline, seeded per line), trim, resample, hash cache with repair, manifest, review lists, script sheet, `motion-slides voice` (US1: AC1.4; US2: AC2.3, AC2.4; US3: AC3.1, AC3.2, AC3.3, AC3.4, AC3.5; US4: AC4.1, AC4.2, AC4.3, AC4.4; US7: AC7.1, AC7.2, AC7.3, AC7.4, AC7.5) after: T002
      Verify: `npm run test:voice` (sample-identical repeat, "0 synthesised, N cached", one changed line = one synthesis); unit tests for trim and cache key

## Slice 3: mix and captions

- [ ] T004 [AFK] Narration stem, pad, loudness and peak, caption files, wired into the narrated render with 001 T010 (US9: AC9.1, AC9.2, AC9.3, AC9.4, AC9.5; US10: AC10.1, AC10.2, AC10.3, AC10.4; US11: AC11.1) after: T003
      Verify: integration test with tone-burst clips: one-sample placement, -16 ±0.5 LUFS and true peak <= -1.5 dBTP measured on the encoded MP4, sample-identical audio across two renders; SRT/VTT golden files

## Slice 4: listening pack (after the PoC)

- [ ] T005 [AFK] Pronunciation listening pack with human verdicts (US8: AC8.1, AC8.2, AC8.3, AC8.4, AC8.5) after: T003
      Verify: listening page and JSON written; report says NOT VERIFIED until every verdict is recorded

## Ship

- [ ] T006 [HITL] User listens to the sample narration and merges the PR after: T004
      Verify: PR approved by Ahmadkashif and merged by the user
