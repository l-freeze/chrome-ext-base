import type { CoffeeClient } from "./contracts";
import { fetchCoffeeInput, fetchCoffeeOutput } from "./validation";
import { getJson } from "../../../infrastructure/http/http-client";
import type { Fetch } from "../../../infrastructure/http/http-client";

export function createSampleApisCoffeeClient(fetch: Fetch): CoffeeClient {
  return {
    async fetchCoffee(raw) {
      const input = fetchCoffeeInput.parse(raw);
      const url = new URL(`https://api.sampleapis.com/coffee/hot/${input.id}`);
      const data = await getJson(url, fetch);
      return fetchCoffeeOutput.parse(data);
    },
  };
}
