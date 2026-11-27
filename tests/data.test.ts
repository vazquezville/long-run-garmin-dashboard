import assert from "node:assert/strict";
import { test } from "node:test";
import { average, bestEffort, bucketByDate, overallPace, weekStart } from "../src/lib/data/aggregate.ts";
import { toActivities, toDays, toNights, toSport, toWeights } from "../src/lib/data/normalize.ts";

const range = { start: "2026-11-23", end: "2026-11-26" };
const run = (activityId: number, day: string, distance: number, duration: number) => ({
  activityId,
  startTimeLocal: `${day} 18:00:00`,
  activityType: { typeKey: "running" },
  distance,
  duration,
  movingDuration: duration,
  averageSpeed: distance / duration,
  fastestSplit_1000: duration / (distance / 1000),
});

test("toSport groups Garmin type keys", () => {
  assert.equal(toSport("trail_running"), "run");
  assert.equal(toSport("hiking"), "walk");
  assert.equal(toSport("strength_training"), "strength");
  assert.equal(toSport("virtual_ride"), "ride");
  assert.equal(toSport("yoga"), "other");
});

test("toActivities converts units, removes duplicates and filters the range", () => {
  const raw = [run(1, "2026-11-24", 10000, 3000), run(1, "2026-11-24", 10000, 3000), run(2, "2026-11-01", 5000, 1500)];
  const [activity, ...rest] = toActivities(raw, range);
  assert.equal(rest.length, 0);
  assert.equal(activity!.distanceKm, 10);
  assert.equal(activity!.paceSecPerKm, 300);
  assert.equal(activity!.time, "18:00");
});

test("toDays keeps days without watch data empty instead of zero", () => {
  const raw = [
    { calendarDate: "2026-11-23", movement: { steps: { value: 8000, goal: 10000, distanceInMeters: 6000 } } },
    { calendarDate: "2026-11-24", includesWellnessData: false, movement: { steps: { value: 0 } } },
  ];
  const days = toDays(raw, range, "2026-11-26");
  assert.equal(days.length, 4);
  assert.equal(days[0]!.distanceKm, 6);
  assert.equal(days[1]!.steps, null);
  assert.equal(days[2]!.steps, null);
  assert.equal(days[3]!.isToday, true);
});

test("toNights skips placeholder nights", () => {
  const raw = [
    { calendarDate: null, sleepTimeSeconds: null },
    { calendarDate: "2026-11-25", sleepTimeSeconds: 3600, sleepStartTimestampLocal: Date.UTC(2026, 10, 24, 23, 30) },
  ];
  const nights = toNights(raw, range);
  assert.equal(nights.length, 1);
  assert.equal(nights[0]!.bedtime, "23:30");
});

test("toWeights converts grams and sorts by date", () => {
  const raw = [
    { summaryDate: "2026-11-25", latestWeight: { weight: 77600 } },
    { summaryDate: "2026-11-23", latestWeight: { weight: 78100 } },
  ];
  assert.deepEqual(
    toWeights(raw, range).map((reading) => reading.kg),
    [78.1, 77.6],
  );
});

test("average ignores missing values", () => {
  assert.equal(average([10, null, 20]), 15);
  assert.equal(average([null]), null);
});

test("weeks start on Monday and partial weeks are flagged", () => {
  assert.equal(weekStart("2026-11-29"), "2026-11-23");
  const buckets = bucketByDate([{ date: "2026-11-24" }], { start: "2026-11-19", end: "2026-11-29" }, "week");
  assert.deepEqual(
    buckets.map((bucket) => [bucket.start, bucket.isPartial, bucket.items.length]),
    [
      ["2026-11-16", true, 0],
      ["2026-11-23", false, 1],
    ],
  );
});

test("pace is weighted by distance and best efforts pick the fastest run", () => {
  const activities = toActivities([run(1, "2026-11-23", 1000, 240), run(2, "2026-11-24", 9000, 2970)], range);
  assert.equal(overallPace(activities), 321);
  assert.deepEqual(bestEffort(activities, "km1"), { seconds: 240, date: "2026-11-23" });
});
