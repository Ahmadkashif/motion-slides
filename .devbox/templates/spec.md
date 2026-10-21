---
feature: {{FEATURE_ID}}
title: {{FEATURE_TITLE}}
status: draft   # draft | approved | shipped
lane: feature   # patch | feature | product
appetite:       # how much time this is worth, e.g. "2 days", "1 week" (Shape Up)
created: {{DATE}}
---

# {{FEATURE_TITLE}}

<!--
DevBox spec. Describes WHAT and WHY, never HOW. No file paths, no code, no library names
(those belong in design.md). Write it so a stakeholder can approve it and a tester can test it.
Mark every unknown inline with a clarification marker: an opening square bracket, the words
NEEDS CLARIFICATION, a colon, the question, and a closing bracket. /devbox:grill resolves them and
`devbox approve spec` refuses while any marker remains. Delete these comments when done.
-->

## Problem

Who hurts, how, and how we know. One or two paragraphs from the user's point of view.
Include evidence (support tickets, metrics, quotes) when it exists.

## Outcome

What is true for the user when this ships. One paragraph. This is the yardstick for every later trade-off.

## Users and jobs

| Actor | Job to be done ("When ..., I want to ..., so I can ...") |
|-------|-----------------------------------------------------------|
|       |                                                           |

## User stories

Ordered by priority. P1 stories alone must be a shippable, demoable increment (the MVP slice).
Each story gets an ID so tasks, tests and commits can reference it.

### US1 (P1): <short title>

As a <actor>, I want <capability>, so that <benefit>.

Acceptance criteria (EARS or Given/When/Then; each one must be testable as written):

- AC1.1 WHEN <trigger> THE SYSTEM SHALL <response>.
- AC1.2 IF <unwanted condition> THEN THE SYSTEM SHALL <response>.
- AC1.3 Given <context>, when <action>, then <observable result>.

### US2 (P2): <short title>

As a <actor>, I want <capability>, so that <benefit>.

- AC2.1 ...

## Edge cases and failure modes

- What happens with empty, huge, malformed, duplicate or concurrent input?
- What happens when a dependency is slow, down, or returns garbage?
- What happens for a user without permission?

## Non-functional requirements

Only the ones that matter for this feature, each with a number or a named standard.

| Quality | Requirement | How we will check |
|---------|-------------|-------------------|
| Performance | e.g. p95 < 300 ms at 50 rps | load test in CI |
| Security / privacy | e.g. only owners can read; PII never logged | authz tests, log review |
| Accessibility | e.g. WCAG 2.2 AA | axe + keyboard walkthrough |
| Reliability | e.g. retries are idempotent | integration test |
| Observability | e.g. success/failure counter + trace span | dashboard check |

## Success metrics

How we will know after release that the outcome happened (leading and lagging indicators).

## Scope

In scope:
-

Out of scope (explicit non-goals, so nobody builds them):
-

## Assumptions and dependencies

-

## Decisions log

Filled in by /devbox:grill. One line per resolved question: `Q: ... -> A: ... (why)`.

-
