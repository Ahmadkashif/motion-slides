import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { hostname, tmpdir, userInfo } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scan } from '../../scripts/publish-scan/lib.mjs';

// Each case runs real git and node processes, several of them for the push cases.
vi.setConfig({ testTimeout: 30_000 });

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCANNER = join(ROOT, 'scripts/publish-scan.mjs');
const SCANNER_FILES = [
  'scripts/publish-scan.mjs',
  'scripts/publish-scan/lib.mjs',
  'scripts/install-hooks.mjs',
  '.githooks/pre-push',
];

// Every planted value is assembled here at run time, so none of them appears in this file and a scan of
// this repository never trips over its own fixtures. They are made-up stand-ins, never real list entries.
const cat = (...parts: string[]) => parts.join('');
const LONG = cat('North', 'wind'); // #1, nine characters: substring rule
const SHORT = cat('Q', 'R', 'X'); // #2, all caps, short: boundary rule
const NAME = cat('K', 'i', 'm'); // #3, mixed case, short: boundary rule
const FIVE = cat('Qu', 'ixo'); // #4, exactly five characters: substring rule
const TERMS = [LONG, SHORT, NAME, FIVE];
const GITHUB_TOKEN = cat('gh', 'p_', 'a1B2'.repeat(9));
// The folder an earlier install-hooks used, through an absolute core.hooksPath.
const OLD_FOLDER = 'motion-slides-hooks';
const IN_HISTORY =
  'IN HISTORY: if this commit was never pushed, amend it; if it was, stop and ask the user before any history rewrite (AC4.5)';

interface Run {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface Box {
  root: string;
  home: string;
  repo: string;
  env: Record<string, string>;
}

const boxes: string[] = [];

afterEach(() => {
  for (const root of boxes.splice(0)) {
    const list = join(root, 'home/.config/motion-slides/private-terms.txt');
    if (existsSync(list)) chmodSync(list, 0o600);
    rmSync(root, { recursive: true, force: true });
  }
});

function run(command: string, args: string[], cwd: string, env: Record<string, string>): Run {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 60_000 });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

