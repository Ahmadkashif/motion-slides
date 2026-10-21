# Requirements

Read this when writing or reviewing `specs/NNN-name/spec.md`, running `/devbox:spec` or `/devbox:grill`, or when a request is vague.

A spec says **what** and **why**. It never says how: no file paths, no library names, no code. Those belong in `design.md`. A good spec can be approved by a stakeholder and tested by someone who never saw the conversation.

## Frame the problem first

Before stories, answer: who hurts, how much, how do we know, and what is true when it is fixed.

- **Jobs to be done:** frame needs as the progress a user is trying to make. Job story: "When [situation], I want to [motivation], so I can [outcome]." Jobs outlive features.
- **Double diamond:** Discover then Define (diverge, converge on the right problem), then Develop then Deliver (diverge, converge on the right solution). Most failed features skipped the first diamond.
- **Shape Up appetite:** set how much time the problem is worth ("2 days", "1 week") instead of estimating. Time is fixed; scope flexes. Record it in the spec front matter (`appetite:`).
- **Pitch elements** worth stealing for the Problem section: the problem, the appetite, the solution sketch, **rabbit holes** (risks you have already patched), and **no-gos** (things explicitly excluded).

## Rules

- Write the Problem and Outcome sections before any user story.
- Give every story an ID (US1, US2) and a priority (P1, P2, P3). **P1 stories alone must be a shippable, demoable MVP.**
- Write stories as "As a <actor>, I want <capability>, so that <benefit>". The benefit clause is mandatory; if you cannot write it, question the story.
- Check each story against **INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable.
- Give every acceptance criterion an ID (AC1.1, AC1.2) so tasks, tests and commits can cite it.
- Write acceptance criteria in EARS or Given/When/Then. One behavior per criterion. Each must be testable exactly as written.
- List edge cases and failure modes explicitly: empty, huge, malformed, duplicate, concurrent input; slow or failing dependencies; unauthorized users.
- State non-functional requirements with a number or a named standard, plus how they will be checked.
- Write explicit non-goals in "Out of scope". Anything not in scope is out.
- Never guess. Mark every unknown inline with a clarification marker (an opening square bracket, the words NEEDS CLARIFICATION, a colon, the question, a closing bracket). `devbox approve spec` refuses while any marker remains.
- Keep success metrics separate from acceptance criteria: AC prove the feature works; metrics prove it mattered.

## EARS patterns

EARS (Easy Approach to Requirements Syntax, Mavin) keeps requirements unambiguous. Kiro uses the uppercase form; both are fine.

| Pattern | Template | Example |
|---------|----------|---------|
| Ubiquitous | THE SYSTEM SHALL <response> | THE SYSTEM SHALL store all timestamps in UTC. |
| Event-driven | WHEN <trigger> THE SYSTEM SHALL <response> | WHEN a user submits the signup form with a taken email THE SYSTEM SHALL show "Email already registered" next to the email field. |
| State-driven | WHILE <state> THE SYSTEM SHALL <response> | WHILE the device is offline THE SYSTEM SHALL queue edits locally and show a "pending sync" badge. |
| Unwanted behavior | IF <condition> THEN THE SYSTEM SHALL <response> | IF the payment provider times out after 10 s THEN THE SYSTEM SHALL mark the order "pending" and retry with the same idempotency key. |
| Optional feature | WHERE <feature is included> THE SYSTEM SHALL <response> | WHERE SSO is enabled for the workspace THE SYSTEM SHALL hide the password login form. |
| Complex | WHILE <state>, WHEN <trigger> THE SYSTEM SHALL <response> | WHILE an export is running, WHEN the user requests another export THE SYSTEM SHALL return the existing job id instead of starting a new one. |

## Given / When / Then

Use for flows with setup and observable outcomes.

```
AC2.1 Given a cart with 2 items and a valid card,
      when the user confirms checkout,
      then an order with status "confirmed" appears in their order history
      and the cart is empty.
```

