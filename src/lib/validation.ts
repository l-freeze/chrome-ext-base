// Mechanism only. Each boundary owns its validation rules.
export interface Validator<Output> {
  parse(input: unknown): Output;
}

export interface ValidationIssue {
  message: string;
  path: readonly PropertyKey[];
}

export class ValidationError extends Error {
  override name = "ValidationError";
  readonly issues: readonly ValidationIssue[];
  constructor(message: string, issues: readonly ValidationIssue[] = []) {
    super(message);
    this.issues = issues;
  }
}

export function validatedAction<Input, Output>(
  validator: Validator<Input>,
  execute: (input: Input) => Promise<Output>,
): (raw: unknown) => Promise<Output> {
  return async (raw) => execute(validator.parse(raw));
}

// The Standard Schema v1 interface (https://standardschema.dev), written out so the base needs no
// dependency. Valibot, Zod, ArkType, and other libraries implement it on their schemas.
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
  };
}
export type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<{ readonly message: string; readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined }> };
export type InferSchemaOutput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["output"];

// Uses a schema from any Standard Schema library wherever the base expects a Validator: controllers,
// storage contracts, and message contracts. Validation stays synchronous, so asynchronous schemas are rejected.
export function fromStandardSchema<Schema extends StandardSchemaV1>(schema: Schema): Validator<InferSchemaOutput<Schema>> {
  if (typeof schema?.["~standard"]?.validate !== "function") throw new TypeError("Expected a Standard Schema.");
  return {
    parse(input) {
      const result = schema["~standard"].validate(input);
      if (result instanceof Promise) {
        result.catch(() => {});
        throw new TypeError("Asynchronous schemas are not supported; validators must be synchronous.");
      }
      if (result.issues) {
        const issues = result.issues.map((issue) => ({
          message: issue.message,
          path: (issue.path ?? []).map((segment) => typeof segment === "object" ? segment.key : segment),
        }));
        throw new ValidationError(issues.map((issue) => issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message).join("; "), issues);
      }
      return result.value as InferSchemaOutput<Schema>;
    },
  };
}
