import type { FetchCoffeeInput, FetchCoffeeOutput } from "./contracts";
import type { Validator } from "../../../shared/validation/validator";
import { object, positiveId, ValidationError } from "../../../shared/validation/primitives";

export const fetchCoffeeInput: Validator<FetchCoffeeInput> = {
  parse(input) { return { id: positiveId(object(input).id) }; },
};

export const fetchCoffeeOutput: Validator<FetchCoffeeOutput> = {
  parse(input) {
    const value = object(input);
    if (
      typeof value.title !== "string" || typeof value.description !== "string" ||
      typeof value.image !== "string" || !Array.isArray(value.ingredients) ||
      !value.ingredients.every((item: unknown) => typeof item === "string")
    ) {
      throw new ValidationError("SampleAPIs のコーヒーデータの形式が不正です。");
    }
    return {
      id: positiveId(value.id), title: value.title, description: value.description,
      ingredients: [...value.ingredients], image: value.image,
    };
  },
};
