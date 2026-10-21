# Testing

Read this before writing any code (`/devbox:tdd`, `/devbox:build`), when planning a testing strategy in `design.md`, or when a test suite feels slow, flaky or useless.

Tests are the backpressure that keeps agents honest. A good test suite lets you change the code freely and tells you, fast and specifically, when behavior broke.

## Canon TDD

Kent Beck's own description:

1. Write a **list** of test scenarios for the behavior you need.
2. Turn **exactly one** scenario into a concrete, runnable test.
3. Make it pass, and keep all earlier tests passing. Add newly discovered scenarios to the list.
4. Optionally refactor, with tests green.
5. Repeat until the list is empty.

Red, green, refactor:

- **RED:** write one test for one behavior. Run it. Watch it fail for the right reason. A test that passes immediately proves nothing.
- **GREEN:** write the minimum code that makes it pass. No speculative features.
- **REFACTOR:** remove duplication, deepen modules, rename. Run tests after each step. Never refactor while red.

## Vertical tracer bullets, not horizontal slices

```
WRONG (horizontal):  RED: test1 test2 test3 test4   GREEN: impl1 impl2 impl3 impl4
RIGHT (vertical):    test1 -> impl1, test2 -> impl2, test3 -> impl3, ...
```

Writing all tests first tests imagined behavior and the shape of data, not real behavior. Each cycle should respond to what the previous one taught you. The first test is a tracer bullet: it proves the path works end to end.

## Rules

- No production code without a failing test that demands it (Constitution Article II). Spikes are labelled, kept out of main, and thrown away.
- Test behavior through **public interfaces**. A test should survive any refactor that keeps behavior the same.
- **Mock only at system boundaries:** network, third-party APIs, clock, randomness, sometimes the filesystem. Never mock your own modules or internal collaborators. Prefer a real test database (Testcontainers) over mocking the data layer.
- Expected values come from an **independent source of truth** (the spec, a hand calculation, an oracle). Never copy the value the code computed into the assertion.
- One logical behavior per test. Name tests after the behavior: "rejects expired tokens", not "testValidate2".
- Every bug fix starts with a test that reproduces the bug and fails. Then fix. The test stays forever.
- Never delete, skip, or weaken a test to get green. If a test is wrong, fix it in its own commit with a reason.
- Keep tests hermetic: inject clocks, seeds and network. No sleeps; wait on conditions.
- Run the full verify suite (`devbox verify`) before claiming done, and paste the output as evidence.

## Pyramid or trophy: choose by confidence per cost

| Model | Shape | Fits |
|-------|-------|------|
| Test pyramid | many unit, fewer integration, very few E2E | libraries, algorithms, domain-heavy cores |
| Testing trophy | static analysis, some unit, **mostly integration**, few E2E | web apps and services where bugs hide in the wiring |

"The more your tests resemble the way your software is used, the more confidence they can give you." Spend effort where a test buys the most confidence for its run time and maintenance cost. Static checks (types, lint) are the cheapest tests of all.

## What good tests look like (Test Desiderata)

Isolated, composable, deterministic, fast, writable, readable, behavioral, structure-insensitive, automated, specific, predictive, inspiring. When two properties conflict (fast vs predictive), decide consciously.

### Good and bad, side by side

```typescript
// BAD: tests implementation, mocks our own collaborator, breaks on refactor
test("checkout calls paymentService.process", async () => {
  const process = vi.spyOn(paymentService, "process");
  await checkout(cart, card);
  expect(process).toHaveBeenCalledWith(cart.total);
});

// GOOD: tests observable behavior through the public interface,
// fakes only the external payment provider at the boundary
test("checkout with a valid card confirms the order and empties the cart", async () => {
  const provider = fakePaymentProvider({ outcome: "approved" });
  const shop = createShop({ paymentProvider: provider });
  const cart = shop.cart().add(product({ priceCents: 1250 }), 2);

  const order = await shop.checkout(cart, testCard);

  expect(order.status).toBe("confirmed");
  expect(order.totalCents).toBe(2500); // from the spec, not from the code
  expect(shop.cart().items()).toHaveLength(0);
});
```

Red flags: asserting call counts or order, testing private methods, verifying through a side channel (querying the database directly instead of reading back through the API), test names that describe how instead of what.

## Beyond example tests

- **Property-based testing** (Hypothesis, fast-check, proptest): state invariants such as round trips (`decode(encode(x)) == x`), idempotence, ordering, or agreement with a simple oracle. Let the framework shrink failures; commit failing seeds as regression tests. Best for parsers, serializers, money math, state machines.
- **Contract testing:** consumer-driven contracts (Pact) between services, verified in the provider's CI, gating deploys with `can-i-deploy`. For schema-first APIs, run breaking-change checks: `oasdiff` for OpenAPI, `buf breaking` for protobuf.
- **Mutation testing** (Stryker, PIT, cargo-mutants, mutmut): measures whether tests actually detect changes. Track mutation score on changed code; kill surviving mutants with real assertions. Coverage alone lies.
- **Fuzzing:** for anything that parses untrusted input. Go native fuzzing, cargo-fuzz, Atheris, Jazzer.
- **Snapshot and golden tests:** for CLI output, rendered HTML, generated code. Review snapshot diffs like code; never bulk-accept.
- **End-to-end:** Playwright for web, XCUITest and Compose UI tests for mobile. Cover the P1 journeys only. Run like a user would (click, type, read the screen).

## Flaky tests

- A flaky test is a failing test. Quarantine it the same day (skip with an issue link and an owner), fix within a week, or delete it and replace it with something deterministic.
- Common causes: real time, shared state between tests, ordering assumptions, network, async without awaiting conditions, random data without a seed.
- Never retry a flaky test into green in CI without tracking it.

## Test data

- Build data with small factories that set only the fields the test cares about.
- No shared mutable fixtures across tests. Each test arranges what it needs.
- Never use production personal data in tests. Generate realistic synthetic data.
- Keep test data close to the test that uses it.

## Evidence before claims

A task is done when the evidence exists, not when the code is written:

1. Identify the command that proves it (`devbox verify`, the task's `Verify:` line, a Playwright run).
2. Run it fresh.
3. Read the output and the exit code.
4. Only then say it works, and paste the evidence into `progress.md`.

"Should work now" is banned. A subagent's "done" is a claim to verify, not evidence.

## Checklist (per TDD cycle)

- [ ] The test describes one behavior, named in domain language
- [ ] I watched it fail, for the expected reason
- [ ] It uses the public interface only
- [ ] It would survive an internal refactor
- [ ] Mocks exist only at system boundaries
- [ ] The expected value came from the spec or an independent calculation
- [ ] The code is the minimum that passes
- [ ] All tests are green before refactoring

## Anti-patterns

- Horizontal slicing (all tests first, then all code).
- Mocking everything, so tests pass while production fails.
- Tautological tests that recompute the answer the same way the code does.
- Assertion-free tests written for coverage.
- Tests that need a specific execution order.
- Deleting or loosening tests to make an agent's change pass.
- E2E suites that try to cover every edge case and take an hour.

## Sources

- Canon TDD: https://newsletter.kentbeck.com/p/canon-tdd
- Practical test pyramid: https://martinfowler.com/articles/practical-test-pyramid.html
- Testing trophy: https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications
- Test Desiderata: https://testdesiderata.com
- Hypothesis: https://hypothesis.readthedocs.io and fast-check: https://fast-check.dev
- Pact: https://docs.pact.io
- Stryker: https://stryker-mutator.io and PIT: https://pitest.org
- superpowers TDD and verification skills: https://github.com/obra/superpowers
