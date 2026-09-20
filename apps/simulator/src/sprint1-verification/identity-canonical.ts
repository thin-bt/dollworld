import {
  compareUnicodeCodePoints,
  computeConfigHash,
  createSprint1RunSession,
  toCanonicalJson,
  withDefaultSprint2BindingsForRunSessionInput,
  validateSprint1CliInput,
  type PersonId,
  type Sha256Provider,
} from "@shared-world/simulation-core";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadValidatedNameData } from "../file-loader.js";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import {
  SPRINT1_BASE_SEED,
  SPRINT1_FIXTURE_CONFIG_RELATIVE,
  SPRINT1_FIXTURE_INPUT_RELATIVE,
} from "./constants.js";
import { loadTinySprint1Fixtures } from "./fixtures.js";
import { scanMathRandomCallExpressions } from "./math-random-scan.js";
import type { IdentityAndCanonicalSection, VerificationIssue } from "./types.js";

function expectOk<T>(
  result: { ok: true; value: T } | { ok: false; issues: unknown },
  label: string,
): T {
  if (!result.ok) {
    throw new Error(`${label} failed: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

export type IdentityVerificationResult = {
  section: IdentityAndCanonicalSection;
  failures: VerificationIssue[];
};

export function verifyIdentityAndCanonical(repoRoot: string): IdentityVerificationResult {
  const failures: VerificationIssue[] = [];
  const sha256Provider: Sha256Provider = createNodeSha256Provider();
  const tempRoot = mkdtempSync(join(tmpdir(), "dollworld-s1-identity-"));

  try {
    const fixtures = loadTinySprint1Fixtures(repoRoot, sha256Provider);
    const nameData = loadValidatedNameData({
      cwd: repoRoot,
      manifestPath: fixtures.config.nameData.manifestPath,
      requiredVersion: fixtures.config.nameData.requiredVersion,
      initialFamilyCount: fixtures.config.families.initialFamilyCount,
      sha256Provider,
    });

    // Path independence: copy fixtures to two dirs, same simulationId.
    const dirA = join(tempRoot, "a");
    const dirB = join(tempRoot, "b");
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });
    const configName = "config.json";
    const inputName = "sprint1-input.json";
    copyFileSync(join(repoRoot, SPRINT1_FIXTURE_CONFIG_RELATIVE), join(dirA, configName));
    copyFileSync(join(repoRoot, SPRINT1_FIXTURE_INPUT_RELATIVE), join(dirA, inputName));
    copyFileSync(join(repoRoot, SPRINT1_FIXTURE_CONFIG_RELATIVE), join(dirB, configName));
    copyFileSync(join(repoRoot, SPRINT1_FIXTURE_INPUT_RELATIVE), join(dirB, inputName));

    const createFrom = (dir: string) => {
      const inputRaw = JSON.parse(readFileSync(join(dir, inputName), "utf8")) as unknown;
      const validatedInput = expectOk(
        validateSprint1CliInput(inputRaw, sha256Provider),
        "validateSprint1CliInput",
      );
      void validatedInput;
      return expectOk(
        createSprint1RunSession(
          withDefaultSprint2BindingsForRunSessionInput({
            seed: SPRINT1_BASE_SEED,
            config: fixtures.config,
            nameData,
            sprint1CliInput: inputRaw,
          }),
          sha256Provider,
        ),
        "createSprint1RunSession",
      );
    };
    const sessionA = createFrom(dirA);
    const sessionB = createFrom(dirB);
    const pathIndependencePassed =
      sessionA.session.context.simulationId === sessionB.session.context.simulationId;
    if (!pathIndependencePassed) {
      failures.push({
        code: "SPRINT1_IDENTITY_PATH",
        message: "simulationId changed when fixtures were loaded from different paths",
        scope: "identityAndCanonical/pathIndependence",
      });
    }

    // Config / catalog / sidecar hash recompute consistency (via session identity fields).
    const configHash = computeConfigHash(fixtures.config, sha256Provider);
    if (sessionA.session.context.simulationIdentity.initialWorldConfigHash !== configHash) {
      failures.push({
        code: "SPRINT1_IDENTITY_CONFIG_HASH",
        message: "initialWorldConfigHash mismatch vs recomputed computeConfigHash",
        scope: "identityAndCanonical/configHash",
      });
    }

    // Sidecar motivationFactor ±1 mutation changes hashes.
    const entries = [...fixtures.sprint1CliInput.initialWeeklyTrainingSidecar.entries].sort(
      (a, b) => compareUnicodeCodePoints(a.personId, b.personId),
    );
    const first = entries[0];
    if (first === undefined) {
      throw new Error("sidecar empty");
    }
    const mutatedMotivation =
      first.motivationFactor < 11500 ? first.motivationFactor + 1 : first.motivationFactor - 1;
    const mutatedEntries = entries.map((entry, index) =>
      index === 0 ? { ...entry, motivationFactor: mutatedMotivation } : entry,
    );
    const mutatedInput = {
      ...(fixtures.sprint1CliInputRaw as Record<string, unknown>),
      initialWeeklyTrainingSidecar: {
        schemaVersion: fixtures.sprint1CliInput.initialWeeklyTrainingSidecar.schemaVersion,
        entries: mutatedEntries,
      },
    };
    const mutatedSession = expectOk(
      createSprint1RunSession(
        withDefaultSprint2BindingsForRunSessionInput({
          seed: SPRINT1_BASE_SEED,
          config: fixtures.config,
          nameData,
          sprint1CliInput: mutatedInput,
        }),
        sha256Provider,
      ),
      "createSprint1RunSession(mutated)",
    );
    const sidecarMotivationMutationChangesHashes =
      mutatedSession.session.context.simulationId !== sessionA.session.context.simulationId &&
      mutatedSession.session.context.simulationIdentityHash !==
        sessionA.session.context.simulationIdentityHash &&
      mutatedSession.session.context.simulationIdentity.initialWeeklyTrainingSidecarHash !==
        sessionA.session.context.simulationIdentity.initialWeeklyTrainingSidecarHash;
    if (!sidecarMotivationMutationChangesHashes) {
      failures.push({
        code: "SPRINT1_IDENTITY_SIDECAR_MUTATION",
        message: "motivationFactor ±1 did not change required identity hashes",
        scope: "identityAndCanonical/sidecarMutation",
      });
    }

    // Key-order-only change: rebuild object with shuffled key insertion order.
    const canonicalInput = JSON.parse(toCanonicalJson(fixtures.sprint1CliInputRaw)) as Record<
      string,
      unknown
    >;
    const reordered: Record<string, unknown> = {};
    const keys = Object.keys(canonicalInput).reverse();
    for (const key of keys) {
      reordered[key] = canonicalInput[key];
    }
    writeFileSync(join(tempRoot, "reordered.json"), `${JSON.stringify(reordered)}\n`, "utf8");
    const reorderedSession = expectOk(
      createSprint1RunSession(
        withDefaultSprint2BindingsForRunSessionInput({
          seed: SPRINT1_BASE_SEED,
          config: fixtures.config,
          nameData,
          sprint1CliInput: reordered,
        }),
        sha256Provider,
      ),
      "createSprint1RunSession(reordered)",
    );
    const keyOrderInvariancePassed =
      reorderedSession.session.context.simulationId === sessionA.session.context.simulationId &&
      reorderedSession.session.context.simulationIdentityHash ===
        sessionA.session.context.simulationIdentityHash;
    if (!keyOrderInvariancePassed) {
      failures.push({
        code: "SPRINT1_IDENTITY_KEY_ORDER",
        message: "object key order alone changed simulation identity hashes",
        scope: "identityAndCanonical/keyOrder",
      });
    }

    const mathScan = scanMathRandomCallExpressions(repoRoot);
    if (mathScan.count > 0) {
      failures.push({
        code: "SPRINT1_MATH_RANDOM",
        message: `Math.random(...) call expressions found: ${mathScan.locations.join(", ")}`,
        scope: "identityAndCanonical/mathRandom",
      });
    }

    void (null as unknown as PersonId);

    const section: IdentityAndCanonicalSection = {
      status: failures.length === 0 ? "passed" : "failed",
      pathIndependencePassed,
      sidecarMotivationMutationChangesHashes,
      keyOrderInvariancePassed,
      mathRandomCallExpressions: mathScan.count,
      detail:
        failures.length === 0
          ? "identity/canonical/hash/math.random checks passed"
          : failures.map((item) => item.message).join("; "),
    };
    return { section, failures };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_IDENTITY_FAILED",
      message,
      scope: "identityAndCanonical",
    });
    return {
      section: {
        status: "failed",
        pathIndependencePassed: false,
        sidecarMotivationMutationChangesHashes: false,
        keyOrderInvariancePassed: false,
        mathRandomCallExpressions: 0,
        detail: message,
      },
      failures,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