// A temporary HOME holding the planted private terms list, and a repository folder next to it. git gets
// its identity from the environment because CI has none configured.
function makeBox(terms: string[] | null = TERMS): Box {
  const root = mkdtempSync(join(tmpdir(), 'publish-scan-'));
  boxes.push(root);
  const home = join(root, 'home');
  mkdirSync(join(home, '.config/motion-slides'), { recursive: true });
  if (terms) writeList(home, 'private-terms.txt', terms.join('\n'));
  const env = {
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ''}`,
    HOME: home,
    LANG: 'C',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test Author',
    GIT_AUTHOR_EMAIL: 'author@example.com',
    GIT_COMMITTER_NAME: 'Test Author',
    GIT_COMMITTER_EMAIL: 'author@example.com',
  };
  return { root, home, repo: join(root, 'repo'), env };
}

function writeList(home: string, name: string, content: string): string {
  const file = join(home, '.config/motion-slides', name);
  writeFileSync(file, `${content}\n`);
  return file;
}

function write(dir: string, rel: string, content: string | Buffer): void {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), content);
}

function git(box: Box, ...args: string[]): string {
  const result = run('git', args, box.repo, box.env);
  if (result.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function commitAll(box: Box, message: string): string {
  git(box, 'add', '-A');
  git(box, 'commit', '-q', '-m', message);
  return git(box, 'rev-parse', 'HEAD');
}

// A repository with a first commit that has no scanner yet, then a commit that adds a copy of it, with
// the hook installed the way `npm ci` installs it (unless `install` is false). Returns the first commit.
function makeRepo(box: Box, install = true): string {
  mkdirSync(box.repo);
  git(box, 'init', '-q', '-b', 'main');
  write(box.repo, 'README.md', 'A sample project.\n');
  const start = commitAll(box, 'start');
  for (const file of SCANNER_FILES) write(box.repo, file, readFileSync(join(ROOT, file)));
  commitAll(box, 'add the publish scan');
  if (install) installHooks(box, box.repo);
  return start;
}

function installHooks(box: Box, cwd: string): Run {
  const result = run(process.execPath, ['scripts/install-hooks.mjs'], cwd, box.env);
  expect(result.code).toBe(0);
  return result;
}

function scanRepo(box: Box, ...args: string[]): Run {
  return run(process.execPath, [SCANNER, ...args], box.repo, box.env);
}

function scanText(box: Box, body: string): Run {
  const file = join(box.root, 'body.md');
  writeFileSync(file, body);
  return run(process.execPath, [SCANNER, '--text', file], box.root, box.env);
}

// The output never carries a planted value, in any letter case.
function expectNoLeak(result: Run, ...planted: string[]): void {
  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  for (const value of planted) expect(output).not.toContain(value.toLowerCase());
}

function findingLines(result: Run): string[] {
  return result.stdout
    .split('\n')
    .filter((line) => line !== '' && !line.startsWith('publish-scan:'));
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

// Finding lines with the fingerprint taken out and the IN HISTORY advice shortened, sorted, for exact
// comparison. Each line must carry a 16-digit fingerprint.
function findings(result: Run): string[] {
  const lines = findingLines(result);
  for (const line of lines) expect(line).toMatch(/ fingerprint [0-9a-f]{16}( -- |$)/);
  return lines
    .map((line) => line.replace(/ fingerprint [0-9a-f]{16}/, '').replace(IN_HISTORY, 'IN HISTORY'))
    .sort();
}

function fingerprintOf(result: Run, prefix: string): string {
  const line = findingLines(result).find((l) => l.startsWith(prefix));
  const match = line?.match(/ fingerprint ([0-9a-f]{16})/);
  if (!match) throw new Error(`no finding starting with ${prefix}`);
  return match[1];
}

function gitWith(box: Box, env: Record<string, string>, ...args: string[]): string {
  const result = run('git', args, box.repo, { ...box.env, ...env });
  if (result.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

// A commit no branch reaches: made on a side branch that is then deleted.
function danglingCommit(box: Box, rel: string, content: string): string {
  git(box, 'checkout', '-q', '-b', 'side');
  write(box.repo, rel, content);
  const sha = commitAll(box, 'side work');
  git(box, 'checkout', '-q', 'main');
  git(box, 'branch', '-q', '-D', 'side');
  return sha;
}

function makeRemote(box: Box): string {
  const remote = join(box.root, 'remote.git');
  expect(run('git', ['init', '-q', '--bare', remote], box.root, box.env).code).toBe(0);
  git(box, 'remote', 'add', 'origin', remote);
  return remote;
}

function remoteRef(box: Box, remote: string, ref: string): string {
  return run(
    'git',
    ['--git-dir', remote, 'rev-parse', '--verify', '-q', ref],
    box.root,
    box.env,
  ).stdout.trim();
}

// git's default hooks folder in the common dir, shared by every worktree of the clone.
function hooksFolder(box: Box): string {
  return join(git(box, 'rev-parse', '--path-format=absolute', '--git-common-dir'), 'hooks');
}

// The local core.hooksPath setting, or '' when there is none.
function hooksPathSetting(box: Box): string {
  return run(
    'git',
    ['config', '--local', '--get', 'core.hooksPath'],
    box.repo,
    box.env,
  ).stdout.trim();
}

// A correct, executable copy of the hook in a folder git would only use through core.hooksPath.
function hookCopyElsewhere(box: Box): string {
  const elsewhere = join(box.root, 'elsewhere');
  write(elsewhere, 'pre-push', readFileSync(join(box.repo, '.githooks/pre-push')));
  chmodSync(join(elsewhere, 'pre-push'), 0o755);
  return elsewhere;
}

function zipBytes(): Buffer {
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('a packed body')]);
}

function pdfBytes(): Buffer {
  return Buffer.from(cat('%PD', 'F-1.7\n', 'a document body\n'));
}

describe('publish-scan --text', () => {
  it('reports a private term in a PR body by list position and exits 1', () => {
    const box = makeBox();
    const result = scanText(box, `Title\n\nThis adds the ${LONG} importer.\n`);
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(
      /^private-term <private term #1> in text \S+body\.md:3 fingerprint [0-9a-f]{16}$/m,
    );
    expect(result.stdout).toMatch(/^publish-scan: text, 1 objects, 0 refs, 1 findings$/m);
    expect(result.stderr).toBe('');
    expectNoLeak(result, ...TERMS);
  });

  it('reports an absolute home path, from HOME and from the password database', () => {
    const box = makeBox();
    const fromEnv = join(box.home, 'videos/out.mp4');
    const fromPasswd = join(userInfo().homedir, 'videos/out.mp4');
    const result = scanText(box, `Rendered to ${fromEnv}\nand to ${fromPasswd}\n`);
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/^home-path <home path> in text \S+:1 fingerprint/m);
    expect(result.stdout).toMatch(/^home-path <home path> in text \S+:2 fingerprint/m);
    expectNoLeak(result, box.home, userInfo().homedir);
  });

  it('passes a clean PR body with exit 0 and the summary line only', () => {
    const box = makeBox();
    const result = scanText(box, 'Adds the walking skeleton.\n\nVerify: 5 gates pass.\n');
    expect(result).toEqual({
      code: 0,
      stdout: 'publish-scan: text, 1 objects, 0 refs, 0 findings\n',
      stderr: '',
    });
  });

  it('returns code and findings to a direct caller of scan()', async () => {
    const box = makeBox();
    const file = join(box.root, 'body.md');
    writeFileSync(file, `About ${SHORT}.\n`);
    const result = await scan({ mode: 'text', repo: box.root, textFile: file, env: box.env });
    expect(result.code).toBe(1);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({ rule: 'private-term', label: '<private term #2>' });
  });
});

describe('publish-scan private terms list', () => {
  it('cannot scan (exit 2) when the list is missing', () => {
    const box = makeBox(null);
    const result = scanText(box, 'clean\n');
    expect(result.code).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^publish-scan: cannot scan: .*private terms list/m);
    expectNoLeak(result, box.home);
  });

  it('cannot scan (exit 2) when the list has only comments and blank lines', () => {
    const box = makeBox([]);
    writeList(box.home, 'private-terms.txt', '# stand-ins only\n\n   \n# nothing else');
    const result = scanText(box, 'clean\n');
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/private terms list/);
  });

  it('cannot scan (exit 2) when the list is unreadable', () => {
    const box = makeBox();
    chmodSync(join(box.home, '.config/motion-slides/private-terms.txt'), 0o000);
    const result = scanText(box, 'clean\n');
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/private terms list/);
    expectNoLeak(result, box.home);
  });

  it('skips comment lines, indented or not, and counts positions over terms only', () => {
    const box = makeBox([]);
    writeList(box.home, 'private-terms.txt', `# header\n${LONG}\n   # a stand-in\n\n${SHORT}`);
    const result = scanText(box, `${SHORT} notes\n`);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('private-term <private term #2> in text');
    expectNoLeak(result, LONG, SHORT);
  });

  it('keeps a # inside a term, because # starts a comment only at the start of a line', () => {
    const box = makeBox([]);
    const hashed = cat('Qx', '#', 'Lab');
    writeList(box.home, 'private-terms.txt', `${LONG}\n${hashed}`);
    const result = scanText(box, `Notes on ${hashed}\nand ${hashed.slice(0, 2)} alone\n`);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual([
      expect.stringMatching(/^private-term <private term #2> in text \S+body\.md:1$/),
    ]);
    expectNoLeak(result, LONG, hashed);
  });
});

