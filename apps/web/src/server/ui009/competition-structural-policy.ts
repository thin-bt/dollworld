import type {
  InjectedStructuralPolicyInput,
  PersonId,
  Sprint2ConfigInput,
} from "@shared-world/simulation-core";
import type { Ui009TournamentFormatSelection } from "./competition-format-selection.js";
import { buildUi009GroupComposition } from "./competition-group-composition.js";
import { buildUi009SingleEliminationKnockoutMapping } from "./competition-knockout-seed-mapping.js";

const UI009_FORMAT_POLICY = {
  policyVersion: "ui009-format-selection-0.1.0",
  configVersion: "ui009-format-config-a",
} as const;

const UI009_STANDINGS_TIE_BREAK_POLICY = {
  policyVersion: "ui009-standings-tie-break-0.1.0",
  configVersion: "ui009-standings-tie-break-config-a",
} as const;

export function buildUi009StructuralPolicy(
  formatSelection: Ui009TournamentFormatSelection,
  orderedPersonIds: readonly PersonId[],
  config: Sprint2ConfigInput,
): InjectedStructuralPolicyInput {
  const base: InjectedStructuralPolicyInput = {
    formatSelection: {
      formatKind: formatSelection.structuralFormatKind,
      policyIdentity: { ...UI009_FORMAT_POLICY },
    },
    knockoutSeedByePolicyIdentity: {
      policyVersion: "ui009-knockout-seed-bye-0.1.0",
      configVersion: "ui009-knockout-seed-bye-config-a",
    },
    standingsTieBreakPolicyIdentity: { ...UI009_STANDINGS_TIE_BREAK_POLICY },
  };

  if (formatSelection.structuralFormatKind === "group_round_robin_knockout") {
    const groups = buildUi009GroupComposition(orderedPersonIds, config.format.groupCount);
    const placeholderAdvancers = groups.map((group) => group[0]!);
    return {
      ...base,
      formatSelection: {
        ...base.formatSelection,
        groups,
      },
      knockoutSeedByeMapping: buildUi009SingleEliminationKnockoutMapping(placeholderAdvancers),
    };
  }

  if (formatSelection.structuralFormatKind === "knockout") {
    return {
      ...base,
      knockoutSeedByeMapping: buildUi009SingleEliminationKnockoutMapping(orderedPersonIds),
    };
  }

  return base;
}
