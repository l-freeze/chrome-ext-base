import type { CoffeeApi } from "../../../application/ports/coffee-api";
import { fetchCoffeeInput, fetchCoffeeOutput } from "../../../validation/coffee-validation";
import { getJson } from "./http-client";
import type { Fetch } from "./http-client";

export function createSampleApisCoffeeApi(fetch: Fetch): CoffeeApi {
  return {
    async fetchCoffee(raw) {
      const input = fetchCoffeeInput.parse(raw);
      const url = new URL(`https://api.sampleapis.com/coffee/hot/${input.id}`);
      const data = await getJson(url, fetch);
      return fetchCoffeeOutput.parse(data);
    },
  };
}
