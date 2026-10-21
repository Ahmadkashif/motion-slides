# Process

Read this to understand where the DevBox lifecycle comes from, to explain it to someone who knows Scrum or Shape Up, or to decide how much ceremony a piece of work deserves.

DevBox is not a new methodology. It is a synthesis: the parts of established human and agent methods that survive contact with AI coding agents, wired into files, skills, gates and a CLI.

## Scale the ceremony to the work

Borrowed from BMAD's scale-adaptive tracks and GSD's quick mode. `/devbox:deliver` picks the lane first.

| Lane | Size | Phases | Human gates |
|------|------|--------|-------------|
| Patch | bug fix or small change, under a day | reproduce, failing test, fix, verify, review, ship | PR review |
| Feature | one capability, days to two weeks | spec, grill, design (light), slice, critique, build, verify, review, ship, retro | spec approval, HITL tasks, PR review |
| Product | new system or major capability | intake, constitution, architecture, then features | constitution, architecture ADRs, every feature's gates |

When unsure, start in Feature lane. Escalate to Product when the work needs more than one feature folder; drop to Patch when the spec would be one sentence.

## The methods, at a glance

### Shape Up (Basecamp)

Appetite instead of estimates; time fixed, scope variable. Shape before betting: fat-marker sketches, rabbit holes removed, no-gos stated. Six-week cycles, two-week cool-down, bets not backlogs. Circuit breaker: work that does not ship in the cycle is cancelled by default. Hill charts (uphill figuring out, downhill executing).

### Extreme Programming

TDD, pair or mob programming, continuous integration, small releases, refactoring, simple design, collective ownership, coding standards, sustainable pace, an on-site customer. DevBox's agent-plus-reviewer pairing is a form of pairing.

### Scrum (2020 Guide)

One team (Product Owner, Scrum Master, Developers). Sprint, Sprint Planning, Daily Scrum, Review, Retrospective. Each artifact has a commitment: Product Backlog has the Product Goal, Sprint Backlog has the Sprint Goal, Increment has the Definition of Done.

### Kanban

Visualize the workflow, limit WIP explicitly, manage flow, make policies explicit, measure cycle time, throughput, WIP and work item age.

### Lean

Small batches. Stop starting, start finishing. Remove waste: partially done work, handoffs, waiting. Defer commitment to the last responsible moment. Build quality in.

### BMAD Method

Named agent roles (analyst, PM, architect, UX, developer, and more), each owning one artifact. Scale-adaptive planning tracks. A machine-readable sprint status file. A fresh chat per story. An implementation-readiness check before code. Retrospectives per epic.

### GitHub Spec Kit

Constitution, specify, clarify, plan, checklist, tasks, analyze, implement, converge. Specs say what and why; plans say how. Clarification markers must be resolved before planning. Stable IDs (US, FR, SC, T) for traceability. A constitution check gate before and after design. Feature folders `specs/NNN-name/`.

### obra/superpowers

Brainstorm with one question per message and a hard human approval gate; detailed plans with exact verify steps; subagent-driven development with a fresh implementer per task and a review per task; mandatory TDD; systematic debugging (root cause first, question the architecture after three failed fixes); verification before completion; disciplined branch finishing.

### AWS Kiro

`requirements.md` with EARS acceptance criteria, `design.md`, `tasks.md`. Bugfix specs record current, expected and unchanged behavior. Steering files for always-on context. Tasks grouped into dependency waves.

### GSD (Get Shit Done, now gsd-core)

Discuss, plan, execute, verify, ship per phase. Goal-backward verification of must-haves. Reversibility ratings that auto-insert human checkpoints for one-way doors. One fresh context per executor; atomic commit per task.

### Ralph loop (Geoffrey Huntley)

A bash loop that pipes the same prompt into a fresh headless agent session until the plan is done: one task per iteration, backpressure from tests, types and lint, "signs" added whenever it fails. Best for greenfield; run it in a sandbox.

### HumanLayer ACE-FCA and 12-factor agents

Research, plan, implement with frequent intentional compaction (keep context around 40 to 60% full). Humans review research and plans, not giant diffs. Own your prompts, context window and control flow; contact humans with tool calls; small focused agents.

