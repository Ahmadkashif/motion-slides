# Git and release

Read this before branching, committing, opening a PR, cutting a release (`/devbox:ship`), or when CI and main drift apart.

The goal is small batches flowing into one trunk, every change reviewable and reversible, every release traceable to the commits and specs that produced it.

## Trunk-based development

- Integrate into `main` at least once every 24 hours. Long-lived branches are a smell.
- Use short-lived, single-owner branches whose only purpose is review and CI. Delete them after merge.
- Run the full local verify (`devbox verify`) before pushing. CI must verify every merge to main.
- Hide unfinished work behind **feature flags**, default off. Remove flags once the feature is fully rolled out.
- For large changes, use **branch by abstraction**: introduce an interface, move callers to it, swap the implementation behind it, delete the old one. Each step merges separately.
- Release from trunk and fix forward. If you need release branches, cut them just in time and delete them after.

## Branches

| Prefix | Use |
|--------|-----|
| `feat/<slug>` | new capability (usually one DevBox feature or slice) |
| `fix/<slug>` | bug fix |
| `chore/<slug>` | tooling, deps, CI, docs-only |
| `refactor/<slug>` | behavior-preserving change |
| `spike/<slug>` | throwaway exploration; never merged |

`devbox run` refuses to work on protected branches (`DEVBOX_PROTECTED_BRANCHES` in `.devbox/config`). Create a work branch first.

## Conventional Commits 1.0

```
type(scope)!: short imperative description

Optional body: why the change, not what (the diff shows what).

Refs: T004, specs/003-export-csv
BREAKING CHANGE: the /v1/export endpoint now returns a job id instead of the file
```

| Type | Use | Version bump |
|------|-----|--------------|
| `feat` | new capability | MINOR |
| `fix` | bug fix | PATCH |
| `perf` | performance improvement | none (PATCH if user-visible) |
| `refactor` | behavior-preserving change | none |
| `test` | tests only | none |
| `docs` | docs only | none |
| `build`, `ci`, `chore` | tooling, pipelines, housekeeping | none |
| any with `!` or `BREAKING CHANGE:` footer | breaking change | MAJOR |

Rules:

- Subject in imperative mood, lower case after the colon, no trailing period, about 72 characters max.
- Footer tokens use hyphens: `Refs:`, `Reviewed-by:`, `Co-Authored-By:`. `BREAKING CHANGE` must be uppercase.
- Cite the DevBox task id in the subject or a `Refs:` footer.
- Commit early and often during a task; a partial commit beats lost work. Squash or tidy before merge if the project prefers.
- Never use `--no-verify`. Never commit secrets, `.env` files, or `.devbox/runs/`.
- Follow any project or global commit-trailer rules in `AGENTS.md` or `CLAUDE.md`.

Examples:

```
feat(auth): reject expired session tokens (T004)
fix(export): stream rows instead of loading all into memory (T011)
refactor(orders): extract pricing into a pure module
docs(adr): record choice of PostgreSQL for order storage
feat(api)!: return export job id instead of file body
```

## Semantic Versioning 2.0

- Declare a public API first (endpoints, CLI flags, library exports, file formats). SemVer applies to it.
- MAJOR for incompatible changes, MINOR for backward compatible features, PATCH for backward compatible fixes. Reset lower numbers to 0 on a bump.
- `0.y.z` means anything may change. `1.0.0` is the first stable public API.
- Pre-release: `1.0.0-rc.1` (ranks below `1.0.0`). Build metadata `+sha.abc123` is ignored for precedence.
- **Never modify a released version.** Every change gets a new version.

## Changelog (Keep a Changelog)

Keep a Changelog 2.0.0 revises the guidance; the file format is the same as 1.1.0.

```markdown
# Changelog

## [Unreleased]

## [1.4.0] - 2026-10-21
### Added
- CSV export for order history (#123)
### Fixed
- Expired sessions no longer stay valid after the clock migration
### Security
- CVE-2026-XXXX: upgrade parser to patched version
```

