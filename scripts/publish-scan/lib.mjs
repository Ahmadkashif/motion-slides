// Publish-safety scan (specs/008-acceptance-and-public-release/design.md). Dependency-free so it runs
// from the pre-push hook and in CI before `npm ci`. It never prints a matched value: a match is named by
// its label, and every printed path or ref name has its matches replaced by labels first.
import { spawn } from 'node:child_process';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, open, readFile, readlink } from 'node:fs/promises';
import { hostname, networkInterfaces, userInfo } from 'node:os';
import { join } from 'node:path';

const IN_HISTORY =
  'IN HISTORY: if this commit was never pushed, amend it; if it was, stop and ask the user before any history rewrite (AC4.5)';
const ACCEPTED = 'accepted by the user (baseline)';
const OBJECT_ID = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const REF_NAME = /^refs\/[^\s\p{Cc}]{1,250}$/u;
const CONFIG_DIR = '.config/motion-slides';
const LIST = '~/.config/motion-slides/private-terms.txt';
const REINSTALL = 'run node scripts/install-hooks.mjs (or npm ci)';
// Header names git writes in a commit; any other is reported as `header`.
const COMMIT_HEADERS = new Set([
  'tree',
  'parent',
  'author',
  'committer',
  'encoding',
  'mergetag',
  'gpgsig',
  'gpgsig-sha256',
]);
const ID_LINE = /^(?:tree|parent|object) [0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const ARMOUR_BEGIN = /^-----BEGIN (PGP|SSH) SIGNATURE-----$/;
const ARMOUR_HEADER = /^(?:Version|Comment): /;
const ARMOUR_LINE = /^(?:=?[A-Za-z0-9+/]*={0,2}|(?:Version|Comment): .*)$/;

// Secret shapes. Lookbehinds keep a key-like run inside a longer identifier from matching. No rule has a
// nested quantifier.
const SECRET_RULES = [
  { name: 'github-token', pattern: /(?<![A-Za-z0-9_])gh[pousr]_[A-Za-z0-9]{36,}/g },
  { name: 'github-token', pattern: /github_pat_[A-Za-z0-9_]{22,}/g },
  { name: 'aws-access-key', pattern: /(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/g },
  { name: 'private-key', pattern: /-----BEGIN [A-Z0-9 ]{0,40}PRIVATE KEY(?: BLOCK)?-----/g },
  { name: 'slack-token', pattern: /xox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'google-api-key', pattern: /AIza[A-Za-z0-9_-]{35}/g },
  { name: 'anthropic-key', pattern: /(?<![A-Za-z0-9_-])sk-ant-[A-Za-z0-9_-]{20,}/g },
  {
    name: 'openai-key',
    pattern: /(?<![A-Za-z0-9_-])sk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{20,}/g,
  },
  { name: 'openai-key', pattern: /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9]{32,}/g },
  { name: 'huggingface-token', pattern: /(?<![A-Za-z0-9_])hf_[A-Za-z0-9]{30,}/g },
];

// Leading bytes of containers a byte scan cannot see into. Written as numbers so this file does not start
// to look like one of them.
const OPAQUE = [
  { kind: 'zip', magic: [0x50, 0x4b, 0x03, 0x04] },
  { kind: 'zip', magic: [0x50, 0x4b, 0x05, 0x06] },
  { kind: 'zip', magic: [0x50, 0x4b, 0x07, 0x08] },
  { kind: 'office', magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  { kind: 'pdf', magic: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { kind: 'gzip', magic: [0x1f, 0x8b] },
  { kind: 'xz', magic: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00] },
  { kind: 'zstd', magic: [0x28, 0xb5, 0x2f, 0xfd] },
  { kind: '7z', magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },
  { kind: 'woff', magic: [0x77, 0x4f, 0x46, 0x46] },
  { kind: 'woff2', magic: [0x77, 0x4f, 0x46, 0x32] },
].map(({ kind, magic }) => ({ kind, magic: Buffer.from(magic) }));
const BZIP2 = Buffer.from([0x42, 0x5a, 0x68]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * @typedef {'full' | 'ci' | 'text'} Mode
 * @typedef {'substring' | 'word' | 'ip4' | 'ip6'} MatchKind
 * @typedef {{ rule: string, label: string, key: string, kind: MatchKind, bytes: RegExp, chars: RegExp }} Fact
 * @typedef {{ text: string, binary: boolean, utf16: boolean }} View
 * @typedef {{ index: number, length: number, rule: string, label: string, key: string }} Hit
 * @typedef {{ rule: string, label: string, key: string, subject: string, history: boolean, location: string }} RawFinding
 * @typedef {{ rule: string, label: string, location: string, fingerprint: string, history: boolean, accepted: boolean, line: string }} Finding
 * @typedef {{ code: number, findings: Finding[], output: string[], error?: string }} ScanResult
 * @typedef {{ subject: string, history: boolean, location: string, lines: boolean }} Where
 * @typedef {{ mode: Mode, home: string, facts: Fact[], allowed: Set<string>, raw: RawFinding[], seen: Set<string>, names: Map<string, Hit[]>, objects: number, refs: number }} Context
 */

class CannotScan extends Error {}

class GitFailed extends CannotScan {
  /**
   * @param {string} command
   * @param {number | null} status
   * @param {string} stderr
   */
  constructor(command, status, stderr) {
    const detail = stderr.split('\n').find((line) => line.trim() !== '') ?? `exit ${status}`;
    super(`git ${command} failed: ${detail.trim()}`);
  }
}

/**
 * Scans the repository at `repo` (modes full and ci) or one text file (mode text).
 * Codes: 0 clean, 1 findings, 2 cannot scan. `output` is for standard output, `error` for standard error.
 * `pushRefs` are the remote ref names a push is about to create or update: they become public with the
 * push, so they are scanned like any other ref name, but they are not history and cannot be baselined.
 * @param {{ mode: Mode, repo: string, textFile?: string, include?: string[], pushRefs?: string[], env: NodeJS.ProcessEnv }} options
 * @returns {Promise<ScanResult>}
 */
export async function scan({ mode, repo, textFile, include = [], pushRefs = [], env }) {
  try {
    return await runScan({ mode, repo, textFile, include, pushRefs, env });
  } catch (error) {
    const reason =
      error instanceof CannotScan
        ? error.message
        : `unexpected ${error instanceof Error ? `${error.name}: ${error.message}` : 'error'}`;
    return {
      code: 2,
      findings: [],
      output: [],
      error: `publish-scan: cannot scan: ${maskHome(reason, env)}`,
    };
  }
}

/**
 * @param {{ mode: Mode, repo: string, textFile?: string, include: string[], pushRefs: string[], env: NodeJS.ProcessEnv }} options
 * @returns {Promise<ScanResult>}
 */
async function runScan({ mode, repo, textFile, include, pushRefs, env }) {
  if (!['full', 'ci', 'text'].includes(mode)) throw new CannotScan('unknown mode');
  if (include.some((id) => !OBJECT_ID.test(id))) {
    throw new CannotScan('an --include value is not a 40 or 64 digit lowercase hex object id');
  }
  if (pushRefs.some((ref) => !REF_NAME.test(ref))) {
    throw new CannotScan('a --push-ref value is not a ref name');
  }
  const home = env.HOME;
  if (!home) throw new CannotScan('HOME is not set');
  // CI has no private list and is not this box: secrets only.
  const facts = mode === 'ci' ? [] : [...hostFacts(env), ...termFacts(await readTerms(home))];
  /** @type {Context} */
  const ctx = {
    mode,
    home,
    facts,
    allowed: await readAllowedBinaries(home),
    raw: [],
    seen: new Set(),
    names: new Map(),
    objects: 0,
    refs: 0,
  };
  if (mode === 'text') {
    if (!textFile) throw new CannotScan('--text needs a file');
    await scanTextFile(ctx, textFile);
  } else {
    await scanRepository(ctx, repo, include, pushRefs, env);
  }
  return finish(ctx);
}

/**
 * @param {Context} ctx
 * @param {string} file
 */
async function scanTextFile(ctx, file) {
  /** @type {Buffer} */
  let bytes;
  try {
    bytes = await readFile(file);
  } catch {
    throw new CannotScan('the --text file cannot be read');
  }
  ctx.objects = 1;
  const shown = labelled(ctx, Buffer.from(file, 'utf8').toString('latin1'));
  scanContent(ctx, bytes, {
    subject: `text:${file}`,
    history: false,
    location: `text ${shown}`,
    lines: true,
  });
}

/**
 * Ref names, the working tree, and every object reachable from any ref or from an included id.
 * @param {Context} ctx
 * @param {string} repo
 * @param {string[]} include
 * @param {string[]} pushRefs
 * @param {NodeJS.ProcessEnv} env
 */
async function scanRepository(ctx, repo, include, pushRefs, env) {
  const top = (await git(repo, env, ['rev-parse', '--show-toplevel'])).toString('utf8').trim();
  /** @param {string[]} args */
  const run = (args) => git(top, env, args);
  if ((await run(['rev-parse', '--is-shallow-repository'])).toString('latin1').trim() !== 'false') {
    throw new CannotScan('the clone is shallow; fetch the full history (git fetch --unshallow)');
  }
  if (ctx.mode === 'full') await checkHook(top, run);

  const refs = splitLines(await run(['for-each-ref', '--format=%(refname)']));
  ctx.refs = refs.length;
  for (const ref of refs) {
    addHits(ctx, hits(ctx, plainView(ref)), {
      subject: ref,
      history: true,
      location: `ref ${labelled(ctx, ref)}`,
      lines: false,
    });
  }

  for (const ref of pushRefs) {
    addHits(ctx, hits(ctx, plainView(ref)), {
      subject: `push:${ref}`,
      history: false,
      location: `pushed-ref ${labelled(ctx, ref)}`,
      lines: false,
    });
  }

  await scanWorkTree(ctx, top, run);

  /** @type {Map<string, string>} */
  const paths = new Map();
  for (const line of splitLines(await run(['rev-list', '--objects', '--all', ...include]))) {
    const space = line.indexOf(' ');
    if (space === -1) paths.set(line, '');
    else paths.set(line.slice(0, space), line.slice(space + 1));
  }
  ctx.objects += paths.size;
  await readObjects(top, env, [...paths.keys()], (oid, type, data) => {
    const path = paths.get(oid) ?? '';
    if (type === 'blob') {
      scanContent(ctx, data, {
        subject: oid,
        history: true,
        location: `blob ${oid} ${labelled(ctx, path)}`,
        lines: false,
      });
    } else if (type === 'tree') {
      scanTree(ctx, oid, path, data);
    } else if (type === 'commit') {
      scanCommit(ctx, oid, data);
    } else if (type === 'tag') {
      scanTag(ctx, oid, data);
    }
  });
}

/**
 * A full scan only passes a clone whose pushes are scanned: git runs hooks from its default folder
 * `<git common dir>/hooks` (no core.hooksPath, local or global, sends it elsewhere), and the pre-push
 * there is executable and byte for byte the committed .githooks/pre-push.
 * @param {string} top
 * @param {(args: string[]) => Promise<Buffer>} run
 */
async function checkHook(top, run) {
  /** @param {string[]} args */
  const path = async (args) =>
    (await run(['rev-parse', '--path-format=absolute', ...args]))
      .toString('utf8')
      .replace(/\n$/, '');
  const folder = join(await path(['--git-common-dir']), 'hooks');
  if ((await path(['--git-path', 'hooks'])) !== folder) {
    throw new CannotScan(
      `core.hooksPath sends git hooks away from <git common dir>/hooks, so pushes are not scanned; ${REINSTALL}, which removes it from this clone, and remove it from any global git config`,
    );
  }
  const hook = join(folder, 'pre-push');
  try {
    await access(hook, constants.X_OK);
  } catch {
    throw new CannotScan(
      `the pre-push hook in <git common dir>/hooks is missing or not executable; ${REINSTALL}`,
    );
  }
  /** @type {Buffer[]} */
  let pair;
  try {
    pair = await Promise.all([readFile(hook), readFile(join(top, '.githooks', 'pre-push'))]);
  } catch {
    throw new CannotScan(
      `the installed or the committed pre-push hook cannot be read; ${REINSTALL}`,
    );
  }
  if (!pair[0].equals(pair[1])) {
    throw new CannotScan(
      `the installed pre-push hook differs from .githooks/pre-push; ${REINSTALL}`,
    );
  }
}

/**
 * Tracked and untracked (not ignored) files: names, and contents read as bytes. A symlink is scanned as
 * its target text, which is what a commit would hold.
 * @param {Context} ctx
 * @param {string} top
 * @param {(args: string[]) => Promise<Buffer>} run
 */
async function scanWorkTree(ctx, top, run) {
  const listed = (await run(['ls-files', '-z', '--cached', '--others', '--exclude-standard']))
    .toString('latin1')
    .split('\0')
    .filter((path) => path !== '');
  for (const path of new Set(listed)) {
    const where = {
      subject: `worktree:${path}`,
      history: false,
      location: `worktree ${labelled(ctx, path)}`,
      lines: false,
    };
    addHits(ctx, hits(ctx, plainView(path)), where);
    const file = Buffer.concat([Buffer.from(`${top}/`, 'utf8'), Buffer.from(path, 'latin1')]);
    /** @type {Buffer | null} */
    let bytes = null;
    try {
      const stat = await lstat(file);
      if (stat.isSymbolicLink()) bytes = await readlink(file, { encoding: 'buffer' });
      else if (stat.isFile()) bytes = await readFile(file);
    } catch (error) {
      // A tracked file deleted from the working tree has nothing left to read.
      if (errorCode(error) !== 'ENOENT') throw new CannotScan('a working-tree file cannot be read');
    }
    if (bytes === null) continue;
    ctx.objects += 1;
    scanContent(ctx, bytes, { ...where, lines: true });
  }
}

/**
 * Tree entry names. One name sits in many trees across history, so a match is reported once per path,
 * with the path rather than the tree id in its fingerprint.
 * @param {Context} ctx
 * @param {string} oid
 * @param {string} base
 * @param {Buffer} data
 */
function scanTree(ctx, oid, base, data) {
  const idLength = oid.length / 2;
  for (let pos = 0; pos < data.length; ) {
    const space = data.indexOf(0x20, pos);
    const nul = space === -1 ? -1 : data.indexOf(0, space);
    if (nul === -1) throw new CannotScan('a tree object cannot be parsed');
    const name = data.toString('latin1', space + 1, nul);
    pos = nul + 1 + idLength;
    let found = ctx.names.get(name);
    if (found === undefined) {
      found = hits(ctx, plainView(name));
      ctx.names.set(name, found);
    }
    if (found.length === 0) continue;
    const path = base === '' ? name : `${base}/${name}`;
    for (const hit of found) {
      const once = `${hit.rule}\0${hit.label}\0path:${path}`;
      if (ctx.seen.has(once)) continue;
      ctx.seen.add(once);
      add(ctx, hit, {
        subject: `path:${path}`,
        history: true,
        location: `tree ${oid} ${labelled(ctx, path)}`,
        lines: false,
      });
    }
  }
}

/**
 * Commits raw: every header and the message, each reported by name (`header` for a name git does not
 * write itself, so a crafted header name is never printed).
 * @param {Context} ctx
 * @param {string} oid
 * @param {Buffer} data
 */
function scanCommit(ctx, oid, data) {
  for (const { name, text } of objectParts(data)) {
    const part = name === null ? 'message' : COMMIT_HEADERS.has(name) ? name : 'header';
    addHits(ctx, hits(ctx, plainView(text)), {
      subject: oid,
      history: true,
      location: `commit ${oid} ${part}`,
      lines: false,
    });
  }
}

/**
 * Annotated tags raw: every header and the message.
 * @param {Context} ctx
 * @param {string} oid
 * @param {Buffer} data
 */
function scanTag(ctx, oid, data) {
  for (const { text } of objectParts(data)) {
    addHits(ctx, hits(ctx, plainView(text)), {
      subject: oid,
      history: true,
      location: `tag ${oid}`,
      lines: false,
    });
  }
}

/**
 * The text to scan in a commit or tag object, part by part: each header by name, with its continuation
 * lines unfolded (a `mergetag` holds a whole tag object that way), then the message (name null). Only text
 * nobody wrote is left out: genuine signature armour (see withoutArmour) and lines that are exactly
 * `tree`, `parent` or `object` and an object id, whose hex digits would otherwise trip short terms.
 * @param {Buffer} data
 * @returns {{ name: string | null, text: string }[]}
 */
function objectParts(data) {
  const lines = data.toString('latin1').split('\n');
  /** @type {{ name: string, lines: string[] }[]} */
  const headers = [];
  let i = 0;
  for (; i < lines.length && lines[i] !== ''; i++) {
    const line = lines[i];
    const last = headers.at(-1);
    if (line.startsWith(' ') && last !== undefined) {
      last.lines.push(line.slice(1));
    } else {
      const space = line.indexOf(' ');
      if (space === -1) headers.push({ name: line, lines: [] });
      else headers.push({ name: line.slice(0, space), lines: [line.slice(space + 1)] });
    }
  }
  /** @type {{ name: string | null, text: string }[]} */
  const parts = headers.map(({ name, lines: value }) => {
    if (value.length === 1 && ID_LINE.test(`${name} ${value[0]}`)) return { name, text: '' };
    const kept = withoutArmour(value).filter((line) => !ID_LINE.test(line));
    return { name, text: [name, ...kept].join('\n') };
  });
  if (i < lines.length)
    parts.push({ name: null, text: withoutArmour(lines.slice(i + 1)).join('\n') });
  return parts;
}

/**
 * The lines without genuine signature armour: a `-----BEGIN PGP|SSH SIGNATURE-----` line, its matching
 * END line, and the lines between, when every one of those is base64 (with `=` padding and the `=` CRC
 * line), blank, or a `Version:` or `Comment:` armour header. Random base64 would trip short terms, so it
 * is left out; the armour headers are written text and stay. A BEGIN line whose block has any other
 * shape is ordinary text, scanned with the lines after it.
 * @param {string[]} lines
 * @returns {string[]}
 */
function withoutArmour(lines) {
  /** @type {string[]} */
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    const begin = ARMOUR_BEGIN.exec(lines[i]);
    if (begin !== null) {
      const end = `-----END ${begin[1]} SIGNATURE-----`;
      let j = i + 1;
      while (j < lines.length && lines[j] !== end && ARMOUR_LINE.test(lines[j])) j++;
      if (j < lines.length && lines[j] === end) {
        kept.push(...lines.slice(i + 1, j).filter((line) => ARMOUR_HEADER.test(line)));
        i = j;
        continue;
      }
    }
    kept.push(lines[i]);
  }
  return kept;
}

/**
 * Every content rule on one blob, file or text: the user's allowed binaries first, then (full mode only)
 * opaque containers, then terms, host facts and secrets over the latin1 view and, when the bytes look like
 * UTF-16, over the decoded text too.
 * @param {Context} ctx
 * @param {Buffer} bytes
 * @param {Where} where
 */
function scanContent(ctx, bytes, where) {
  if (ctx.allowed.has(createHash('sha256').update(bytes).digest('hex'))) return;
  if (ctx.mode === 'full') {
    const kind = opaqueKind(bytes);
    if (kind !== null) {
      const hit = {
        index: 0,
        length: 0,
        rule: 'opaque-binary',
        label: `<opaque:${kind}>`,
        key: kind,
      };
      add(ctx, hit, { ...where, lines: false });
    }
  }
  const binary = bytes.subarray(0, 8192).includes(0);
  /** @type {View[]} */
  const views = [{ text: bytes.toString('latin1'), binary, utf16: false }];
  const decoded = utf16(bytes);
  if (decoded !== null) views.push({ text: decoded, binary, utf16: true });
  for (const view of views) addHits(ctx, hits(ctx, view), where, view.text);
}

/**
 * The opaque container kind the bytes start with, or null.
 * @param {Buffer} bytes
 * @returns {string | null}
 */
function opaqueKind(bytes) {
  /** @param {Buffer} magic */
  const startsWith = (magic) =>
    bytes.length >= magic.length && bytes.subarray(0, magic.length).equals(magic);
  for (const { kind, magic } of OPAQUE) if (startsWith(magic)) return kind;
  if (startsWith(BZIP2) && bytes[3] >= 0x31 && bytes[3] <= 0x39) return 'bzip2';
  if (startsWith(PNG) && pngHasTextChunks(bytes)) return 'png-text';
  return null;
}

/**
 * Whether a PNG carries compressed or international text chunks (zTXt, iTXt).
 * @param {Buffer} bytes
 */
function pngHasTextChunks(bytes) {
  for (let pos = PNG.length; pos + 8 <= bytes.length; pos += 12 + bytes.readUInt32BE(pos)) {
    const type = bytes.toString('latin1', pos + 4, pos + 8);
    if (type === 'zTXt' || type === 'iTXt') return true;
    if (type === 'IEND') return false;
  }
  return false;
}

/**
 * The UTF-16 reading of bytes with a byte-order mark or a NUL in every other byte of the first 1 KB.
 * @param {Buffer} bytes
 * @returns {string | null}
 */
function utf16(bytes) {
  if (bytes.length < 2) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString('utf16le');
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return utf16be(bytes.subarray(2));
  const head = bytes.subarray(0, 1024);
  let oddNul = true;
  let evenNul = true;
  for (let i = 0; i < head.length; i++) {
    if (head[i] === 0) continue;
    if (i % 2 === 1) oddNul = false;
    else evenNul = false;
  }
  if (oddNul && !evenNul) return bytes.toString('utf16le');
  if (evenNul && !oddNul) return utf16be(bytes);
  return null;
}

/** @param {Buffer} bytes */
function utf16be(bytes) {
  const even = bytes.subarray(0, bytes.length - (bytes.length % 2));
  return Buffer.from(even).swap16().toString('utf16le');
}

/** @param {string} text */
function plainView(text) {
  return { text, binary: false, utf16: false };
}

/**
 * Every fact and secret match in a view. Fact matches may overlap.
 * @param {Context} ctx
 * @param {View} view
 * @returns {Hit[]}
 */
function hits(ctx, view) {
  /** @type {Hit[]} */
  const found = [];
  for (const fact of ctx.facts) {
    const pattern = view.utf16 ? fact.chars : fact.bytes;
    pattern.lastIndex = 0;
    for (let m = pattern.exec(view.text); m !== null; m = pattern.exec(view.text)) {
      if (accepts(fact.kind, view, m.index, m[0])) {
        const { rule, label, key } = fact;
        found.push({ index: m.index, length: m[0].length, rule, label, key });
      }
      pattern.lastIndex = m.index + 1;
    }
  }
  for (const { name, pattern } of SECRET_RULES) {
    for (const m of view.text.matchAll(pattern)) {
      const label = `<secret:${name}>`;
      found.push({ index: m.index, length: m[0].length, rule: 'secret', label, key: m[0] });
    }
  }
  return found;
}

const isLower = (/** @type {string} */ c) => c >= 'a' && c <= 'z';
const isUpper = (/** @type {string} */ c) => c >= 'A' && c <= 'Z';
const isLetter = (/** @type {string} */ c) => isLower(c) || isUpper(c);
const isDigit = (/** @type {string} */ c) => c >= '0' && c <= '9';
const isHexOrColon = (/** @type {string} */ c) =>
  isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') || c === ':';

/**
 * The boundary rules. Letters are ASCII only, so a byte outside ASCII never blocks a match.
 * @param {MatchKind} kind
 * @param {View} view
 * @param {number} index
 * @param {string} match
 */
function accepts(kind, view, index, match) {
  const text = view.text;
  const before = text[index - 1] ?? '';
  const after = text[index + match.length] ?? '';
  if (kind === 'substring') return true;
  if (kind === 'ip4') return !isDigit(before) && !isDigit(after);
  if (kind === 'ip6') return !isHexOrColon(before) && !isHexOrColon(after);
  // Short terms: no letter before and no lowercase letter after, except camelCase (a lowercase letter
  // before a match that starts uppercase; off in binary content, where glyph and table data look like
  // camelCase) and a single plural `s` after an all-caps match.
  if (isLetter(before) && !(isLower(before) && isUpper(match[0]) && !view.binary)) return false;
  if (isLower(after)) {
    const allCaps = /[A-Z]/.test(match) && !/[a-z]/.test(match);
    return after === 's' && allCaps && !isLower(text[index + match.length + 1] ?? '');
  }
  return true;
}

/**
 * Records hits as findings at `where`, adding `:<line>` when the location has lines.
 * @param {Context} ctx
 * @param {Hit[]} found
 * @param {Where} where
 * @param {string} [text] the view the hits index into, for line numbers
 */
function addHits(ctx, found, where, text = '') {
  const lineOf = lineCounter(text);
  for (const hit of found) {
    const location = where.lines ? `${where.location}:${lineOf(hit.index)}` : where.location;
    add(ctx, hit, { ...where, location });
  }
}

/**
 * One finding per rule, label and location.
 * @param {Context} ctx
 * @param {Hit} hit
 * @param {Where} where
 */
function add(ctx, hit, where) {
  const once = `${hit.rule}\0${hit.label}\0${where.location}`;
  if (ctx.seen.has(once)) return;
  ctx.seen.add(once);
  const { rule, label, key } = hit;
  const { subject, history, location } = where;
  ctx.raw.push({ rule, label, key, subject, history, location });
}

/**
 * A function from an index in `text` to its 1-based line number.
 * @param {string} text
 */
function lineCounter(text) {
  /** @type {number[] | null} */
  let newlines = null;
  return (/** @type {number} */ index) => {
    if (newlines === null) {
      newlines = [];
      for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) newlines.push(i);
    }
    let low = 0;
    let high = newlines.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (newlines[mid] < index) low = mid + 1;
      else high = mid;
    }
    return low + 1;
  };
}

