import type { CoffeeClient } from "../../../integrations/sampleapis/coffee";
import type { NoteSource } from "../ports";
import { noteText } from "../note";
import { importFailure } from "./failure";

export function createSampleApisCoffeeSource(coffeeClient: CoffeeClient): NoteSource {
  return {
    async fetchNote(input) {
      try {
        const coffee = await coffeeClient.fetchCoffee(input);
        // A converted note longer than the limit is also a response the feature cannot use.
        return {
          id: coffee.id,
          text: noteText([coffee.title, coffee.description, `材料: ${coffee.ingredients.join(", ")}`].join("\n\n")),
        };
      } catch (error) { throw importFailure(error); }
    },
  };
}