describe('publish-scan full mode over the working tree and every object in history', () => {
  it('passes a clean repository with the summary line only', () => {
    const box = makeBox();
    makeRepo(box);
    const result = scanRepo(box);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^publish-scan: full, \d+ objects, 1 refs, 0 findings\n$/);
    expect(result.stderr).toBe('');
  });

  it('flags a secret in a blob that a later commit deleted', () => {
    const box = makeBox();
    makeRepo(box);
    write(box.repo, 'config.json', `{ "token": "${GITHUB_TOKEN}" }\n`);
    commitAll(box, 'add config');
    const blob = git(box, 'rev-parse', 'HEAD:config.json');
    rmSync(join(box.repo, 'config.json'));
    commitAll(box, 'drop config');
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual([
      `secret <secret:github-token> in blob ${blob} config.json -- IN HISTORY`,
    ]);
    expect(result.stdout).toMatch(/^publish-scan: full, \d+ objects, 1 refs, 1 findings$/m);
    expectNoLeak(result, GITHUB_TOKEN);
  });

  it('flags a secret inside a binary file, in the working tree and in history', () => {
    const box = makeBox();
    makeRepo(box);
    const key = cat('AK', 'IA', 'Z7Y6X5W4V3U2T1S0');
    write(
      box.repo,
      'data/blob.bin',
      Buffer.concat([Buffer.from([0, 1, 2, 0]), Buffer.from(key), Buffer.from([0, 255])]),
    );
    commitAll(box, 'add data');
    const blob = git(box, 'rev-parse', 'HEAD:data/blob.bin');
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual([
      `secret <secret:aws-access-key> in blob ${blob} data/blob.bin -- IN HISTORY`,
      'secret <secret:aws-access-key> in worktree data/blob.bin:1',
    ]);
    expectNoLeak(result, key);
  });

  it('flags a term inside UTF-16 files, with or without a byte-order mark', () => {
    const box = makeBox();
    makeRepo(box);
    const withBom = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from(`Notes\r\nabout ${LONG}\r\n`, 'utf16le'),
    ]);
    const bigEndian = Buffer.from(`Plan for ${LONG}\n`, 'utf16le').swap16();
    write(box.repo, 'notes/le.txt', withBom);
    write(box.repo, 'notes/be.txt', bigEndian);
    commitAll(box, 'add notes');
    const le = git(box, 'rev-parse', 'HEAD:notes/le.txt');
    const be = git(box, 'rev-parse', 'HEAD:notes/be.txt');
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual(
      [
        `private-term <private term #1> in blob ${be} notes/be.txt -- IN HISTORY`,
        `private-term <private term #1> in blob ${le} notes/le.txt -- IN HISTORY`,
        'private-term <private term #1> in worktree notes/be.txt:1',
        'private-term <private term #1> in worktree notes/le.txt:2',
      ].sort(),
    );
    expectNoLeak(result, LONG);
  });

  it('flags a short-term hit in a non-opaque binary until the user allows its hash', () => {
    const box = makeBox();
    makeRepo(box);
    const glyphs = Buffer.concat([
      Buffer.from([0, 1, 2, 0]),
      Buffer.from(` ${SHORT} `),
      Buffer.from([0, 9]),
    ]);
    write(box.repo, 'assets/glyphs.bin', glyphs);
    commitAll(box, 'add glyphs');
    const blob = git(box, 'rev-parse', 'HEAD:assets/glyphs.bin');
    const flagged = scanRepo(box);
    expect(flagged.code).toBe(1);
    expect(findings(flagged)).toEqual([
      `private-term <private term #2> in blob ${blob} assets/glyphs.bin -- IN HISTORY`,
      'private-term <private term #2> in worktree assets/glyphs.bin:1',
    ]);
    expectNoLeak(flagged, SHORT);

    writeList(
      box.home,
      'allowed-binaries.txt',
      `${sha256(glyphs)} assets/glyphs.bin looked at by the user`,
    );
    const allowed = scanRepo(box);
    expect(allowed.code).toBe(0);
    expect(findingLines(allowed)).toEqual([]);
  });

  it('turns the camelCase exception off in binary content but keeps it in text', () => {
    const box = makeBox();
    makeRepo(box);
    const camel = cat('my', SHORT[0], SHORT.slice(1).toLowerCase());
    write(
      box.repo,
      'assets/table.bin',
      Buffer.concat([Buffer.from([0]), Buffer.from(camel), Buffer.from([0])]),
    );
    write(box.repo, 'src/names.ts', `export const ${camel} = 1;\n`);
    commitAll(box, 'add both');
    const text = git(box, 'rev-parse', 'HEAD:src/names.ts');
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual([
      `private-term <private term #2> in blob ${text} src/names.ts -- IN HISTORY`,
      'private-term <private term #2> in worktree src/names.ts:1',
    ]);
    expectNoLeak(result, SHORT);
  });

  it('applies the short-term rule and the substring rule exactly as the design table says', () => {
    const box = makeBox();
    makeRepo(box);
    const lower = SHORT.toLowerCase();
    write(
      box.repo,
      'match.txt',
      [
        `${SHORT}_notes`,
        `${SHORT}Colors`,
        `my${SHORT}`,
        `${SHORT}s are due`,
        `${NAME}'s draft`,
        `the ${NAME} review`,
        `x${FIVE}x`,
      ].join('\n'),
    );
    write(
      box.repo,
      'nomatch.txt',
      [
        `${NAME}berly`,
        `${NAME}s`,
        `${SHORT}ss`,
        `x${lower}`,
        `${lower}y`,
        `${FIVE.slice(0, 4)}`,
      ].join('\n'),
    );
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual([
      'private-term <private term #2> in worktree match.txt:1',
      'private-term <private term #2> in worktree match.txt:2',
      'private-term <private term #2> in worktree match.txt:3',
      'private-term <private term #2> in worktree match.txt:4',
      'private-term <private term #3> in worktree match.txt:5',
      'private-term <private term #3> in worktree match.txt:6',
      'private-term <private term #4> in worktree match.txt:7',
    ]);
    expectNoLeak(result, ...TERMS);
  });

  it('reports a term in a file, a path, a commit message, an author, a branch and a tag by position only', () => {
    const box = makeBox();
    makeRepo(box);
    write(box.repo, 'notes/plan.md', `Plan for ${LONG}\n`);
    write(box.repo, `docs/${SHORT}_notes.md`, 'Nothing private here.\n');
    gitWith(box, {}, 'add', '-A');
    gitWith(
      box,
      { GIT_AUTHOR_NAME: `${NAME} Doe` },
      'commit',
      '-q',
      '-m',
      `Draft for ${NAME}'s review`,
    );
    const commit = git(box, 'rev-parse', 'HEAD');
    const plan = git(box, 'rev-parse', 'HEAD:notes/plan.md');
    const docs = git(box, 'rev-parse', 'HEAD:docs');
    git(box, 'branch', `feature/${SHORT}-colors`);
    git(box, 'tag', '-a', 'v1', '-m', `Release for ${FIVE}`);
    const tag = git(box, 'rev-parse', 'v1');
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual(
      [
        `private-term <private term #1> in blob ${plan} notes/plan.md -- IN HISTORY`,
        'private-term <private term #1> in worktree notes/plan.md:1',
        'private-term <private term #2> in ref refs/heads/feature/<private term #2>-colors -- IN HISTORY',
        `private-term <private term #2> in tree ${docs} docs/<private term #2>_notes.md -- IN HISTORY`,
        'private-term <private term #2> in worktree docs/<private term #2>_notes.md',
        `private-term <private term #3> in commit ${commit} author -- IN HISTORY`,
        `private-term <private term #3> in commit ${commit} message -- IN HISTORY`,
        `private-term <private term #4> in tag ${tag} -- IN HISTORY`,
      ].sort(),
    );
    expect(result.stdout).toMatch(/^publish-scan: full, \d+ objects, 3 refs, 8 findings$/m);
    expectNoLeak(result, ...TERMS);
  });

  it('flags extra host facts from the test seam, with digit boundaries for addresses', () => {
    const box = makeBox();
    makeRepo(box);
    const host = cat('build', 'box7');
    const user = cat('ada', 'q');
    const ip = cat('10.', '20.30.40');
    write(
      box.repo,
      'deploy.txt',
      [`ssh ${user}@${host}.example.lan`, `address ${ip}`, `not an address ${ip}1`, `${host}`].join(
        '\n',
      ),
    );
    const extra = JSON.stringify({
      hostNames: [`${host}.example.lan`],
      userNames: [user],
      ips: [ip],
    });
    const result = run(process.execPath, [SCANNER], box.repo, {
      ...box.env,
      MOTION_SLIDES_SCAN_EXTRA_FACTS: extra,
    });
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual([
      'host-name <host name> in worktree deploy.txt:1',
      'host-name <host name> in worktree deploy.txt:4',
      'ip-address <ip address> in worktree deploy.txt:2',
      'user-name <user name> in worktree deploy.txt:1',
    ]);
    expectNoLeak(result, host, user, ip);
  });

  it('cannot scan (exit 2) when the test seam is not a JSON object of string lists', () => {
    const box = makeBox();
    makeRepo(box);
    for (const extra of ['{', '[]', '{"hostNames":"x"}', '{"other":["x"]}']) {
      const result = run(process.execPath, [SCANNER], box.repo, {
        ...box.env,
        MOTION_SLIDES_SCAN_EXTRA_FACTS: extra,
      });
      expect(result.code).toBe(2);
      expect(result.stderr).toMatch(/MOTION_SLIDES_SCAN_EXTRA_FACTS/);
    }
  });

  it("flags this box's own host name, user name and home path even under another HOME", () => {
    const box = makeBox();
    makeRepo(box);
    const me = userInfo();
    write(box.repo, 'whoami.txt', `${hostname()}\nowner ${me.username}\nat ${me.homedir}/work\n`);
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    const lines = findings(result);
    expect(lines).toContain('host-name <host name> in worktree whoami.txt:1');
    expect(lines).toContain('user-name <user name> in worktree whoami.txt:2');
    expect(lines).toContain('home-path <home path> in worktree whoami.txt:3');
    expectNoLeak(result, hostname(), me.username, me.homedir);
  });
});

