import type { CoffeeClient } from "../../../integrations/sampleapis/coffee";
import type { NoteSource } from "../ports";
import { noteText } from "../note";

export function createSampleApisCoffeeSource(coffeeClient: CoffeeClient): NoteSource {
  return {
    async fetchNote(input) {
      const coffee = await coffeeClient.fetchCoffee(input);
      return {
        id: coffee.id,
        text: noteText([coffee.title, coffee.description, `材料: ${coffee.ingredients.join(", ")}`].join("\n\n")),
      };
    },
  };
}
