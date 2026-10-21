---
status: proposed   # proposed | accepted | rejected | deprecated | superseded by ADR-NNNN
date: {{DATE}}
decision-makers:
consulted:
informed:
---

# {{NUMBER}}. {{TITLE}}

<!-- MADR 4 style (adr.github.io/madr), trimmed. One decision per record, one or two pages at most.
Once accepted, never edit the decision: write a new ADR and mark this one superseded. -->

## Context and problem statement

What forces are at play (technical, product, team, cost, deadline) and what question needs an answer.
Two to five sentences. State it so someone joining in a year understands why this mattered.

## Decision drivers

- <driver, e.g. "p95 latency under 100 ms">
- <driver, e.g. "team already operates PostgreSQL">

## Considered options

1. <option A>
2. <option B>
3. <option C>

## Decision outcome

Chosen option: "<option>", because <justification tied to the drivers>.

We will <the decision, in active voice>.

### Consequences

- Good, because <positive consequence>.
- Bad, because <negative consequence or cost we accept>.

### Confirmation

How we will check the decision is followed (a lint rule, an architecture test, a review checklist item,
a metric) and when we will revisit it (for example: after one month in production).

## Pros and cons of the options

### <option A>

- Good, because ...
- Bad, because ...

### <option B>

- Good, because ...
- Bad, because ...

## More information

Links to specs, benchmarks, spikes, related ADRs.
