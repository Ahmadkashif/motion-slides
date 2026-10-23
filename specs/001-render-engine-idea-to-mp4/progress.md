# Progress: Render engine: idea to MP4

Append-only log for `001-render-engine-idea-to-mp4`. Newest entries at the bottom. Every agent session that
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
devbox-e6): 9 stories (7 P1), 40 acceptance criteria, edge cases, NFRs, scope, assumptions.
Evidence: specs only, no code. Every issue requirement is mapped to an AC in docs/architecture.md section 12
(cross-checked by script: all AC IDs exist). Clarification markers in this spec: 0.
Decisions: 8 open choices logged as "Proposed" in the Decisions log, pending grill. Not committed;
the user reviews with git diff and commits.
Next: /devbox:grill (confirm or override the proposed decisions in the Decisions log).

## 2026-10-23 22:30  critique  design and tasks (Stage 0 and Stage 1)

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

## 2026-10-23 22:34  build  T001

Did: walking skeleton. package.json with the exact pins and no build script, both tsc projects, Biome, vitest,
`.nvmrc`, `.gitignore`, the `motion-slides` bin (`--help`, `--version`, exit 0 and 2), CI on master with Ubuntu
24.04, Node from `.nvmrc`, apt ffmpeg and strace and the headless shell; Dependabot ignores playwright-core;
AGENTS.md Commands and Testing filled in.
Evidence: `.devbox/bin/devbox verify`: FORMAT pass, LINT pass, TYPECHECK pass, TEST pass (1 file, 6 tests),
BUILD pass (no build script, skipped by `--if-present`). Golden tests in `test/golden/cli.test.ts`: `--help`,
`--version`, unknown option (exit 2), unknown command (exit 2), no command (help on stderr, exit 2), stdout
closed early (exit 0, empty stderr). Each gate was also shown to fail on a planted fault (an unformatted file, a
`==` comparison, unsorted imports, a type error in `main.ts`, a bad import in the bin, a wrong gsap type in a
stage file), and the faults were removed. After `npm ci && npm test` no file changed; `git check-ignore
node_modules/ build/ out/ | wc -l` prints 3. CI green is checked at ship.
Decisions: no arguments prints help on stderr and exits 2. A stray word is reported as an unknown command
(commander says "too many arguments" while there are no subcommands). EPIPE on stdout is ignored, so
`--help | head -1` exits 0 without a stack trace. The lint gate is `biome check --formatter-enabled=false
--error-on-warnings` (rules plus import order; warnings fail, per P7). Biome uses spaces, single quotes and
100 columns. `tsconfig.json` also checks `bin/*.js`; `tsconfig.stage.json` takes `src/stage/types/gsap.d.ts`
as its first input. Both projects use `skipLibCheck`. CI caches npm through setup-node.
Next: 008 T001 (publish scan), then the Stage 0 gate (001 T013).