/**
 * A printable form of a path or ref name given as latin1 bytes: every match becomes its label,
 * overlapping matches merge into one run of labels, and control characters are escaped.
 * @param {Context} ctx
 * @param {string} latin1
 */
function labelled(ctx, latin1) {
  const found = hits(ctx, plainView(latin1)).sort(
    (a, b) => a.index - b.index || b.length - a.length,
  );
  let out = '';
  let pos = 0;
  for (let i = 0; i < found.length; ) {
    const start = found[i].index;
    let end = start;
    /** @type {string[]} */
    const labels = [];
    for (; i < found.length && found[i].index <= end; i++) {
      end = Math.max(end, found[i].index + found[i].length);
      if (!labels.includes(found[i].label)) labels.push(found[i].label);
    }
    out += latin1.slice(pos, start) + labels.join('');
    pos = end;
  }
  out += latin1.slice(pos);
  return Buffer.from(out, 'latin1')
    .toString('utf8')
    .replace(/[^ -~ -￿]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`);
}

/**
 * Fingerprints, the baseline, the output lines and the exit code.
 * @param {Context} ctx
 * @returns {Promise<ScanResult>}
 */
async function finish(ctx) {
  const key = ctx.raw.length > 0 ? await fingerprintKey(ctx.home) : Buffer.alloc(0);
  // Only history findings can be accepted; working-tree and text findings never are.
  const baseline = ctx.raw.some((f) => f.history) ? await readBaseline(ctx.home) : new Set();
  /** @type {Finding[]} */
  const findings = ctx.raw.map(({ rule, label, key: term, subject, history, location }) => {
    const fingerprint = createHmac('sha256', key)
      .update(`${rule}\0${subject}\0${term}`)
      .digest('hex')
      .slice(0, 16);
    const accepted = history && baseline.has(fingerprint);
    let line = `${rule} ${label} in ${location} fingerprint ${fingerprint}`;
    if (accepted) line += ` -- ${ACCEPTED}`;
    else if (history) line += ` -- ${IN_HISTORY}`;
    return { rule, label, location, fingerprint, history, accepted, line };
  });
  const failing = findings.filter((f) => !f.accepted).length;
  const output = findings.map((f) => f.line);
  output.push(
    `publish-scan: ${ctx.mode}, ${ctx.objects} objects, ${ctx.refs} refs, ${failing} findings`,
  );
  return { code: failing > 0 ? 1 : 0, findings, output };
}

/**
 * The private terms list: one term per line; a line whose first character after optional spaces is `#` is
 * a comment, and a `#` anywhere else is part of the term. Missing, unreadable or empty is "cannot scan".
 * @param {string} home
 * @returns {Promise<string[]>}
 */
async function readTerms(home) {
  /** @type {string} */
  let content;
  try {
    content = await readFile(join(home, CONFIG_DIR, 'private-terms.txt'), 'utf8');
  } catch (error) {
    throw new CannotScan(
      errorCode(error) === 'ENOENT'
        ? `the private terms list ${LIST} is missing`
        : `the private terms list ${LIST} cannot be read`,
    );
  }
  /** @type {string[]} */
  const terms = [];
  for (const line of content.split(/\r?\n/)) {
    const term = line.trim();
    if (term === '' || term.startsWith('#')) continue;
    if (!terms.some((t) => t.toLowerCase() === term.toLowerCase())) terms.push(term);
  }
  if (terms.length === 0) throw new CannotScan(`the private terms list ${LIST} has no terms`);
  return terms;
}

/**
 * Terms of five or more characters match as substrings, shorter ones by the boundary rule. A term is
 * labelled by its position among the terms.
 * @param {string[]} terms
 * @returns {Fact[]}
 */
function termFacts(terms) {
  return terms.map((term, i) => {
    const kind = [...term].length >= 5 ? 'substring' : 'word';
    return fact('private-term', `<private term #${i + 1}>`, kind, term);
  });
}

/**
 * This box's identity: the host name and its short form, the user name and home folder from the
 * password database (so a changed HOME does not hide them) and the home folder from HOME, and every IP
 * address that is neither loopback nor link-local. MOTION_SLIDES_SCAN_EXTRA_FACTS can only add facts.
 * @param {NodeJS.ProcessEnv} env
 * @returns {Fact[]}
 */
function hostFacts(env) {
  /** @type {Fact[]} */
  const facts = [];
  const adders = {
    hostNames: (/** @type {string} */ name) => {
      for (const form of new Set([name, name.split('.')[0]])) {
        if (form !== '' && form.toLowerCase() !== 'localhost') {
          facts.push(fact('host-name', '<host name>', 'word', form));
        }
      }
    },
    userNames: (/** @type {string} */ name) => {
      if (name !== '') facts.push(fact('user-name', '<user name>', 'word', name));
    },
    homePaths: (/** @type {string} */ path) => {
      const trimmed = path.replace(/\/+$/, '');
      if (trimmed !== '') facts.push(fact('home-path', '<home path>', 'substring', trimmed));
    },
    ips: (/** @type {string} */ address) => {
      const kind = address.includes(':') ? 'ip6' : 'ip4';
      facts.push(fact('ip-address', '<ip address>', kind, address));
    },
  };

  /** @type {{ username: string, homedir: string }} */
  let user;
  try {
    user = userInfo();
  } catch {
    throw new CannotScan('the user name and home folder cannot be read from the password database');
  }
  adders.hostNames(hostname());
  adders.userNames(user.username);
  adders.homePaths(user.homedir);
  adders.homePaths(env.HOME ?? '');
  for (const addresses of Object.values(networkInterfaces())) {
    for (const { internal, address } of addresses ?? []) {
      const linkLocal = address.startsWith('169.254.') || /^fe[89ab]/i.test(address);
      if (!internal && !linkLocal) adders.ips(address);
    }
  }

  const extra = env.MOTION_SLIDES_SCAN_EXTRA_FACTS;
  if (extra !== undefined && extra !== '') {
    const shape =
      'MOTION_SLIDES_SCAN_EXTRA_FACTS must be a JSON object of string lists: hostNames, userNames, homePaths, ips';
    /** @type {unknown} */
    let parsed;
    try {
      parsed = JSON.parse(extra);
    } catch {
      throw new CannotScan(shape);
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new CannotScan(shape);
    }
    for (const [name, values] of Object.entries(parsed)) {
      if (!Object.hasOwn(adders, name)) throw new CannotScan(shape);
      if (!Array.isArray(values) || values.some((v) => typeof v !== 'string')) {
        throw new CannotScan(shape);
      }
      for (const value of values) adders[/** @type {keyof adders} */ (name)](value);
    }
  }
  return facts.filter((f, i) => facts.findIndex((g) => g.rule === f.rule && g.key === f.key) === i);
}

/**
 * One fact, compiled for both views: `bytes` matches the UTF-8 bytes of the text in a latin1 view,
 * `chars` matches the text itself in a decoded UTF-16 view. Both ignore case.
 * @param {string} rule
 * @param {string} label
 * @param {MatchKind} kind
 * @param {string} text
 * @returns {Fact}
 */
function fact(rule, label, kind, text) {
  const literal = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return {
    rule,
    label,
    kind,
    key: text.toLowerCase(),
    bytes: new RegExp(literal(Buffer.from(text, 'utf8').toString('latin1')), 'gi'),
    chars: new RegExp(literal(text), 'gi'),
  };
}

/**
 * The SHA-256 of every file content the user has looked at and cleared.
 * @param {string} home
 */
async function readAllowedBinaries(home) {
  const content = await readOptional(
    join(home, CONFIG_DIR, 'allowed-binaries.txt'),
    'the allowed-binaries list ~/.config/motion-slides/allowed-binaries.txt cannot be read',
  );
  return firstTokens(content, /^[0-9a-f]{64}$/);
}

/** @param {string} home */
async function readBaseline(home) {
  const content = await readOptional(
    join(home, CONFIG_DIR, 'publish-scan-baseline.txt'),
    'the baseline ~/.config/motion-slides/publish-scan-baseline.txt cannot be read',
  );
  return firstTokens(content, /^[0-9a-f]{16}$/);
}

/**
 * The first word of every line that has the given shape.
 * @param {string} content
 * @param {RegExp} shape
 * @returns {Set<string>}
 */
function firstTokens(content, shape) {
  const tokens = new Set();
  for (const line of content.split(/\r?\n/)) {
    const token = line.trim().split(/\s+/)[0].toLowerCase();
    if (shape.test(token)) tokens.add(token);
  }
  return tokens;
}

/**
 * The file's text, or '' when it does not exist. Any other failure is "cannot scan".
 * @param {string} file
 * @param {string} message
 */
async function readOptional(file, message) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return '';
    throw new CannotScan(message);
  }
}

