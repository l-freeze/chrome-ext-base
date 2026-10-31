import type { PageReader } from "../ports";

export function createMockPageReader(): PageReader {
  return {
    async read(input) {
      return {
        title: "アイデアを集める、小さな習慣。",
        url: "https://example.com/articles/ideas",
        selection: input.includeSelection ? "気になった文章を選んで、次のアイデアにつなげよう。" : "",
        selectionTruncated: false,
      };
    },
  };
}
