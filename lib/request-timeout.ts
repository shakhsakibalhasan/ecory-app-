/** Bound network reads as well as headers; do not retry writes automatically. */
export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 18000): Promise<Response> {
  const controller = new AbortController();
  const original = init?.signal ?? (typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined);
  let timer: ReturnType<typeof setTimeout>;
  let rejectAbort: (error: unknown) => void = () => {};
  const abort = () => {
    controller.abort();
    rejectAbort(new DOMException("Request cancelled", "AbortError"));
  };
  if (original?.aborted) throw new DOMException("Request cancelled", "AbortError");
  const stop = new Promise<never>((_, reject) => {
    rejectAbort = reject;
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Request timed out. Check your connection and retry."));
    }, timeoutMs);
    original?.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(input, { ...init, signal: controller.signal });
        // These status codes forbid a response body, even an empty buffer.
        if (!response.body || [101, 103, 204, 205, 304].includes(response.status)) return response;
        const bytes = await response.arrayBuffer();
        return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
      })(),
      stop,
    ]);
  } finally {
    clearTimeout(timer!);
    original?.removeEventListener("abort", abort);
  }
}
