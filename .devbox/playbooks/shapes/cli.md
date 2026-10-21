# CLI tool

> Command-line programs and terminal tools meant for humans and for scripts

## When this applies

- Developer tools, admin utilities, installers, code generators, terminal UIs, scripts that grew up.
- A CLI that ships alongside a library or SDK: also read `library`.
- A CLI that wraps an API: also read `api-service` for the contract it consumes.

## Default architecture

- A thin entry point: parse arguments with a mature parser (clap for Rust, cobra for Go, typer or click for Python, commander or citty for Node), then dispatch to command handlers.
- Command handlers are thin; real logic lives in a core library with no knowledge of argv, stdout or the terminal. That core is where the tests go.
- Output goes through renderers: human (default on a TTY), `--json` (stable, documented schema), and `--plain` (line-oriented, grep-friendly).
- Ship a single static binary where the stack allows it (Go, Rust); otherwise a single installable package with pinned dependencies.
- Configuration precedence: flags > environment variables > project config > user config (XDG paths) > system config.
- Avoid starting with: a plugin system, an interactive TUI before the plain commands work, a custom argument parser, network calls at startup.

## Quality attributes

- Startup and response: under about 100 ms for simple commands; show progress for anything slower than about 1 s.
- Scriptability: deterministic, parseable output; documented exit codes; no prompts when stdin is not a TTY.
- Stable output contract: `--json` output and exit codes are a public API and follow semver.
- Cross-platform: Linux, macOS and Windows behave the same, or differences are documented.
- Safe defaults: destructive actions require confirmation or `--force`/`--yes`, and support `--dry-run`.
- Respect the environment: `NO_COLOR`, `TERM=dumb`, terminal width, locale.

## Spec and design prompts

/devbox:spec and /devbox:grill should always ask:

- Who runs it: humans interactively, CI scripts, other programs, or all three?
- What are the top three commands and their exact invocation? Write the `--help` examples first.
- What is the machine-readable output contract and who consumes it?
- Which operations are destructive or slow? What does `--dry-run` show?
- Where do credentials come from? (Never flags or plain environment variables for long-lived secrets.)
- Which platforms and shells must be supported? Is a Windows binary required?
- Is any telemetry wanted? (Default: none without explicit opt-in.)

/devbox:design should decide and record:

- Command tree and naming (verb-noun or noun-verb, consistently), global flags.
- Exit code table (0 success, 1 general failure, 2 usage error, plus specific codes if scripts need them).
- Config file format and locations, precedence, and how `--config` overrides.
- Distribution: Homebrew, npm, pipx/uv tool, cargo install, GitHub Releases, container image; signing and checksums.

## Testing strategy

- Unit tests on the core library, independent of argv and terminal.
- Golden or snapshot tests for `--help`, error messages and `--json` output (insta or trycmd for Rust, testscript for Go, pytest snapshots or bats for others). Review snapshot diffs like code.
- Exit-code tests for success, usage errors and runtime failures.
- TTY vs non-TTY tests: colors and prompts only on a TTY; piped output is plain.
- Integration tests that run the built binary in a temporary directory with a temporary HOME and config.
- OS matrix in CI (Linux, macOS, Windows) when cross-platform is promised.
- Mock only the network and the clock; use real temporary file systems.

## Walking skeleton

T001 delivers: the built binary with `--help` (leading with examples), `--version`, one real command that reads input and writes output through the human and `--json` renderers, correct exit codes, a golden test for help and output, and a CI job that builds release artifacts for the target platforms.

## Checklist

- [ ] Exit 0 on success and non-zero on failure; exit codes documented in `--help` or the man page
- [ ] Primary output to stdout; logs, progress and errors to stderr
- [ ] `-h`/`--help` leads with examples; `--version` prints a parseable version
- [ ] Every flag has a long form; flags preferred over positional arguments for anything optional
- [ ] `--json` output with a stable, documented schema covered by golden tests
- [ ] Color only on a TTY; honors `NO_COLOR`, `TERM=dumb` and `--no-color`
- [ ] Prompts only when stdin is a TTY; `--no-input` disables them; `--yes`/`--force` for confirmations
- [ ] `--dry-run` for every mutating command
- [ ] Secrets never accepted as flag values; use a file (`--password-file`), stdin, or the OS keychain
- [ ] Config precedence implemented and documented; XDG base directories used
- [ ] Ctrl-C exits promptly and cleans up temporary state
- [ ] Progress indicator for operations slower than about 1 s
- [ ] Shell completions and a man page or reference doc generated from the parser
- [ ] No telemetry without opt-in; offline use works for local operations
- [ ] Release artifacts have checksums and are signed where the platform supports it

## Pitfalls

- Changing human-readable output that scripts were parsing; give them `--json` before they start.
- Mixing logs into stdout, which corrupts pipes.
- Hanging forever waiting on stdin when nothing is piped.
- Catch-all or prefix-abbreviated subcommands that block adding new commands later.
- Slow startup from heavy imports (Python, Node); import lazily inside commands.
- Asking for confirmation in CI, where nobody can answer.
- Taking secrets as flags, which leak into shell history and process lists.

## Verify gates

Use the stack defaults from `.devbox/playbooks/languages.md`, plus:

- A golden test target in DEVBOX_TEST_CMD that runs the compiled binary (for example `cargo test` with trycmd, `go test ./...` with testscript, `uv run pytest tests/cli`).
- For shell-based tools: `DEVBOX_FORMAT_CMD=shfmt -d .`, `DEVBOX_LINT_CMD=shellcheck $(git ls-files '*.sh')`, `DEVBOX_TEST_CMD=bats test`.
- CI extra: build the release matrix and run `<binary> --help` on each platform.

## Sources

- https://clig.dev/
- https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html (POSIX utility conventions)
- https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html
- https://no-color.org/
- https://specifications.freedesktop.org/basedir-spec/latest/
- https://google.github.io/styleguide/shellguide.html
- https://github.com/bats-core/bats-core
- https://www.shellcheck.net/
