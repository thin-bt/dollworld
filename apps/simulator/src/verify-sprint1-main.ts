import { runVerifySprint1Cli } from "./sprint1-verification/verify-cli.js";

const result = runVerifySprint1Cli(process.cwd());
if (result.stdout.length > 0) {
  process.stdout.write(result.stdout);
}
if (result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}
process.exitCode = result.exitCode;
