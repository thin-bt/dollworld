import type { FastifyReply } from "fastify";
import { API_PREFIX } from "../shared/ui001-contracts.js";

export const CACHE_CONTROL_NO_STORE = "no-store" as const;

export function applyApiNoStore(reply: FastifyReply): void {
  void reply.header("cache-control", CACHE_CONTROL_NO_STORE);
}

export function isS15ApiUrl(url: string): boolean {
  return url === API_PREFIX || url.startsWith(`${API_PREFIX}/`) || url.startsWith(`${API_PREFIX}?`);
}

export function sendApiJson(reply: FastifyReply, status: number, body: string): void {
  applyApiNoStore(reply);
  void reply.status(status).header("content-type", "application/json; charset=utf-8").send(body);
}

export function requestHasQuery(url: string): boolean {
  const q = url.indexOf("?");
  return q >= 0 && q < url.length - 1;
}
