---
feature: 001-render-engine-idea-to-mp4
status: approved   # draft | approved   (approved = the critique gate returned GO)
created: 2026-10-23
---

# Tasks: Render engine: idea to MP4

<!--
Task line format (parsed by `devbox`, keep it exact; TNNN is a three digit id such as T001):

  - [ ] TNNN [AFK|HITL] Short imperative title (US1: AC1.1, AC1.2) after: <ids or none>
        Verify: <the command or observable check that proves this task is done>

  e.g. - [ ] T003 [AFK] Reject expired tokens at the API edge (US2: AC2.1) after: T001

  [ ] open   [x] done   [!] blocked (write the reason in progress.md)
  [AFK]  an agent can finish and merge it with no human input
  [HITL] needs a human (a decision, credentials, a design review, a manual test)
  after: the task IDs this one depends on

Rules:
- Each task is a vertical slice: a thin, complete path through every layer it touches
  (schema, logic, interface, tests), demoable or verifiable on its own. Never "all the models", then
  "all the endpoints".
- Each task fits one focused agent session and one reviewable commit or small PR.
- Every acceptance criterion in spec.md maps to at least one task.
- Order by dependency, then by priority (P1 stories first), so the first tasks form the MVP.
- The first task is a walking skeleton when the feature or project is new: the thinnest end-to-end
  path, runnable, with CI green.
- The last task before shipping is usually HITL: a human reviews docs, release notes and rollout.
-->

## Slice 1: walking skeleton (build-plan Stage 0)

- [ ] T001 [AFK] Walking skeleton: package with exact pins, no-build TypeScript, Biome, vitest, `.nvmrc`, `.gitignore`, `motion-slides --help` and `--version`, CI on master (foundation, no acceptance criterion) after: none
      Verify: `devbox verify` green locally with real format, lint, typecheck and test gates; golden tests for `--help`, `--version` and a usage error (exit 2); after `npm ci && npm test` the tree is clean (`git status --short` empty) and `git check-ignore node_modules/ build/ out/ | wc -l` prints 3. CI green is checked at ship, not by the worker.
      Scope: `package.json` (`private: true`, `type: module`, `engines.node: ">=24.15 <25"`, bin `bin/motion-slides.js`, scripts `format:check`, `lint`, `typecheck` (both tsc projects), `test`; no `build` script); exact pins commander 14.0.3, zod 4.6.5, gsap 3.15.0, playwright-core 1.59.1, dev typescript 6.0.3, vitest 5.0.3, @biomejs/biome 2.5.15, @types/node 24.19.2 (`yaml` waits for 005); `package-lock.json` from npm; `tsconfig.json` (strict, `noEmit`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `module: nodenext`); `tsconfig.stage.json` (DOM, `checkJs`, `noEmit`, `paths` for `/vendor/gsap/index.js`); `biome.json`; `.nvmrc` `24.15.0`; `.gitignore` adds `node_modules/`, `build/`, `out/`, `coverage/`, `*.tsbuildinfo`, `.env*`; CI: push on `master`, `runs-on: ubuntu-24.04`, `node-version-file: .nvmrc`, checkout `fetch-depth: 0`, apt `ffmpeg` and `strace` (interim until 007), `npx --no-install playwright-core install --only-shell chromium`, then `devbox verify` (008 T001 adds the publish scan before `npm ci`); `persist-credentials: false` kept; Dependabot ignores `playwright-core` (bumped by hand with its browser); AGENTS.md Commands and Testing sections filled in.
- [ ] T013 [HITL] Stage 0 gate: 008 T001 done, hook installed and checked by the full scan, full scan exit 0 (summary line only in progress.md), the Inter TTF checked against the full scan in a scratch clone (if flagged, the user adds its SHA-256 to their allowed-binaries file now), PR text scanned with `--text`, Stage 0 PR opened by AhmadKashifAF, approved by Ahmadkashif after green CI, merged by the user after: T001, 008 T001
      Verify: PR merged; `node scripts/publish-scan.mjs` exits 0 on master after the merge
      Note: placed here in file order on purpose, because `devbox run` takes the first open task and stops only at HITL lines.

## Slice 2: silent preview end to end (build-plan Stage 1)

- [ ] T002 [AFK] Idea contract: `loadIdea` with size limit, JSON positions, strict key sets, field paths, did-you-mean and semantic rules (US1: AC1.2, AC1.3, AC1.4) after: T001
      Verify: `npm test -- test/unit/idea` covers every rule and edge case in the spec and design, including an unknown key inside `voice`, `audio`, `timing.floors` and a cue, an empty `disclosure`, a lead or gap below 0.12 s, duplicate scene ids and a truncated file's position. (The "fails before any browser starts" part of AC1.1 is verified in T007.)
- [ ] T003 [AFK] Schedule: estimate, placement, frame snapping, cap fitting with the shrink rule and floors, fade and settle times, fade invariant (US2: AC2.1; US3: AC3.1; US6: AC6.1, AC6.2, AC6.3, AC6.5) after: T002
      Verify: `npm test -- test/unit/schedule` with table tests: AC3.1 placement, 155 wpm with the 1.0 s minimum, a pause already below its floor stays unchanged, a 0.12 s gap under a tight cap keeps `next.fade_in.start >= prev.fade_out.end`, a cap that is not a whole number of frames gives `N/30 <= cap`, dense 0.40 s and tail 3.0 s minimums, the overrun report, and the same input giving a byte-identical serialised schedule twice.
