---
feature: 006-production-workflow-cli
status: draft   # draft | approved
created: 2026-10-23
---

# Design: Production workflow CLI

Build-plan Stage 6. This stage is the PoC finish line. Per-scene re-render (US3) and the Artifact page
(US6) come after the PoC.

## Approach

- The CLI uses `commander`. Each subcommand is a thin handler in `src/cli/commands/<name>.ts` that calls
  one core function:
  - `compileBrief` (005)
  - `voicePass` (002)
  - `renderStills` (001)
  - `render` (001)
  - `verifyFolder` (003)
  - `deliver` (this feature)
  - `doctor` (007)
- `new <brief> --through` runs these in order: compile, voice, the sign-off gate, render, verify,
  deliver. It stops at the first failure, names the step and exits with that step's code.
- **Freshness** (`src/workflow/fresh.ts`). One function, `checkFresh(folder, step)`, compares recorded
  hashes:
  - brief versus `idea.source.sha256`;
  - idea spoken script versus the manifest;
  - the MP4 SHA-256 versus `verify/report.json`.
  On a mismatch it returns the step to run first (AC1.4).
- **Sign-off** (`build/signoff.json`): `{by, date, script_sha256}`. The script hash covers every beat's
  caption and final spoken text.
  - `render --signed-off-by <name>` writes it.
  - When the brief asks for sign-off and none is recorded, or the recorded hash differs from the current
    script, `--through` stops after the voice step. It prints the script sheet and exits 10, "awaiting
    sign-off".
- **Deliver** (`src/deliver/`):
  - It refuses unless `report.json` says verified, has the same MP4 SHA-256 as the current MP4, and the
    MP4 is not a preview.
  - It writes `out/SHA256SUMS` in the standard `sha256sum` format.
  - It copies the four files and the sums to each target, through a temp name and a rename, then
    re-hashes each copy.
  - It prints the absolute MP4 path, the duration in `m:ss.s` and a one-line ready-to-send message.
  - It lists the manual checks that are still NOT VERIFIED.
  - Delivering twice is idempotent.
- **Stills** (`stills [moments...]`): with no moments, it takes one per scene at the end of the last beat,
  plus one at each counter landing, then builds a contact sheet with the 003 `contactSheet` helper on the
  PNGs.
- **CLI conventions**:
  - results on stdout; progress, logs and errors on stderr;
  - `--json` on `voice`, `verify`, `deliver` and `doctor`;
  - `NO_COLOR` honoured, and no prompts at all;
  - SIGINT aborts an `AbortController` that every core function takes, and a second SIGINT exits at once;
  - exit codes: 0 ok, 1 failure, 2 usage, 3 voice weights missing, 10 awaiting sign-off.

## Modules

| Module | Interface | Hides | New / changed |
|--------|-----------|-------|---------------|
| `cli/main` | `main(argv): Promise<number>` | commander tree, help with examples first, exit codes, renderers | changed (from 001) |
| `workflow/through` | `runThrough(brief, opts): Promise<StepResult[]>` | step order, stop on failure, sign-off gate | new |
| `workflow/fresh` | `checkFresh(folder, step): StaleReason[]` | hash comparisons | new |
| `deliver` | `deliver(folder, {copyTo[], artifact?}): Promise<DeliveryResult>` | gate check, sums, atomic copies, re-hash, message | new |

## Testing strategy

- **Golden tests.** Every `--help` (examples first), `--version`, and the `--json` schemas of `voice`,
  `verify` and `deliver` against a fixture folder.
- **Exit-code table test.** One case per code.
- **Freshness tests.** Change the brief, then `render` refuses and names `new`. Change a caption, then
  `render` refuses and names `voice`. Re-encode the MP4, then `deliver` refuses and names `verify`.
- **Sign-off tests.** A required sign-off stops with exit 10. `--signed-off-by` continues. A changed
  caption makes the sign-off lapse.
- **Deliver tests.** A copy target that is read-only fails by name. A target equal to `out/` is refused.
  A second run reports no change.
- **End to end** (`test/e2e`, needs the voice weights, otherwise reported NOT RUN):
  `motion-slides new examples/sample/brief.md --through --out <tmp>` ends VERIFIED, delivers, and leaves
  `src/` unchanged.

## Security

- A copy target is resolved and checked: it must exist, be a directory, and not be `out/` itself.
- File names come only from the validated name.
- No outward communication: the ready-to-send message is printed, never sent.
