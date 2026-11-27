// Calls every endpoint once, saves raw JSON and prints its shape without values
import { mkdir, writeFile } from "node:fs/promises";
import { createGarminClient, GarminAuthError, type Query } from "../src/lib/garmin/client.ts";
import { lastDays, toIsoDate, type DateRange } from "../src/lib/garmin/ranges.ts";

const apiKey = process.env.GARMIN_API_KEY;
if (!apiKey) throw new Error("GARMIN_API_KEY is missing in .env");

const client = createGarminClient(apiKey);
const today = toIsoDate(new Date());
const outputDir = ".cache/probe";
const rangeSizes = [90, 31, 28, 7];

interface Probe {
  name: string;
  isRanged: boolean;
  request(range: DateRange): [path: string, query?: Query];
}

const ranged = (name: string, request: Probe["request"]): Probe => ({ name, isRanged: true, request });
const single = (name: string, request: Probe["request"]): Probe => ({ name, isRanged: false, request });
const byDates = ({ start, end }: DateRange): Query => ({ startDate: start, endDate: end });

const latestRuns = (await client.get("/activitylist-service/activities/search/activities", { start: 0, limit: 1, activityType: "running" })) as Array<{ activityId: number }>;

const probes: Probe[] = [
  ...latestRuns.flatMap(({ activityId }) => [
    single("activity", () => [`/activity-service/activity/${activityId}`]),
    single("activityDetails", () => [`/activity-service/activity/${activityId}/details`, { maxChartSize: 2000, maxPolylineSize: 4000 }]),
  ]),
  single("activities", () => ["/activitylist-service/activities/search/activities", { start: 0, limit: 20 }]),
  single("activityTypes", () => ["/activity-service/activity/activityTypes/simple"]),
  ranged("dailySummaries", (r) => ["/usersummary-service/v2/dailysummaries", byDates(r)]),
  ranged("steps", (r) => [`/usersummary-service/stats/steps/daily/${r.start}/${r.end}`]),
  ranged("stress", (r) => [`/usersummary-service/stats/stress/daily/${r.start}/${r.end}`]),
  ranged("sleep", (r) => ["/sleep-service/sleep/dailySleepSummariesByDate", byDates(r)]),
  single("sleepDay", () => ["/sleep-service/sleep/dailySleep", { date: today }]),
  ranged("hrv", (r) => [`/hrv-service/hrv/daily/${r.start}/${r.end}`]),
  ranged("bodyBattery", (r) => ["/wellness-service/wellness/bodyBattery/reports/daily", byDates(r)]),
  ranged("vo2Max", (r) => [`/metrics-service/metrics/maxmet/daily/${r.start}/${r.end}`]),
  single("fitnessAge", () => [`/fitnessage-service/fitnessage/v2/${today}`]),
  ranged("weight", (r) => [`/weight-service/weight/range/${r.start}/${r.end}`, { includeAll: true }]),
  single("heartRateZones", () => ["/biometric-service/heartRateZones/v2"]),
];

// Merges array items so optional fields show up in the shape
function mergeItems(items: unknown[]): unknown {
  const objects = items.filter((item) => item !== null && typeof item === "object" && !Array.isArray(item));
  if (objects.length === 0) return items.find((item) => item !== null) ?? null;
  const merged: Record<string, unknown> = {};
  for (const item of objects as Array<Record<string, unknown>>) {
    for (const [key, value] of Object.entries(item)) merged[key] ??= value;
  }
  return merged;
}

function describeShape(value: unknown): unknown {
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length === 0 ? "array(0)" : [`array(${value.length})`, describeShape(mergeItems(value))];
  if (typeof value !== "object") return typeof value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, describeShape(child)]));
}

await mkdir(outputDir, { recursive: true });

for (const probe of probes) {
  const sizes = probe.isRanged ? rangeSizes : [1];
  for (const size of sizes) {
    try {
      const data = await client.get(...probe.request(lastDays(size, today)));
      await writeFile(`${outputDir}/${probe.name}.json`, JSON.stringify(data, null, 2), { mode: 0o600 });
      console.log(`\n## ${probe.name} OK${probe.isRanged ? ` (${size} days)` : ""}`);
      console.log(JSON.stringify(describeShape(data)));
      break;
    } catch (error) {
      if (error instanceof GarminAuthError) throw error;
      console.log(`\n## ${probe.name} FAILED${probe.isRanged ? ` (${size} days)` : ""}: ${(error as Error).message}`);
    }
  }
}