- [ ] T004 [AFK] Stage page and offline route: static file map, header CSP, failure listeners, WebSocket and service-worker blocking, bundled Inter loaded through FontFace, `__ms.ready` and `checkCaptions()` (US5: AC5.3, AC5.4, AC5.5; US8: AC8.1, AC8.2) after: T003
      Verify: integration tests with every folder under `os.tmpdir()`: tricky and `<script>`/`onerror` captions have `textContent` equal to the input and no child elements, `window.__pwned` stays undefined and no CSP violation fires; a caption at weight 600 is wider than at 400; an unlisted URL, a font that fails to load and a WebSocket each fail naming the URL or file; a caption too long for one line fails with its overflow in pixels; unit tests for the file map (`..`, `%2F`, `%5C`, NUL and a symlink escape all miss), the font SHA-256 pin and the source-policy bans.
- [ ] T005 [AFK] Timeline and parallel capture: caption fades, cue hook, watermark, `seek`, `visibleText`, W workers into a private run folder, `captions.jsonl` and `stage-text.jsonl` merged in frame order, 60 s stall timeout (US2: AC2.2; US5: AC5.1, AC5.2) after: T004
      Verify: integration test captures a 2 s made-up idea: exactly N JPEGs and N `captions.jsonl` lines; no frame has two captions above 0 opacity; fade-in and fade-out land within one frame of 0.18 s and 0.12 s; a fresh page seeked straight to an arbitrary frame, and a page seeked backwards, match the sequential capture; the watermark is in `visibleText()` at the first, middle and last frame; `stage-text.jsonl` has one settle line per beat; 1 worker and 4 workers give identical frame hashes.
- [ ] T006 [AFK] Encode and probe: N frames plus exactly N*1600 samples of stereo silence, BT.709 limited range, standard metadata, ffprobe frame check (US2: AC2.3, AC2.4; US4: AC4.1, AC4.2; US9: AC9.5) after: T005
      Verify: integration test: ffprobe reports H.264 High, `yuv420p`, `tv` range, BT.709 matrix, primaries and transfer, 1920x1080, SAR 1:1, 30 fps constant, `nb_frames == N`, AAC-LC 48 kHz stereo, audio and video durations within 33.4 ms, and `title`, `comment` and `description` (`timing_source=estimate`); a brand red frame decodes within 3 of its hex on each channel.
- [ ] T007 [AFK] `motion-slides render --preview` end to end: validation before Chrome, lock, run folder, publish order, the `out/preview/` set, poster, `schedule.json`, append-only `render.log`, names (US1: AC1.1, AC1.5; US2: AC2.2, AC2.4; US4: AC4.3, AC4.4; US6: AC6.3, AC6.4; US8: AC8.4; US9: AC9.1, AC9.2, AC9.3, AC9.4) after: T006
      Verify: `motion-slides render <tmp>/hello --preview` writes `out/preview/hello-preview.mp4`, a 1920x1080 `poster.jpg`, `schedule.json` and `render.log`; an invalid idea exits 1 listing field paths and no Chrome process is started; an over-cap idea exits 1 with natural, floor, cap and overrun; a second render while the first holds the lock is refused naming the pid; `src/`, `bin/`, `package.json` and `package-lock.json` are byte-identical after rendering two different ideas; `render.log` contains no absolute path, user name or host name; a bad `--name` exits non-zero. AC4.4 is partial: the poster is the frame at the opener's end, and the title card it should show arrives with 004 T001.
- [ ] T008 [AFK] Failure handling and offline proof: abort, crash, stall, full disk, read-only folder, Ctrl-C within 5 s, stale run folders, no outbound connection (US8: AC8.3; NFR Offline) after: T007
      Verify: integration tests: SIGINT mid-capture, a forced ffmpeg failure and a frame stall (stall timeout shortened for the test) each leave no file under the final MP4 name, earlier outputs byte-identical, no run folder, a failure record appended to `render.log`, and no child process alive 5 s later; ENOSPC injected at the file-write boundary fails cleanly; a read-only folder fails before Chrome starts naming the path; a run folder left by a dead pid is removed by the next render; a render under `strace -f -e trace=connect` shows no `AF_INET` or `AF_INET6` connect.
- [ ] T009 [HITL] User watches the preview MP4 and merges the Stage 1 PR after: T008
      Verify: PR opened by AhmadKashifAF, approved by Ahmadkashif after CI is green and `devbox:qa` passes, merged by the user

## Slice 3: narrated timing (build-plan Stage 2, needs 002 T004)

- [ ] T010 [AFK] Narrated render from the voice manifest: measured timing, stale-manifest refusal, mux of the 002 mix (US3: AC3.3, AC3.4) after: T009
      Verify: integration test with tone-fixture clips: a missing manifest, a missing beat and a stale beat are each refused by name; MP4 audio and video durations within one frame; narrated outputs land in `out/` and a later preview leaves them byte-identical
      Note: US3 AC3.2 (a cue starts on the nearest frame) needs a component to animate and is verified by 004 T002 with the counter.

## Slice 4: stills and budgets (after the PoC)

- [ ] T011 [AFK] Stills at `<scene>-<beat>+<sec>` moments without a full capture (US7: AC7.1, AC7.2, AC7.3, AC7.4) after: T010
      Verify: integration test writes named PNGs; an out-of-range moment fails with the valid range; without a manifest the names carry `-preview`
- [ ] T012 [AFK] Measure a 180 s made-up render on this box against the 15 min, 4 GB and 5 GB budgets, and prove the Determinism NFR (NFR Performance, Memory, Disk, Determinism) after: T010
      Verify: `/usr/bin/time -v` output and the `render.log` capture rate pasted in progress.md; two renders give byte-identical `schedule.json` and sample-identical decoded audio
