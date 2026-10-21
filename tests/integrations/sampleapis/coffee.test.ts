import { describe, expect, it } from "vitest";
import { createSampleApisCoffeeClient } from "../../../src/integrations/sampleapis/coffee";
import { coffee } from "../../fixtures/sampleapis-coffee";

describe("SampleAPIs Coffee の Input / Output 契約", () => {
  it("指定 ID を coffee/hot の GET に渡し、型付き Output を返す", async () => {
    const api = createSampleApisCoffeeClient(async (url, init) => {
      if (url.href !== "https://api.sampleapis.com/coffee/hot/1" || init.method !== "GET") {
        return new Response(null, { status: 404 });
      }
      return Response.json({ ...coffee, extra: "ignored" });
    });
    expect(await api.fetchCoffee({ id: 1 })).toEqual(coffee);
  });

});
