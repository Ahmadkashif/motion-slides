# Security

Read this when designing anything that touches auth, money, personal data, untrusted input, dependencies, CI or infrastructure; when filling the STRIDE section of `design.md`; and before `/devbox:ship`. `devbox:security-lens` reviews against this playbook.

Security is a design property, not a scan you run at the end (OWASP A06 Insecure Design). DevBox treats it as Constitution Article VI: least privilege, validate at boundaries, fail closed, secrets never in code, logs or prompts.

## Rules

- Threat-model every feature that crosses a trust boundary before writing code (template: `.devbox/templates/threat-model.md`).
- Authenticate every request and authorize every object access, server side. The client is never trusted.
- Validate input at every trust boundary with an allowlist schema; encode output for its context (HTML, SQL, shell, URL).
- Use parameterized queries and safe APIs. Never build SQL, shell commands or HTML by string concatenation with user input.
- Fail closed: on an unexpected error, deny access and return a generic error. Never leak stack traces, queries or internal IDs.
- Never commit secrets. Load them at runtime from a secret manager or the environment. Never log them.
- Prefer short-lived credentials via workload identity (OIDC from CI to cloud) over static keys.
- Pin and lock dependencies; review new ones for maintenance, license and footprint.
- Treat all model output as untrusted input (LLM05). Give agents and tools least privilege.
- Log security-relevant events (login, permission change, admin action) with who, what, when, without secrets or PII.

## OWASP Top 10:2025

| ID | Category | One-line defense |
|----|----------|------------------|
| A01 | Broken Access Control (includes SSRF) | Deny by default; check ownership on every object (BOLA); allowlist outbound URLs |
| A02 | Security Misconfiguration | Hardened defaults, no debug in prod, security headers, IaC scanning |
| A03 | Software Supply Chain Failures (new) | Lockfiles, pinned actions, SBOM, provenance, dependency review |
| A04 | Cryptographic Failures | TLS everywhere, vetted libraries, strong password hashing (Argon2id, bcrypt), no homegrown crypto |
| A05 | Injection | Parameterized queries, safe APIs, output encoding, schema validation |
| A06 | Insecure Design | Threat model, abuse cases in the spec, rate limits, secure patterns from the start |
| A07 | Authentication Failures | MFA, rate-limited login, secure session handling, no default credentials |
| A08 | Software or Data Integrity Failures | Signed artifacts and updates, verify integrity of deserialized data, protected CI |
| A09 | Security Logging and Alerting Failures | Log and alert on auth failures and admin actions; tamper-resistant logs |
| A10 | Mishandling of Exceptional Conditions (new) | Fail closed, handle every error path, never expose internals in errors |

## OWASP ASVS 5.0

About 350 requirements in 17 chapters. Pick a level per system and cite requirements as `v5.0.0-<chapter>.<section>.<req>` in specs and tests.

| Level | Use for |
|-------|---------|
| L1 | Baseline for every app |
| L2 | Most apps that handle sensitive data (the DevBox default for anything with accounts) |
| L3 | High assurance: payments, health, critical infrastructure |

## Threat modeling

Answer the four questions (Threat Modeling Manifesto):

1. What are we working on? Draw the data flow with trust boundaries.
2. What can go wrong? Apply STRIDE to each element and boundary crossing.
3. What are we going to do about it? Mitigate, detect, respond, or accept with a named owner.
4. Did we do a good job? Review with someone other than the author.

| STRIDE | Property violated | Typical mitigation |
|--------|-------------------|--------------------|
| Spoofing | Authentication | Strong auth, mTLS between services, signed webhooks |
| Tampering | Integrity | Signatures, checksums, immutable logs, input validation |
| Repudiation | Non-repudiation | Audit logs with actor and timestamp |
| Information disclosure | Confidentiality | Encryption, least privilege, redaction, generic errors |
| Denial of service | Availability | Rate limits, quotas, timeouts, bounded queues and payloads |
| Elevation of privilege | Authorization | Server-side authz on every operation, least privilege roles |

Record threats and mitigations in `design.md` (Cross-cutting concerns) and turn each mitigation into a task with a test.

## Secrets management

- Never commit secrets; enable secret scanning with push protection. DevBox's PreToolUse hook blocks writes containing obvious keys.
- Load secrets at runtime from a secret manager (Vault, cloud secret managers) or injected environment variables. Never bake them into images or bundles.
- Scope each secret to least privilege; one secret per consumer.
- Rotate on a schedule and immediately after any exposure. Assume anything pasted into a chat, log or prompt is exposed.
- Never log secrets; redact tokens in error messages.
- CLIs read secrets from files or stdin, never from flags.
- `.env` files are for local development only and are gitignored; commit a `.env.example` with fake values.

## Supply chain

