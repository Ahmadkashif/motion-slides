# Architecture

Read this when writing `design.md` (`/devbox:design`), updating `docs/architecture.md`, recording an ADR, or deciding how to split a system.

Architecture is the set of decisions that are expensive to change. The goal is not a beautiful diagram; it is making those decisions deliberately, writing them down, and keeping the rest cheap to change.

## Rules

- Start every design from the approved spec. If the design needs something the spec does not say, go back and change the spec.
- Design it twice: sketch at least two approaches and record why the loser lost in "Alternatives considered".
- Prefer the simplest architecture that meets the NFRs. Default to a modular monolith.
- Name every module, its public interface, and what it hides. Interfaces are where the tests go.
- Write an ADR for every decision that is hard to reverse, crosses modules, adds a dependency or service, or that someone would reasonably question later.
- Mark each significant decision as a one-way door (hard or impossible to reverse) or two-way door. One-way doors need human approval before build.
- Fill in the Constitution check table. Every exception names the simpler alternative and why it was rejected.
- Keep diagrams as code (Mermaid, Structurizr DSL, PlantUML) next to the code they describe.

## C4 model: which diagrams, when

| Diagram | Shows | When to draw |
|---------|-------|--------------|
| System Context (L1) | The system, its users, the external systems it talks to | Always, for every system |
| Container (L2) | Deployable or runnable pieces: apps, services, databases, queues, workers | Always |
| Component (L3) | Major components inside one container | Only for complex containers |
| Code (L4) | Classes and functions | Rarely by hand; generate it |
| Dynamic | A runtime flow across elements | For tricky flows (auth, payments, sync) |
| Deployment | Where containers run | When infra is non-trivial |

Every diagram has a title and a legend. Every element states its type, technology and one-line responsibility. Every relationship is labelled with its intent and protocol ("Reads orders, SQL").

## arc42-lite

`docs/architecture.md` follows a trimmed arc42. Map C4 into it like this:

| arc42 section | DevBox section | Content |
|---------------|----------------|---------|
| 1 Goals, 2 Constraints | 1. Goals and constraints | top three quality goals, hard constraints |
| 3 Context and scope | 2. Context | C4 L1 |
| 5 Building block view | 3. Containers, 5. Building blocks | C4 L2, L3 |
| 4 Solution strategy | 4. Solution strategy | five to ten key ideas |
| 6 Runtime, 7 Deployment | 6. Runtime and deployment | dynamic and deployment diagrams |
| 8 Crosscutting concepts | 7. Cross-cutting concepts | auth, errors, telemetry, config |
| 9 Decisions | `docs/adr/` | ADRs |
| 10 Quality requirements | 8. Quality scenarios | concrete, testable scenarios |
| 11 Risks and debt | 9. Risks and technical debt | table with plans |
| 12 Glossary | 10. Glossary | the ubiquitous language |

Use the one-page version for small or early systems. Grow sections only when a reader needs them.

## Architecture Decision Records

- Create with `devbox adr "<title>"`; files are `docs/adr/NNNN-title-with-dashes.md`, numbered sequentially, never reused.
- Format: MADR 4 (Context and problem statement, Decision drivers, Considered options, Decision outcome with Consequences and Confirmation, Pros and cons). Nygard's minimal form (Title, Status, Context, Decision, Consequences) is acceptable for small decisions.
- Write the decision in active voice: "We will use PostgreSQL for order storage."
- Statuses: proposed, accepted, rejected, deprecated, superseded by ADR-NNNN.
- Accepted ADRs are immutable. Reversing a decision means a new ADR and marking the old one superseded.
- Include **Confirmation**: how compliance is checked (lint rule, architecture test, review item) and when to revisit.
- Keep each ADR to one or two pages.

## Choosing an architecture

Default path, in order. Move to the next step only when a written NFR forces it.

