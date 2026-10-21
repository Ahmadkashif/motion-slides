## What and why

<!-- One or two sentences on the problem this solves, in plain language. Then the approach, briefly. -->

Spec / task: <!-- specs/NNN-name, T00X -->

## How it was verified

<!-- Paste the evidence, not a promise: devbox verify output, test names, screenshots, curl output. -->

```
devbox verify
```

## Risk and rollback

<!-- What could break, who would notice, and how to undo it. "Low: docs only" is a fine answer. -->

## Checklist

- [ ] Tests written first and passing; acceptance criteria covered
- [ ] No unrelated changes bundled in (refactors go in their own PR)
- [ ] Docs, CHANGELOG and ADRs updated where behavior or decisions changed
- [ ] No secrets, debug output or commented-out code
