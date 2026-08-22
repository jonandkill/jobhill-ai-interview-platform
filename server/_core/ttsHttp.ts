const MAX_TTS_TEXT_CHARACTERS = 800;
const MAX_TTS_TEXT_BYTES = 4_096;
const MAX_WAV_BYTES = 8 * 1024 * 1024;

export type TtsErrorCode =
  | "TTS_CONFIG_ERROR"
  | "TTS_INVALID_INPUT"
  | "TTS_TIMEOUT"
  | "TTS_UNAVAILABLE"
  | "TTS_INVALID_AUDIO"
  | "TTS_TOO_LARGE";

export class TtsProviderError extends Error {
  constructor(public readonly code: TtsErrorCode) {
    super(code);
    this.name = "TtsProviderError";
  }
}

export function normalizeTtsText(value: string): string {
  const normalized = value
    .normalize("NFC")
    .replace(/<[^>]{0,120}>/g, " ")
    .replace(/\[[A-Za-z][^\]\n]{0,80}\]/g, " ")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_TTS_TEXT_CHARACTERS ||
    Buffer.byteLength(normalized, "utf8") > MAX_TTS_TEXT_BYTES
  ) {
    throw new TtsProviderError("TTS_INVALID_INPUT");
  }

  return normalized;
}

export function normalizeTtsEndpoint(
  rawValue: string | undefined,
  options: { allowInsecureHttp: boolean; isProduction?: boolean; requirePrivateHost?: boolean },
): string | null {
  const value = rawValue?.trim();
  if (!value) return null;

  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new TtsProviderError("TTS_CONFIG_ERROR");
  }

  const hostname = endpoint.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const ipv4Parts = hostname.split(".").map(Number);
  const isPrivateIpv4 = ipv4Parts.length === 4 && ipv4Parts.every(Number.isInteger) && (
    ipv4Parts[0] === 10 ||
    ipv4Parts[0] === 127 ||
    (ipv4Parts[0] === 172 && ipv4Parts[1] >= 16 && ipv4Parts[1] <= 31) ||
    (ipv4Parts[0] === 192 && ipv4Parts[1] === 168)
  );
  const isPrivateHost =
    hostname === "localhost" ||
    hostname === "::1" ||
    (hostname.includes(":") && (hostname.startsWith("fc") || hostname.startsWith("fd"))) ||
    isPrivateIpv4 ||
    !hostname.includes(".") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".cluster.local");
  const isLoopback = hostname === "localhost" || hostname === "::1" || (isPrivateIpv4 && ipv4Parts[0] === 127);
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    (options.requirePrivateHost && !isPrivateHost) ||
    (isProduction && endpoint.protocol !== "https:" && !isLoopback && !options.allowInsecureHttp)
  ) {
    throw new TtsProviderError("TTS_CONFIG_ERROR");
  }

  endpoint.pathname = endpoint.pathname.replace(/\/+$/, "");
  return endpoint.toString().replace(/\/$/, "");
}

function hasWavMagic(audio: Buffer): boolean {
  return audio.length >= 12 && audio.toString("ascii", 0, 4) === "RIFF" && audio.toString("ascii", 8, 12) === "WAVE";
}

async function readBoundedWav(response: Response, abort: AbortController): Promise<Buffer> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "audio/wav" && contentType !== "audio/x-wav") {
    throw new TtsProviderError("TTS_INVALID_AUDIO");
  }

  const advertisedLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_WAV_BYTES) {
    abort.abort();
    throw new TtsProviderError("TTS_TOO_LARGE");
  }
  if (!response.body) throw new TtsProviderError("TTS_INVALID_AUDIO");

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    totalBytes += chunk.length;
    if (totalBytes > MAX_WAV_BYTES) {
      abort.abort();
      await reader.cancel().catch(() => undefined);
      throw new TtsProviderError("TTS_TOO_LARGE");
    }
    chunks.push(chunk);
  }

  const audio = Buffer.concat(chunks, totalBytes);
  if (audio.length < 44 || !hasWavMagic(audio)) throw new TtsProviderError("TTS_INVALID_AUDIO");
  return audio;
}

export async function postTransientWav(options: {
  endpoint: string;
  body: Record<string, unknown>;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  timeout.unref?.();

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "cache-control": "no-store",
      accept: "audio/wav",
    };
    if (options.token?.trim()) headers.authorization = `Bearer ${options.token.trim()}`;

    const response = await (options.fetchImpl ?? fetch)(options.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(options.body),
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new TtsProviderError("TTS_UNAVAILABLE");
    return await readBoundedWav(response, controller);
  } catch (error) {
    if (error instanceof TtsProviderError) throw error;
    if (controller.signal.aborted) throw new TtsProviderError("TTS_TIMEOUT");
    throw new TtsProviderError("TTS_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}
