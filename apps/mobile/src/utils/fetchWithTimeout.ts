export class RequestTimeoutError extends Error {
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${Math.round(timeoutMs / 1000)}s`);
    this.name = 'RequestTimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * fetch with AbortSignal timeout. Logs [LONG_TEXT] timeout op=...
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  operation: string
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.log(`[LONG_TEXT] timeout op=${operation} ms=${timeoutMs}`);
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new RequestTimeoutError(operation, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
