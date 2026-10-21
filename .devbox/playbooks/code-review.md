# Code review

Read this before reviewing a diff or a plan (`/devbox:review`, `/devbox:critique`), before opening a PR, and when receiving review feedback. This is the shared method every DevBox review agent follows: `devbox:linus`, the lenses (`devbox:frontend-lens`, `devbox:backend-lens`, `devbox:infra-lens`, `devbox:ai-lens`, `devbox:security-lens`) and `devbox:verification-lens`.

The standard (Google eng-practices): **approve once the change definitely improves the overall health of the code, even if it is not perfect.** Aim for better, not perfect. Block on correctness, security, design and missing tests; never block on personal taste.

## Author rules (before asking for review)

- One self-contained change per PR. About 100 changed lines is reasonable; around 1,000 is too large. File count matters too.
- If you add a new API, include a real caller in the same change.
- Keep refactors separate from behavior changes. Every PR leaves the build green.
- Split big work by stacking PRs, by vertical slice (preferred), or by layer with stubs.
- Description: a short imperative first line that stands alone ("Reject expired tokens at the API edge"), a blank line, then what problem it solves, why this approach, known shortcomings, and how it was verified with evidence. Do not rely only on links.
- Review your own diff first (`/devbox:review` on your branch). Remove debug output, commented-out code, unrelated edits.
- Do not take comments personally. Fix unclear code in the code, not in a reply.

## Reviewer rules

- Read every human-written line and the whole file for context, not only the diff. Say so if you only reviewed part.
- Review in this order: **design, functionality** (edge cases, concurrency, user impact), **complexity** (over-engineering, speculative features), **tests** (would they fail if the code broke?), naming, comments (why, not what), style, consistency, docs.
- Respond within one business day at most, ideally at a natural break. Send a quick first response even if the full review comes later.
- Prefix optional points with "Nit:". Use "LGTM with comments" when the rest is minor and the author can be trusted.
- For large changes, comment on the design first and ask for a split.
- On pushback, first consider whether the author is right. If not, explain why, politely, with evidence.
- Do not accept "I will clean it up later". Require the cleanup before merge, or a filed, assigned issue plus a TODO referencing it.
- Point out good work when you see it, briefly.

## The three lenses

Every changed file is read through three lenses, then the whole change is read once more for synthesis.

### Lens 1: Necessity ("why is this change here?")

- Does the diff match the PR description and the task it cites?
- Is there dead code, unrelated cleanup, or scope creep bundled in?
- Does anything contradict the description ("no behavior change" when behavior clearly changes)?

Ask genuine questions: "was there a reason to bundle these together?"

### Lens 2: Fragility ("how will this break?")

The most important lens. Look for unguarded null access, races, unvalidated input at boundaries, swallowed errors, off-by-one, type coercion surprises, resource leaks, silent failures, stale state, injection, auth gaps.

Every fragility finding must state:

1. The exact location (file and line).
2. The concrete trigger (what input or state causes it).
3. The observable consequence (what the user or system sees).

Language hints: TS/JS unhandled promises and `any` casts; Python bare `except` and mutable defaults; Go unchecked errors and goroutine leaks; Rust `unwrap()` in non-test code; Java unclosed resources and unsynchronized shared state.

### Lens 3: Modularity ("is this well structured?")

Copy-pasted logic (non-trivial, three or more lines, in several places), functions doing several things, tight coupling, magic numbers, misleading names, pure logic buried in handlers or effects, shallow modules. Suggest the alternative concretely: show the extracted function, do not just say "extract this".

### Cross-file synthesis

After all files: duplicated logic across files, orphaned exports, inconsistent approaches to the same problem, contract changes not reflected in callers. Write exactly one sentence with the single most important cross-cutting observation, or say the change is coherent.

## Severity

