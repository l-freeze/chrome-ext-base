import { ValidationError } from "../../lib/validation";
import { getJson } from "../../infrastructure/http";
import type { Fetch } from "../../infrastructure/http";

export interface FetchCoffeeInput { id: number }
export interface FetchCoffeeOutput {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  image: string;
}
export interface CoffeeClient {
  fetchCoffee(input: FetchCoffeeInput): Promise<FetchCoffeeOutput>;
}

function parseRequest(raw: unknown): FetchCoffeeInput {
  if (
    typeof raw !== "object" || raw === null || Array.isArray(raw) || !("id" in raw) ||
    typeof raw.id !== "number" || !Number.isSafeInteger(raw.id) || raw.id < 1
  ) {
    throw new ValidationError("SampleAPIs coffee ID must be a positive safe integer.");
  }
  return { id: raw.id };
}

function parseResponse(raw: unknown): FetchCoffeeOutput {
  if (
    typeof raw !== "object" || raw === null || Array.isArray(raw) || !("id" in raw) ||
    typeof raw.id !== "number" || !Number.isSafeInteger(raw.id) || raw.id < 1 ||
    !("title" in raw) || typeof raw.title !== "string" ||
    !("description" in raw) || typeof raw.description !== "string" ||
    !("image" in raw) || typeof raw.image !== "string" ||
    !("ingredients" in raw) || !Array.isArray(raw.ingredients) ||
    !raw.ingredients.every((item: unknown) => typeof item === "string")
  ) {
    throw new ValidationError("SampleAPIs returned unexpected coffee data.");
  }
  return {
    id: raw.id, title: raw.title, description: raw.description,
    ingredients: [...raw.ingredients], image: raw.image,
  };
}

export function createSampleApisCoffeeClient(fetch: Fetch): CoffeeClient {
  return {
    async fetchCoffee(raw) {
      const input = parseRequest(raw);
      const data = await getJson(new URL(`https://api.sampleapis.com/coffee/hot/${input.id}`), fetch);
      return parseResponse(data);
    },
  };
}
