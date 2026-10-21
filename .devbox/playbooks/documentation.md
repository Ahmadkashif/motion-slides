# Documentation

Read this when writing a README, docs, `AGENTS.md`, `CLAUDE.md`, a skill, a changelog, a PR description, a commit message or a review comment (`/devbox:humanize` applies the voice rules).

Docs are part of the product and part of the harness. For agents, docs are the context: wrong docs are worse than missing docs, and missing docs are worse than noisy docs.

## Diataxis: four kinds of documentation

| Kind | Serves | Orientation | Style |
|------|--------|-------------|-------|
| Tutorial | learning | action | A guaranteed-to-work lesson; no choices offered; the reader succeeds at something small |
| How-to guide | doing work | action | A goal-oriented recipe for a competent reader; steps, no theory |
| Reference | doing work | knowledge | Austere, accurate, complete; mirrors the code's structure; generated where possible |
| Explanation | learning | knowledge | The why, context, trade-offs and alternatives |

Compass for any page: is it about **action or cognition**? Is the reader **acquiring or applying** a skill? Never mix kinds on one page; link between them instead.

## README

Answer, in this order:

1. What it is and why it exists (two sentences).
2. Quick start: install and the smallest useful run.
3. Usage examples.
4. Configuration.
5. How to get help and how to contribute.
6. License.

Badges sparingly. Everything else goes in `docs/`.

## Docs as code

- Keep docs in the repo, in Markdown, reviewed in the same PR as the code change.
- Build and link-check docs in CI.
- Generate reference docs from source (OpenAPI, docstrings, `--help`). Write tutorials, how-tos and explanations by hand.
- A behavior change without a docs change is incomplete (release checklist).

## Instruction files for agents

Instruction files are **maps, not manuals**. They point to where knowledge lives; they do not contain all of it.

| File | Holds | Loaded |
|------|-------|--------|
| `AGENTS.md` | Canonical project instructions: overview, exact commands, boundaries (always, ask first, never), conventions a newcomer gets wrong, where things live, lessons learned | Read by Claude Code (when no CLAUDE.md), Codex, Cursor, Copilot, Gemini CLI, Aider and others |
| `CLAUDE.md` | `@AGENTS.md` plus Claude-only notes (skills, subagents, plan mode habits) | Every Claude Code session |
| Skills (`/devbox:*`) | Procedures needed only sometimes (how to grill, how to slice) | On demand |
| `.devbox/playbooks/` | Reference knowledge (this file) | Linked from AGENTS.md and skills |
| Hooks | Rules that must hold every time (block secrets, block force pushes) | Deterministic, every tool call |

Rules:

- Keep `AGENTS.md` and `CLAUDE.md` under about 200 lines each. For every line ask: would removing it cause the agent to make a mistake? If not, delete it.
- Put commands first, with exact flags. Show one short real example of house style rather than describing it.
- Do not document what the agent can infer from the code.
- Prompts advise; hooks enforce. If a rule must never be broken, make it a hook or a CI check.
- When an agent repeats a mistake, add one line to Lessons learned in `AGENTS.md`. Prune lines that no longer change behavior.
- Nested `AGENTS.md` files are allowed for subprojects; the closest one wins.

## ADRs and changelogs

- ADRs: `docs/adr/`, created with `devbox adr`, MADR 4 format, immutable once accepted. See `architecture.md`.
- Changelogs: Keep a Changelog, written for humans. See `git-and-release.md`.

## Code comments

- Comment **why**, not what. The code says what.
- Explain constraints, invariants, non-obvious trade-offs, and links to the spec or ADR that forced a choice.
- Delete commented-out code; git remembers.
- A TODO needs an issue link and an owner.
- Public APIs get doc comments with an example.

## Voice rules for PRs, commits, reviews and replies

These come from the `humanize` skill and apply to every piece of prose a human will read.

- **No em-dash or en-dash. Ever.** Use a comma, a period, parentheses, a colon, or "and" / "but". Scan and remove before posting.
- **Lead with the root cause** or the user's actual goal in one or two plain sentences. Then the code, briefly, with file and line references. Then stop.
- **Short by default.** A confirmation is one sentence; a status update is two; an explanation is a short paragraph plus a couple of references.
- **Affirmative.** Take a position. Skip "might", "could potentially", "it may be worth considering". If you do not know, say so directly and say what you would check.
- **Explain the mechanism.** One sentence of "here is why it works" beats five of "here is what I did".
- **Banned vocabulary:** delve, leverage (say use), robust, seamless or seamlessly, "it is important to note", "it is worth noting", marketing openers, "Great question!", "Certainly!", "I hope this helps", "Let me know if you have any questions".
- No bold-the-keyword-in-every-bullet formatting. No three-item bullet lists where one sentence works.
- Keep technical accuracy clean: identifiers, paths, commands and commit subjects are exact.

## Checklist

- [ ] Each doc page is one Diataxis kind
- [ ] README answers what, quick start, usage, config, help, license
- [ ] Docs changed in the same PR as behavior
- [ ] `AGENTS.md` under about 200 lines, commands first, boundaries explicit
- [ ] No rule that must always hold lives only in prose (it is a hook or CI check)
- [ ] Comments explain why; no commented-out code
- [ ] Prose has no em-dash or en-dash and no banned vocabulary

## Anti-patterns

- The 2,000-line `CLAUDE.md` that nobody, human or model, reads to the end.
- Tutorials that offer five options at every step.
- Reference docs written by hand and out of date.
- "Docs coming soon".
- PR descriptions that narrate every file touched instead of saying why.

## Sources

- Diataxis: https://diataxis.fr and compass: https://diataxis.fr/compass/
- Docs as code: https://www.writethedocs.org/guide/docs-as-code/
- GitHub README guidance: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
- Standard Readme: https://github.com/RichardLitt/standard-readme
- AGENTS.md: https://agents.md
- Claude Code memory and CLAUDE.md: https://code.claude.com/docs/en/memory
- Claude Code best practices: https://code.claude.com/docs/en/best-practices
