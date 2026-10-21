export interface FetchCoffeeInput { id: number }

export interface FetchCoffeeOutput {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
  image: string;
}

export interface CoffeeClient {
  fetchCoffee(input: FetchCoffeeInput): Promise<FetchCoffeeOutput>;
}
