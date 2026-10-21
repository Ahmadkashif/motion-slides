# Operations

Read this when anything will run in production: when writing the observability and rollout parts of `design.md`, before `/devbox:ship`, when writing a runbook (`.devbox/templates/runbook.md`), and after an incident (`.devbox/templates/postmortem.md`).

Shipping is the start of operating. Constitution Article VII: anything in production emits logs, metrics and traces, has an owner, and can be rolled back in minutes.

## The Twelve-Factor App

Heroku open-sourced the methodology in November 2024 and a community refresh is in progress (`next` branch, unreleased). Treat the original twelve as normative.

| # | Factor | Rule |
|---|--------|------|
| I | Codebase | One repo per app, many deploys |
| II | Dependencies | Declare and isolate explicitly (manifest plus lockfile) |
| III | Config | In the environment, never in code. Test: could you open-source the repo right now without leaking credentials? |
| IV | Backing services | Database, queue, cache are attached resources swappable by config |
| V | Build, release, run | Strictly separate; releases immutable and uniquely identified |
| VI | Processes | Stateless, share-nothing; state in backing services |
| VII | Port binding | Export services by binding a port |
| VIII | Concurrency | Scale out via the process model |
| IX | Disposability | Fast start, graceful SIGTERM shutdown, idempotent re-entrant jobs |
| X | Dev/prod parity | Same backing service types and versions everywhere |
| XI | Logs | Unbuffered event stream to stdout; the platform routes them |
| XII | Admin processes | One-off tasks run with the same code and config |

## SLIs, SLOs and error budgets

- An **SLI** is a ratio of good events to valid events, measured as close to the user as possible: availability, latency, freshness, correctness.
- An **SLO** is a target for an SLI over a window, below 100% (for example 99.9% of requests under 300 ms and non-5xx over 28 days). Never aim for 100%.
- The **error budget** is 1 minus the SLO. It is permission to take risk.
- Adopt a written **error budget policy**: when the budget is exhausted, freeze everything except P0 and security fixes until back within SLO. Any incident that consumes more than 20% of the budget gets a postmortem with at least one P0 action item.
- Alert on **burn rate** (budget consumed too fast over short and long windows), not on raw thresholds.

## What to measure

| Method | Signals | Use for |
|--------|---------|---------|
| Four golden signals | latency (successes and failures separately), traffic, errors, saturation | user-facing services |
| RED | rate, errors, duration | request-driven services |
| USE | utilization, saturation, errors | resources (CPU, memory, disks, queues, pools) |

Watch tail latency (p95, p99), not averages. Saturation is about the most constrained resource.

## Alerting rules

- Page on **symptoms** users feel (SLO burn), not causes (CPU at 80%).
- Every page must be urgent, actionable and need human judgment. Anything else becomes a ticket or is deleted.
- Every alert links its runbook section.
- Keep alert rules simple; review noisy alerts weekly and fix or remove them.

## OpenTelemetry

- Instrument with the vendor-neutral OpenTelemetry API and SDK; export over OTLP through the Collector so backends can change without code changes.
- Traces, metrics and logs are stable signals. Baggage carries context. Profiles are alpha; do not depend on them yet.
- Follow semantic conventions for attribute names (`http.request.method`, `db.system`, GenAI conventions for model calls).
- Propagate W3C Trace Context across every service boundary, including queues.
- Write structured JSON logs that include `trace_id` and `span_id`, so logs and traces correlate.
- Never put secrets or personal data in spans, metrics labels or logs. Watch label cardinality.

## Runbooks

- One runbook per service, from `.devbox/templates/runbook.md`: what it does, SLOs, dependencies and their failure behavior, alerts with first checks, common operations (deploy, rollback, scale, rotate secrets), escalation.
- Test the runbook: someone who did not write it follows it during a drill.
- Keep it next to the code and update it in the same PR that changes behavior.

## Incidents

- Declare early; it is cheaper to stand down than to declare late.
- Roles: incident commander (coordinates), operations lead (changes production), communications lead (updates stakeholders). In small teams one person may hold several roles, but say so.
- Mitigate first (roll back, flip the flag, shed load), diagnose later.
- Keep a timestamped log in the incident channel; it becomes the postmortem timeline.

## Blameless postmortems

- Template: `.devbox/templates/postmortem.md`. Required for user-visible outages, data loss, security incidents, and anything over 20% of the error budget.
- Cover impact, timeline, trigger and root causes (usually several), what went well, what went badly, where we got lucky, and owned, tracked action items.
- Focus on systems and processes, never individuals.
- Put lessons where agents will read them: `AGENTS.md` Lessons learned, `.devbox/constitution.md`, or a hook. `/devbox:retro` does this.

## Toil

Toil is manual, repetitive, automatable, tactical, without lasting value, and grows with the service. Keep it under 50% of operations time. Track it and automate the top item every cycle.

## Progressive delivery and rollback

- Deploy small and often; every deploy is a release you can identify and undo.
- Ship risky behavior behind a feature flag, default off, with a kill switch.
- Roll out progressively: canary (1%, 10%, 50%, 100%), by region or cohort. Watch the golden signals at each step; abort automatically on SLO burn where possible.
- Rollback target: **under five minutes**, rehearsed. Database changes are backward compatible so the previous version still runs.
- Separate liveness and readiness probes; drain connections on shutdown.

## Backups and recovery

- Define RPO (how much data you can lose) and RTO (how long you can be down) per data store.
- Automate backups; encrypt them; store copies in a separate account or region.
- **Restore drills** on a schedule. A backup that was never restored is a hope, not a backup.

## Checklist (before first production deploy)

- [ ] Config in environment; no secrets in the image
- [ ] Structured logs to stdout with trace ids; no PII
- [ ] RED or golden-signal metrics exported; traces propagated
- [ ] SLOs defined, dashboard exists, burn-rate alerts wired to a runbook
- [ ] Liveness and readiness probes; graceful shutdown on SIGTERM
- [ ] Rollback rehearsed, under five minutes
- [ ] Feature flag and kill switch for risky behavior
- [ ] Backups automated and a restore tested
- [ ] Owner and on-call named

## Anti-patterns

- Alerts nobody acts on, so real pages get ignored.
- Logging everything at INFO with request bodies.
- Dashboards with averages only.
- Snowflake servers configured by hand.
- Big-bang deploys on Friday evening with no rollback.
- Postmortems that end with "be more careful".

## Sources

- Twelve-Factor App: https://12factor.net and refresh: https://github.com/twelve-factor/twelve-factor
- Google SRE book: https://sre.google/sre-book/table-of-contents/
- SLOs: https://sre.google/sre-book/service-level-objectives/
- Error budget policy: https://sre.google/workbook/error-budget-policy/
- Monitoring distributed systems: https://sre.google/sre-book/monitoring-distributed-systems/
- Postmortem culture: https://sre.google/sre-book/postmortem-culture/
- Eliminating toil: https://sre.google/sre-book/eliminating-toil/
- OpenTelemetry signals: https://opentelemetry.io/docs/concepts/signals/
- Semantic conventions: https://opentelemetry.io/docs/specs/semconv/
