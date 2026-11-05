// Sample: new entries in the SampleAPIs coffee list, checked every 30 minutes by an alarm and counted
// on the toolbar badge. Screens show the new entries and mark them as seen.
import type { KeyValueStorage } from "../infrastructure/storage/contracts";
import type { BadgeBoard } from "../infrastructure/badge";
import { createBadgeBoard } from "../infrastructure/badge";
import { createHttpClient } from "../infrastructure/http";
import { createMessageClient } from "../infrastructure/messaging/client";
import { createChromeTransport } from "../infrastructure/messaging/drivers/chrome";
import { createSampleApisCoffeeClient } from "../integrations/sampleapis/coffee";
import { createArrivalsApplication } from "../features/arrivals/compose";
import { createArrivalsStorage } from "../features/arrivals/gateways/storage";
import { createCoffeeArrivalsSource } from "../features/arrivals/gateways/coffee";
import { createBadgeIndicator, silentIndicator } from "../features/arrivals/gateways/badge";
import { checkArrivalsMessage, delegateCheckToWorker } from "../features/arrivals/gateways/worker";
import type { Environment } from "./environment";
import type { WorkerRegistry } from "./worker";
import { colors } from "#palette/colors";

const CHECK = "arrivals.check";
const CHECK_MINUTES = 30;
// Above the notes reminder: a count says more than a dot.
const BADGE_SLOT = "arrivals";
const BADGE_PRIORITY = 20;

function createArrivals(driver: KeyValueStorage, badges: BadgeBoard | undefined) {
  return createArrivalsApplication({
    source: createCoffeeArrivalsSource(createSampleApisCoffeeClient(createHttpClient({
      fetch: (url, init) => globalThis.fetch(url, init),
      timeoutMs: 8_000,
    }))),
    repository: createArrivalsStorage(driver),
    indicator: badges ? createBadgeIndicator(badges.slot(BADGE_SLOT, BADGE_PRIORITY), colors.badge.positive) : silentIndicator,
    clock: { now: () => Date.now() },
  });
}

export function createArrivalsScreens(environment: Environment) {
  if (!environment.extension) return { arrivals: createArrivals(environment.driver, undefined) };
  const arrivals = createArrivals(environment.driver, createBadgeBoard(chrome.action, environment.driver));
  return { arrivals: delegateCheckToWorker(arrivals, createMessageClient(createChromeTransport(chrome.runtime))) };
}

export function registerArrivalsWorker(worker: WorkerRegistry) {
  const arrivals = createArrivals(worker.environment.driver, worker.badges);
  worker.router.handle(checkArrivalsMessage, (input) => arrivals.checkArrivals(input));
  // The first check runs a minute after install and records the list; later checks count what was added.
  worker.alarms.push({
    name: CHECK,
    periodInMinutes: CHECK_MINUTES,
    firstDelayInMinutes: 1,
    async run() { await arrivals.checkArrivals(undefined); },
  });
}
