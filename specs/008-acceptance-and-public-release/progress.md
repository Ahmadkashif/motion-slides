# Progress: Acceptance and public release

Append-only log for `008-acceptance-and-public-release`. Newest entries at the bottom. Every agent session that
touches this feature adds an entry before it ends. This file is how a fresh session (or a human)
picks up where the last one stopped, so write for a reader with zero context.

Entry format:

```
## YYYY-MM-DD HH:MM  <phase>  <task id or gate>
Did: what changed, in one to three lines.
Evidence: commands run and their result (tests, verify, screenshots, URLs).
Decisions: anything decided that is not already in spec.md or an ADR.
Next: the single next step.
```

## 2026-10-23  specify  created

Did: feature scaffolded with `devbox feature`.
Next: write spec.md (/devbox:spec).

## 2026-10-23 15:43  specify  spec drafted

Did: wrote spec.md from research-registery issue #17 and the user's feature breakdown (relayed by session
devbox-e6): 7 stories (6 P1), 27 acceptance criteria, edge cases, NFRs, scope, assumptions.
Evidence: specs only, no code. Every issue requirement is mapped to an AC in docs/architecture.md section 12
(cross-checked by script: all AC IDs exist). Clarification markers in this spec: 1.
Decisions: 2 open choices logged as "Proposed" in the Decisions log, pending grill. Not committed;
the user reviews with git diff and commits.
Next: /devbox:grill (resolve the clarification on the R1 to R3 briefs, then the proposed decisions).

## 2026-10-23 21:30  critique  design and tasks (Stage 0 and Stage 1)

Did: devbox:linus reviewed the 001 design and tasks and the 008 publish-scan design (Slice 1) in four passes.
Passes 1 to 3 returned THROW AWAY; every finding was fixed in the docs. Pass 4 returned GO with one fail-closed
MAJOR (the bundled font tripping a short-term rule) and minors, all folded in before approval.
Evidence: verdicts held in the session; key fixes are in design.md (no build step, header CSP, exact-match file
map, FontFace weight range, immediateRender false, BT.709 tags, frame count, run folder; scan fails closed,
user-owned baseline and allowed binaries, hook in the git common dir, pushed ids scanned, --text mode).
Decisions: two 001 spec amendments (lead and gap at least 0.12 s; previews under out/preview/) decided under the
build plan's delegation, flagged for the user at the PR. 008 approval covers Slice 1 (publish scan) only;
the release slice is designed in Stage 8.
Next: build 001 T001, then 008 T001, then the Stage 0 gate (001 T013).

## 2026-10-23 23:03  build  T001

Did: publish-safety scan `scripts/publish-scan.mjs` (logic in `scripts/publish-scan/lib.mjs`, no dependencies),
hook source `.githooks/pre-push` (committed 100755) and `scripts/install-hooks.mjs`, run by the new `prepare`
script. CI runs `node scripts/publish-scan.mjs --ci` right after Node setup, before apt and `npm ci`; the
headless-shell step now passes `--with-deps`. AGENTS.md has the `--text` rule, the summary-only evidence rule
and the ask-first entry for the scanner files. `tsconfig.json` now also type-checks `scripts/**/*.mjs`.
Evidence: `.devbox/bin/devbox verify`: FORMAT, LINT, TYPECHECK, TEST (2 files, 45 tests), BUILD all pass.
`npm test -- test/integration/publish-scan`: 39 tests pass. They cover every case in design.md's Testing
strategy, using planted values built at run time and checking that no planted value shows up in stdout or
stderr. Fourteen faults planted one at a time each turned a test red: camelCase on in binary, plural rule for
any case, hook without `--include`, no byte compare, trees skipped, no UTF-16 view, paths not labelled,
baseline ignored, opaque rule in `--ci`, no IP digit boundary, allowed list ignored, password-database home
ignored, empty list accepted, shallow clone accepted. I unset `core.hooksPath` and removed the hooks folder,
then ran `npm ci`: `core.hooksPath` came back as `<git common dir>/motion-slides-hooks`, and `test -x` passes
on its `pre-push`. Repository check with the real private list, before this commit:
`publish-scan: full, 284 objects, 3 refs, 0 findings` (exit 0); `--ci`: `publish-scan: ci, 284 objects, 3 refs,
0 findings` (exit 0).
Decisions (gaps the design left open, resolved here):
- A finding line reads `<rule> <label> in <location> fingerprint <16 hex>`, then ` -- IN HISTORY: ...` or
  ` -- accepted by the user (baseline)`. The rule ids are `private-term`, `host-name`, `user-name`,
  `home-path`, `ip-address`, `secret` and `opaque-binary`. Labels look like `<secret:github-token>` and
  `<opaque:zip>`. One finding per rule, label and location.
