# Principles

Read this before writing a constitution, reviewing a design, or arguing about "the right way". It explains the ten DevBox constitution articles and the design principles behind them.

The project copy of the articles lives in `.devbox/constitution.md`. That file is the authority; this playbook is the reasoning. When a spec, design or plan conflicts with an article, the conflict is a CRITICAL finding unless `design.md` records a justified exception in its Constitution check table.

## The ten articles

### I. Specification before code

- **Why:** a bad line in a spec becomes hundreds of bad lines of code. Reviewing a one-page spec is cheaper than reviewing a 2,000-line diff. Spec Kit, Kiro, superpowers and BMAD all gate code on an approved spec for this reason.
- **Apply:** every feature starts with `specs/NNN-name/spec.md` (what and why, no stack), approved with `devbox approve spec`. Patch-lane work skips the spec but must start from a reproduction.
- **Source:** github/spec-kit spec-driven.md; HumanLayer ACE-FCA.

### II. Test first

- **Why:** a test written after the code tends to test what the code does, not what it should do. A test you watched fail proves it can detect the bug.
- **Apply:** red, green, refactor, one behavior at a time, through public interfaces. Spikes are allowed, labelled, and thrown away. See `testing.md`.
- **Source:** Kent Beck, Canon TDD; obra/superpowers test-driven-development.

### III. Small vertical slices

- **Why:** small batches cut lead time and change fail rate (DORA). Vertical slices surface integration problems on day one instead of at the end.
- **Apply:** every task in `tasks.md` is a thin end-to-end path that is demoable on its own. Integrate into main at least daily. PRs aim for about 100 lines and should rarely pass 400.
- **Source:** trunkbaseddevelopment.com; dora.dev capabilities (small batches); Matt Pocock tracer bullets.

### IV. Simplicity

- **Why:** complexity is the main cost of software (Ousterhout). Speculative generality is complexity with no payoff.
- **Apply:** build only what the approved spec needs. Prefer deep modules. Wait for the third duplicate. Justify every new dependency, layer or service in `design.md`.
- **Source:** A Philosophy of Software Design; martinfowler.com/bliki/Yagni.html; Gall's law.

### V. Evidence over assertion

- **Why:** agents (and tired humans) report success they did not observe. "Should work now" is not evidence.
- **Apply:** run the command, read the output and exit code, then claim. Record evidence in `progress.md`. `devbox verify` is the minimum bar.
- **Source:** superpowers verification-before-completion; Anthropic Claude Code best practices ("give Claude a check it can run").

### VI. Secure by default

- **Why:** security bolted on later is security that misses the design flaws (OWASP A06 Insecure Design).
- **Apply:** least privilege, validate at trust boundaries, encode output, fail closed, secrets never in code, logs or prompts. Threat-model auth, money, personal data and untrusted input. See `security.md`.
- **Source:** OWASP Top 10:2025; OWASP ASVS 5.0; NIST SSDF.

### VII. Observable and operable

- **Why:** you cannot fix what you cannot see, and you cannot ship fast if you cannot roll back fast.
- **Apply:** structured logs, metrics and traces for production code; config in the environment; rollback in minutes; backward compatible migrations. See `operations.md`.
- **Source:** 12factor.net; Google SRE book; OpenTelemetry.

### VIII. Decisions are recorded

- **Why:** without a record, reasons evaporate and agents undo deliberate choices.
- **Apply:** `devbox adr "<title>"` for hard-to-reverse or cross-module decisions. Never edit an accepted ADR; supersede it.
- **Source:** Michael Nygard 2011; MADR 4.

### IX. Humans own the irreversible

- **Why:** an agent cannot be held accountable, and one-way doors (data loss, production outages, money, public statements) cannot be undone.
- **Apply:** agents propose; humans approve merges to protected branches, production deploys, real data changes, spending, credential rotation and external communication. `devbox run` refuses protected branches.
- **Source:** OWASP LLM06 Excessive Agency; OWASP Agentic Top 10 2026; Amazon one-way vs two-way doors.

### X. Leave it better

- **Why:** code health decays unless every change pushes the other way (Google reviewer standard: approve when the change improves overall code health).
- **Apply:** fix the confusing name you tripped on, add the missing test, write the lesson into `AGENTS.md`. Keep unrelated refactors in their own PR.
- **Source:** google.github.io/eng-practices.

## Design principles

### Deep modules (A Philosophy of Software Design)

Complexity shows up as change amplification, cognitive load and unknown unknowns. It comes from dependencies and obscurity.

