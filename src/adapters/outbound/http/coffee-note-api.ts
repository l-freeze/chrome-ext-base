import type { CoffeeApi } from "../../../application/ports/coffee-api";
import type { NoteApi } from "../../../application/ports/note-api";
import { fetchNoteInput, fetchNoteOutput } from "../../../validation/note-validation";

// 外部の Coffee 形式を、アプリケーションが要求する Note 形式に変換する。
export function createCoffeeNoteApi(coffeeApi: CoffeeApi): NoteApi {
  return {
    async fetchNote(raw) {
      const input = fetchNoteInput.parse(raw);
      const coffee = await coffeeApi.fetchCoffee(input);
      return fetchNoteOutput.parse({
        id: coffee.id,
        text: [coffee.title, coffee.description, `材料: ${coffee.ingredients.join(", ")}`].join("\n\n"),
      });
    },
  };
}
