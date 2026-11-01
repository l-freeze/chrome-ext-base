import type { SiteAccessGateway } from "../ports";

export type GrantInput = { origin: string };
export type GrantOutput = boolean;
export type GrantAccess = (input: GrantInput) => Promise<GrantOutput>;
export function createGrantAccess(gateway: SiteAccessGateway): GrantAccess {
  // Invoke immediately: permissions.request must retain the user's click gesture.
  return async (input) => gateway.grant(input);
}