### Matt Pocock skills

Grill-me interviews, PRD to tickets as tracer-bullet vertical slices labelled AFK or HITL, TDD one seam at a time, deep modules and the deletion test.

## What DevBox borrowed, and where it lives

| Idea | From | In DevBox |
|------|------|-----------|
| Appetite, no-gos, rabbit holes | Shape Up | `spec.md` front matter and Scope section |
| Constitution with versioned articles | Spec Kit | `.devbox/constitution.md`, Constitution check in `design.md` |
| Spec says what/why; design says how | Spec Kit, Kiro | `spec.md` vs `design.md` |
| Clarification markers that block approval | Spec Kit | `devbox approve spec` refuses while markers remain |
| EARS acceptance criteria | Kiro, Mavin | `spec.md`, `requirements.md` |
| Priority stories, P1 is the MVP | Spec Kit | `spec.md` User stories |
| One question at a time with a recommendation | superpowers, Matt Pocock | `/devbox:grill` |
| Tracer-bullet slices, AFK vs HITL | Matt Pocock | `tasks.md` format, `/devbox:slice` |
| Adversarial plan review, GO / THROW AWAY | Linus review panel | `/devbox:critique`, `devbox:linus` and lenses |
| Fresh context per task | superpowers, BMAD, GSD, Ralph | `devbox run`, `devbox:implementer` |
| Red, green, refactor; failing test first | XP, Kent Beck, superpowers | `/devbox:tdd`, Constitution Article II |
| Evidence before claims | superpowers, Anthropic | `/devbox:verify`, `progress.md` evidence |
| Builder does not grade itself | Anthropic harness design, superpowers | `devbox:qa`, `devbox:verification-lens` |
| State on disk, append-only ledger | Anthropic long-running harness, BMAD | `progress.md`, `tasks.md` checkboxes, `devbox status` |
| Loop with backpressure and a stop file | Ralph, become-orchestrator | `devbox run` gates, `.devbox/STOP` |
| Never pay overage; pause on quota | become-orchestrator | `devbox run` exits on usage limits |
| Small batches, WIP of one | Lean, Kanban, DORA | one active feature, one task per session |
| Retros feed the system | Scrum, BMAD | `/devbox:retro` updates AGENTS.md, constitution, hooks |
| Scale-adaptive lanes | BMAD, GSD quick mode | Patch, Feature, Product lanes |
| Reversibility gates | GSD, Amazon doors | one-way doors flagged in `design.md`, Article IX |

## Rules

- Choose the lane before starting and say which one in one line.
- Keep WIP at one active feature per agent session; finish before starting.
- Prefer fixed appetite with flexible scope over fixed scope with slipping dates.
- If a feature blows its appetite, stop and re-shape (circuit breaker), do not silently extend.
- Run a retro at the end of every feature; push action items into files that change behavior.

## Anti-patterns

- Full Product ceremony for a one-line fix.
- Patch lane for a change that alters a public API.
- Cargo-cult sprints for a solo developer and an agent.
- Backlogs of hundreds of stale issues; keep bets, not backlogs.
- Process changes that live only in someone's memory.

## Sources

- Shape Up: https://basecamp.com/shapeup
- XP: http://www.extremeprogramming.org
- Scrum Guide 2020: https://scrumguides.org/scrum-guide.html
- Kanban Guide: https://kanbanguides.org
- BMAD Method: https://github.com/bmad-code-org/BMAD-METHOD
- Spec Kit: https://github.com/github/spec-kit
- superpowers: https://github.com/obra/superpowers
- Kiro specs: https://kiro.dev/docs/specs/
- gsd-core: https://github.com/open-gsd/gsd-core
- Ralph: https://ghuntley.com/ralph/ and https://github.com/ghuntley/how-to-ralph-wiggum
- 12-factor agents: https://github.com/humanlayer/12-factor-agents
- ACE-FCA: https://github.com/humanlayer/advanced-context-engineering-for-coding-agents
- Matt Pocock skills: https://github.com/mattpocock/skills
