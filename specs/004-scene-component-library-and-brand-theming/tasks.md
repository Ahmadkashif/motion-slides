---
feature: 004-scene-component-library-and-brand-theming
status: draft   # draft | approved   (approved = the critique gate returned GO)
created: 2026-10-23
---

# Tasks: Scene component library and brand theming

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

## Slice 1: theme, registry and the cards the sample needs (build-plan Stage 4)

- [ ] T001 [AFK] Theme validation with WCAG contrast, bundled Inter font, component registry with limits and docs generation, title and close cards with disclaimer and disclosure, cards (US1: AC1.1, AC1.2, AC1.3, AC1.4; US2: AC2.1, AC2.2, AC2.3, AC2.4, AC2.5; US3: AC3.1, AC3.2, AC3.3, AC3.4; US9: AC9.1, AC9.2) after: none
      Verify: unit tests for theme and registry; integration render of a made-up idea shows title card for the opener, disclosure >= 3 s on the close card; two renders pixel-identical

## Slice 2: numbers on screen

- [ ] T002 [AFK] Running counter, calculator panel (static and before/after), flying chips with placement rules; also verifies 001 US3 AC3.2 (a counter cue starts on the nearest frame) (US4: AC4.1, AC4.2, AC4.3, AC4.4, AC4.5; US5: AC5.1, AC5.2, AC5.3, AC5.4; US6: AC6.1, AC6.2, AC6.3, AC6.4) after: T001
      Verify: integration tests read stage-text.jsonl and element boxes: counter monotonic and exact at landing, chip boxes obey AC6 at start, flight and landing, panel differences signed and correct

## Slice 3: people, flow, density and layout check

- [ ] T003 [AFK] Neutral flat figure (3 poses), flow diagram, dense-scene rule, layout check (overflow, off-stage, overlaps, glyphs, palette), themed caption plate (US7: AC7.1, AC7.2, AC7.3; US8: AC8.2, AC8.4; US10: AC10.1, AC10.2, AC10.3; US11: AC11.1, AC11.2, AC11.3, AC11.4, AC11.5; US12: AC12.1, AC12.2) after: T002
      Verify: planted overlap, overflow, missing glyph and off-palette ideas fail naming elements; dense rule logged

## Slice 4: after the PoC

- [ ] T004 [AFK] Funnel and sequence diagrams and the made-up component gallery (US8: AC8.1, AC8.3; US13: AC13.1, AC13.2) after: T003
      Verify: gallery idea renders and passes the gate

## Ship

- [ ] T005 [HITL] User reviews stills of the sample and merges the PR after: T003
      Verify: PR approved by Ahmadkashif and merged by the user
