import { Command, CommanderError } from 'commander';
import packageJson from '../../package.json' with { type: 'json' };

const OK = 0;
const USAGE_ERROR = 2;

const EXIT_CODES_HELP = `
Exit codes:
  0  success
  1  failure
  2  usage error (unknown option or command)`;

function buildProgram(): Command {
  const program = new Command('motion-slides')
    .description('Make narrated, captioned explainer videos on this machine.')
    .version(packageJson.version)
    .addHelpText('after', EXIT_CODES_HELP)
    .showHelpAfterError('(add --help for usage)')
    // Commander would call process.exit itself; throwing instead lets main() own the exit code.
    .exitOverride();
  // With no subcommands yet, commander would call a stray word "too many arguments".
  program.on('command:*', (operands: string[]) => {
    program.error(`error: unknown command '${operands[0]}'`, {
      code: 'commander.unknownCommand',
      exitCode: USAGE_ERROR,
    });
  });
  return program;
}

/** Runs the CLI with the given arguments (without node and script path) and returns the exit code. */
export async function main(argv: readonly string[]): Promise<number> {
  // A reader that stops early (`motion-slides --help | head -1`) closes the pipe. The rest of the output
  // has nowhere to go, which is not a failure; anything else still surfaces.
  process.stdout.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EPIPE') throw error;
  });
  const program = buildProgram();
  try {
    await program.parseAsync(argv, { from: 'user' });
    if (argv.length === 0) program.help({ error: true });
    return OK;
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    // Help and version exit 0; every other parse failure is a usage error.
    return error.exitCode === OK ? OK : USAGE_ERROR;
  }
}
