# Playbooks

The DevBox knowledge base. Skills and agents link here; `devbox init` copies the core playbooks and the chosen shape playbooks into each project's `.devbox/playbooks/` so any agent (Claude Code, Codex, Cursor, Copilot) can read them. `devbox sync` refreshes the copies.

Each playbook follows the same shape: when to read it, rules as imperatives, a checklist, anti-patterns, and sources.

## Start here

| Playbook | Read when |
|----------|-----------|
| [lifecycle.md](lifecycle.md) | Always first: the DevBox phases, lanes, gates and artifacts |

## Core

| Playbook | Read when |
|----------|-----------|
| [principles.md](principles.md) | Writing the constitution, reviewing a design, or settling "the right way" |
| [requirements.md](requirements.md) | Writing or grilling `spec.md`: JTBD, stories, EARS, NFRs, clarification |
| [architecture.md](architecture.md) | Writing `design.md` or `docs/architecture.md`: C4, arc42, ADRs, migrations, reversibility |
| [testing.md](testing.md) | Before any code: canon TDD, tracer bullets, good tests, property, contract and mutation testing |
| [code-review.md](code-review.md) | Reviewing or receiving review: Google eng-practices, three lenses, severity, verification |
| [git-and-release.md](git-and-release.md) | Branching, committing, PRs, SemVer, changelogs, releases, rollback, DORA |
| [security.md](security.md) | Auth, data, dependencies, CI: OWASP Top 10:2025, ASVS, STRIDE, secrets, supply chain |
| [operations.md](operations.md) | Anything in production: 12-factor, SLOs, golden signals, OpenTelemetry, incidents |
| [documentation.md](documentation.md) | READMEs, docs, AGENTS.md, CLAUDE.md, and the voice rules for PRs and commits |
| [api-design.md](api-design.md) | Any HTTP, gRPC, GraphQL, event or webhook contract |
| [process.md](process.md) | Where DevBox comes from, lanes, and what it borrowed from each method |
| [ai-assisted-development.md](ai-assisted-development.md) | Working with coding agents: context, loops, guardrails, subagents |
| [languages.md](languages.md) | Toolchain defaults per language and the `.devbox/config` verify gates |

## Shapes

Per-project-shape playbooks in [shapes/](shapes/): default architecture, NFRs, testing strategy, checklist and pitfalls. `devbox init --shape a,b` installs the ones a project needs; `devbox shapes` lists them.

| Shape | For |
|-------|-----|
| [web-app](shapes/web-app.md) | Web frontends, SPAs, SSR and full-stack web apps |
| [api-service](shapes/api-service.md) | Backend APIs and services (REST, gRPC, GraphQL, workers) |
| [cli](shapes/cli.md) | Command-line tools |
| [library](shapes/library.md) | Libraries, SDKs and packages |
| [mobile](shapes/mobile.md) | iOS, Android and cross-platform mobile apps |
| [desktop](shapes/desktop.md) | Desktop apps (Electron, Tauri, native) |
| [data-pipeline](shapes/data-pipeline.md) | Data pipelines and analytics engineering |
| [ml-system](shapes/ml-system.md) | Machine learning systems and MLOps |
| [llm-app](shapes/llm-app.md) | LLM features, RAG and AI agents |
| [infrastructure](shapes/infrastructure.md) | Infrastructure as code, platforms, Kubernetes |
| [embedded](shapes/embedded.md) | Embedded systems and firmware |
| [game](shapes/game.md) | Games |
| [browser-extension](shapes/browser-extension.md) | Browser extensions (Manifest V3) |
| [smart-contract](shapes/smart-contract.md) | Smart contracts |

## How to use them

- Agents: read `lifecycle.md`, then the playbook for the phase you are in, then the shape playbook for the project.
- Humans: skim the Rules and Checklist sections; the Sources are there when you want the full argument.
- Change a playbook in DevBox itself (not the vendored copy), then `devbox sync` in each project.
