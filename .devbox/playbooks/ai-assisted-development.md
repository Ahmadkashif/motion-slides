# AI-assisted development

Read this before running agents on real work, before starting an AFK loop (`devbox run`), when an agent keeps going in circles, or when designing a new skill, hook or subagent for DevBox.

Coding agents are fast, tireless and confidently wrong in predictable ways: they lose context, over-scope, under-test, and report success they did not observe. Every DevBox mechanism exists to counter one of those failure modes. As models improve, remove scaffolding one piece at a time and keep what still earns its place.

## Context engineering

- **State lives on disk, not in chat.** `spec.md`, `design.md`, `tasks.md` and `progress.md` are the source of truth. Every session starts by reading them; every session ends by updating `progress.md`.
- **Fresh context per task.** One task per session. `devbox run` and `devbox:implementer` give each task a clean context with only what it needs.
- **Keep utilization around 40 to 60%.** Quality drops as the window fills. Compact intentionally: after each verified phase, write the status into the files, then `/clear` or `/compact <focus>`.
- **Damage order of bad context:** wrong information is worse than missing information, which is worse than noise. Delete stale notes.
- **After two failed corrections, stop.** Clear the context and re-prompt with what you learned, instead of piling corrections on a confused session.
- **Use subagents for investigation** so search results and file dumps stay out of the main context. Keep the conclusion, not the transcript.
- Pre-fetch what the agent will certainly need (the task, the cited acceptance criteria, the files it touches) instead of making it search.

## Research, plan, implement

1. **Research:** understand how the system works today. Read code, trace flows, record findings. Shallow research is the main failure mode.
2. **Plan:** write the plan to a file with exact files, interfaces and verify steps. Humans review the plan: a bad line of plan becomes hundreds of bad lines of code.
3. **Implement:** execute the plan phase by phase, verifying and compacting after each.

In DevBox: research and plan are `/devbox:design` and `/devbox:slice`; review is `/devbox:critique`; implement is `/devbox:build` or `devbox run`.

## The builder never grades itself

- An independent reviewer or evaluator, in a fresh context, checks every task: spec compliance and code quality are separate verdicts.
- `devbox:qa` exercises the system against acceptance criteria like a user would. `devbox:verification-lens` confirms or refutes every review finding against source.
- Agree on "done" before building (sprint contracts): each task's `Verify:` line in `tasks.md` is the contract.
- Never trust a subagent's success report. Read the diff and rerun the verify command.

## Backpressure: prompts advise, hooks enforce

- Tests, type checks, linters and builds are the fastest feedback an agent can get. Make them fast and run them often (`devbox verify`).
- Anything that must hold every time is a hook or a CI check, not a sentence in `AGENTS.md`. DevBox hooks block force pushes to protected branches, `--no-verify`, destructive commands, and writes that contain obvious secrets.
- `devbox run` re-runs verify after every task and stops on failure.
- Never let an agent delete, skip or weaken tests to get green. That is a stop-the-line event.

## HITL and AFK

- Label every task `[AFK]` (an agent can finish it with no human input) or `[HITL]` (needs a decision, credentials, a design review, a manual test).
- Prefer AFK; but be honest. A mislabelled HITL task burns a session and produces a guess.
- Spend human attention where leverage is highest: specs, designs, plans and one-way doors. Review diffs, but do not rely on diff review alone.

## Autonomous loops

DevBox's loop is `devbox run`, a gated version of the Ralph loop:

| Guardrail | How |
|-----------|-----|
| Plan approved first | refuses unless `tasks.md` status is approved (critique returned GO) |
| Blast radius | refuses protected branches; requires a clean tree |
| One task per session | each iteration pipes `worker-prompt.md` into a fresh headless session |
| Human tasks | stops at the next `[HITL]` task |
| Blocked work | stops when the agent marks a task `[!]` |
| Proof of work | requires the task marked `[x]` and a new commit |
| Backpressure | runs `devbox verify` after every task; stops on failure |
| Kill switch | `touch .devbox/STOP` halts before the next task |
| Budget | `--max N` iterations; `--max-turns` per session |
| Quota | stops on usage or rate limits; never enables paid overage |
| Audit | logs every session to `.devbox/runs/` |