- Commit lockfiles and install in frozen mode in CI (`npm ci`, `pnpm install --frozen-lockfile`, `uv sync --locked`, `cargo build --locked`).
- Pin GitHub Actions to full commit SHAs with a version comment; let Dependabot bump them.
- Dependabot or Renovate for version and security updates, grouped minor and patch, with a **cooldown** (minimum release age, for example 7 days, 30 for majors). Cooldown never delays security updates.
- Run dependency review on PRs (fail on high severity, license deny-list).
- Generate an SBOM (CycloneDX or SPDX) for every release and scan continuously against OSV or GHSA.
- **SLSA v1.2:** Build track L0 to L3 (aim for at least L2: signed provenance from a hosted builder; L3: hardened, isolated builder). Source track L1 to L4 (L4: two-party review).
- **OpenSSF Scorecard:** pass Dangerous-Workflow, Token-Permissions, Branch-Protection, Code-Review, Pinned-Dependencies, Dependency-Update-Tool, Vulnerabilities, Signed-Releases, Security-Policy, SAST.
- Publish packages only from CI with **trusted publishing via OIDC** (npm, PyPI, crates.io) and provenance attestations. No long-lived publish tokens.

## NIST SSDF (SP 800-218)

Map the process to four practice groups. v1.1 is final; v1.2 is a draft.

| Group | Meaning | DevBox mapping |
|-------|---------|----------------|
| PO | Prepare the Organization | constitution, playbooks, CI policy |
| PS | Protect the Software | branch protection, signed releases, secret scanning |
| PW | Produce Well-Secured Software | threat model, security tests, review lenses |
| RV | Respond to Vulnerabilities | SECURITY.md, dependency alerts, postmortems |

## LLM and agent security

For features that call models or run agents, apply the OWASP Top 10 for LLM Applications 2025 (prompt injection, sensitive information disclosure, supply chain, data and model poisoning, improper output handling, excessive agency, system prompt leakage, vector and embedding weaknesses, misinformation, unbounded consumption) and the OWASP Top 10 for Agentic Applications 2026 (goal hijack, tool misuse, identity and privilege abuse, agentic supply chain, unexpected code execution, memory and context poisoning, insecure inter-agent communication, cascading failures, human-agent trust exploitation, rogue agents). Details and checklists: `.devbox/playbooks/shapes/llm-app.md`.

The same rules apply to DevBox itself: agents run with least privilege, autonomous loops run in sandboxes, and humans approve irreversible actions (Article IX).

## GitHub Actions hardening

- Top-level `permissions: contents: read` (or `{}`); raise per job only where needed (`security-events: write`, `id-token: write`).
- Never interpolate `${{ github.event.* }}` (titles, branch names, bodies) directly into `run:`. Pass through `env:` and quote.
- Never check out and run fork code in `pull_request_target` or `workflow_run`.
- `persist-credentials: false` on checkout unless the job pushes.
- Do not save caches from privileged triggers.
- `timeout-minutes` on every job; concurrency groups to cancel superseded runs.
- Lint workflows with **actionlint** and **zizmor**.
- Use environments with required reviewers for deploys.

## Regulation note

The EU Cyber Resilience Act requires reporting actively exploited vulnerabilities (24 hours early warning, 72 hours notification) since 11 September 2026, with full application from 11 December 2027. If the product is sold in the EU, keep an SBOM, a vulnerability disclosure process and a support period. The European Accessibility Act applies since June 2025 (see web and mobile shape playbooks).

## Checklist (before ship)

- [ ] Threat model done for every trust boundary the feature touches
- [ ] Authz checked server side for every operation and object, with tests for unauthorized access
- [ ] Input validated with schemas; output encoded; no string-built queries or commands
- [ ] Errors fail closed and reveal nothing internal
- [ ] No secrets in code, config, logs, prompts or test fixtures
- [ ] New dependencies reviewed; lockfile committed; dependency review green
- [ ] Rate limits on expensive or sensitive endpoints
- [ ] Security events logged without PII
- [ ] CI permissions least privilege; actions pinned by SHA
- [ ] SECURITY.md present with a private reporting channel

## Anti-patterns

- Client-side authorization only.
- "Internal" endpoints with no auth because they are not linked anywhere.
- Catching exceptions and continuing with partial state.
- Secrets in example configs that turn out to be real.
- `curl | sh` installers in CI.
- Granting an agent or CI job admin tokens "to save time".

## Sources

- OWASP Top 10:2025: https://owasp.org/Top10/2025/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Top 10 for LLM Applications: https://genai.owasp.org/llm-top-10/
- OWASP Agentic Security Initiative: https://genai.owasp.org/initiatives/agentic-security-initiative/
- OWASP Cheat Sheets (secrets management): https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final
- SLSA v1.2: https://slsa.dev/spec/v1.2/
- OpenSSF Scorecard checks: https://github.com/ossf/scorecard/blob/main/docs/checks.md
- Threat Modeling Manifesto: https://www.threatmodelingmanifesto.org
- STRIDE: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
- Dependabot: https://docs.github.com/en/code-security/dependabot
- zizmor: https://github.com/zizmorcore/zizmor and actionlint: https://github.com/rhysd/actionlint
