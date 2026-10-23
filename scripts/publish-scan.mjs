#!/usr/bin/env node
// Publish-safety scan CLI. Dependency-free: it runs from the pre-push hook and in CI before `npm ci`.
// Exit 0 clean, 1 findings, 2 cannot scan. See specs/008-acceptance-and-public-release/design.md.
import { scan } from './publish-scan/lib.mjs';

const USAGE =
  'usage: node scripts/publish-scan.mjs [--ci] [--text <file>] [--include <object id>]... [--push-ref <ref>]...';
const OBJECT_ID = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
// Git ref names never contain whitespace or control characters; the shape check keeps the hook honest.
// U+FFFD stands in for bytes that are not UTF-8 in Node's argv, so such a name cannot be scanned.
const REF_NAME = /^refs\/[^\s\p{Cc}\uFFFD]{1,250}$/u;

/**
 * Argument values are never echoed: one could be the very thing the scan protects.
 * @param {string[]} argv
 * @returns {{ mode: 'full' | 'ci' | 'text', textFile?: string, include: string[], pushRefs: string[] } | { error: string }}
 */
function parse(argv) {
  /** @type {'full' | 'ci' | 'text'} */
  let mode = 'full';
  /** @type {string | undefined} */
  let textFile;
  /** @type {string[]} */
  const include = [];
  /** @type {string[]} */
  const pushRefs = [];
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
    } else if (arg === '--push-ref') {
      const ref = argv[++i];
      if (ref === undefined || !REF_NAME.test(ref)) {
        return { error: 'a --push-ref value is not a ref name' };
      }
      pushRefs.push(ref);
    } else {
      return { error: `unexpected argument\n${USAGE}` };
    }
  }
  if (mode === 'text' && (include.length > 0 || pushRefs.length > 0))
    return { error: `--include and --push-ref do not apply to --text\n${USAGE}` };
  return { mode, textFile, include, pushRefs };
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
