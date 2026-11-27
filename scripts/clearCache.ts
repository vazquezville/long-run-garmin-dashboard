import { rm } from "node:fs/promises";

await rm(".cache", { recursive: true, force: true });
console.log("Cache cleared.");
