export interface Validator<Output> {
  parse(input: unknown): Output;
}
