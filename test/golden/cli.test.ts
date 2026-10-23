import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const BIN = fileURLToPath(new URL('../../bin/motion-slides.js', import.meta.url));

function golden(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
}

const packageVersion: unknown = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
).version;

// Runs the real bin the way a user would: a separate node process, piped output, a neutral working folder
// and a minimal environment, so nothing from the test runner leaks into the output.
function cli(...args: string[]) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
    timeout: 30_000,
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('motion-slides CLI', () => {
  it('prints help to stdout and exits 0 for --help', () => {
    expect(cli('--help')).toEqual({ code: 0, stdout: golden('help.txt'), stderr: '' });
  });

  it('prints the package version to stdout and exits 0 for --version', () => {
    expect(packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(cli('--version')).toEqual({ code: 0, stdout: `${packageVersion}\n`, stderr: '' });
  });

  it('reports an unknown option on stderr and exits 2', () => {
    expect(cli('--frobnicate')).toEqual({
      code: 2,
      stdout: '',
      stderr: golden('unknown-option.txt'),
    });
  });

  it('reports an unknown command on stderr and exits 2', () => {
    expect(cli('frobnicate')).toEqual({
      code: 2,
      stdout: '',
      stderr: golden('unknown-command.txt'),
    });
  });

  it('prints help to stderr and exits 2 when no command is given', () => {
    expect(cli()).toEqual({ code: 2, stdout: '', stderr: golden('help.txt') });
  });

  it('exits 0 without an error when the reader closes stdout early, as in `--help | head -1`', async () => {
    const child = spawn(process.execPath, [BIN, '--help'], {
      cwd: tmpdir(),
      env: { PATH: process.env.PATH ?? '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Close the read end before the child starts writing, so its first write meets a closed pipe.
    child.stdout.destroy();
    let stderr = '';
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    const [code] = await once(child, 'close');
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
  });
});
