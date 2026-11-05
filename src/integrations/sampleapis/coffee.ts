import { ValidationError } from "../../lib/validation";
import { createRetryPolicy, getJson } from "../../infrastructure/http";
import type { HttpClient } from "../../infrastructure/http";

export interface FetchCoffeeInput { id: number }
export interface FetchCoffeeOutput {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  image: string;
}
// One entry of the list. Only the fields a caller needs to tell entries apart are validated.
export interface CoffeeSummary {
  id: number;
  title: string;
}
export interface CoffeeClient {
  fetchCoffee(input: FetchCoffeeInput): Promise<FetchCoffeeOutput>;
  listCoffees(): Promise<CoffeeSummary[]>;
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

function parseList(raw: unknown): CoffeeSummary[] {
  if (!Array.isArray(raw)) throw new ValidationError("SampleAPIs returned an unexpected coffee list.");
  return raw.map((item: unknown) => {
    if (
      typeof item !== "object" || item === null || Array.isArray(item) || !("id" in item) ||
      typeof item.id !== "number" || !Number.isSafeInteger(item.id) || item.id < 1 ||
      !("title" in item) || typeof item.title !== "string"
    ) {
      throw new ValidationError("SampleAPIs returned an unexpected coffee list entry.");
    }
    return { id: item.id, title: item.title };
  });
}

// A public sample API: retry brief outages up to twice. With 8 s per try, 20 s in total stays well
// inside the service worker's ~30 s idle limit.
const retry = createRetryPolicy({ maxRetries: 2, baseDelayMs: 500, maxElapsedMs: 20_000 });

export function createSampleApisCoffeeClient(client: HttpClient): CoffeeClient {
  return {
    async fetchCoffee(raw) {
      const input = parseRequest(raw);
      const data = await getJson(client, new URL(`https://api.sampleapis.com/coffee/hot/${input.id}`), { retry });
      return parseResponse(data);
    },
    async listCoffees() {
      return parseList(await getJson(client, new URL("https://api.sampleapis.com/coffee/hot"), { retry }));
    },
  };
}
