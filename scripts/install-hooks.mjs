#!/usr/bin/env node
// Installs the publish-safety pre-push hook; `npm ci` runs it through the `prepare` script.
// The hook goes into git's default hooks folder, `<git common dir>/hooks`, with mode 0755: every worktree
// and branch of the clone shares it, and it moves with the clone. core.hooksPath is not used: an absolute
// value goes stale when the clone moves, so pushes would silently run no hook, and a relative one points
// into whichever checkout is pushing, which may be older than the hook. So a local core.hooksPath is
// removed, together with the folder an earlier version of this script pointed it at. Outside a git work
// tree, or when this package sits inside another project's work tree, it does nothing.
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
// The folder earlier versions installed into, through an absolute core.hooksPath.
const OLD_FOLDER = 'motion-slides-hooks';
// `git config --unset-all` exits 5 when the key is not set.
const NOT_SET = 5;

/** @param {string[]} args */
function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).replace(/\n$/, '');
}

function workTreeTop() {
  try {
    if (git(['rev-parse', '--is-inside-work-tree']) !== 'true') return null;
    return git(['rev-parse', '--show-toplevel']);
  } catch {
    return null;
  }
}

function removeLocalHooksPath() {
  try {
    git(['config', '--local', '--unset-all', 'core.hooksPath']);
  } catch (error) {
    const status = error !== null && typeof error === 'object' && 'status' in error && error.status;
    if (status !== NOT_SET) throw error;
  }
}

const top = workTreeTop();
if (top !== null && realpathSync(top) === realpathSync(root)) {
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  const folder = join(common, 'hooks');
  const hook = join(folder, 'pre-push');
  mkdirSync(folder, { recursive: true });
  // Removed first, so a symlinked pre-push is replaced rather than written through.
  rmSync(hook, { force: true });
  copyFileSync(join(root, '.githooks', 'pre-push'), hook);
  chmodSync(hook, 0o755);
  removeLocalHooksPath();
  rmSync(join(common, OLD_FOLDER), { recursive: true, force: true });
}
