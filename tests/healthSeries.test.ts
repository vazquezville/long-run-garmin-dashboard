import assert from "node:assert/strict";
import { test } from "node:test";
import { toTrend } from "../src/lib/healthSeries.ts";
import { calendarPeriod, periodBuckets } from "../src/lib/trainingPeriod.ts";

const buckets = periodBuckets(calendarPeriod("week", "2026-11-27"), "2026-11-27");
const series = (items: Array<{ date: string; value: number | null }>, goal?: number) =>
  toTrend({ id: "steps", label: "Steps", unit: "steps", items, read: (item) => item.value, goal: goal ?? null }, buckets, "day");

test("toTrend averages recorded values only, per bucket and overall", () => {
  const metric = series([
    { date: "2026-11-23", value: 8000 },
    { date: "2026-11-24", value: null },
    { date: "2026-11-25", value: 12000 },
  ]);
  assert.equal(metric.value, "10,000");
  assert.deepEqual(metric.chart!.points.slice(0, 3).map((point) => point.value), [8000, null, 12000]);
  assert.equal(metric.chart!.reference, 10000);
});

test("toTrend prefers a goal for the dashed line and has no chart without data", () => {
  assert.equal(series([{ date: "2026-11-23", value: 8000 }], 9000).chart!.reference, 9000);
  assert.equal(series([]).chart, null);
  assert.equal(series([]).value, "–");
});
