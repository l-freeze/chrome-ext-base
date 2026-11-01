import type { SiteAccess } from "./access";

export interface SiteAccessActions {
  status(input: unknown): Promise<SiteAccess>;
  grant(input: unknown): Promise<boolean>;
}
export interface SiteAccessGateway {
  status(): Promise<SiteAccess>;
  grant(input: { origin: string }): Promise<boolean>;
}
// Notifications invalidate displayed page data; the UI then reads a fresh status.
export interface SiteAccessChanges { subscribe(invalidate: () => void): () => void }
