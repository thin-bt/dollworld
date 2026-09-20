import type { PersonId } from "@shared-world/simulation-core";
import { compareUnicodeCodePoints } from "@shared-world/simulation-core";
import type {
  StoredBattleResultRecord,
  TournamentBracketDefinition,
} from "@shared-world/simulation-core";
import { projectRoundRobinProgress } from "./competition-round-robin-progress.js";

/** Group-stage advancers for UI009 integration (wins, then person_id). */
export function selectUi009GroupAdvancers(
  bracketDefinition: TournamentBracketDefinition,
  storedRecords: readonly StoredBattleResultRecord[],
  advanceCountPerGroup: number,
): readonly PersonId[] {
  const advancers: PersonId[] = [];
  for (const group of bracketDefinition.groupMemberships) {
    const groupPairs = bracketDefinition.groupRoundRobinPairs.filter(
      (pair) =>
        group.personIds.includes(pair.personIdA) && group.personIds.includes(pair.personIdB),
    );
    const progress = projectRoundRobinProgress({
      bracketDefinition: {
        ...bracketDefinition,
        roundRobinPairs: groupPairs,
      },
      storedRecords,
    });
    const ranked = [...progress.matrix].sort((left, right) => {
      if (right.wins !== left.wins) {
        return right.wins - left.wins;
      }
      if (left.losses !== right.losses) {
        return left.losses - right.losses;
      }
      return compareUnicodeCodePoints(left.personId, right.personId);
    });
    for (const row of ranked.slice(0, advanceCountPerGroup)) {
      advancers.push(row.personId as PersonId);
    }
  }
  return advancers.sort((left, right) => compareUnicodeCodePoints(left, right));
}