- Build deep modules: a small, simple interface over a powerful implementation.
- Hide design decisions inside the module (information hiding). If two modules must change together, the boundary is wrong.
- Avoid shallow pass-through layers. **Deletion test:** if deleting a module makes complexity vanish rather than move, it was a pass-through.
- Pull complexity downward: the module author suffers so callers do not.
- Define errors out of existence where possible (an idempotent delete that succeeds on a missing key needs no error path).
- Design it twice: sketch two different interfaces before committing to one.
- The interface is the test surface. Tests at the interface survive refactors.
- One adapter is a hypothetical seam; two adapters make it a real seam.

### SOLID

| Principle | Rule | Smell when violated |
|-----------|------|---------------------|
| Single responsibility | One reason to change per module | A file changes for unrelated features |
| Open/closed | Extend without editing stable code | Every new case edits a giant switch |
| Liskov substitution | Subtypes honor the base contract | `instanceof` checks before calls |
| Interface segregation | Small, client-specific interfaces | Implementers stub methods with `throw` |
| Dependency inversion | Policy owns the abstraction; details implement it | Domain imports the database driver |

Apply SOLID where it reduces change cost. Do not create an interface with one implementation and no test that needs a second.

### Domain-driven design essentials

- Build a **ubiquitous language** with domain experts and use it in code, specs and conversation. Record it in the glossary in `docs/architecture.md`.
- Draw explicit **bounded contexts**, each with its own model. The same word (Account, Order) may mean different things in different contexts, and that is fine.
- Map relationships between contexts: anti-corruption layer when integrating a messy upstream, published language for shared contracts.
- An **aggregate** is a consistency boundary. Change one aggregate per transaction, reference other aggregates by ID, keep aggregates small.
- Use domain events to communicate between aggregates and contexts.

### Hexagonal and clean architecture

- Dependencies point inward toward the domain.
- The domain defines ports (interfaces it needs); adapters (HTTP, database, queue, filesystem, LLM provider) implement them at the edge.
- Frameworks and I/O stay at the edge, so the core is testable without infrastructure.
- Do not build the full ceremony for a CRUD app. A thin service layer over a well-named data module is often enough.

### YAGNI and KISS

- Build only what is needed now, in the simplest form that works.
- "We might need it later" is not a requirement. Put it in the spec's out-of-scope list.
- Configuration options, plugin systems and generic frameworks need a second real user before they exist.

### DRY, with caveats

- DRY is about duplicated **knowledge**, not similar-looking code. Two functions that look alike but change for different reasons are not duplication.
- **Rule of three:** tolerate two copies; abstract on the third, when you know what varies.
- **Prefer duplication over the wrong abstraction** (Sandi Metz). When an abstraction grows flags and special cases, inline it and start again.

### Gall's law

A complex system that works always evolved from a simple system that worked. Ship a walking skeleton first (the thinnest end-to-end path, deployed, CI green), then grow it. Big-bang designs fail.

## Checklist

- [ ] The project has `.devbox/constitution.md`, reviewed at intake, with project-specific articles added
- [ ] Every design has a Constitution check table filled in
- [ ] Exceptions name the simpler alternative and why it was rejected
- [ ] New modules pass the deletion test and have a small interface
- [ ] No abstraction exists with a single caller and no second use in the spec
- [ ] Domain terms in code match the glossary

## Anti-patterns

- Constitution as wallpaper: articles nobody checks during critique.
- Architecture astronautics: ports, adapters and factories around a two-table CRUD app.
- Premature microservices: network boundaries before module boundaries are understood.
- Shallow wrappers: a `UserService` that forwards every call to `UserRepository`.
- Flag-driven abstractions: one function with five booleans serving five callers.
- "Clean it up later" with no issue and no owner.

## Sources

- Ousterhout, A Philosophy of Software Design: https://web.stanford.edu/~ouster/cgi-bin/book.php
- DDD Reference: https://www.domainlanguage.com/ddd/reference/
- Bounded context: https://martinfowler.com/bliki/BoundedContext.html
- Hexagonal architecture: https://alistair.cockburn.us/hexagonal-architecture/
- Clean architecture: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- YAGNI: https://martinfowler.com/bliki/Yagni.html
- The wrong abstraction: https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction
- Spec Kit: https://github.com/github/spec-kit
- Google eng-practices: https://google.github.io/eng-practices/
- DORA capabilities: https://dora.dev/capabilities/