/**
 * The local fingerprint key: 32 random bytes, created with mode 0600 on first use.
 * @param {string} home
 * @returns {Promise<Buffer>}
 */
async function fingerprintKey(home) {
  const dir = join(home, CONFIG_DIR);
  const file = join(dir, 'publish-scan.key');
  const unusable = 'the fingerprint key ~/.config/motion-slides/publish-scan.key cannot be used';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const key = await readFile(file);
      if (key.length >= 32) return key;
      throw new CannotScan(unusable);
    } catch (error) {
      if (error instanceof CannotScan || errorCode(error) !== 'ENOENT')
        throw new CannotScan(unusable);
    }
    try {
      await mkdir(dir, { recursive: true, mode: 0o700 });
      const handle = await open(file, 'wx', 0o600);
      const key = randomBytes(32);
      await handle.writeFile(key);
      await handle.close();
      return key;
    } catch (error) {
      // Another scan created it first: read that one on the next pass.
      if (errorCode(error) !== 'EEXIST') throw new CannotScan(unusable);
    }
  }
  throw new CannotScan(unusable);
}

/**
 * Lines of git output, as latin1 so every byte survives.
 * @param {Buffer} output
 */
function splitLines(output) {
  return output
    .toString('latin1')
    .split('\n')
    .filter((line) => line !== '');
}

