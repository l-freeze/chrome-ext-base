import type { ArrivalsActions, ArrivalsClock, ArrivalsIndicator, ArrivalsRepository, ArrivalsSource } from "./ports";
import { createCheckArrivals } from "./use-cases/check";
import { createReviewArrivals } from "./use-cases/review";
import { createLoadArrivals } from "./use-cases/load";
import { createCheckController } from "./controllers/check";
import { createReviewController } from "./controllers/review";
import { createLoadController } from "./controllers/load";

export function createArrivalsApplication(dependencies: {
  source: ArrivalsSource; repository: ArrivalsRepository; indicator: ArrivalsIndicator; clock: ArrivalsClock;
}): ArrivalsActions {
  const { source, repository, indicator, clock } = dependencies;
  return {
    loadArrivals: createLoadController(createLoadArrivals(repository)),
    checkArrivals: createCheckController(createCheckArrivals(source, repository, indicator, clock)),
    reviewArrivals: createReviewController(createReviewArrivals(repository, indicator)),
  };
}
