# Runbook: <service or component>

Owner: <team or person> · On-call: <rotation link> · Dashboards: <links> · Last tested: <date>

## What it does

One paragraph. What breaks for users when this is down.

## Service level objectives

| SLI (good events / valid events) | SLO | Window | Error budget policy |
|----------------------------------|-----|--------|---------------------|
| e.g. HTTP requests < 300 ms and non-5xx | 99.9% | 28 days | freeze non-critical deploys when exhausted |

## Dependencies

| Dependency | What happens when it fails | Fallback |
|------------|----------------------------|----------|
|            |                            |          |

## Alerts

For each alert: what it means, how urgent it is, first three things to check. Every page must be
urgent, actionable and need human judgment; anything else becomes a ticket or gets deleted.

### <AlertName>

- Meaning:
- Impact:
- Check: 1. ... 2. ... 3. ...
- Mitigate:

## Common operations

- Deploy: `<command>`
- Roll back (target: under 5 minutes): `<command>`
- Scale: `<command>`
- Rotate a secret: `<steps>`
- Run a one-off admin task: `<command>` (same code and config as production)

## Escalation

Who to call when the runbook does not cover it, and when to declare an incident.