/**
 * The environment for every git process of the scan. Replacement objects (`git replace`) would make git
 * show a stand-in wherever it reads the replaced object, while a push still sends the original, so they
 * are turned off. The replacements themselves stay in scope: their refs/replace/* refs are scanned like
 * any other ref.
 * @param {NodeJS.ProcessEnv} env
 * @returns {NodeJS.ProcessEnv}
 */
function gitEnv(env) {
  return { ...env, GIT_NO_REPLACE_OBJECTS: '1' };
}

/**
 * Runs git and resolves with its standard output. Any failure is "cannot scan".
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} args
 * @returns {Promise<Buffer>}
 */
function git(cwd, env, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, env: gitEnv(env), stdio: ['ignore', 'pipe', 'pipe'] });
    /** @type {Buffer[]} */
    const out = [];
    /** @type {Buffer[]} */
    const err = [];
    child.stdout.on('data', (chunk) => out.push(chunk));
    child.stderr.on('data', (chunk) => err.push(chunk));
    child.on('error', () => reject(new CannotScan('git cannot be started')));
    child.on('close', (status) => {
      if (status === 0) resolve(Buffer.concat(out));
      else reject(new GitFailed(args[0], status, Buffer.concat(err).toString('utf8')));
    });
  });
}

/**
 * Reads every object through one `git cat-file --batch` process and hands each to `onObject` as it
 * arrives, so only one object is held in memory at a time.
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} oids
 * @param {(oid: string, type: string, data: Buffer) => void} onObject
 * @returns {Promise<void>}
 */
