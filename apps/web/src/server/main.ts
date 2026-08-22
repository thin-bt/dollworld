import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LISTEN_HOST,
  DEFAULT_LISTEN_PORT,
  defaultPublicOrigin,
} from "../shared/ui001-contracts.js";
import { createUiApp, listenUiApp } from "./app.js";
import { nodeCsprngBytes } from "./csprng.js";
import { loadDefaultFrozenPresetRegistry } from "./presets.js";
import { createProcessSecurityContext } from "./process-keys.js";

const here = dirname(fileURLToPath(import.meta.url));
const staticRoot = join(here, "..", "client");
const repoRoot = resolveRepoRoot(here);

function resolveRepoRoot(serverDir: string): string {
  return join(serverDir, "..", "..", "..", "..");
}

const csprng = nodeCsprngBytes;
const processKeys = createProcessSecurityContext(csprng);
const presetRegistry = loadDefaultFrozenPresetRegistry(repoRoot);

const app = await createUiApp({
  publicOrigin: defaultPublicOrigin(DEFAULT_LISTEN_HOST, DEFAULT_LISTEN_PORT),
  staticRoot,
  enableTestProbe: false,
  repoRoot,
  processKeys,
  csprng,
  presetRegistry,
  loadDefaultPresets: false,
});

await listenUiApp(app, { host: DEFAULT_LISTEN_HOST, port: DEFAULT_LISTEN_PORT });
