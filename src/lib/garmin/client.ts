import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const baseUrl = "https://personal.connectapi.garmin.com";
const tokenPath = "/personalapitoken-service/personal-api/personal-api-key/token";
const userAgent = "long-run-garmin-dashboard";
const timeoutMs = 30_000;
const minTokenLifetimeMs = 60 * 60 * 1000;
const maxConcurrentRequests = 4;
const maxRateLimitRetries = 3;
const rejectedKeyPauseMs = 30_000;

export type Query = Record<string, string | number | boolean>;

export interface GarminClient {
  get(path: string, query?: Query): Promise<unknown>;
  // Raw bytes, for files such as the original activity recording
  download(path: string): Promise<Buffer>;
}

export class GarminError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GarminError";
    this.status = status;
  }
}

export class GarminAuthError extends GarminError {
  constructor(status: number) {
    super(
      "Garmin rejected the API key, it may be expired or revoked. Create a new one at https://connect.garmin.com/app/settings/personalApiToken, update GARMIN_API_KEY in .env and restart.",
      status,
    );
    this.name = "GarminAuthError";
  }
}

interface Token {
  value: string;
  expiresAt: number;
}

function readExpiry(jwt: string): number {
  const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8"));
  return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
}

// Simple semaphore to avoid hammering the API
function createLimiter(limit: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

export function createGarminClient(apiKey: string, tokenFile = ".cache/token.json"): GarminClient {
  const fingerprint = createHash("sha256").update(apiKey).digest("hex");
  const limit = createLimiter(maxConcurrentRequests);
  let pendingToken: Promise<Token> | undefined;

  async function readStoredToken(): Promise<Token | undefined> {
    try {
      const stored = JSON.parse(await readFile(tokenFile, "utf8"));
      const isUsable = stored.fingerprint === fingerprint && stored.expiresAt - Date.now() > minTokenLifetimeMs;
      return isUsable ? { value: stored.value, expiresAt: stored.expiresAt } : undefined;
    } catch {
      return undefined;
    }
  }

  async function requestToken(): Promise<Token> {
    const response = await fetch(baseUrl + tokenPath, {
      method: "POST",
      headers: { Accept: "*/*", Authorization: `ApiKey ${apiKey}`, "User-Agent": userAgent },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 401 || response.status === 403) throw new GarminAuthError(response.status);
    if (!response.ok) throw new GarminError(`Token request failed with HTTP ${response.status}`, response.status);

    const value = (await response.text()).trim();
    const token = { value, expiresAt: readExpiry(value) };
    await mkdir(dirname(tokenFile), { recursive: true });
    await writeFile(tokenFile, JSON.stringify({ fingerprint, ...token }), { mode: 0o600 });
    await chmod(tokenFile, 0o600);
    return token;
  }

  // Shares one token request between parallel callers
  function getToken(forceRefresh = false): Promise<Token> {
    if (forceRefresh || !pendingToken) {
      pendingToken = (async () => (!forceRefresh && (await readStoredToken())) || requestToken())();
      pendingToken.catch((error) => {
        const forget = () => (pendingToken = undefined);
        // A rejected key is remembered briefly to avoid repeated attempts
        if (error instanceof GarminAuthError) setTimeout(forget, rejectedKeyPauseMs).unref();
        else forget();
      });
    }
    return pendingToken;
  }

  async function send(url: URL, accept: string): Promise<Response> {
    let token = await getToken();
    let hasRefreshed = false;

    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, {
        headers: { Accept: accept, Authorization: `Bearer ${token.value}`, "User-Agent": userAgent },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 401 && !hasRefreshed) {
        hasRefreshed = true;
        const current = await getToken();
        token = current.value === token.value ? await getToken(true) : current;
        continue;
      }
      if (response.status === 429 && attempt < maxRateLimitRetries) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt);
        continue;
      }
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new GarminError(`GET ${url.pathname} failed with HTTP ${response.status} ${detail}`, response.status);
      }

      return response;
    }
  }

  return {
    get(path, query = {}) {
      const url = new URL(path, baseUrl);
      for (const [name, value] of Object.entries(query)) url.searchParams.set(name, String(value));
      // The body is read inside the limiter, so slots stay taken until it arrives
      return limit(async () => {
        const body = await (await send(url, "application/json")).text();
        return body.trim() ? JSON.parse(body) : null;
      });
    },

    download: (path) => limit(async () => Buffer.from(await (await send(new URL(path, baseUrl), "*/*")).arrayBuffer())),
  };
}
