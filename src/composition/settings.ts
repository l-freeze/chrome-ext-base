import type { Environment } from "./environment";
import { createSettingsStorage, createSettingsChanges } from "../features/settings/gateways/storage";
import { createSettingsApplication } from "../features/settings/compose";

// The base settings feature: operations for screens and the change subscription that applies the theme.
export function createSettings(environment: Pick<Environment, "driver" | "events">) {
  return {
    actions: createSettingsApplication(createSettingsStorage(environment.driver)),
    changes: createSettingsChanges(environment.events),
  };
}
