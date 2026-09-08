export const DEFAULT_MEDIA_BUSY_RETRY_DELAY_MS = 1_000;

type MediaRequest = (constraints: MediaStreamConstraints) => Promise<MediaStream>;
type Wait = (delayMs: number, signal?: AbortSignal) => Promise<void>;

export interface MediaAcquireOptions {
  getUserMedia: MediaRequest;
  constraints: MediaStreamConstraints;
  signal?: AbortSignal;
  maxBusyRetries?: number;
  retryDelayMs?: number;
  wait?: Wait;
}

function createAbortError() {
  return new DOMException("Media request was cancelled", "AbortError");
}

export function getMediaErrorName(error: unknown): string {
  if (error instanceof DOMException || error instanceof Error) return error.name;
  if (typeof error === "object" && error !== null && "name" in error) {
    return String((error as { name?: unknown }).name || "");
  }
  return "";
}

export function isRetryableMediaBusyError(error: unknown) {
  return ["NotReadableError", "TrackStartError", "AbortError"].includes(getMediaErrorName(error));
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach(track => {
    try {
      track.stop();
    } catch {
      // A track may already be ended. Cleanup must remain idempotent.
    }
  });
}

export function waitForMediaRelease(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(createAbortError());

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, Math.max(0, delayMs));

    const handleAbort = () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", handleAbort);
      reject(createAbortError());
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

/**
 * Acquire a stream with one bounded retry for transient device-busy failures.
 * Permission and device-not-found failures are never retried.
 */
export async function acquireMediaStreamWithRetry({
  getUserMedia,
  constraints,
  signal,
  maxBusyRetries = 1,
  retryDelayMs = DEFAULT_MEDIA_BUSY_RETRY_DELAY_MS,
  wait = waitForMediaRelease,
}: MediaAcquireOptions): Promise<MediaStream> {
  const retryLimit = Math.max(0, Math.min(2, Math.trunc(maxBusyRetries)));

  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw createAbortError();

    try {
      const stream = await getUserMedia(constraints);
      if (signal?.aborted) {
        stopMediaStream(stream);
        throw createAbortError();
      }
      return stream;
    } catch (error) {
      if (signal?.aborted) throw createAbortError();
      if (!isRetryableMediaBusyError(error) || attempt >= retryLimit) throw error;
      await wait(retryDelayMs, signal);
    }
  }
}

export interface SingleFlight<T> {
  run(task: () => Promise<T>): Promise<T>;
  readonly pending: boolean;
}

/** Prevents rapid taps from creating overlapping getUserMedia requests. */
export function createSingleFlight<T>(): SingleFlight<T> {
  let current: Promise<T> | null = null;

  return {
    run(task) {
      if (current) return current;
      const request = task();
      current = request;
      const clear = () => {
        if (current === request) current = null;
      };
      void request.then(clear, clear);
      return request;
    },
    get pending() {
      return current !== null;
    },
  };
}
