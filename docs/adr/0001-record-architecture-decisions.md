---
status: accepted
date: 2026-10-21
decision-makers: project maintainers
---

# 0001. Record architecture decisions

## Context and problem statement

Decisions about structure, dependencies, data and interfaces get made every week, by humans and by
agents. Without a record, the reasons disappear, the same debates repeat, and agents happily undo
choices they do not know were deliberate.

## Decision outcome

We will keep Architecture Decision Records in `docs/adr/`, one Markdown file per decision, numbered
sequentially (`NNNN-title-with-dashes.md`), using the MADR 4 format from `.devbox/templates/adr.md`.
New records are created with `devbox adr "<title>"`.

We write an ADR when a decision is hard to reverse, affects more than one module, adds a dependency or
service, or when someone (human or agent) would reasonably ask "why did we do it this way?".

Accepted ADRs are not edited. To change a decision, write a new ADR and mark the old one
`superseded by ADR-NNNN`.

### Consequences

- Good, because the reasoning survives turnover and context resets, and agents can read it.
- Good, because reviews can point at a decision instead of re-arguing it.
- Bad, because it costs a few minutes per decision. That is the price.

### Confirmation

Design reviews and `/devbox:critique` check that significant decisions in `design.md` link an ADR.

## More information

- Michael Nygard, "Documenting Architecture Decisions" (2011)
- MADR: https://adr.github.io/madr/
