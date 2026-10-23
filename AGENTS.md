# AGENTS.md

Instructions for AI coding agents (and the humans working with them) in **motion-slides**.
Read this file before every task. Keep it short, specific and true; when something here is wrong,
fix it in the same PR that discovered it.

## Project

motion-slides turns a Markdown storyboard brief into a narrated, captioned explainer MP4, entirely on
the local machine. A brief compiles into an idea file (the single source of truth) and a scene built from
a library of flat, brand-themed components; one paused animation timeline is captured frame by frame and
encoded; narration comes from a local voice (Supertonic 3, voice M3); and a verify gate checks every
video against a fixed bar before delivery. It is for people who would rather send a short video than a
document, driven from one CLI, `motion-slides` (`new`, `voice`, `stills`, `render`, `verify`, `deliver`,
`doctor`). Current state: specification only. Eight feature specs are drafted in `specs/` (roadmap and
requirement coverage in `docs/architecture.md`), and there is no code yet. The repository is public, so
constitution article P6 (no company content) applies to every push.

- Shape: `cli` (playbooks in `.devbox/playbooks/shapes/`)
- Stack: `node` (toolchain defaults in `.devbox/playbooks/languages.md`)
- `specs/`: one folder per feature, 001 to 008 in build order (spec first, then design and tasks).
- `docs/`: architecture, roadmap, requirement coverage and glossary; decisions in `docs/adr/`.
- `.devbox/`: DevBox config, constitution (project articles P1 to P7), playbooks and templates.
- `.github/`: CI workflow, issue and PR templates, Dependabot.

## Commands

TODO(devbox): fill in exact commands with versions where it matters.

- Setup: `TODO`
- Run locally: `TODO`
- Verify, before every commit and before claiming anything is done: `devbox verify`
  (or `.devbox/bin/devbox verify` when DevBox is not installed), which runs
- `npm run --if-present format:check`
- `npm run --if-present lint`
- `npm run --if-present typecheck`
- `npm test`
- `npm run --if-present build`

## How work flows here

This project uses the DevBox lifecycle (`.devbox/playbooks/lifecycle.md`). Pick the lane first:

- **Patch** (bug fix or small change, under a day): reproduce, write a failing test, fix, verify, PR.
- **Feature**: `devbox feature "<name>"`, then spec, grill, design, slice, critique, build, verify, ship.
- **Product** (new system or major capability): intake and constitution first, then features.

Every feature lives in `specs/NNN-name/` (`spec.md`, `design.md`, `tasks.md`, `progress.md`).
Files on disk are the source of truth; chat history is not. `devbox status` shows where everything is.
In Claude Code, `/devbox:deliver` drives the whole thing.

## Boundaries

Always:
- Read the relevant spec, design and the last `progress.md` entry before changing code.
- Write the failing test first, then the code. Test behavior through public interfaces.
- Keep changes small and on one task. Commit early with Conventional Commits that cite the task id.
- Run `devbox verify` and show the output before saying something works.
- Log progress in the feature's `progress.md` before ending a session.

Ask first:
- Adding a dependency, a new service, or a new top-level directory.
- Changing a public API, a database schema, CI, or anything in `.devbox/`.
- Anything that touches auth, payments, personal data, or production infrastructure.
- Deviating from the approved spec or design (update the doc and get approval, do not drift).

Never:
- Commit secrets, credentials or `.env` files. Never print them in logs.
- Disable, skip or weaken tests, lint, type checks or git hooks to get green (`--no-verify` is banned).
- Push to protected branches, force-push shared branches, merge your own PR, or deploy to production.
- Delete data, rewrite published history, or run destructive commands without explicit approval.
- Guess at requirements. Mark the gap with a clarification marker and ask.

## Code conventions

TODO(devbox): the conventions a newcomer would get wrong. Show one short real example of the
house style rather than describing it.

- Prefer deep modules: small interfaces that hide real complexity. No pass-through layers.
- Handle errors at the boundary where you can do something useful; never swallow them silently.
- Structured logs, no secrets or personal data in logs.
- Comments explain why, not what.

## Testing

- Unit and integration tests live: TODO(devbox)
- Mock only at system boundaries (network, clock, randomness, third-party APIs). Never mock our own modules.
- A bug fix starts with a test that reproduces the bug.

## Git and pull requests

- Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`. Short-lived; merge within a few days.
- Commits: Conventional Commits (`feat(scope): ...`, `fix: ...`, `BREAKING CHANGE:` footer when needed).
- PRs: use the template, link the spec and tasks, paste verify evidence, keep them reviewable (aim for under ~400 changed lines).

## Where to find things

- Specs and task lists: `specs/`
- Architecture overview: `docs/architecture.md`; decisions: `docs/adr/`
- Principles we do not break: `.devbox/constitution.md`
- Playbooks (testing, security, API design, review, release, operations): `.devbox/playbooks/`

## Lessons learned

One line each, newest last. Add a line whenever an agent or a human gets bitten by something
this file could have prevented.

- Examples in docs and tests (matching rules, fixtures) use made-up stand-ins, never an entry from the private terms list.