Run fully unattended permission modes (`--dangerously-skip-permissions`, `bypassPermissions`) only inside a disposable container or VM. "Not if it gets popped, but when." The default is `--permission-mode auto`, where a classifier blocks risky actions.

When a loop fails the same way twice, add a "sign": one line in `AGENTS.md` Lessons learned or a hook, so the next session does not repeat it.

## Subagent-driven development

For in-session builds (`/devbox:build`):

1. The controller session reads the task and writes a brief with only the needed context.
2. A fresh `devbox:implementer` does the task test first and returns one status: **DONE**, **DONE_WITH_CONCERNS**, **NEEDS_CONTEXT**, or **BLOCKED**.
3. A reviewer checks spec compliance and quality. Findings go back to an implementer; the controller does not fix them itself.
4. After a few failed rounds, escalate: fresh implementer, stronger model, or a human.
5. Never run parallel implementers on the same working tree. Use separate git worktrees if you must parallelize.
6. Finish the feature with one whole-branch review.

## Worktrees

- One worktree per feature for parallel or isolated work (`.claude/worktrees/` or `.worktrees/`, gitignored).
- Install dependencies and confirm the test baseline is green before starting.
- Never force-remove a dirty worktree.

## Agent architecture patterns (for products that use LLMs)

From Anthropic's "Building effective agents": use the simplest pattern that works. Single call with retrieval, then workflows (prompt chaining with programmatic gates, routing, parallelization, orchestrator-workers, evaluator-optimizer), and full agents only when the steps cannot be predicted. Invest in the agent-computer interface: clear tool descriptions, mistake-proof parameters (absolute paths), small focused tool sets. Product-side guidance lives in `.devbox/playbooks/shapes/llm-app.md`.

12-factor agents highlights worth applying to any harness: own your prompts, own your context window, tools are structured outputs, own your control flow, contact humans with tool calls, compact errors into context, small focused agents, stateless reducer.

## Rules

- One task per session; one feature per branch; one active feature per agent.
- Start every session by reading the files, not by trusting memory.
- End every session with a `progress.md` entry and a commit.
- Plan before editing more than three files or any public interface.
- Show evidence before claiming success.
- Add a sign whenever an agent fails the same way twice.
- Remove a guardrail only when you have evidence it no longer prevents anything.

## Checklist (before an AFK run)

- [ ] `tasks.md` approved after a GO from `/devbox:critique`
- [ ] Every task has a `Verify:` line and an honest AFK or HITL label
- [ ] `devbox verify` green on a clean work branch
- [ ] `DEVBOX_AGENT_CMD` permission mode chosen deliberately; sandbox if bypassing permissions
- [ ] `--max` set; you know how to `touch .devbox/STOP`
- [ ] You will review the branch as a whole before merging

## Anti-patterns

- Vibe coding: accepting diffs you have not read into code you must maintain.
- Giant prompts and 2,000-line instruction files.
- Trusting "done" without rerunning verify.
- Letting the agent edit or delete tests to pass.
- Parallel agents on one working tree.
- Infinite loops with no stop condition, budget or sandbox.
- Long sessions that drift across several features until the context rots.

## Sources

- Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Building effective agents: https://www.anthropic.com/engineering/building-effective-agents
- Effective context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- ACE-FCA: https://github.com/humanlayer/advanced-context-engineering-for-coding-agents
- 12-factor agents: https://github.com/humanlayer/12-factor-agents
- Ralph: https://ghuntley.com/ralph/
- superpowers subagent-driven development: https://github.com/obra/superpowers
- Claude Code headless mode: https://code.claude.com/docs/en/headless
