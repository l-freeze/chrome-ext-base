import type { CoffeeClient } from "../../../integrations/sampleapis/coffee";
import type { NoteSource } from "../ports";
import { noteText } from "../note";
import { importFailure } from "./failure";

export function createSampleApisCoffeeSource(coffeeClient: CoffeeClient): NoteSource {
  return {
    async fetchNote(input) {
      let coffee;
      try { coffee = await coffeeClient.fetchCoffee(input); }
      catch (error) { throw importFailure(error); }
      return {
        id: coffee.id,
        text: noteText([coffee.title, coffee.description, `材料: ${coffee.ingredients.join(", ")}`].join("\n\n")),
      };
    },
  };
}
