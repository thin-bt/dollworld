import { assertUiSessionIntegrity, type UiSession, UiSessionIntegrityError } from "./ui-session.js";

export type SessionStore = {
  has(sessionId: string): boolean;
  get(sessionId: string): UiSession | undefined;
  /** Throws on integrity failure instead of returning a corrupt row as missing. */
  getStrict(sessionId: string): UiSession | "missing" | "corrupt";
  insert(session: UiSession): void;
  size(): number;
  /** Test-only tamper hook: replace a row without constructor validation. */
  replaceForTest(sessionId: string, session: UiSession): void;
};

export type SessionStoreHooks = {
  beforeInsert?: (session: UiSession) => void;
  afterGet?: (sessionId: string) => void;
};

export function createMemorySessionStore(hooks: SessionStoreHooks = {}): SessionStore {
  const rows = new Map<string, UiSession>();
  return {
    has(sessionId: string): boolean {
      return rows.has(sessionId);
    },
    get(sessionId: string): UiSession | undefined {
      hooks.afterGet?.(sessionId);
      return rows.get(sessionId);
    },
    getStrict(sessionId: string): UiSession | "missing" | "corrupt" {
      hooks.afterGet?.(sessionId);
      const row = rows.get(sessionId);
      if (row === undefined) {
        return "missing";
      }
      try {
        assertUiSessionIntegrity(row);
        return row;
      } catch (error) {
        if (error instanceof UiSessionIntegrityError) {
          return "corrupt";
        }
        throw error;
      }
    },
    insert(session: UiSession): void {
      assertUiSessionIntegrity(session);
      hooks.beforeInsert?.(session);
      if (rows.has(session.sessionId)) {
        throw new Error("sessionId already registered");
      }
      rows.set(session.sessionId, session);
    },
    size(): number {
      return rows.size;
    },
    replaceForTest(sessionId: string, session: UiSession): void {
      rows.set(sessionId, session);
    },
  };
}
