// Generic HTTP: sending, a per-request timeout, aborting, error kinds, and a retry mechanism.
// It knows no service. When and how long to retry is decided by the caller's RetryPolicy.

export type Fetch = (input: string | URL, init: RequestInit) => Promise<Response>;
export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;

export type TransportErrorKind = "network" | "timeout" | "aborted";

// No response was received: the network failed, the timeout passed, or the caller aborted.
export class TransportError extends Error {
  override name = "TransportError";
  readonly kind: TransportErrorKind;
  constructor(kind: TransportErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.kind = kind;
  }
}

// A response arrived with a non-2xx status.
export class HttpError extends Error {
  override name = "HttpError";
  readonly status: number;
  constructor(status: number) {
    super(`HTTP request failed with status ${status}`);
    this.status = status;
  }
}

export interface HttpRequest {
  url: string | URL;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export interface RetryContext {
  attempt: number;     // 0 for the first try
  elapsedMs: number;   // since the first try started, including waits
}

// Returns how many milliseconds to wait before trying again, or null to stop.
export interface RetryPolicy {
  onResponse?(response: Response, context: RetryContext): number | null;
  onError?(error: TransportError, context: RetryContext): number | null;
}

export interface HttpClient {
  // Resolves with any response, whatever its status. Rejects with TransportError when none arrives.
  send(request: HttpRequest, retry?: RetryPolicy): Promise<Response>;
}

// Only methods that are safe to repeat are retried, whatever the policy says.
const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);

const abortableSleep: Sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(signal.reason); return; }
  const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
  const onAbort = () => { clearTimeout(timer); reject(signal!.reason); };
  signal?.addEventListener("abort", onAbort, { once: true });
});

export function createHttpClient(options: { fetch: Fetch; timeoutMs?: number; sleep?: Sleep; now?: () => number }): HttpClient {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const sleep = options.sleep ?? abortableSleep;
  const now = options.now ?? Date.now;

  async function once(request: HttpRequest): Promise<Response> {
    if (request.signal?.aborted) throw new TransportError("aborted", "Request aborted", { cause: request.signal.reason });
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
    try {
      return await options.fetch(request.url, {
        method: request.method ?? "GET",
        ...(request.headers ? { headers: request.headers } : {}),
        ...(request.body !== undefined ? { body: request.body } : {}),
        signal,
      });
    } catch (error) {
      if (request.signal?.aborted) throw new TransportError("aborted", "Request aborted", { cause: error });
      if (timeout.aborted) throw new TransportError("timeout", `No response within ${timeoutMs} ms`, { cause: error });
      throw new TransportError("network", "Network request failed", { cause: error });
    }
  }

  return {
    async send(request, retry) {
      const policy = RETRYABLE_METHODS.has((request.method ?? "GET").toUpperCase()) ? retry : undefined;
      const started = now();
      for (let attempt = 0; ; attempt++) {
        let waitMs: number | null;
        try {
          const response = await once(request);
          waitMs = policy?.onResponse?.(response, { attempt, elapsedMs: now() - started }) ?? null;
          if (waitMs === null) return response;
          await response.body?.cancel();
        } catch (error) {
          if (!(error instanceof TransportError) || error.kind === "aborted") throw error;
          waitMs = policy?.onError?.(error, { attempt, elapsedMs: now() - started }) ?? null;
          if (waitMs === null) throw error;
        }
        try { await sleep(waitMs, request.signal); }
        catch (error) { throw new TransportError("aborted", "Request aborted", { cause: error }); }
      }
    },
  };
}

// Retry-After (RFC 9110): delay seconds or an HTTP date, as milliseconds from now. Null when absent or invalid.
export function retryAfterMs(headers: Headers, now = Date.now()): number | null {
  const value = headers.get("retry-after")?.trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export interface RetryOptions {
  maxRetries?: number;            // retries after the first try (default 2)
  baseDelayMs?: number;           // backoff for the first retry, doubled each time (default 500)
  maxDelayMs?: number;            // longest single wait; a longer Retry-After stops retrying (default 10 s)
  maxElapsedMs?: number;          // total time budget including requests and waits (default 20 s)
  statuses?: readonly number[];   // statuses worth retrying (default 408, 429, 500, 502, 503, 504)
}

// A general policy: retry network errors, timeouts, and the given statuses with exponential backoff,
// honoring Retry-After. The time budget keeps retries inside an MV3 service worker's ~30 s idle limit.
export function createRetryPolicy(options: RetryOptions = {}): RetryPolicy {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const maxElapsedMs = options.maxElapsedMs ?? 20_000;
  const statuses = new Set(options.statuses ?? [408, 429, 500, 502, 503, 504]);
  const decide = (delayMs: number, context: RetryContext) =>
    context.attempt < maxRetries && delayMs <= maxDelayMs && context.elapsedMs + delayMs <= maxElapsedMs ? delayMs : null;
  return {
    onResponse(response, context) {
      if (!statuses.has(response.status)) return null;
      return decide(retryAfterMs(response.headers) ?? baseDelayMs * 2 ** context.attempt, context);
    },
    onError(_error, context) {
      return decide(baseDelayMs * 2 ** context.attempt, context);
    },
  };
}

export interface JsonRequest extends Omit<HttpRequest, "body"> {
  json?: unknown;   // sent as a JSON body with Content-Type: application/json
}

// Sends a request expecting JSON. Non-2xx statuses reject with HttpError; a 204 resolves with undefined.
export async function requestJson(client: HttpClient, request: JsonRequest, retry?: RetryPolicy): Promise<unknown> {
  const { json, ...rest } = request;
  const headers: Record<string, string> = { Accept: "application/json", ...request.headers };
  let body: string | undefined;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  const response = await client.send({ ...rest, headers, ...(body !== undefined ? { body } : {}) }, retry);
  if (!response.ok) {
    await response.body?.cancel();
    throw new HttpError(response.status);
  }
  return response.status === 204 ? undefined : response.json();
}

export function getJson(client: HttpClient, url: string | URL, options: { signal?: AbortSignal; retry?: RetryPolicy } = {}): Promise<unknown> {
  return requestJson(client, { url, ...(options.signal ? { signal: options.signal } : {}) }, options.retry);
}
