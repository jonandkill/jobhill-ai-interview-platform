import { describe, expect, it, vi } from "vitest";
import {
  acquireMediaStreamWithRetry,
  createSingleFlight,
  isRetryableMediaBusyError,
  stopMediaStream,
} from "./mediaDeviceLifecycle";

function fakeStream(trackCount = 2) {
  const stops = Array.from({ length: trackCount }, () => vi.fn());
  const stream = {
    getTracks: () => stops.map(stop => ({ stop })),
  } as unknown as MediaStream;
  return { stream, stops };
}

function mediaError(name: string) {
  return new DOMException("test", name);
}

describe("media device lifecycle", () => {
  it("retries one transient device-busy error after the bounded delay", async () => {
    const { stream } = fakeStream();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(mediaError("NotReadableError"))
      .mockResolvedValueOnce(stream);
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      acquireMediaStreamWithRetry({
        getUserMedia,
        constraints: { audio: true, video: true },
        retryDelayMs: 1_000,
        wait,
      }),
    ).resolves.toBe(stream);

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1_000, undefined);
  });

  it("does not retry permission or missing-device failures", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(mediaError("NotAllowedError"));
    const wait = vi.fn();

    await expect(
      acquireMediaStreamWithRetry({
        getUserMedia,
        constraints: { audio: true },
        wait,
      }),
    ).rejects.toMatchObject({ name: "NotAllowedError" });

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });

  it("stops a stream that resolves after cancellation", async () => {
    const { stream, stops } = fakeStream();
    const controller = new AbortController();
    const getUserMedia = vi.fn().mockImplementation(async () => {
      controller.abort();
      return stream;
    });

    await expect(
      acquireMediaStreamWithRetry({
        getUserMedia,
        constraints: { video: true },
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    stops.forEach(stop => expect(stop).toHaveBeenCalledOnce());
  });

  it("stops every track idempotently", () => {
    const { stream, stops } = fakeStream(3);
    stopMediaStream(stream);
    stops.forEach(stop => expect(stop).toHaveBeenCalledOnce());
    expect(() => stopMediaStream(null)).not.toThrow();
  });

  it("deduplicates rapid requests and opens again after settlement", async () => {
    const gate = createSingleFlight<number>();
    let resolveFirst: ((value: number) => void) | undefined;
    const task = vi.fn(
      () => new Promise<number>(resolve => {
        resolveFirst = resolve;
      }),
    );

    const first = gate.run(task);
    const duplicate = gate.run(task);
    expect(duplicate).toBe(first);
    expect(task).toHaveBeenCalledOnce();
    expect(gate.pending).toBe(true);

    resolveFirst?.(1);
    await first;
    await Promise.resolve();
    expect(gate.pending).toBe(false);

    const next = gate.run(async () => 2);
    await expect(next).resolves.toBe(2);
  });

  it("recognizes browser-specific device-busy names", () => {
    expect(isRetryableMediaBusyError(mediaError("NotReadableError"))).toBe(true);
    expect(isRetryableMediaBusyError(mediaError("TrackStartError"))).toBe(true);
    expect(isRetryableMediaBusyError(mediaError("NotAllowedError"))).toBe(false);
  });
});