describe('publish-scan opaque containers, --ci, --include and shallow clones', () => {
  it('flags a zip and a PDF as opaque in full mode, in the working tree and in history', () => {
    const box = makeBox();
    makeRepo(box);
    write(box.repo, 'assets/pack.zip', zipBytes());
    write(box.repo, 'assets/brief.pdf', pdfBytes());
    commitAll(box, 'add assets');
    const zip = git(box, 'rev-parse', 'HEAD:assets/pack.zip');
    const pdf = git(box, 'rev-parse', 'HEAD:assets/brief.pdf');
    const result = scanRepo(box);
    expect(result.code).toBe(1);
    expect(findings(result)).toEqual(
      [
        `opaque-binary <opaque:pdf> in blob ${pdf} assets/brief.pdf -- IN HISTORY`,
        `opaque-binary <opaque:zip> in blob ${zip} assets/pack.zip -- IN HISTORY`,
        'opaque-binary <opaque:pdf> in worktree assets/brief.pdf',
        'opaque-binary <opaque:zip> in worktree assets/pack.zip',
      ].sort(),
    );
  });

  it('still flags a zip whose hash is listed only inside the repository, and passes once the user lists it', () => {
    const box = makeBox();
    makeRepo(box);
    const zip = zipBytes();
    write(box.repo, 'assets/pack.zip', zip);
    write(
      box.repo,
      '.config/motion-slides/allowed-binaries.txt',
      `${sha256(zip)} assets/pack.zip listed in the repo\n`,
    );
    commitAll(box, 'add a zip');
    expect(scanRepo(box).code).toBe(1);
    writeList(
      box.home,
      'allowed-binaries.txt',
      `# sha256 path reason\n${sha256(zip)} assets/pack.zip looked at`,
    );
    const allowed = scanRepo(box);
    expect(allowed.code).toBe(0);
    expect(findingLines(allowed)).toEqual([]);
  });

  it('--ci checks secrets only: no opaque rule, no terms list, no host facts', () => {
    const box = makeBox(null);
    makeRepo(box);
    write(box.repo, 'assets/pack.zip', zipBytes());
    write(box.repo, 'notes.md', `${LONG} at ${hostname()}\n`);
    commitAll(box, 'add things');
    const clean = scanRepo(box, '--ci');
    expect(clean.code).toBe(0);
    expect(clean.stdout).toMatch(/^publish-scan: ci, \d+ objects, 1 refs, 0 findings\n$/);
    write(box.repo, 'token.txt', `${GITHUB_TOKEN}\n`);
    const secret = scanRepo(box, '--ci');
    expect(secret.code).toBe(1);
    expect(findings(secret)).toEqual(['secret <secret:github-token> in worktree token.txt:1']);
    expectNoLeak(secret, GITHUB_TOKEN);
  });

  it('--ci cannot scan a shallow clone (exit 2)', () => {
    const box = makeBox();
    makeRepo(box);
    const shallow = join(box.root, 'shallow');
    expect(
      run('git', ['clone', '-q', '--depth', '1', `file://${box.repo}`, shallow], box.root, box.env)
        .code,
    ).toBe(0);
    const result = run(process.execPath, [SCANNER, '--ci'], shallow, box.env);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/^publish-scan: cannot scan: .*shallow/m);
  });

  it('refuses an --include value that is not an object id, and one that does not exist (exit 2)', () => {
    const box = makeBox();
    makeRepo(box);
    const head = git(box, 'rev-parse', 'HEAD');
    for (const value of ['HEAD', head.toUpperCase(), head.slice(1), `${head} `, `--ci`]) {
      const result = scanRepo(box, '--include', value);
      expect(result.code).toBe(2);
      expect(result.stdout).toBe('');
      expect(result.stderr).toMatch(/--include value is not .*object id/);
    }
    const missing = scanRepo(box, '--include', `${'0'.repeat(39)}1`);
    expect(missing.code).toBe(2);
  });

  it('scans a commit given by --include that no ref reaches', () => {
    const box = makeBox();
    makeRepo(box);
    const sha = danglingCommit(box, 'side.md', `${LONG}\n`);
    expect(scanRepo(box).code).toBe(0);
    const result = scanRepo(box, '--include', sha);
    expect(result.code).toBe(1);
    expect(findings(result)).toContain(
      `private-term <private term #1> in blob ${git(box, 'rev-parse', `${sha}:side.md`)} side.md -- IN HISTORY`,
    );
    expectNoLeak(result, LONG);
  });
});

