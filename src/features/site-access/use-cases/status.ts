import type { SiteAccessGateway } from "../ports";
import type { SiteAccess } from "../access";

export type StatusInput = void;
export type StatusOutput = SiteAccess;
export type ReadStatus = (input: StatusInput) => Promise<StatusOutput>;
export function createReadStatus(gateway: SiteAccessGateway): ReadStatus {
  return async (_input) => gateway.status();
}
