---
feature: 005-storyboard-brief-compiler
status: draft   # draft | approved
created: 2026-10-23
---

# Design: Storyboard brief compiler

This is build-plan Stage 5.

## Brief format (documented in `docs/brief-format.md`; template in `examples/template/brief.md`)

````markdown
---
title: "Made-up title"          # required
kicker: "Sample"
subtitle: "..."
footer: "..."
audience: "Team leads"
cap: 90                          # length target in seconds, required
sample: true                     # marks a made-up sample (005 AC7.2)
signoff: none                    # none | required | { by: "Name", date: "2026-10-23" }
delivery: ["~/Videos/out"]
disclaimer: "All names and figures are made up."
disclosure: "AI narration"       # optional; default "AI narration"
brand:
  colors: { background: "#0F172A", text: "#F8FAFC", accent: "#F59E0B" }
  fonts: { heading: Inter, body: Inter, numbers: Inter }   # bundled name or a path
  wordmark: "Northwind Cafe"
  logo: ./logo.svg               # optional
pronunciations: { Northwind: "North wind" }
figures:
  - { name: cups_per_day, value: 420, format: "#,##0" }
  - { name: price, value: 3.5, format: "$#,##0.00" }
  - { name: daily_sales, formula: "cups_per_day * price", value: 1470, format: "$#,##0" }
banned_terms: ["guaranteed"]
timing: { opener: 2.0, lead: 0.8, gap: 0.25, tail: 4.0 }   # optional
---

## Scene: Morning rush
<!-- dense -->

- Every morning, the cafe pours 420 cups.
- That is $1,470 before nine o'clock.
  - say: That is one thousand four hundred seventy dollars before nine o'clock.

```yaml
components:
  - { id: sales, type: counter, figure: daily_sales, from: 0 }
cues:
  - { line: 2, at: 0.2, target: sales, action: run, duration: 1.5 }
```
````

- The front matter is YAML, parsed with `yaml` and a `LineCounter`, so every error carries a line number.
- A scene starts with `## Scene: <title>`. A `<!-- dense -->` comment flags the scene as dense.
- Each top-level `- ` item is one narration line, which becomes one beat. A nested `- say:` item holds
  the spoken override.
- One fenced `yaml` block per scene declares the components and the cues. A cue names its narration
  `line` (1-based within the scene) and an `at` offset in seconds.
- Anything else in a scene is an error that names the line. Markdown inside a narration line is kept as
  literal characters.

## Approach

- The parser is a hand-written line scanner over the normalised text (BOM stripped, CRLF changed to LF,
  tabs accepted). It produces an AST that keeps line numbers.
- The compiler maps the AST to the idea contract (001 table):
  - front-matter fields map to the idea fields;
  - `source` is `{file: basename, sha256}`;
  - scene ids are `s1`, `s2`, and so on;
  - components are validated against the 004 registry, figure references are checked by name (with the
    closest names suggested), and the figures table goes through the 003 `evaluateFigures`.
- Errors are collected, not thrown, up to 50, then reported as `file:line: found X, expected Y`.
- When there is any error, nothing is written.
- Output: `idea.json` (stable key order, 2-space indent, trailing newline) and `scene.html`. The scene
  page is a byte-for-byte copy of the product's page shell `src/stage/scene.html` (001). It holds no
  idea text (AC2.4), so it is identical for every brief of the same product version. The engine never
  reads this copy: it serves its own shell and sends the CSP as a response header (001 design). The
  composition lives in `idea.scenes[].components`.
- Re-compile safety: `build/compile-state.json` records the SHA-256 of both files as written. If either
  file on disk differs from that record, the compiler refuses unless `--force` is given (AC6.1).
- Repository guard: the compiler resolves the real path of the target folder. If that folder is inside
  the product repository (found by walking up to the `package.json` named `motion-slides`) and the brief
  has no `sample: true`, it refuses (AC7.2).

## Modules

| Module | Interface | Hides | New / changed |
|--------|-----------|-------|---------------|
| `brief/parse` | `parseBrief(text, file): Result<BriefAst, BriefError[]>` | normalisation, front matter, scene scanner, line tracking | new |
| `brief/compile` | `compileBrief(briefPath, outFolder, {force}): Result<{ideaPath, scenePath}, BriefError[]>` | mapping, cross-checks, deterministic serialisation, safe re-compile, repository guard | new |

## Testing strategy

- **Golden tests.** The sample brief compiles to a checked-in `idea.json`. The blank template compiles
  with only the expected "fill me in" errors.
- **Broken-brief table.** About 20 small briefs, each paired with its expected error lines: missing
  title, bad hex, unknown component, unknown parameter, a cue to a missing line, a figure cycle, a
  duplicate figure, an empty narration line, a short hex, sign-off without a date, more than 1 MB.
- **Tricky text.** `$1,000`, `$&`, `$1`, `` $` ``, `$$`, `<b>`, `&amp;`, quotes, a backslash, emoji and
  Arabic all survive byte for byte into `idea.json`. 001 then shows them literally.
- **Determinism.** Compiling twice gives byte-identical files. An `strace`-free check proves no network
  is used: the compile module does not import `node:net`, `node:http` or `node:https`, and a lint rule
  enforces that.
- **Guard.** A non-sample brief compiled into a temporary folder inside a fake product repository is
  refused.

## Security

- The YAML is parsed with the `yaml` library's default core schema, which has no custom tags and so
  cannot build code objects.
- Text is never interpreted as anything but text.
- Paths in the brief (fonts, logo) are resolved relative to the brief, must exist, and are recorded
  relative to the video folder (AC4.3).

## Constitution check

| Principle | Pass? | Note |
|-----------|-------|------|
| P3 Brief is the source of truth | yes | captions verbatim, figures by name only |
| P6 No company content in repo | yes | repository guard; only the made-up sample is in `examples/` |
| IV Simplicity | yes | no model, no network, a line scanner plus the YAML library |
