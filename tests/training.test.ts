import assert from "node:assert/strict";
import { test } from "node:test";
import { toActivities } from "../src/lib/data/normalize.ts";
import { climbSummary, intensitySplit, loadComparison, weeklyRange, zoneTotals } from "../src/lib/training.ts";

const activity = (activityId: number, date: string, activityTrainingLoad: number, hrTimeInZone_2 = 0, hrTimeInZone_4 = 0) => ({
  activityId,
  startTimeLocal: `${date} 18:00:00`,
  activityType: { typeKey: "running" },
  activityTrainingLoad,
  hrTimeInZone_2,
  hrTimeInZone_4,
});
const activities = toActivities(
  [activity(1, "2026-11-27", 150, 600, 200), activity(2, "2026-11-21", 50, 200), activity(3, "2026-11-20", 100), activity(4, "2026-10-31", 100), activity(5, "2026-10-30", 999)],
  { start: "2026-01-01", end: "2026-12-31" },
);

test("loadComparison sets seven days against the weekly average of twenty eight", () => {
  assert.deepEqual(loadComparison(activities, "2026-11-27"), { recent: 200, average: 100, change: 1 });
  assert.equal(loadComparison(activities, "2026-06-01"), null);
});

test("intensitySplit groups the zones into three efforts", () => {
  const split = intensitySplit(zoneTotals(activities));
  assert.deepEqual(
    split.map((part) => [part.label, part.seconds, part.share]),
    [
      ["Easy", 800, 0.8],
      ["Moderate", 0, 0],
      ["Hard", 200, 0.2],
    ],
  );
  assert.deepEqual(intensitySplit([0, 0, 0, 0, 0]), []);
});

test("climbSummary adds up the climb and keeps the hilliest run", () => {
  const runs = toActivities(
    [
      { activityId: 1, startTimeLocal: "2026-11-27 18:00:00", distance: 10000, elevationGain: 80 },
      { activityId: 2, startTimeLocal: "2026-11-25 18:00:00", distance: 5000, elevationGain: 220 },
      // Left out of the average, since it has no elevation
      { activityId: 3, startTimeLocal: "2026-11-24 18:00:00", distance: 8000 },
    ],
    { start: "2026-01-01", end: "2026-12-31" },
  );
  const climb = climbSummary(runs);
  assert.deepEqual([climb?.total, climb?.perKm, climb?.top.id], [300, 20, 2]);
  assert.equal(climbSummary([]), null);
});

test("weeklyRange shows at least sixteen weeks and gives up past sixty", () => {
  const today = "2026-11-27";
  assert.deepEqual(weeklyRange({ start: "2026-11-23", end: "2026-11-29" }, today), { start: "2026-08-10", end: "2026-11-29" });
  assert.equal(weeklyRange({ start: "2026-01-01", end: "2026-12-31" }, today)?.start, "2025-12-29");
  assert.equal(weeklyRange({ start: "2021-03-20", end: today }, today), null);
});
