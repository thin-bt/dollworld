/**
 * API-011 GET /api/s1_5/mock-battles/candidates
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { sendApiJson } from "../api-response.js";
import { buildSuccessEnvelope, serializeEnvelope } from "../envelope.js";
import type { ProcessSecurityContext } from "../process-keys.js";
import { parseSessionCookieHeader } from "../session-cookie.js";
import type { SessionStore } from "../session-store.js";
import { deriveEnvelopeRevision, type UiSession } from "../ui-session.js";
import {
  bindListCursor,
  fixReadSnapshot,
  sendInternal,
  sendInvalid,
  sendNotStarted,
  sendSessionRequired,
  sendStaleCursor,
  signNextCursor,
  type ListGetHooks,
} from "./list-get-common.js";
import { buildMockCandidatesPage } from "./mock-candidates/filter-sort-page-candidates.js";
import { isCandidatesNextPosition, parseMockCandidatesQuery } from "./parse-query.js";
import {
  assertExactKeys,
  projectMockBattleCandidateView,
  type MockBattleCandidateView,
} from "./project-person.js";
import { buildMockCandidateSourceRows } from "./source-from-runtime.js";

export const MOCK_CANDIDATES_ENDPOINT = "GET /api/s1_5/mock-battles/candidates" as const;

export type MockCandidatesRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  hooks?: ListGetHooks;
};

const CANDIDATE_KEYS = ["personId", "displayName", "age", "careerStatus"] as const;

function loadSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: MockCandidatesRouteDeps,
): UiSession | null {
  if (request.uiSession !== undefined) {
    return request.uiSession;
  }
  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  if (cookieValue === undefined) {
    sendSessionRequired(reply);
    return null;
  }
  const row = deps.store.getStrict(cookieValue);
  if (row === "missing") {
    sendSessionRequired(reply);
    return null;
  }
  if (row === "corrupt") {
    sendInternal(reply, deps.processKeys, null, deps.hooks);
    return null;
  }
  return row;
}

export async function handleGetMockBattleCandidates(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: MockCandidatesRouteDeps,
): Promise<void> {
  const session = loadSession(request, reply, deps);
  if (session === null) {
    return;
  }

  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  if (cookieValue === undefined) {
    sendSessionRequired(reply);
    return;
  }

  const parsed = parseMockCandidatesQuery(request.url);
  if (!parsed.ok) {
    sendInvalid(reply, session, parsed.message, parsed.fieldErrors);
    return;
  }

  const fixed = fixReadSnapshot(session);
  if (fixed.committedLifecycle !== "ready") {
    sendNotStarted(reply, session);
    return;
  }
  if (fixed.worldEngineRuntime === null || fixed.simulationId === null) {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
    return;
  }

  const bound = bindListCursor({
    cursorRaw: parsed.cursorRaw,
    endpoint: MOCK_CANDIDATES_ENDPOINT,
    expectedKind: "mock_candidates",
    effectiveQuery: parsed.query,
    sessionCookie: cookieValue,
    processKeys: deps.processKeys,
    fixed,
    isValidNextPosition: isCandidatesNextPosition,
  });
  if (bound.kind === "invalid") {
    sendInvalid(reply, session, bound.message, [
      { field: "/query/cursor", code: "format", message: bound.message },
    ]);
    return;
  }
  if (bound.kind === "stale") {
    sendStaleCursor(reply, session);
    return;
  }

  try {
    if (deps.hooks?.forceSourceCorruption === true) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }
    const source = buildMockCandidateSourceRows(fixed.worldEngineRuntime);
    if (!source.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const pageResult = buildMockCandidatesPage(
      source.rows,
      parsed.query,
      bound.kind === "ok" ? (bound.nextPosition as { personId: string }) : null,
    );
    if (pageResult.kind === "corruption") {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }
    if (pageResult.kind === "stale_cursor") {
      sendStaleCursor(reply, session);
      return;
    }

    const worldYear = fixed.worldEngineRuntime.runtimeState.worldState.worldDate.year;
    const persons = fixed.worldEngineRuntime.runtimeState.worldState.persons;
    const byId = new Map(persons.map((p) => [p.personId as string, p]));

    const items: MockBattleCandidateView[] = [];
    for (const member of pageResult.page.items) {
      const person = byId.get(member.personId);
      if (person === undefined) {
        throw new Error("eligible candidate person missing");
      }
      const view = projectMockBattleCandidateView(person, worldYear);
      if (view === null || !assertExactKeys(view, CANDIDATE_KEYS)) {
        throw new Error("MockBattleCandidateView projection failed");
      }
      if (view.careerStatus !== member.careerStatus || view.age !== member.derivedAgeAtWorldDate) {
        throw new Error("MockBattleCandidateView cross-view mismatch");
      }
      items.push(view);
    }

    let nextCursor: string | null = null;
    if (pageResult.page.nextPosition !== null) {
      nextCursor = signNextCursor({
        processKeys: deps.processKeys,
        sessionCookie: cookieValue,
        endpoint: MOCK_CANDIDATES_ENDPOINT,
        simulationId: fixed.simulationId,
        uiRevision: fixed.uiRevision,
        query: parsed.query,
        nextPosition: pageResult.page.nextPosition,
      });
    }

    const data = {
      items,
      totalCount: pageResult.page.totalCount,
      nextCursor,
    };

    deps.hooks?.throwAfterProjection?.();

    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      200,
      serializeEnvelope(
        buildSuccessEnvelope({
          data,
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
        }),
      ),
    );
  } catch {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
  }
}
