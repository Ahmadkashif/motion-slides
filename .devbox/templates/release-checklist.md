# Release checklist: <version>

Copy into the release PR or progress.md and tick as you go. Skip lines that do not apply to the project
shape, but say why.

## Before merge

- [ ] Every task in tasks.md is `[x]`; every acceptance criterion has evidence in progress.md
- [ ] `devbox verify` is green locally and CI is green on the PR
- [ ] Review findings resolved (self review, /devbox:review, human review)
- [ ] No secrets, debug flags, TODOs without an issue, or commented-out code added
- [ ] Database or data migrations are backward compatible (expand, migrate, contract) and reversible
- [ ] Feature flag in place for risky behavior, default off
- [ ] Docs updated: README, reference docs, user-facing help, ADRs for decisions made
- [ ] CHANGELOG `[Unreleased]` entry written for humans (Added / Changed / Deprecated / Removed / Fixed / Security)

## Version

- [ ] SemVer bump chosen from the changes: breaking -> MAJOR, feat -> MINOR, fix -> PATCH
- [ ] Version set in the manifest and CHANGELOG section dated (YYYY-MM-DD)
- [ ] Tag `vX.Y.Z` on the merge commit; release notes written from the CHANGELOG

## Deploy

- [ ] Rollback plan written and tested (target: under 5 minutes)
- [ ] Deploy to staging or a canary first; watch the four golden signals (latency, traffic, errors, saturation)
- [ ] Progressive rollout (percentage, region, cohort) for anything user-facing and risky
- [ ] Post-deploy smoke test of the P1 user stories

## After

- [ ] Success metrics from spec.md are being collected
- [ ] `devbox approve ship` run and a retro entry added to progress.md
- [ ] Follow-up issues filed for anything deferred
