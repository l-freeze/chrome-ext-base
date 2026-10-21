import type { FetchCoffeeOutput } from "../../src/integrations/sampleapis/coffee/contracts";

// SampleAPIs の公開データ形式に基づく固定 fixture。テストは外部通信しない。
export const coffee: FetchCoffeeOutput = {
  id: 1, title: "Black Coffee", description: "Ground coffee beans steeped in hot water.",
  ingredients: ["Coffee"], image: "https://images.unsplash.com/photo-1494314671902-399b18174975",
};
