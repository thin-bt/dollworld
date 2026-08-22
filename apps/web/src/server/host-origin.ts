import { authorityFromOrigin } from "../shared/ui001-contracts.js";

export type HostOriginConfig = {
  publicOrigin: string;
};

export function expectedHost(config: HostOriginConfig): string {
  return authorityFromOrigin(config.publicOrigin);
}

export function isAllowedHost(hostHeader: string | undefined, config: HostOriginConfig): boolean {
  if (hostHeader === undefined || hostHeader.length === 0) {
    return false;
  }
  return hostHeader === expectedHost(config);
}

export function isStateChangingMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

export function isAllowedOrigin(
  originHeader: string | undefined,
  config: HostOriginConfig,
): boolean {
  if (originHeader === undefined || originHeader.length === 0) {
    return false;
  }
  return originHeader === config.publicOrigin;
}
