---
status: accepted
date: 2026-10-23
decision-makers: Claude (design), to be confirmed by the user at the Stage 1 PR
---

# 0003. Chrome runs without its sandbox on this host

## Context and problem statement

Playwright starts Chrome's headless shell with `--no-sandbox` unless told otherwise. Enabling the
sandbox on this Ubuntu 24.04 host needs unprivileged user namespaces, which the system restricts, or a
root-owned setuid helper. The render engine must still run as an ordinary user with no sudo.

## Decision outcome

Run without the sandbox, and compensate:

- The page runs only product code, GSAP from npm and the bundled font. Idea text arrives as JSON data
  and reaches the DOM only through `textContent`.
- A strict Content Security Policy is sent as a response header; scripts load only from the runtime and
  GSAP paths.
- Every request is served from an exact-match file map or fails the render; WebSockets and service
  workers are blocked; host name resolution is disabled.
- Before 004 and 005 accept fonts and logos from requesters, Node checks each file first: type by magic
  bytes, a size limit, fonts only `woff2`, `ttf` or `otf`, logos only `svg` or `png`, shown through
  `<img>` so SVG script never runs.
- `motion-slides doctor` (007) reports whether the sandbox could be enabled, and the engine enables it
  where it can.

### Consequences

- Bad: a Chrome renderer exploit would run with the user's rights. The controls above keep untrusted
  bytes away from the renderer except validated fonts and images.
- Good: no root, no system changes, works on a stock install.

### Confirmation

001 T004 tests (CSP, file map, blocked requests) and the 004 and 005 input-file checks.
