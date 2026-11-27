import assert from "node:assert/strict";
import { test } from "node:test";
import { chartStretchM, toRoutePath, toRunDetail, toStretches } from "../src/lib/data/runDetail.ts";

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
