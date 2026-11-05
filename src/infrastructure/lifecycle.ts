// Work to do when the extension is installed or updated, e.g. opening a welcome page or moving stored
// data to a new format. Registered at the worker's top level like other events.
export type InstallReason = "install" | "update" | "chrome_update" | "shared_module_update";

export interface InstallDetails {
  reason: InstallReason;
  previousVersion: string | undefined;   // set for "update"
}

export interface InstallTask {
  name: string;
  run(details: InstallDetails): Promise<void>;
}

const reasons = new Set<string>(["install", "update", "chrome_update", "shared_module_update"]);

export function registerInstallTasks(
  installed: Pick<typeof chrome.runtime.onInstalled, "addListener">, items: readonly InstallTask[], onError: (error: unknown) => void,
) {
  const names = new Set<string>();
  for (const item of items) {
    if (names.has(item.name)) throw new TypeError(`Install task "${item.name}" is duplicated.`);
    names.add(item.name);
  }
  installed.addListener((details) => {
    if (!reasons.has(details.reason)) return;
    const facts: InstallDetails = {
      reason: details.reason as InstallReason,
      previousVersion: typeof details.previousVersion === "string" ? details.previousVersion : undefined,
    };
    // Each task runs on its own, so one failure does not stop the others.
    for (const item of items) void item.run(facts).catch(onError);
  });
}
