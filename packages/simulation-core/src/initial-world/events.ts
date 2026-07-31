import type { SimulationId } from "../ids.js";
import { asFamilyId, asLineageId, asPersonId, asRelationshipId } from "../ids.js";
import {
  createFamilyInitializedEvent,
  createLineageInitializedEvent,
  createPersonInitializedEvent,
  createRelationshipInitializedEvent,
  createWorldStartedEvent,
} from "../events/factories.js";
import type { EventEnvelope } from "../events/types.js";
import { validateEventSequence } from "../events/validate.js";
import type { Person, Relationship, Family, Lineage } from "../domain.js";
import { INITIAL_WORLD_SOURCE_PROCESSOR } from "./constants.js";
import { asWorldId } from "../ids.js";
import { FIXED_WORLD_ID } from "./constants.js";

export function buildInitialEvents(
  simulationId: SimulationId,
  families: readonly Family[],
  lineages: readonly Lineage[],
  persons: readonly Person[],
  relationships: readonly Relationship[],
): EventEnvelope[] {
  const events: EventEnvelope[] = [];
  let sequence = 0;

  events.push(
    createWorldStartedEvent({
      simulationId,
      sequence,
      importance: "historic",
      sourceProcessor: INITIAL_WORLD_SOURCE_PROCESSOR,
      payload: { worldId: FIXED_WORLD_ID },
    }),
  );
  sequence += 1;

  const sortedFamilies = [...families].sort((a, b) => a.familyId.localeCompare(b.familyId));
  for (const family of sortedFamilies) {
    events.push(
      createFamilyInitializedEvent({
        simulationId,
        sequence,
        importance: "normal",
        sourceProcessor: INITIAL_WORLD_SOURCE_PROCESSOR,
        payload: { familyId: family.familyId },
      }),
    );
    sequence += 1;
  }

  const sortedLineages = [...lineages].sort((a, b) => a.lineageId.localeCompare(b.lineageId));
  for (const lineage of sortedLineages) {
    events.push(
      createLineageInitializedEvent({
        simulationId,
        sequence,
        importance: "normal",
        sourceProcessor: INITIAL_WORLD_SOURCE_PROCESSOR,
        payload: { lineageId: lineage.lineageId },
      }),
    );
    sequence += 1;
  }

  const sortedPersons = [...persons].sort((a, b) => a.personId.localeCompare(b.personId));
  for (const person of sortedPersons) {
    events.push(
      createPersonInitializedEvent({
        simulationId,
        sequence,
        importance: "normal",
        sourceProcessor: INITIAL_WORLD_SOURCE_PROCESSOR,
        payload: { personId: person.personId },
      }),
    );
    sequence += 1;
  }

  const sortedRelationships = [...relationships].sort((a, b) =>
    a.relationshipId.localeCompare(b.relationshipId),
  );
  for (const relationship of sortedRelationships) {
    events.push(
      createRelationshipInitializedEvent({
        simulationId,
        sequence,
        importance: "normal",
        sourceProcessor: INITIAL_WORLD_SOURCE_PROCESSOR,
        payload: { relationshipId: relationship.relationshipId },
      }),
    );
    sequence += 1;
  }

  validateEventSequence(events, {
    knownIds: {
      personIds: sortedPersons.map((p) => asPersonId(p.personId)),
      familyIds: sortedFamilies.map((f) => asFamilyId(f.familyId)),
      lineageIds: sortedLineages.map((l) => asLineageId(l.lineageId)),
      relationshipIds: sortedRelationships.map((r) => asRelationshipId(r.relationshipId)),
    },
  });

  void asWorldId(FIXED_WORLD_ID);
  return events;
}
