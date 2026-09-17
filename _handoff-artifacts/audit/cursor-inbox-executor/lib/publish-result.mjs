import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @param {object} input
 * @param {string} input.handoffRoot absolute `_handoff-artifacts`
 * @param {string} input.taskKey
 * @param {string} input.body markdown/plain result body
 * @param {Record<string, string>} [input.headerFields]
 */
export async function publishTaskResult(input) {
  const { handoffRoot, taskKey, body, headerFields = {} } = input;
  const resultDir = path.join(handoffRoot, "results", taskKey);
  await mkdir(resultDir, { recursive: true });
  const resultPath = path.join(resultDir, "result.md");

  const lines = [
    `# ${taskKey}`,
    "",
    ...Object.entries(headerFields).map(([k, v]) => `${k}: ${v}`),
    ...(Object.keys(headerFields).length > 0 ? [""] : []),
    body.trim(),
    "",
  ];
  await writeFile(resultPath, lines.join("\n"), "utf8");
  return resultPath;
}
