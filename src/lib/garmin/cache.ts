import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const cacheDir = ".cache/api";
const inFlight = new Map<string, Promise<unknown>>();

async function readFresh(file: string, ttlMs: number): Promise<{ data: unknown } | undefined> {
  try {
    const entry = JSON.parse(await readFile(file, "utf8"));
    return Date.now() - entry.savedAt < ttlMs ? entry : undefined;
  } catch {
    return undefined;
  }
}

async function loadAndStore(file: string, key: string, load: () => Promise<unknown>): Promise<unknown> {
  const data = await load();
  await mkdir(cacheDir, { recursive: true });
  // Write then rename so readers never see partial files
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ key, savedAt: Date.now(), data }), { mode: 0o600 });
  await rename(temporary, file);
  return data;
}

export async function cached(key: string, ttlMs: number, load: () => Promise<unknown>): Promise<unknown> {
  const file = `${cacheDir}/${createHash("sha256").update(key).digest("hex")}.json`;
  const entry = await readFresh(file, ttlMs);
  if (entry) return entry.data;

  let pending = inFlight.get(key);
  if (!pending) {
    pending = loadAndStore(file, key, load).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}
