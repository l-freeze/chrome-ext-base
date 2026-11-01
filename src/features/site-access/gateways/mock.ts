import type { SiteAccessChanges, SiteAccessGateway } from "../ports";

export function createMockSiteAccess(): SiteAccessGateway & SiteAccessChanges {
  return {
    status: async () => ({ available: true, tabId: 1, url: "https://example.com/articles/ideas", origin: "https://example.com", allowed: true }),
    grant: async () => true,
    subscribe: () => () => {},
  };
}
