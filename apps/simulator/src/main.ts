import { runCli } from "./cli.js";
import { createNodeSha256Provider } from "./node-sha256-provider.js";

const result = runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  sha256Provider: createNodeSha256Provider(),
});

if (result.stdout.length > 0) {
  process.stdout.write(result.stdout);
}
if (result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}

process.exitCode = result.exitCode;
