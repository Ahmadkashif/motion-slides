#!/usr/bin/env node
// Publish-safety scan CLI. Dependency-free: it runs from the pre-push hook and in CI before `npm ci`.
// Exit 0 clean, 1 findings, 2 cannot scan. See specs/008-acceptance-and-public-release/design.md.
import { scan } from './publish-scan/lib.mjs';

const USAGE =
  'usage: node scripts/publish-scan.mjs [--ci] [--text <file>] [--include <object id>]...';
const OBJECT_ID = /^[0-9a-f]{40}([0-9a-f]{24})?$/;

/**
 * Argument values are never echoed: one could be the very thing the scan protects.
 * @param {string[]} argv
 * @returns {{ mode: 'full' | 'ci' | 'text', textFile?: string, include: string[] } | { error: string }}
 */
function parse(argv) {
  /** @type {'full' | 'ci' | 'text'} */
  let mode = 'full';
  /** @type {string | undefined} */
  let textFile;
  /** @type {string[]} */
  const include = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--ci' && mode === 'full') {
      mode = 'ci';
    } else if (arg === '--text' && mode === 'full' && argv[i + 1] !== undefined) {
      mode = 'text';
      textFile = argv[++i];
    } else if (arg === '--include') {
      const id = argv[++i];
      if (id === undefined || !OBJECT_ID.test(id)) {
        return { error: 'an --include value is not a 40 or 64 digit lowercase hex object id' };
      }
      include.push(id);
    } else {
      return { error: `unexpected argument\n${USAGE}` };
    }
  }
  if (mode === 'text' && include.length > 0)
    return { error: `--include does not apply to --text\n${USAGE}` };
  return { mode, textFile, include };
}

/** @returns {Promise<number>} */
async function main() {
  const options = parse(process.argv.slice(2));
  if ('error' in options) {
    process.stderr.write(`publish-scan: cannot scan: ${options.error}\n`);
    return 2;
  }
  const result = await scan({ ...options, repo: process.cwd(), env: process.env });
  if (result.code === 2) process.stderr.write(`${result.error}\n`);
  else process.stdout.write(`${result.output.join('\n')}\n`);
  return result.code;
}

// Anything unexpected is "cannot scan", never "findings" or "clean".
process.exitCode = await main().catch(() => {
  process.stderr.write('publish-scan: cannot scan: unexpected error\n');
  return 2;
});