describe('publish-scan hook installation', () => {
  it('install-hooks copies an executable hook into the default hooks folder of the git common dir', () => {
    const box = makeBox();
    makeRepo(box);
    const hook = join(hooksFolder(box), 'pre-push');
    expect(statSync(hook).mode & 0o777).toBe(0o755);
    expect(readFileSync(hook)).toEqual(readFileSync(join(box.repo, '.githooks/pre-push')));
    expect(hooksPathSetting(box)).toBe('');
  });

  it('install-hooks moves a clone off the old absolute core.hooksPath folder', () => {
    const box = makeBox();
    makeRepo(box, false);
    const old = join(
      git(box, 'rev-parse', '--path-format=absolute', '--git-common-dir'),
      OLD_FOLDER,
    );
    write(old, 'pre-push', readFileSync(join(box.repo, '.githooks/pre-push')));
    chmodSync(join(old, 'pre-push'), 0o755);
    git(box, 'config', 'core.hooksPath', old);
    installHooks(box, box.repo);
    expect(hooksPathSetting(box)).toBe('');
    expect(existsSync(old)).toBe(false);
    expect(existsSync(join(hooksFolder(box), 'pre-push'))).toBe(true);
    expect(scanRepo(box).code).toBe(0);
  });

  it('install-hooks from a linked worktree installs the shared hook, which scans pushes from there', () => {
    const box = makeBox();
    makeRepo(box, false);
    const remote = makeRemote(box);
    const linked = { ...box, repo: join(box.root, 'linked') };
    git(box, 'worktree', 'add', '-q', linked.repo, '-b', 'other');
    installHooks(box, linked.repo);
    expect(existsSync(join(hooksFolder(box), 'pre-push'))).toBe(true);
    write(linked.repo, 'plan.md', `Plan for ${LONG}\n`);
    commitAll(linked, 'plan');
    const blocked = run('git', ['push', '-q', 'origin', 'other'], linked.repo, box.env);
    expect(blocked.code).not.toBe(0);
    expect(`${blocked.stdout}${blocked.stderr}`).toContain('<private term #1>');
    expect(remoteRef(box, remote, 'other')).toBe('');
    expectNoLeak(blocked, LONG);
  });

  it('install-hooks outside a git work tree does nothing', () => {
    const box = makeBox();
    const plain = join(box.root, 'plain');
    for (const file of SCANNER_FILES) write(plain, file, readFileSync(join(ROOT, file)));
    const result = installHooks(box, plain);
    expect(result.stderr).toBe('');
    expect(existsSync(join(plain, '.git'))).toBe(false);
  });

  it('runs install-hooks from the npm prepare script, and the hook source is committed executable', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.prepare).toBe('node scripts/install-hooks.mjs');
    const staged = spawnSync('git', ['ls-files', '-s', '.githooks/pre-push'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(staged.stdout).toMatch(/^100755 /);
  });

  it('full mode cannot scan (exit 2) when no hook is installed', () => {
    const box = makeBox();
    makeRepo(box, false);
    const result = scanRepo(box);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(
      /missing or not executable; run node scripts\/install-hooks\.mjs/,
    );
    expectNoLeak(result, box.root);
  });

  it('full mode cannot scan (exit 2) when a local core.hooksPath points elsewhere', () => {
    const box = makeBox();
    makeRepo(box);
    git(box, 'config', 'core.hooksPath', hookCopyElsewhere(box));
    const result = scanRepo(box);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/core\.hooksPath.*run node scripts\/install-hooks\.mjs/);
    expectNoLeak(result, box.root);
  });

  it('full mode cannot scan (exit 2) when a global core.hooksPath points elsewhere', () => {
    const box = makeBox();
    makeRepo(box);
    const global = join(box.root, 'global.gitconfig');
    writeFileSync(global, `[core]\n\thooksPath = ${hookCopyElsewhere(box)}\n`);
    const result = run(process.execPath, [SCANNER], box.repo, {
      ...box.env,
      GIT_CONFIG_GLOBAL: global,
    });
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/core\.hooksPath.*run node scripts\/install-hooks\.mjs/);
    expectNoLeak(result, box.root);
  });

  it('full mode cannot scan (exit 2) when the installed hook is not executable', () => {
    const box = makeBox();
    makeRepo(box);
    chmodSync(join(hooksFolder(box), 'pre-push'), 0o644);
    const result = scanRepo(box);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/not executable/);
  });

  it('full mode cannot scan (exit 2) when the installed hook differs from .githooks/pre-push', () => {
    const box = makeBox();
    makeRepo(box);
    const hook = join(hooksFolder(box), 'pre-push');
    writeFileSync(hook, `${readFileSync(hook, 'utf8')}exit 0\n`);
    const result = scanRepo(box);
    expect(result.code).toBe(2);
    expect(result.stderr).toMatch(/differs/);
  });
});

