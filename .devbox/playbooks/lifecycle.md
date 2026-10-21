# The DevBox lifecycle

Read this first. It is the operating model every other playbook, skill and agent plugs into.

DevBox delivers software through a fixed sequence of phases. Each phase owns one artifact on disk
and ends at a gate. Gates are either **deterministic** (a command passes or fails) or **human**
(a person approves). Nothing skips a gate. The ceremony scales with the size of the work through
**lanes**, so a typo fix does not get a design review and a new product does not get built from a chat message.

Files on disk are the state. A fresh session, a different agent, or a human can pick up any feature
by running `devbox status` and reading `specs/NNN-name/progress.md`. Chat history is never the record.

## Lanes

Pick the lane before anything else and say which one you picked in one line.

| Lane | Use when | Phases |
|------|----------|--------|
| **Patch** | Bug fix, small change, dependency bump, docs. One sitting, one PR, no new interfaces. | reproduce, failing test, fix, verify, review, ship |
| **Feature** | New capability or behavior change inside an existing system. Days, several tasks. | specify, clarify, design (light), plan, critique, build, verify, ship, learn |
| **Product** | New system, new service, major capability, or anything with one-way-door decisions. | intake and constitution, then the feature lane for each slice of the roadmap, with full design (C4, ADRs, threat model) |

Escalate a lane the moment you discover the work is bigger than it looked (a patch that needs a schema
change is a feature). Never de-escalate silently; say why.

## Phases and gates

| # | Phase | Skill | Artifact | Exit gate |
|---|-------|-------|----------|-----------|
| 0 | Intake | `/devbox:intake` | `.devbox/config`, `.devbox/constitution.md`, `AGENTS.md`, `CLAUDE.md` | Shape, stack and verify gates configured; `devbox verify` runs green on the baseline; human reviewed the constitution |
| 1 | Specify | `/devbox:spec` | `specs/NNN/spec.md` | Every story has an ID, a priority and testable acceptance criteria; non-goals listed; open questions marked |
| 2 | Clarify | `/devbox:grill` | `spec.md` decisions log | Zero clarification markers; **human approves**, then `devbox approve spec` |
| 3 | Design | `/devbox:design` | `design.md`, `docs/adr/*`, contracts, threat model when needed | Constitution check passes or exceptions are justified; one-way doors approved by a human; `devbox approve design` |
| 4 | Plan | `/devbox:slice` | `tasks.md` | Every acceptance criterion maps to a task; tasks are vertical, sized to one session, tagged AFK or HITL, ordered by dependency |
| 5 | Critique | `/devbox:critique` (agent `devbox:linus`) | verdict in `progress.md` | **GO** from Linus, then `devbox approve tasks`. THROW AWAY sends you back to the phase that is wrong |
| 6 | Build | `/devbox:build` (in session) or `devbox run` (AFK) | code, tests, commits, task checkboxes | Per task: failing test seen, then green; `devbox verify` green; committed; task marked `[x]`; progress logged |
| 7 | Verify | `/devbox:verify`, `/devbox:review` (agent `devbox:qa`) | verification report in `progress.md` | Every acceptance criterion has fresh evidence; independent QA passes; review findings resolved |
| 8 | Ship | `/devbox:ship` | PR, CHANGELOG, release notes, rollout plan | CI green; PR opened with the user requested as reviewer; **human merges**; `devbox approve ship` |
| 9 | Learn | `/devbox:retro` | retro entry, `AGENTS.md` lessons, constitution amendments | At least one concrete lesson captured or an explicit "nothing to change" |

`devbox status` derives the phase of every feature from these files, so the files must be kept honest:
front matter `status:` in `spec.md` (draft, approved, shipped), `design.md` (draft, approved) and
`tasks.md` (draft, approved), plus the task checkboxes.

## Who decides what

Agents propose; humans own the irreversible (constitution Article IX).

- **Human gates:** spec approval, one-way-door design decisions, HITL tasks, merge, production deploy,
  anything that spends money, deletes data or talks to people outside the team.
- **Agent gates:** clarification interviews, Linus critique, verify gates, independent QA, code review.
- **Deterministic gates:** `devbox verify`, CI, the DevBox hooks (destructive command and secret guards),
  `devbox approve` preconditions (no open clarification markers, no open tasks before ship).

When a gate fails, go back to the phase that produced the faulty artifact. A THROW AWAY on the plan
because the spec is ambiguous means re-grilling the spec, not patching the task list.

## Building: in session or AFK

**In session** (`/devbox:build`): the session acts as controller. For each task it dispatches a fresh
`devbox:implementer` subagent with only the context the task needs, then checks the result itself:
reads the diff, runs `devbox verify`, and runs review before the next task. Implementers run one at a
time on the same working tree. The controller never "fixes it quickly" itself; it sends findings back.

**AFK** (`devbox run`): a bash loop starts one headless agent session per task with
`templates/spec/worker-prompt.md`. It refuses to start on a protected branch, on a dirty tree, or before
the tasks are approved. After each task it requires the task to be checked off, a new commit, and green
verify gates. It stops on HITL tasks, blocked tasks, failed gates, usage limits (it waits, it never enables
paid overage), a `.devbox/STOP` file, or `--max` tasks. Review the result like any PR.

Use AFK for well-specified AFK-tagged tasks. Use in-session for anything exploratory or risky.

## Context discipline

- One feature per session. Start each phase by reading its input artifacts, not by trusting memory.
- Keep the context lean: delegate searches and investigations to subagents and keep their conclusions.
- After two failed attempts to correct the same mistake, stop, write what you learned to `progress.md`,
  and restart with a fresh context.
- End every session with a `progress.md` entry whose "Next:" line a stranger could act on.

## Definition of done (feature)

- [ ] Spec approved, design approved (or deleted for small features), tasks approved after a GO
- [ ] Every task `[x]`, every acceptance criterion backed by evidence in `progress.md`
- [ ] `devbox verify` and CI green; independent QA passed; review findings resolved
- [ ] Docs, CHANGELOG and ADRs updated; rollout and rollback written down
- [ ] PR merged by a human; `devbox approve ship`; retro captured

## Where each idea comes from

The phase model merges GitHub Spec Kit (constitution, spec, clarify, plan, tasks, analyze, implement),
obra/superpowers (brainstorm, plan, subagent-driven development, TDD, verification before completion),
Matt Pocock's skills (PRD, grill-me, vertical slices tagged AFK or HITL, deep modules), BMAD (scale-adaptive
tracks, fresh context per story), HumanLayer's research, plan, implement with intentional compaction,
Anthropic's guidance on long-running harnesses (state on disk, one feature per session, independent
evaluation), the Ralph loop (fresh context per iteration with backpressure), Shape Up (appetite, scope
hammering), and the engineering canon in the other playbooks. See `process.md` and `docs/sources.md`.