| Severity | Meaning | Calibration |
|----------|---------|-------------|
| CRITICAL | Blocks merge: production bug, data loss, security hole, broken functionality, constitution violation without justification | One or two per review at most |
| MAJOR | Should be fixed: subtle logic error, silent failure, missing test for changed behavior, pattern that will cause real pain | The bulk of real findings |
| MINOR | Worth noting, not blocking: small improvements, pre-existing issues seen in passing | Lenses omit these; human reviews may include a few |

- If you would not leave the comment on a real PR, drop it.
- Five sharp findings beat twenty generic ones. Most PRs have 3 to 8 findings worth raising; a rename may have zero.
- Pre-existing issues on touched lines: flag as "pre-existing, but since you are touching these lines".

## Verify every finding against the source

Non-negotiable. Before a finding leaves your hands:

1. Open the actual file at the line you cite and confirm the code matches your description.
2. Trace the path: can the bad input actually reach this line?
3. Look for existing guards (a check two lines up, middleware, a type guard, a database constraint).
4. Confirm the suggested fix would work.
5. **Dry-run** the path with three scenarios: normal input, boundary input (null, empty, max size, special characters), and concurrent or racing input (two requests at once, a request during deploy or migration). If none triggers the problem, the finding is not real.

**If you cannot prove it, drop it.** A wrong finding destroys trust faster than a missed one.

## Plan review (critique gate)

`/devbox:critique` sends `spec.md`, `design.md` and `tasks.md` to `devbox:linus`, who triages lenses, dispatches them one at a time, self-verifies their findings, and always finishes with `devbox:verification-lens`. The verdict is binary: **GO** or **THROW AWAY**, followed by a three-line case (core observation; the tipping risk; what must change, or what to watch). Plan checks include: every acceptance criterion maps to a task, tasks are vertical and sized for one session, AFK and HITL labels are honest, dependencies are acyclic, one-way doors are flagged, and the constitution check holds.

## Receiving review

- Evaluate each comment technically. Verify it against the code before acting.
- No performative agreement ("You're absolutely right!"). Either fix it, or push back with evidence.
- Watch for YAGNI: a reviewer's "professional" extra (config option, abstraction, extra layer) still needs a spec reason.
- Order the work: blocking issues first, then quick fixes, then larger changes. Reply to each thread with what changed.
- Never fix review findings in a way that weakens tests.

## Tone

- Write like a thoughtful teammate typing in a PR comment box: direct, short, specific.
- Ask before accusing: "can `user` be null here when the session expired?" beats "this will crash".
- Show code for suggested fixes.
- Do not summarize what the code does; the author knows. Silence on a file is approval.
- No em-dashes or en-dashes. No "great job!" padding. No AI-sounding vocabulary (see `documentation.md` voice rules).

## Output format

```
One-sentence cross-file synthesis.

## path/to/file.ts

**[MAJOR]** (L42)
If `session.expiresAt` is null (sessions created before the migration), `isExpired` returns false
and an expired session stays valid forever. Suggest treating null as expired:
`return !expiresAt || expiresAt < now`. Dry-run: boundary input.
```

## Checklist

- [ ] Read the spec or task the change claims to implement
- [ ] Read every changed file in full
- [ ] Applied Necessity, Fragility, Modularity to each file
- [ ] Wrote one synthesis sentence
- [ ] Every finding has location, trigger and consequence, and was verified in source
- [ ] Severity calibrated; padding removed
- [ ] Tests checked: would they fail if the change were broken?

## Anti-patterns

- Rubber-stamp LGTM.
- Line-by-line style nits a formatter should catch.
- Findings about code that does not exist at the cited line.
- Blocking on preference, or on hypothetical future requirements.
- Reviewing only the diff and missing the duplicated helper three functions up.
- Fixing findings in the reviewer's session instead of sending them back to the implementer.

## Sources

- Google eng-practices, reviewer guide: https://google.github.io/eng-practices/review/reviewer/
- Google eng-practices, author guide: https://google.github.io/eng-practices/review/developer/
- superpowers requesting and receiving code review: https://github.com/obra/superpowers
- Anthropic Claude Code best practices (writer and reviewer split): https://code.claude.com/docs/en/best-practices