- `<private term #n>` counts terms only (comments and blank lines are skipped). `#` starts a comment
  anywhere on a line. A term listed twice (ignoring case) keeps its first position.
- Tree entry names are reported as `tree <oid> <path>` (a location the design did not list), once per path,
  with the path in the fingerprint. A name repeated across many trees is then one finding, and its baseline
  entry survives new commits.
- Ref-name findings count as history: they can be baselined and print the IN HISTORY advice, because a
  pushed branch name stays visible in pull requests.
- `<n> findings` counts failing findings only; baselined ones are listed but not counted. `<objects>` counts
  history objects plus the working-tree files read.
- The user name comes from the password database only (HOME gives a home path, not a user name).
  `localhost` is never a host-name fact. Commits are scanned in author, committer and message; signatures
  and object ids are skipped. Tag signature blocks are skipped too.
- Secret rules have lookbehinds and minimum lengths. A key-shaped run inside a longer identifier does not
  match, and neither do kebab-case words after `sk-`.
- Exit-2 messages never print a path: the lists show as `~/.config/...`, and home paths in git's error text
  are masked.
Follow-up: the hook passes only local object ids. A push to a remote ref whose name holds a term
(`git push origin HEAD:refs/heads/<name>`) is caught only once the remote-tracking ref exists locally, after
the push. Scanning the `<remote ref>` field from the hook's standard input would close this. That needs a
design change (a new CLI argument).
Next: the Stage 0 gate (001 T013).

## 2026-10-23 23:05  build  T001 follow-up: pushed ref names

Did: closed the gap the T001 worker logged: the hook now passes each pushed remote ref name as `--push-ref`,
and the scanner checks it before the push makes it public (location `pushed-ref`, never baselined).
Deletions are skipped so a badly named branch can always be deleted. Design updated to match.
Evidence: two new integration tests (a push to `refs/heads/plan-<term>` is blocked with the term absent from
the output; a malformed `--push-ref` is exit 2); publish-scan suite 41 passed; devbox verify green.
Next: Stage 0 gate (001 T013).

## 2026-10-23 23:54  build  T001 follow-up: QA findings on the publish scan

Did: fixed the QA findings. `vitest.config.ts` keeps `.claude/**` (agent worktrees) out of `npm test`. Every git
command of the scan runs with `GIT_NO_REPLACE_OBJECTS=1`, so a `git replace` stand-in hides nothing. The hook
now lives in `<git common dir>/hooks/pre-push`, git's default folder, which moves with the clone and is shared by
every worktree; install-hooks removes a local `core.hooksPath` and the old `motion-slides-hooks` folder, and full
mode checks that `git rev-parse --git-path hooks` resolves there. Commit and tag objects are scanned whole (every
header, `mergetag` and `encoding` included, and the message), skipping only genuine signature armour and exact
object-id lines. Terms and host facts match outside ASCII (NFC, Unicode case-insensitive, plus latin1 bytes), in
content, names, commits and pushed refs, and printed names are masked in both readings. A deletion-only push
passes unscanned. `#` starts a comment only at the start of a line. Known limits are listed in design.md.
Evidence: `npm test -- test/integration/publish-scan`: 53 passed (12 new, 9 updated). Each new test was run red
before its fix, for the expected reason; three mutations of the non-ASCII code each turned tests red.
`.devbox/bin/devbox verify`: FORMAT, LINT, TYPECHECK, TEST (2 files, 59 tests), BUILD all pass.
`node scripts/install-hooks.mjs` migrated this clone (no `core.hooksPath`; hook executable and byte-identical;
old folder gone). Repository check with the real private list: `publish-scan: full, 497 objects, 4 refs,
0 findings` (exit 0); `--ci`: `publish-scan: ci, 497 objects, 4 refs, 0 findings`.
Decisions:
- `Version:` and `Comment:` lines inside genuine armour are still scanned (written text); only base64 and blank
  lines are skipped. Lines that are exactly `tree|parent|object <id>` are skipped (hex trips short terms).
- A commit header git does not write itself prints as `header`, so a crafted header name is never echoed.
- `--push-ref` refuses U+FFFD: Node turns argument bytes that are not UTF-8 into it, so such a name cannot be
  scanned as git holds it (fail closed).
- Findings are kept per rule, label, subject and location, so two names that print alike stay two findings.
- The hook exits 0 only when it read at least one line and every line is a deletion; an empty local id is
  passed on and refused (exit 2).
- tasks.md T001 Verify now names `<git common dir>/hooks/pre-push` with no `core.hooksPath`.
Note: during this session the shared git config went back to the old `core.hooksPath` once, from outside this
checkout (the older installer, run in a checkout that does not have this change yet). Re-running install-hooks
fixed it. Until every checkout of this clone has the new installer, running the old one reverts the migration,
and this checkout's full scan then exits 2.
Next: Stage 0 gate (001 T013).
