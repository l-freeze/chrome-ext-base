import type { SiteAccessActions, SiteAccessGateway } from "./ports";
import { createStatusController } from "./controllers/status";
import { createGrantController } from "./controllers/grant";
import { createReadStatus } from "./use-cases/status";
import { createGrantAccess } from "./use-cases/grant";

export function createSiteAccessApplication(gateway: SiteAccessGateway): SiteAccessActions {
  return { status: createStatusController(createReadStatus(gateway)), grant: createGrantController(createGrantAccess(gateway)) };
}