describe('publish-scan pre-push hook on a real push', () => {
  it('lets a clean push through and blocks a push with a planted term', () => {
    const box = makeBox();
    makeRepo(box);
    const remote = makeRemote(box);
    const clean = run('git', ['push', '-q', 'origin', 'main'], box.repo, box.env);
    expect(clean.code).toBe(0);
    expect(remoteRef(box, remote, 'main')).toBe(git(box, 'rev-parse', 'HEAD'));

    write(box.repo, 'plan.md', `Plan for ${LONG}\n`);
    const planted = commitAll(box, 'plan');
    const blocked = run('git', ['push', '-q', 'origin', 'main'], box.repo, box.env);
    expect(blocked.code).not.toBe(0);
    expect(`${blocked.stdout}${blocked.stderr}`).toContain('<private term #1>');
    expect(remoteRef(box, remote, 'main')).not.toBe(planted);
    expectNoLeak(blocked, LONG);
  });

  it('blocks a commit that no branch reaches, pushed by id to a new remote branch', () => {
    const box = makeBox();
    makeRepo(box);
    const remote = makeRemote(box);
    const sha = danglingCommit(box, 'side.md', `${LONG}\n`);
    const blocked = run(
      'git',
      ['push', '-q', 'origin', `${sha}:refs/heads/side`],
      box.repo,
      box.env,
    );
    expect(blocked.code).not.toBe(0);
    expect(`${blocked.stdout}${blocked.stderr}`).toContain('<private term #1>');
    expect(remoteRef(box, remote, 'side')).toBe('');
    expectNoLeak(blocked, LONG);
  });

  it('blocks a push to a remote branch whose name holds a term, before the name is published', () => {
    const box = makeBox();
    makeRepo(box);
    const remote = makeRemote(box);
    const blocked = run(
      'git',
      ['push', '-q', 'origin', `main:refs/heads/plan-${LONG}`],
      box.repo,
      box.env,
    );
    expect(blocked.code).not.toBe(0);
    expect(`${blocked.stdout}${blocked.stderr}`).toContain(
      'pushed-ref refs/heads/plan-<private term #1>',
    );
    expect(remoteRef(box, remote, `plan-${LONG}`)).toBe('');
    expectNoLeak(blocked, LONG);
  });

  it('lets a deletion-only push through unscanned, so a badly named branch can be deleted', () => {
    const box = makeBox();
    makeRepo(box);
    const remote = makeRemote(box);
    expect(run('git', ['push', '-q', 'origin', 'main'], box.repo, box.env).code).toBe(0);
    // The badly named branch reached the remote some other way; a fetch brings its name here too.
    const bad = `refs/heads/plan-${LONG}`;
    const made = run('git', ['--git-dir', remote, 'update-ref', bad, 'main'], box.root, box.env);
    expect(made.code).toBe(0);
    git(box, 'fetch', '-q', 'origin');
    const pushes = ['push', '-q', 'origin', `:${bad}`, 'main:refs/heads/next'];
    const mixed = run('git', pushes, box.repo, box.env);
    expect(mixed.code).not.toBe(0);
    expect(remoteRef(box, remote, `plan-${LONG}`)).not.toBe('');
    const deleted = run('git', ['push', '-q', 'origin', `:${bad}`], box.repo, box.env);
    expect(deleted.code).toBe(0);
    expect(remoteRef(box, remote, `plan-${LONG}`)).toBe('');
    expectNoLeak(mixed, LONG);
    expectNoLeak(deleted, LONG);
  });

  it('still blocks a planted push after the clone is moved to another folder', () => {
    const box = makeBox();
    makeRepo(box);
    const remote = makeRemote(box);
    const moved = { ...box, repo: join(box.root, 'moved') };
    renameSync(box.repo, moved.repo);
    write(moved.repo, 'plan.md', `Plan for ${LONG}\n`);
    commitAll(moved, 'plan');
    const blocked = run('git', ['push', '-q', 'origin', 'main'], moved.repo, box.env);
    expect(blocked.code).not.toBe(0);
    expect(`${blocked.stdout}${blocked.stderr}`).toContain('<private term #1>');
    expect(remoteRef(box, remote, 'main')).toBe('');
    expectNoLeak(blocked, LONG);
  });

  it('blocks a push whose planted commit is hidden behind a git replace object', () => {
    const box = makeBox();
    makeRepo(box);
    const remote = makeRemote(box);
    git(box, 'commit', '-q', '--allow-empty', '-m', `Plan for ${LONG}`);
    const planted = git(box, 'rev-parse', 'HEAD');
    const stand = git(box, 'commit-tree', `${planted}^{tree}`, '-p', `${planted}^`, '-m', 'plan');
    git(box, 'replace', planted, stand);
    // With the replacement in place, git shows the clean stand-in wherever it reads the commit.
    expect(git(box, 'log', '-1', '--format=%s')).toBe('plan');
    const blocked = run('git', ['push', '-q', 'origin', 'main'], box.repo, box.env);
    expect(blocked.code).not.toBe(0);
    expect(`${blocked.stdout}${blocked.stderr}`).toContain(
      `private-term <private term #1> in commit ${planted} message`,
    );
    expect(remoteRef(box, remote, 'main')).toBe('');
    expectNoLeak(blocked, LONG);
  });

  it('refuses a --push-ref value that is not a ref name (exit 2)', () => {
    const box = makeBox();
    makeRepo(box);
    for (const value of ['main', 'refs/heads/a b', 'refs/heads/a\tb']) {
      const result = scanRepo(box, '--push-ref', value);
      expect(result.code).toBe(2);
      expect(result.stderr).toMatch(/--push-ref value is not a ref name/);
    }
  });

  it('blocks a push from a branch cut before the scanner existed', () => {
    const box = makeBox();
    const start = makeRepo(box);
    const remote = makeRemote(box);
    git(box, 'checkout', '-q', '-b', 'old', start);
    const blocked = run('git', ['push', '-q', 'origin', 'old'], box.repo, box.env);
    expect(blocked.code).not.toBe(0);
    expect(blocked.stderr).toMatch(/scripts\/publish-scan\.mjs is missing/);
    expect(remoteRef(box, remote, 'old')).toBe('');
  });
});