- Written for humans, newest first, ISO dates, an `[Unreleased]` section on top.
- Six change types: Added, Changed, Deprecated, Removed, Fixed, Security. Label breaking entries **Breaking:**. Lead Security entries with the CVE.
- Dependency bumps and known issues are not change types; mention them only when they change behavior.
- Mark pulled releases `[YANKED]`. Link each version to its diff.
- Generated or LLM-drafted changelogs are drafts; edit them for humans.

## Pull requests

- Use `.github/pull_request_template.md`: what and why, linked spec and task, verification evidence, risk and rollback.
- Aim for under about 400 changed lines; 100 is ideal. Split by vertical slice.
- The PR title follows Conventional Commits (it often becomes the squash commit).
- CI green, review findings resolved, and the release checklist (`.devbox/templates/release-checklist.md`) applied for user-facing changes.
- Agents open PRs and request review; humans merge to protected branches.

## Release process

1. All tasks in `tasks.md` are `[x]`; verify and CI are green; review is done.
2. Choose the SemVer bump from the commits since the last tag.
3. Move `[Unreleased]` entries into a dated version section. Update the version in the manifest.
4. Merge the release PR. Tag the merge commit `vX.Y.Z` and publish release notes from the changelog.
5. Publish artifacts only from CI, with provenance (SLSA, Sigstore, trusted publishing via OIDC). Attach an SBOM.
6. Deploy progressively (see `operations.md`), watch the golden signals, run smoke tests on P1 journeys.
7. `devbox approve ship` and add a retro entry to `progress.md` (`/devbox:retro`).

## Rollback

- Every release has a written rollback: redeploy the previous version, flip the flag off, or revert the commit. Target: under five minutes.
- Prefer reverting the change over hot-patching under pressure. Fix forward once calm.
- Database changes must be backward compatible so the previous version still runs (expand, migrate, contract).

## DORA: measure the delivery system

| Group | Metric | Meaning |
|-------|--------|---------|
| Throughput | Change lead time | commit to running in production |
| Throughput | Deployment frequency | how often you deploy |
| Throughput | Failed deployment recovery time | time to restore after a bad deploy |
| Instability | Change fail rate | share of deploys needing immediate intervention |
| Instability | Deployment rework rate | unplanned deploys caused by production incidents |

What moves them: continuous integration, trunk-based development, test automation, deployment automation, small batches, loosely coupled architecture, monitoring, streamlined change approval, fast feedback. DORA 2025 found AI amplifies whatever system it lands in: strong version control, small batches and good platforms make agents productive; weak ones make them dangerous.

## Checklist

- [ ] Branch is short-lived and not protected
- [ ] Commits follow Conventional Commits and cite the task
- [ ] PR is small, described, with evidence
- [ ] Version bump matches the change type
- [ ] CHANGELOG updated for humans
- [ ] Tag on the merge commit; artifacts built in CI with provenance
- [ ] Rollback written and possible in under five minutes

## Anti-patterns

- Month-long feature branches and merge-day pain.
- "WIP" and "fix stuff" commit messages.
- Force-pushing shared branches; rewriting published history.
- Breaking changes in a PATCH release.
- Releases built on a laptop.
- Changelogs that are a raw commit dump.

## Sources

- Trunk-based development: https://trunkbaseddevelopment.com
- Conventional Commits: https://www.conventionalcommits.org/en/v1.0.0/
- SemVer: https://semver.org/spec/v2.0.0.html
- Keep a Changelog: https://keepachangelog.com/en/2.0.0/ (format: https://keepachangelog.com/en/1.1.0/)
- DORA metrics: https://dora.dev/guides/dora-metrics/
- DORA 2025 report: https://dora.dev/research/2025/dora-report/
- Google author guide (small CLs): https://google.github.io/eng-practices/review/developer/small-cls.html