1. **Modular monolith.** One deployable, internal modules with explicit interfaces, one database with per-module ownership of tables. Cheapest to build, test, deploy and refactor.
2. **Hexagonal core inside it.** Domain at the center, ports defined by the domain, adapters at the edge. Worth it when the domain has real rules or the infrastructure is likely to change.
3. **Extract a service** only for a concrete reason: a different scaling profile, a different release cadence owned by a different team, isolation for security or compliance, or a different runtime. Network boundaries are expensive; module boundaries are cheap.
4. **Event-driven integration** between services via a transactional outbox, not dual writes.

Questions that decide the shape:

- Which quality goal dominates (latency, correctness, cost, time to market)?
- What changes most often, and can it change without touching anything else?
- What happens when each dependency is slow or down?
- If this is called 10x more than expected, what breaks first?

## Data modeling and migrations

- Model entities, invariants and ownership before tables. One module owns each table; others go through its interface.
- Store time in UTC, money in integer minor units with a currency, IDs as opaque values.
- Enforce invariants in the database where possible (NOT NULL, unique, foreign keys, check constraints). Application checks alone lose races.
- Migrations follow **expand, migrate, contract**:
  1. Expand: add the new column or table, nullable or with a default. Old code keeps working.
  2. Migrate: dual write, backfill in batches, switch reads.
  3. Contract: remove the old column in a later release, after no code reads it.
- Run migrations as a separate step from deploys. Avoid locking DDL on hot tables; use online schema change tools or concurrent index builds.
- Every migration is tested against a production-like snapshot and has a rollback or fix-forward plan.

## Reversibility

| Door | Examples | Rule |
|------|----------|------|
| Two-way | internal module boundaries, library choice behind an interface, feature flags | Decide fast, note it, move on |
| One-way | public API shape, data model of persisted records, primary database, deleting data, published package names | ADR, human approval, prototype if unsure |

Make one-way doors two-way where possible: put the choice behind an interface, ship behind a flag, keep old data until the new path is proven.

## Design review checklist

- [ ] Design traces to every P1 story and acceptance criterion in the spec
- [ ] Context and container diagrams exist and match reality
- [ ] Each module has a small public interface; no pass-through layers
- [ ] Data model states ownership, invariants and migration plan (expand, migrate, contract)
- [ ] Contracts (API, events, CLI, file formats) are written down, ideally machine-readable in `contracts/`
- [ ] STRIDE threats listed for each trust boundary, with mitigations
- [ ] Failure mode for every dependency: timeout, retry, idempotency, fallback
- [ ] Observability: logs, metrics, traces, alerts, SLO impact
- [ ] Rollout and rollback plan, rollback under five minutes
- [ ] Testing strategy names the level for each behavior and mocks only at boundaries
- [ ] Alternatives considered, with reasons
- [ ] ADRs linked for significant decisions; one-way doors flagged for human approval
- [ ] Constitution check filled in; exceptions justified

## Constitution check and complexity tracking

Spec Kit runs the constitution check as a gate twice: before research and again after design. DevBox does the same through `/devbox:design` and `/devbox:critique`. When a design violates an article (a fourth service, a new abstraction layer, a mock-heavy test plan), record it:

| Article | Violation | Why needed | Simpler alternative rejected because |
|---------|-----------|------------|--------------------------------------|

An unjustified violation is a THROW AWAY at critique.

## Anti-patterns

- Distributed monolith: services that must deploy together.
- Shared database across services with no owner.
- Diagram rot: diagrams that describe last year's system.
- Resume-driven design: Kubernetes, Kafka and GraphQL for a 50-user internal tool.
- Decisions made in chat and never written down.
- Migrations that rename columns in place.

## Sources

- C4 model: https://c4model.com
- arc42: https://arc42.org/overview and https://docs.arc42.org
- Nygard ADRs: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- MADR: https://adr.github.io/madr/
- ADR examples: https://github.com/joelparkerhenderson/architecture-decision-record
- Hexagonal architecture: https://alistair.cockburn.us/hexagonal-architecture/
- Spec Kit plan template (constitution check): https://github.com/github/spec-kit
- Expand and contract (parallel change): https://martinfowler.com/bliki/ParallelChange.html
