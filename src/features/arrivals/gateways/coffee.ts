import type { CoffeeClient } from "../../../integrations/sampleapis/coffee";
import type { ArrivalsSource } from "../ports";

export function createCoffeeArrivalsSource(client: CoffeeClient): ArrivalsSource {
  return { list: () => client.listCoffees() };
}