- Given: the context, stated as data, not steps.
- When: exactly one action.
- Then: observable outcomes only (what a user or caller can see), never internal state.

## Non-functional requirements catalog

Pick only what matters for this feature. Every row needs a number or a standard and a check.

| Quality | Measurable example | Typical check |
|---------|--------------------|---------------|
| Latency | p95 < 300 ms, p99 < 800 ms at 50 rps | k6 load test in CI |
| Throughput | 1,000 events/s sustained for 10 min | soak test |
| Availability | 99.9% over 28 days | SLO dashboard |
| Web performance | LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at p75 | Lighthouse CI + RUM |
| Accessibility | WCAG 2.2 AA | axe in E2E + keyboard walkthrough |
| Security | ASVS 5.0 L2 for auth flows | security tests, review |
| Privacy | no PII in logs; data deleted 30 days after account closure | log review, scheduled job test |
| Reliability | retries never double-charge | idempotency integration test |
| Scalability | linear to 10x current users with horizontal scale | load test |
| Cost | under $0.002 per request | billing alert |
| Compatibility | supports last 2 major browser versions / Android API 26+ | CI matrix |
| Observability | success and failure counters plus a trace span per request | dashboard check |
| Maintainability | no module over 400 lines; public API documented | lint rule, review |

## The grill interview (/devbox:grill)

Clarifying is a separate step from writing. Its job is to drain every clarification marker and every unstated assumption.

- Read the whole spec first. List every decision that is stated, implied but unstated, and missing.
- Order questions by dependency: resolve the decision that unlocks others first.
- Ask **one question at a time**, each with a **recommended answer** and the reason. The user can accept with one word.
- If the codebase can answer it, read the code instead of asking.
- Fold each answer back into the spec immediately and log it in the Decisions log: `Q: ... -> A: ... (why)`.
- Stop when there are no markers, every story has testable criteria, and both of you could explain the feature the same way.
- Spec Kit caps a clarify session at five questions; that is a good default for small features. Larger features run several rounds.

## Requirements quality checklist ("unit tests for English")

Run this before `devbox approve spec`.

- [ ] Problem and Outcome are written from the user's point of view
- [ ] Every story has an ID, a priority and a benefit clause
- [ ] P1 stories alone are a coherent, demoable MVP
- [ ] Every acceptance criterion has an ID and is testable as written (no "fast", "easy", "intuitive", "robust")
- [ ] Each criterion describes one behavior and an observable result
- [ ] Error, empty, boundary and permission cases are covered
- [ ] NFRs have numbers or named standards, and a way to check them
- [ ] Out of scope is explicit
- [ ] No file paths, library names or code (those are design)
- [ ] No clarification markers remain
- [ ] Terms match the glossary; one word per concept
- [ ] Success metrics say how we will know it mattered after release

## Anti-patterns

- Solution-first specs: "Add a Redis cache" instead of "Search results return in under 300 ms".
- Untestable adjectives: user-friendly, fast, scalable, seamless.
- One giant story that is really an epic. Split until each story is small and independently valuable.
- Acceptance criteria that restate the story.
- Silent assumptions instead of clarification markers.
- Specs that grow during build without going back through approval. Drift goes back to `/devbox:spec`, not into code.

## Sources

- Spec Kit spec template: https://github.com/github/spec-kit
- Kiro specs and EARS: https://kiro.dev/docs/specs/
- Shape Up: https://basecamp.com/shapeup
- Double Diamond: https://www.designcouncil.org.uk/our-resources/the-double-diamond/
- INVEST: https://xp123.com/articles/invest-in-good-stories-and-smart-tasks/
- Given/When/Then: https://martinfowler.com/bliki/GivenWhenThen.html
- Gherkin reference: https://cucumber.io/docs/gherkin/reference/
- Matt Pocock skills (grill-me, to-spec): https://github.com/mattpocock/skills
