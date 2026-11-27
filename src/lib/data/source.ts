// Server-only loaders that connect the Astro environment with the Garmin API
import { GARMIN_API_KEY } from "astro:env/server";
import { createGarminClient, GarminAuthError } from "../garmin/client.ts";
import { createGarminApi } from "../garmin/endpoints.ts";
import { lastDays, toIsoDate, type DateRange } from "../garmin/ranges.ts";
import { availableMonths } from "../periods.ts";
import { maxRange } from "../views.ts";
import { toRunDetail } from "./runDetail.ts";
import { toActivities, toDays, toFitnessAge, toHeartRateZones, toHrv, toNights, toVo2, toWeights } from "./normalize.ts";

const client = createGarminClient(GARMIN_API_KEY);

export type Loaded<T> = { data: T; error: null } | { data: null; error: string };

async function load<T>(label: string, task: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { data: await task(), error: null };
  } catch (error) {
    // A rejected key breaks every section, so fail loudly
    if (error instanceof GarminAuthError) throw error;
    console.error(`Could not load ${label}:`, error instanceof Error ? error.message : error);
    return { data: null, error: `Couldn't load ${label} from Garmin. Reload the page to try again.` };
  }
}

export function createSource(now: Date = new Date()) {
  const today = toIsoDate(now);
  const api = createGarminApi(client, today);
  const recent = lastDays(maxRange, today);
  const lastYear = lastDays(365, today);
  const lastTwoYears = lastDays(730, today);

  return {
    today,
    lastYear,
    lastTwoYears,
    months: async () => availableMonths((await api.activityHistory()).map((activity) => activity.startTimeLocal.slice(0, 10)), today),
    activities: (range: DateRange = recent) => load("activities", async () => toActivities(await api.activities(range), range)),
    // Whole history, with the recent weeks refreshed more often
    allActivities: () =>
      load("activities", async () => {
        const [history, latest] = await Promise.all([api.activityHistory(), api.activities(recent)]);
        const older = history.filter((activity) => activity.startTimeLocal < recent.start);
        return toActivities([...older, ...latest], { start: "2000-01-01", end: today });
      }),
    // Only call with an id and date taken from the activity list
    runDetail: (id: number, date: string) =>
      load("the details of this run", async () => toRunDetail(...(await Promise.all([api.activity(id, date), api.activityMetrics(id, date)])))),
    days: (range: DateRange = recent) => load("daily summaries", async () => toDays(await api.dailySummaries(range), range, today)),
    nights: (range: DateRange = recent) => load("sleep", async () => toNights(await api.sleep(range), range)),
    hrv: (range: DateRange = recent) => load("heart rate variability", async () => toHrv(await api.hrv(range), range)),
    vo2: (range: DateRange = lastYear) => load("VO2 max", async () => toVo2(await api.vo2Max(range), range)),
    weights: () => load("weight", async () => toWeights(await api.weight(lastTwoYears), lastTwoYears)),
    fitnessAge: () => load("fitness age", async () => toFitnessAge(await api.fitnessAge())),
    heartRateZones: () => load("heart rate zones", async () => toHeartRateZones(await api.heartRateZones())),
  };
}
