import assert from "node:assert/strict";
import { test } from "node:test";
import { formatClock, formatCount, formatDuration, formatNumber } from "../src/lib/format.ts";

test("formatCount pluralizes regular nouns", () => {
  assert.equal(formatCount(1, "run"), "1 run");
  assert.equal(formatCount(0, "day"), "0 days");
  assert.equal(formatCount(2, "activity"), "2 activities");
});

test("durations and clocks pad their parts", () => {
  assert.equal(formatDuration(4020), "1h 07m");
  assert.equal(formatDuration(540), "9m");
  assert.equal(formatClock(288), "4:48");
  assert.equal(formatClock(6184), "1:43:04");
});

test("missing values show a dash", () => {
  assert.equal(formatNumber(null), "–");
});
