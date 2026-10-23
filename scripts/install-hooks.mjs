#!/usr/bin/env node
// Installs the publish-safety pre-push hook; `npm ci` runs it through the `prepare` script.
// A relative core.hooksPath would make git look for the hook inside whichever checkout is pushing, and a
// checkout of an older commit has none, so its pushes would go unscanned. So the hook is copied into the
// git common dir (shared by every worktree and branch) with mode 0755, and core.hooksPath points at that
// absolute folder. Outside a git work tree, or when this package sits inside another project's work tree,
// it does nothing.
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

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

const top = workTreeTop();
if (top !== null && realpathSync(top) === realpathSync(root)) {
  const folder = join(
    git(['rev-parse', '--path-format=absolute', '--git-common-dir']),
    'motion-slides-hooks',
  );
  const hook = join(folder, 'pre-push');
  mkdirSync(folder, { recursive: true });
  copyFileSync(join(root, '.githooks', 'pre-push'), hook);
  chmodSync(hook, 0o755);
  git(['config', 'core.hooksPath', folder]);
}