function readObjects(cwd, env, oids, onObject) {
  if (oids.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['cat-file', '--batch'], {
      cwd,
      env: gitEnv(env),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    /** @type {Buffer[]} */
    const err = [];
    /** @type {Error | null} */
    let failure = null;
    let header = Buffer.alloc(0);
    /** @type {{ oid: string, type: string, data: Buffer, filled: number } | null} */
    let current = null;
    let read = 0;
    /** @param {Buffer} chunk */
    const consume = (chunk) => {
      for (let offset = 0; offset < chunk.length; ) {
        if (current === null) {
          const newline = chunk.indexOf(0x0a, offset);
          if (newline === -1) {
            header = Buffer.concat([header, chunk.subarray(offset)]);
            return;
          }
          const fields = Buffer.concat([header, chunk.subarray(offset, newline)])
            .toString('latin1')
            .split(' ');
          header = Buffer.alloc(0);
          offset = newline + 1;
          if (fields.length !== 3) throw new CannotScan('git cat-file reported a missing object');
          // One extra byte for the newline git prints after every object.
          const data = Buffer.alloc(Number(fields[2]) + 1);
          current = { oid: fields[0], type: fields[1], data, filled: 0 };
        }
        const take = Math.min(current.data.length - current.filled, chunk.length - offset);
        chunk.copy(current.data, current.filled, offset, offset + take);
        current.filled += take;
        offset += take;
        if (current.filled === current.data.length) {
          onObject(current.oid, current.type, current.data.subarray(0, -1));
          current = null;
          read += 1;
        }
      }
    };
    child.stdout.on('data', (/** @type {Buffer} */ chunk) => {
      if (failure !== null) return;
      try {
        consume(chunk);
      } catch (error) {
        failure =
          error instanceof Error ? error : new CannotScan('git cat-file output is unreadable');
        child.kill();
      }
    });
    child.stderr.on('data', (chunk) => err.push(chunk));
    child.on('error', () => reject(new CannotScan('git cannot be started')));
    child.on('close', (status) => {
      if (failure !== null) reject(failure);
      else if (status !== 0) {
        reject(new GitFailed('cat-file', status, Buffer.concat(err).toString('utf8')));
      } else if (read !== oids.length)
        reject(new CannotScan('git cat-file returned too few objects'));
      else resolve();
    });
    // If git dies early, the failure is reported from 'close'; a broken pipe here adds nothing.
    child.stdin.on('error', () => {});
    child.stdin.end(`${oids.join('\n')}\n`);
  });
}

/**
 * Error text with the home folder (from HOME and from the password database) replaced by its label, so
 * a git message that quotes a path does not print it.
 * @param {string} message
 * @param {NodeJS.ProcessEnv} env
 */
function maskHome(message, env) {
  /** @type {string[]} */
  const homes = [env.HOME ?? ''];
  try {
    homes.push(userInfo().homedir);
  } catch {
    // Nothing more to mask.
  }
  let masked = message;
  for (const home of homes) {
    const trimmed = home.replace(/\/+$/, '');
    if (trimmed !== '') masked = masked.split(trimmed).join('<home path>');
  }
  return masked;
}

/** @param {unknown} error */
function errorCode(error) {
  return error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
}
