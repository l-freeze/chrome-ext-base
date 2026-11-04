import { validatedAction, ValidationError } from "../../../lib/validation";
import type { Validator } from "../../../lib/validation";
import { siteOrigin } from "../access";
import type { GrantAccess, GrantInput } from "../use-cases/grant";

const input: Validator<GrantInput> = { parse(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw) || !("origin" in raw)) {
    throw new ValidationError("Expected { origin } for the site to allow.");
  }
  return { origin: siteOrigin(raw.origin) };
} };
export const createGrantController = (execute: GrantAccess) => validatedAction(input, execute);
