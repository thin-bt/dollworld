import { runVerifySprint0Cli } from "./sprint0-verification/verify-cli.js";

const result = runVerifySprint0Cli(process.cwd());
if (result.stdout.length > 0) {
  process.stdout.write(result.stdout);
}
if (result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}
process.exitCode = result.exitCode;