describe('publish-scan baseline and fingerprints', () => {
  it('prints IN HISTORY for a history finding, and passes it once its fingerprint is in the baseline', () => {
    const box = makeBox();
    makeRepo(box);
    write(box.repo, 'old.md', `${LONG}\n`);
    commitAll(box, 'old');
    const blob = git(box, 'rev-parse', 'HEAD:old.md');
    rmSync(join(box.repo, 'old.md'));
    commitAll(box, 'drop old');
    const first = scanRepo(box);
    expect(first.code).toBe(1);
    expect(first.stdout).toContain(` -- ${IN_HISTORY}`);
    const prefix = `private-term <private term #1> in blob ${blob} old.md`;
    const fingerprint = fingerprintOf(first, prefix);

    writeList(box.home, 'publish-scan-baseline.txt', `# accepted after review\n${fingerprint}`);
    const accepted = scanRepo(box);
    expect(accepted.code).toBe(0);
    expect(findingLines(accepted)).toEqual([
      `${prefix} fingerprint ${fingerprint} -- accepted by the user (baseline)`,
    ]);
    expect(accepted.stdout).toMatch(/ 0 findings$/m);
    expectNoLeak(accepted, LONG);
  });

  it('never baselines a working-tree finding', () => {
    const box = makeBox();
    makeRepo(box);
    write(box.repo, 'draft.md', `${LONG}\n`);
    const first = scanRepo(box);
    writeList(box.home, 'publish-scan-baseline.txt', fingerprintOf(first, 'private-term'));
    expect(scanRepo(box).code).toBe(1);
  });

  it('keeps the key private (mode 0600) and changes every fingerprint when the key changes', () => {
    const box = makeBox();
    makeRepo(box);
    write(box.repo, 'draft.md', `${LONG}\n`);
    const before = fingerprintOf(scanRepo(box), 'private-term');
    const keyFile = join(box.home, '.config/motion-slides/publish-scan.key');
    expect(statSync(keyFile).mode & 0o777).toBe(0o600);
    expect(readFileSync(keyFile)).toHaveLength(32);
    expect(fingerprintOf(scanRepo(box), 'private-term')).toBe(before);
    writeFileSync(keyFile, Buffer.alloc(32, 7));
    expect(fingerprintOf(scanRepo(box), 'private-term')).not.toBe(before);
  });
});
