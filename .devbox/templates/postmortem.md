# Postmortem: <short title>

Date of incident: <YYYY-MM-DD> · Authors: <names> · Status: draft | reviewed | actions complete

Blameless: we describe what the system and process allowed, never who to blame. People acted
reasonably given what they knew at the time; the goal is to change what they will know next time.

## Summary

Two or three sentences: what happened, who was affected, for how long, how it was resolved.

## Impact

Users affected, requests failed, revenue or data lost, SLO error budget consumed (percentage).

## Timeline (all times UTC)

| Time | Event |
|------|-------|
|      | First bad deploy / trigger |
|      | Detected (how: alert, user report) |
|      | Mitigated |
|      | Resolved |

## Root causes and trigger

The trigger is what set it off; the root causes are why the system let it hurt. Ask "why" until
you reach something we can change. There is usually more than one cause.

## What went well

## What went badly

## Where we got lucky

## Action items

| Action | Type (prevent / detect / mitigate / process) | Owner | Tracking issue | Due |
|--------|----------------------------------------------|-------|----------------|-----|
|        |                                              |       |                |     |

Any incident that consumed more than 20% of the error budget gets at least one P0 action item.

## Lessons for DevBox

Anything to add to `.devbox/constitution.md`, `AGENTS.md` or a playbook so agents and humans
do not repeat this. Link the PR that adds it.
