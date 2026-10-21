export type Fetch = (url: URL, init: RequestInit) => Promise<Response>;

export class HttpError extends Error {
  override name = "HttpError";
  constructor(public readonly status: number) {
    super(`API request failed: HTTP ${status}`);
  }
}

export async function getJson(url: URL, fetch: Fetch): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new HttpError(response.status);
  return response.json();
}
