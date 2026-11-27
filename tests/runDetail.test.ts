import assert from "node:assert/strict";
import { test } from "node:test";
import { chartStretchM, hasOwnLaps, toLaps, toRoutePath, toRunDetail, toStretches } from "../src/lib/data/runDetail.ts";

const keys = ["sumDistance", "sumDuration", "directHeartRate", "directElevation", "directDoubleCadence", "directStrideLength"];
const metrics = (rows: Array<Array<number | null>>) => ({
  metricDescriptors: keys.map((key, metricsIndex) => ({ key, metricsIndex })),
  activityDetailMetrics: rows.map((row) => ({ metrics: row })),
});
const rows = [
  [0, 0, 100, 10, 0, 0],
  [800, 240, 130, 18, 170, 100],
  [1200, 360, 150, 14, 180, 120],
  [2000, 640, 160, 20, 180, 120],
  [2500, 790, 170, 20, 180, 120],
];

test("toRunDetail reads samples by metric name and cleans them", () => {
  const { samples } = toRunDetail(null, metrics(rows));
  assert.equal(samples.length, 5);
  assert.equal(samples[0]!.form.cadence, null);
  assert.equal(samples[1]!.form.strideM, 1);
  assert.equal(samples[1]!.form.powerW, null);
});

test("toRunDetail keeps blocks only when the workout has several", () => {
  const block = (splitType: string) => ({ splitType, noOfSplits: 2, distance: 800, duration: 200 });
  assert.deepEqual(toRunDetail({ splitSummaries: [block("INTERVAL_ACTIVE"), block("RWD_RUN")] }, null).blocks, []);
  assert.deepEqual(
    toRunDetail({ splitSummaries: [block("INTERVAL_COOLDOWN"), block("INTERVAL_WARMUP")] }, null).blocks.map((item) => item.label),
    ["Warm up", "Cool down"],
  );
});

test("toStretches interpolates times at each boundary and keeps the last part", () => {
  const stretches = toStretches(toRunDetail(null, metrics(rows)).samples, 1000);
  assert.deepEqual(
    stretches.map((stretch) => [stretch.endM, stretch.seconds, stretch.paceSecPerKm, stretch.climbM]),
    [
      [1000, 300, 300, 6],
      [2000, 340, 340, 4],
      [2500, 150, 300, 0],
    ],
  );
  assert.equal(stretches[0]!.hr, 130);
});

test("chart stretches grow with the distance", () => {
  assert.equal(chartStretchM(11_000), 100);
  assert.equal(chartStretchM(24_000), 200);
  assert.equal(chartStretchM(42_500), 500);
});

test("toRoutePath keeps proportions and needs at least two points", () => {
  assert.equal(toRoutePath([[0, 0]]), null);
  const route = toRoutePath([[0, 0], [0, 2], [1, 2]], 100)!;
  assert.equal(route.path, "M0 50L100 50L100 0");
  assert.deepEqual([route.width, route.height], [100, 50]);
});

const lap = (intensity: string, total_distance: number, total_timer_time = 100) => ({ intensity, total_distance, total_timer_time, avg_heart_rate: 140 });

test("toLaps names the steps of a workout and leaves plain laps unnamed", () => {
  const workout = toLaps([lap("warmup", 1000, 300), lap("active", 400), lap("rest", 0)]);
  assert.deepEqual(
    workout.map((item) => [item.label, item.isWork, item.paceSecPerKm]),
    [
      ["Warm up", false, 300],
      ["Work", true, 250],
      ["Rest", false, null],
    ],
  );
  assert.deepEqual(
    toLaps([lap("active", 500), lap("active", 500)]).map((item) => item.label),
    ["Lap", "Lap"],
  );
});

test("hasOwnLaps skips laps that only repeat the kilometer splits", () => {
  const has = (...laps: Array<ReturnType<typeof lap>>) => hasOwnLaps(toLaps(laps));
  assert.equal(has(lap("active", 1000), lap("active", 1002), lap("active", 340)), false);
  assert.equal(has(lap("active", 5000)), false);
  assert.equal(has(lap("active", 800), lap("active", 800)), true);
  assert.equal(has(lap("warmup", 1000), lap("active", 1000)), true);
});
