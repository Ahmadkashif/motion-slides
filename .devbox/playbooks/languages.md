# Languages and toolchains

Read this when starting a project (`/devbox:intake`, `devbox init --stack`), filling the verify gates in `.devbox/config`, or writing code in a language you have not used in this repo yet.

Every language here has a canonical style guide, one formatter, one linter, a type checker, a test runner, a package manager, and a single verify line. Use the defaults unless the project already chose otherwise; consistency beats preference.

**Versions move fast.** The versions below were current in late 2026. Do not hard-code them from this table: read the real versions from the project's lockfiles and toolchain files, and let Dependabot or Renovate move them. When unsure, check the current release.

## Rules

- One formatter per language, enforced in CI in check mode. Never argue style a formatter can settle.
- Lint with warnings as errors in CI; suppressions need a comment saying why.
- Turn on the strictest practical type checking for new code (TypeScript `strict`, pyright standard or strict, Kotlin and C# nullable reference types, Swift 6 language mode).
- Commit lockfiles and install in frozen mode in CI.
- Pin the toolchain in the repo (`.nvmrc` or `packageManager`, `.python-version`, `go.mod` toolchain, `rust-toolchain.toml`, Gradle wrapper, `global.json`).
- Every gate in `.devbox/config` must run locally in under a few minutes; long suites go to CI only and are documented in `AGENTS.md`.

## Defaults by language

| Language | Style guide | Format | Lint | Types | Test | Packages and env |
|----------|-------------|--------|------|-------|------|------------------|
| TypeScript / JavaScript | Google TypeScript style guide | Biome 2.x (greenfield) or Prettier 3 | Biome; ESLint 10 (flat config only) with typescript-eslint when you need its plugins; Oxlint as a fast alternative | TypeScript (`tsc --noEmit`); TS 7 is the native compiler, keep TS 6 where tools need the JS API | Vitest; Playwright for E2E | pnpm (minimum release age on by default), Node LTS; Bun fine for greenfield |
| Python | PEP 8, Google Python style guide | `ruff format` | `ruff check` | pyright (default); mypy, Pyrefly or ty as alternatives | pytest (+ Hypothesis) | uv with `pyproject.toml` and `uv.lock` |
| Go | Effective Go, Go Code Review Comments, Google Go style guide | gofmt / goimports | `go vet` + golangci-lint v2 | compiler | `go test -race`, native fuzzing | Go modules; pin dev tools with the `tool` directive |
| Rust | Rust style guide, Rust API Guidelines | rustfmt | clippy `-D warnings`; cargo-deny or cargo-audit | rustc | cargo-nextest (+ `cargo test --doc`, nextest skips doctests) | cargo with `rust-toolchain.toml`, edition 2024 |
| Java / Kotlin | Google Java style; Kotlin coding conventions | Spotless with google-java-format; ktlint | Error Prone + NullAway; detekt; Android Lint | javac / kotlinc | JUnit (5 or 6), AssertJ, Testcontainers | Gradle (Kotlin DSL, version catalogs, wrapper, configuration cache), JDK LTS |
| C# | Microsoft C# coding conventions + `.editorconfig` | `dotnet format` | Roslyn analyzers (`AnalysisLevel` latest-recommended, warnings as errors, `<Nullable>enable`) | compiler | xUnit v3 | NuGet Central Package Management with lock files, .NET LTS |
| Swift | Swift API Design Guidelines, Google Swift style | swift-format (bundled) | SwiftLint | Swift 6 language mode, strict concurrency | Swift Testing; XCTest for UI and performance | SwiftPM |
| C / C++ | C++ Core Guidelines, Google C++ style; embedded: MISRA, BARR-C, CERT | clang-format | clang-tidy, cppcheck; ASan, UBSan, TSan in CI | compiler with `-Werror` | GoogleTest or Catch2 v3 via CTest | CMake with `CMakePresets.json` + Ninja; vcpkg or Conan 2 |
| Ruby | Ruby Style Guide (rubystyle.guide) | RuboCop or Standard | RuboCop | optional Sorbet or RBS + Steep | RSpec (Minitest for Rails) | Bundler |
| PHP | PER Coding Style (supersedes PSR-12) | PHP-CS-Fixer `@PER-CS` or Pint | PHPStan 2 at a high level (+ Rector) | PHPStan | PHPUnit or Pest | Composer 2 |
| Shell | Google Shell style guide | shfmt | ShellCheck | n/a | bats-core | `set -euo pipefail` in every script |
| SQL | dbt SQL style guide, sqlstyle.guide | `sqlfluff format` | sqlfluff (set dialect; dbt or jinja templater) | n/a | dbt tests, pgTAP, tSQLt | n/a |

## One-line verify per language

| Language | Verify |
|----------|--------|
| TypeScript / JavaScript | `pnpm install --frozen-lockfile && pnpm biome ci . && pnpm tsc --noEmit && pnpm vitest run` |
| Python | `uv sync --locked && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest -q` |
| Go | `test -z "$(gofmt -l .)" && go vet ./... && golangci-lint run && go test -race ./...` |
| Rust | `cargo fmt --check && cargo clippy --all-targets --all-features -- -D warnings && cargo nextest run && cargo test --doc` |
| Java / Kotlin | `./gradlew spotlessCheck detekt check --configuration-cache` |
| C# | `dotnet format --verify-no-changes && dotnet build -warnaserror && dotnet test` |
| Swift | `swift format lint --strict -r . && swiftlint --strict && swift build && swift test` |
| C / C++ | `cmake --preset ci && cmake --build --preset ci && ctest --preset ci --output-on-failure` |
| Ruby | `bundle exec rubocop && bundle exec rspec` |
| PHP | `composer validate --strict && vendor/bin/php-cs-fixer check && vendor/bin/phpstan analyse && vendor/bin/phpunit` |
| Shell | `shfmt -d . && shellcheck $(git ls-files '*.sh') && bats test` |
| SQL | `sqlfluff lint --dialect <dialect> .` |

## Mapping to `.devbox/config`

`devbox init --stack <stack>` writes defaults for node, python, go, rust, jvm and dotnet; everything else starts as `generic` with empty gates. Split the one-liner across gates so `devbox verify` reports which one failed.

| Stack | FORMAT | LINT | TYPECHECK | TEST | BUILD |
|-------|--------|------|-----------|------|-------|
| node | `pnpm run --if-present format:check` | `pnpm run --if-present lint` | `pnpm run --if-present typecheck` | `pnpm test` | `pnpm run --if-present build` |
| python | `uv run ruff format --check .` | `uv run ruff check .` | `uv run pyright` | `uv run pytest` | (empty) |
| go | `test -z "$(gofmt -l .)"` | `go vet ./...` (add `&& golangci-lint run`) | (compiler) | `go test -race ./...` | `go build ./...` |
| rust | `cargo fmt --all --check` | `cargo clippy --all-targets --all-features -- -D warnings` | (compiler) | `cargo test --all-features` | `cargo build --all-features` |
| jvm | (in `check`) | (in `check`) | (compiler) | `./gradlew check` or `mvn -B verify` | `./gradlew build -x test` |
| dotnet | `dotnet format --verify-no-changes` | (analyzers in build) | (compiler) | `dotnet test` | `dotnet build -warnaserror` |
| swift | `swift format lint --strict -r .` | `swiftlint --strict` | (compiler) | `swift test` | `swift build` |
| cpp | `clang-format --dry-run --Werror $(git ls-files '*.c' '*.cc' '*.cpp' '*.h' '*.hpp')` | `run-clang-tidy -p build` | (compiler) | `ctest --preset ci --output-on-failure` | `cmake --build --preset ci` |
| ruby | (RuboCop) | `bundle exec rubocop` | (optional `bundle exec srb tc`) | `bundle exec rspec` | (empty) |
| php | `vendor/bin/php-cs-fixer check` | `vendor/bin/phpstan analyse` | (PHPStan) | `vendor/bin/phpunit` | (empty) |

For node projects, `devbox init` uses the package manager it detects from the lockfile (pnpm, yarn or npm). Add the matching scripts (`format:check`, `lint`, `typecheck`, `test`, `build`) to `package.json`.

Example `.devbox/config` gates for a Python service:

```
DEVBOX_FORMAT_CMD=uv run ruff format --check .
DEVBOX_LINT_CMD=uv run ruff check .
DEVBOX_TYPECHECK_CMD=uv run pyright
DEVBOX_TEST_CMD=uv run pytest -q
DEVBOX_BUILD_CMD=
```

## Notes

- **Google style guides** (github.com/google/styleguide, served at google.github.io/styleguide) cover C++, C#, Java, JavaScript (legacy, prefer the TypeScript guide), TypeScript, Python, Shell, Swift, Objective-C, R, HTML/CSS and more; the Go guide lives at google.github.io/styleguide/go. They are good defaults when a language community has no stronger convention.
- **Airbnb JavaScript guide:** still readable as a reference, but `eslint-config-airbnb` had no ESLint 9+ flat config support as of mid 2026 and ESLint 10 removed eslintrc. Do not use it as a default config.
- **TypeScript 7** is the native (Go) compiler and is much faster; its programmatic API lags, so tools that import TypeScript may need TS 6 alongside. Check current status.
- **Python type checkers:** pyright is the stable default. ty (Astral) is promising but was still beta in 2026; trial it, do not depend on it.
- **Rust:** cargo-nextest does not run doctests; always add `cargo test --doc`.
- **Mixed repos:** give each language its own gate commands, chained with `&&` in the matching `DEVBOX_*_CMD` line, or wrap them in a `make verify` and point the gates at make targets.

## Checklist

- [ ] Formatter, linter, type checker and test runner chosen and pinned
- [ ] Lockfile committed; CI installs frozen
- [ ] Toolchain version pinned in the repo
- [ ] `.devbox/config` gates filled in; `devbox verify` green
- [ ] CI workflow runs the same gates
- [ ] `AGENTS.md` Commands section matches reality

## Anti-patterns

- Two formatters fighting over the same files.
- Lint warnings ignored until there are 4,000 of them.
- `any`, `# type: ignore`, `@SuppressWarnings` without a reason.
- Tool versions copied from a blog post instead of read from the lockfile.
- Different commands in CI than in `.devbox/config`.

## Sources

- Google style guides: https://google.github.io/styleguide/
- PEP 8: https://peps.python.org/pep-0008/
- Ruff: https://docs.astral.sh/ruff/ and uv: https://docs.astral.sh/uv/
- Biome: https://biomejs.dev
- ESLint: https://eslint.org
- Effective Go: https://go.dev/doc/effective_go and https://go.dev/wiki/CodeReviewComments
- golangci-lint: https://golangci-lint.run
- Rust API Guidelines: https://rust-lang.github.io/api-guidelines/
- cargo-nextest: https://nexte.st
- Kotlin conventions: https://kotlinlang.org/docs/coding-conventions.html
- C# conventions: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions
- Swift API Design Guidelines: https://www.swift.org/documentation/api-design-guidelines/
- C++ Core Guidelines: https://isocpp.github.io/CppCoreGuidelines/
- Ruby Style Guide: https://rubystyle.guide
- PER Coding Style: https://www.php-fig.org/per/coding-style/
- ShellCheck: https://www.shellcheck.net
- SQLFluff: https://sqlfluff.com
