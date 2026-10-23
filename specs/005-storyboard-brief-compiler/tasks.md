---
feature: 005-storyboard-brief-compiler
status: draft   # draft | approved   (approved = the critique gate returned GO)
created: 2026-10-23
---

# Tasks: Storyboard brief compiler

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

## Slice 1: brief to idea (build-plan Stage 5)

- [ ] T001 [AFK] Brief parser and compiler to idea.json and the fixed scene.html shell, verbatim text, figure references, line-numbered errors, determinism, `motion-slides new <brief>` compile step (US2: AC2.1, AC2.2, AC2.3, AC2.4, AC2.5; US3: AC3.1, AC3.2, AC3.3; US4: AC4.1, AC4.2, AC4.3; US5: AC5.1, AC5.2, AC5.3, AC5.4, AC5.5) after: none
      Verify: golden compile, broken-brief table, tricky-text set, compile-twice hash equality

## Slice 2: format docs, template, sample, guards

- [ ] T002 [AFK] Brief format doc, blank template, the made-up sample brief, safe re-compile and repository guard (US1: AC1.1, AC1.2, AC1.3; US6: AC6.1, AC6.2; US7: AC7.1, AC7.2, AC7.3) after: T001
      Verify: sample compiles with zero errors and renders a preview; edited idea.json blocks re-compile without --force; non-sample brief into the repo refused

## Ship

- [ ] T003 [HITL] User reads the sample brief and merges the PR after: T002
      Verify: PR approved by Ahmadkashif and merged by the user
