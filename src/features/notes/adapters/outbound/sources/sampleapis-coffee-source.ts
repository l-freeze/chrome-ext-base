import type { CoffeeClient } from "../../../../../integrations/sampleapis/coffee/contracts";
import type { NoteSource } from "../../../application/ports/outbound/note-source";
import { importNoteInput } from "../../../validation/commands";
import { fetchNoteOutput } from "../../../validation/note";

// 外部の Coffee 形式を、アプリケーションが要求する Note 形式に変換する。
export function createSampleApisCoffeeSource(coffeeClient: CoffeeClient): NoteSource {
  return {
    async fetchNote(raw) {
      const input = importNoteInput.parse(raw);
      const coffee = await coffeeClient.fetchCoffee(input);
      return fetchNoteOutput.parse({
        id: coffee.id,
        text: [coffee.title, coffee.description, `材料: ${coffee.ingredients.join(", ")}`].join("\n\n"),
      });
    },
  };
}
