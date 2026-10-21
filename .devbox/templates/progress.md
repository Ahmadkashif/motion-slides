# Progress: {{FEATURE_TITLE}}

Append-only log for `{{FEATURE_ID}}`. Newest entries at the bottom. Every agent session that
touches this feature adds an entry before it ends. This file is how a fresh session (or a human)
picks up where the last one stopped, so write for a reader with zero context.

Entry format:

```
## YYYY-MM-DD HH:MM  <phase>  <task id or gate>
Did: what changed, in one to three lines.
Evidence: commands run and their result (tests, verify, screenshots, URLs).
Decisions: anything decided that is not already in spec.md or an ADR.
Next: the single next step.
```

## {{DATE}}  specify  created

Did: feature scaffolded with `devbox feature`.
Next: write spec.md (/devbox:spec).
