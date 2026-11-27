import { cached } from "./cache.ts";
import type { GarminClient, Query } from "./client.ts";
import { addDays, splitRange, type DateRange } from "./ranges.ts";
import type { RawActivity, RawActivityDetail, RawActivityMetrics, RawDailySummary, RawFitnessAge, RawHeartRateZones, RawHrv, RawNight, RawVo2Max, RawWeightSummary } from "./rawTypes.ts";

const recentTtlMs = 30 * 60 * 1000;
const dayTtlMs = 24 * 60 * 60 * 1000;
const historyTtlMs = 7 * dayTtlMs;
const archiveTtlMs = 30 * dayTtlMs;
const activityPageSize = 100;

// Maximum days per request, measured with the probe script
const maxDays = { activities: 31, dailySummaries: 28, sleep: 31, hrv: 365, vo2Max: 365, weight: 365 };

export function createGarminApi(client: GarminClient, today: string) {
  // The older the data, the longer it stays cached
  function ttlFor(lastDate: string): number {
    if (lastDate >= addDays(today, -7)) return recentTtlMs;
    return lastDate >= addDays(today, -90) ? historyTtlMs : archiveTtlMs;
  }

  async function get<T>(path: string, query: Query = {}, lastDate: string = today, ttl: number = ttlFor(lastDate)): Promise<T> {
    const key = `${path}?${new URLSearchParams(Object.entries(query).map(([name, value]) => [name, String(value)]))}`;
    return (await cached(key, ttl, () => client.get(path, query))) as T;
  }

  async function byWindow<T>(range: DateRange, size: number, load: (window: DateRange) => Promise<T[]>): Promise<T[]> {
    const pages = await Promise.all(splitRange(range, size, today).map(load));
    return pages.flat();
  }

  async function activityPages(filter: Query, lastDate: string, ttl?: number): Promise<RawActivity[]> {
    const all: RawActivity[] = [];
    for (let offset = 0; ; offset += activityPageSize) {
      const query = { ...filter, start: offset, limit: activityPageSize };
      const page = (await get<RawActivity[] | null>("/activitylist-service/activities/search/activities", query, lastDate, ttl)) ?? [];
      all.push(...page);
      if (page.length < activityPageSize) return all;
    }
  }

  return {
    activities: (range: DateRange) => byWindow(range, maxDays.activities, ({ start, end }) => activityPages({ startDate: start, endDate: end }, end)),

    activity: (id: number, date: string) => get<RawActivityDetail | null>(`/activity-service/activity/${id}`, {}, date),

    activityMetrics: (id: number, date: string) =>
      get<RawActivityMetrics | null>(`/activity-service/activity/${id}/details`, { maxChartSize: 2000, maxPolylineSize: 4000 }, date),

    // Whole history, used to know which months can be browsed
    activityHistory: () => activityPages({}, today, dayTtlMs),

    dailySummaries: (range: DateRange) =>
      byWindow(range, maxDays.dailySummaries, async ({ start, end }) => {
        const response = await get<{ data?: RawDailySummary[] } | null>("/usersummary-service/v2/dailysummaries", { startDate: start, endDate: end }, end);
        return response?.data ?? [];
      }),

    sleep: (range: DateRange) =>
      byWindow(range, maxDays.sleep, async ({ start, end }) => {
        const query = { startDate: start, endDate: end };
        return (await get<RawNight[] | null>("/sleep-service/sleep/dailySleepSummariesByDate", query, end)) ?? [];
      }),

    hrv: (range: DateRange) =>
      byWindow(range, maxDays.hrv, async ({ start, end }) => {
        const response = await get<RawHrv | null>(`/hrv-service/hrv/daily/${start}/${end}`, {}, end);
        return response?.hrvSummaries ?? [];
      }),

    vo2Max: (range: DateRange) =>
      byWindow(range, maxDays.vo2Max, async ({ start, end }) => (await get<RawVo2Max[] | null>(`/metrics-service/metrics/maxmet/daily/${start}/${end}`, {}, end)) ?? []),

    weight: (range: DateRange) =>
      byWindow(range, maxDays.weight, async ({ start, end }) => {
        const response = await get<{ dailyWeightSummaries?: RawWeightSummary[] } | null>(`/weight-service/weight/range/${start}/${end}`, { includeAll: true }, end);
        return response?.dailyWeightSummaries ?? [];
      }),

    fitnessAge: () => get<RawFitnessAge | null>(`/fitnessage-service/fitnessage/v2/${today}`),

    heartRateZones: () => get<RawHeartRateZones[] | null>("/biometric-service/heartRateZones/v2"),
  };
}
