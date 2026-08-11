import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const PRODUCTION_ROOTS = ["packages/simulation-core/src", "apps/simulator/src"] as const;

function shouldScanFile(repoRelativePath: string): boolean {
  if (!repoRelativePath.endsWith(".ts")) return false;
  if (repoRelativePath.endsWith(".test.ts")) return false;
  if (repoRelativePath.includes("/sprint1-verification/")) return false;
  if (repoRelativePath.includes("\\sprint1-verification\\")) return false;
  return true;
}

function walkTsFiles(absoluteDir: string, repoRoot: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const absolute = join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walkTsFiles(absolute, repoRoot, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = relative(repoRoot, absolute).replace(/\\/g, "/");
    if (shouldScanFile(rel)) {
      out.push(absolute);
    }
  }
}

/**
 * Token/AST-aware scan for Math.random(...) CallExpressions in production sources.
 * Comments and string literals are ignored by the TypeScript parser.
 */
export function scanMathRandomCallExpressions(repoRoot: string): {
  count: number;
  locations: string[];
} {
  const files: string[] = [];
  for (const root of PRODUCTION_ROOTS) {
    walkTsFiles(join(repoRoot, root), repoRoot, files);
  }
  const locations: string[] = [];
  for (const file of files) {
    // Confirm path is a file
    if (!statSync(file).isFile()) continue;
    const text = readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (
          ts.isPropertyAccessExpression(expr) &&
          ts.isIdentifier(expr.expression) &&
          expr.expression.text === "Math" &&
          expr.name.text === "random"
        ) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          locations.push(`${relative(repoRoot, file).replace(/\\/g, "/")}:${String(line + 1)}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { count: locations.length, locations };
}
