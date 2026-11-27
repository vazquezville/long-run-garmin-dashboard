import type { RawActivityDetail, RawActivityMetrics, RawLap } from "../garmin/rawTypes.ts";
import { average } from "./aggregate.ts";
import { positive, toCadence } from "./normalize.ts";
import type { Activity } from "./types.ts";

export interface RunSample {
  distanceM: number;
  // Timer time, which leaves pauses out
  seconds: number;
  hr: number | null;
  elevation: number | null;
  form: Activity["form"];
}

export interface RunBlock {
  label: string;
  count: number;
  distanceKm: number;
  seconds: number;
}

export interface RunDetail {
  maxHr: number | null;
  elevationLoss: number | null;
  aerobicEffect: number | null;
  anaerobicEffect: number | null;
  gradePaceSecPerKm: number | null;
  samples: RunSample[];
  route: Array<[lat: number, lon: number]>;
  blocks: RunBlock[];
}

export interface Stretch {
  startM: number;
  endM: number;
  seconds: number;
  paceSecPerKm: number | null;
  hr: number | null;
  elevation: number | null;
  // Height difference between both ends
  climbM: number | null;
  form: Activity["form"];
}

const blockLabels: Array<[type: string, label: string]> = [
  ["INTERVAL_WARMUP", "Warm up"],
  ["INTERVAL_ACTIVE", "Work"],
  ["INTERVAL_RECOVERY", "Recovery"],
  ["INTERVAL_REST", "Rest"],
  ["INTERVAL_COOLDOWN", "Cool down"],
];

export function toRunDetail(summary: RawActivityDetail | null, metrics: RawActivityMetrics | null): RunDetail {
  const columns = new Map(metrics?.metricDescriptors?.map((descriptor) => [descriptor.key, descriptor.metricsIndex]));
  const samples = (metrics?.activityDetailMetrics ?? []).flatMap(({ metrics: row }): RunSample[] => {
    const read = (key: string) => row[columns.get(key) ?? -1] ?? null;
    const distanceM = read("sumDistance");
    const seconds = read("sumDuration");
    if (distanceM == null || seconds == null) return [];
    const stride = positive(read("directStrideLength"));
    return [
      {
        distanceM,
        seconds,
        hr: positive(read("directHeartRate")),
        elevation: read("directElevation"),
        form: {
          cadence: toCadence(read("directDoubleCadence")),
          strideM: stride && stride / 100,
          groundContactMs: positive(read("directGroundContactTime")),
          oscillationCm: positive(read("directVerticalOscillation")),
          verticalRatio: positive(read("directVerticalRatio")),
          powerW: positive(read("directPower")),
        },
      },
    ];
  });
  const totals = summary?.summaryDTO;
  const gradeSpeed = positive(totals?.avgGradeAdjustedSpeed);
  const blocks = blockLabels.flatMap(([type, label]): RunBlock[] => {
    const found = summary?.splitSummaries?.find((block) => block.splitType === type);
    return found ? [{ label, count: found.noOfSplits ?? 1, distanceKm: (found.distance ?? 0) / 1000, seconds: found.duration ?? 0 }] : [];
  });
  return {
    maxHr: positive(totals?.maxHR),
    elevationLoss: totals?.elevationLoss ?? null,
    aerobicEffect: totals?.trainingEffect ?? null,
    anaerobicEffect: totals?.anaerobicTrainingEffect ?? null,
    gradePaceSecPerKm: gradeSpeed && 1000 / gradeSpeed,
    samples,
    route: (metrics?.geoPolylineDTO?.polyline ?? []).flatMap((point): Array<[number, number]> =>
      point.valid !== false && point.lat != null && point.lon != null ? [[point.lat, point.lon]] : [],
    ),
    // A single block repeats the whole run, so it says nothing
    blocks: blocks.length > 1 ? blocks : [],
  };
}

export interface Lap {
  label: string;
  // Counts towards the fastest lap, unlike warm ups and recoveries
  isWork: boolean;
  distanceM: number;
  seconds: number;
  paceSecPerKm: number | null;
  hr: number | null;
}

const lapLabels: Record<string, string> = { warmup: "Warm up", active: "Work", interval: "Work", rest: "Rest", recovery: "Recovery", cooldown: "Cool down" };

export function toLaps(raw: RawLap[]): Lap[] {
  const kinds = raw.map((lap) => lapLabels[String(lap.intensity)] ?? "Lap");
  // Without a structured workout every lap is just a lap
  const isStructured = new Set(kinds).size > 1;
  return raw.map((lap, index) => {
    const distanceM = lap.total_distance ?? 0;
    const seconds = lap.total_timer_time ?? 0;
    const kind = kinds[index]!;
    return {
      label: isStructured ? kind : "Lap",
      isWork: !isStructured || kind === "Work",
      distanceM,
      seconds,
      paceSecPerKm: distanceM > 0 && seconds > 0 ? seconds / (distanceM / 1000) : null,
      hr: positive(lap.avg_heart_rate),
    };
  });
}

// Automatic kilometer laps repeat the splits, and a single lap repeats the run
export function hasOwnLaps(laps: Lap[]): boolean {
  if (laps.length < 2) return false;
  const isKilometer = (lap: Lap) => Math.abs(lap.distanceM - 1000) < 20;
  return laps.some((lap) => lap.label !== "Lap") || !laps.slice(0, -1).every(isKilometer);
}

// Value at an exact distance, interpolated between the two nearest samples
function at(samples: RunSample[], distanceM: number, read: (sample: RunSample) => number | null): number | null {
  const index = samples.findIndex((sample) => sample.distanceM >= distanceM);
  const after = samples[index] ?? samples.at(-1);
  const before = samples[index - 1] ?? after;
  if (!before || !after) return null;
  const low = read(before);
  const high = read(after);
  if (low == null || high == null) return high ?? low;
  const span = after.distanceM - before.distanceM;
  return span > 0 ? low + ((high - low) * (distanceM - before.distanceM)) / span : high;
}

// Cuts the run into stretches of equal length, the last one may be shorter
export function toStretches(samples: RunSample[], lengthM: number, shortestM = 50): Stretch[] {
  const total = samples.at(-1)?.distanceM ?? 0;
  const stretches: Stretch[] = [];
  for (let startM = 0; total - startM >= shortestM; startM += lengthM) {
    const endM = Math.min(startM + lengthM, total);
    const inside = samples.filter((sample) => sample.distanceM > startM && sample.distanceM <= endM);
    const seconds = at(samples, endM, (sample) => sample.seconds)! - (startM === 0 ? 0 : at(samples, startM, (sample) => sample.seconds)!);
    const from = at(samples, startM, (sample) => sample.elevation);
    const to = at(samples, endM, (sample) => sample.elevation);
    const mean = (metric: keyof Activity["form"]) => average(inside.map((sample) => sample.form[metric]));
    stretches.push({
      startM,
      endM,
      seconds,
      paceSecPerKm: seconds > 0 ? seconds / ((endM - startM) / 1000) : null,
      hr: average(inside.map((sample) => sample.hr)),
      elevation: average(inside.map((sample) => sample.elevation)),
      climbM: from == null || to == null ? null : to - from,
      form: {
        cadence: mean("cadence"),
        strideM: mean("strideM"),
        groundContactMs: mean("groundContactMs"),
        oscillationCm: mean("oscillationCm"),
        verticalRatio: mean("verticalRatio"),
        powerW: mean("powerW"),
      },
    });
  }
  return stretches;
}

// Shortest round length that keeps a chart within the point limit
export function chartStretchM(totalM: number, maxPoints = 150): number {
  return [100, 200, 250, 500].find((length) => totalM / length <= maxPoints) ?? 1000;
}

// Draws the route to scale, as an SVG path inside a square of the given size
export function toRoutePath(route: RunDetail["route"], size = 1000) {
  if (route.length < 2) return null;
  const shrink = Math.cos((route[0]![0] * Math.PI) / 180);
  const points = route.map(([lat, lon]) => [lon * shrink, -lat] as const);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const spanX = Math.max(...xs) - left;
  const spanY = Math.max(...ys) - top;
  const scale = size / (Math.max(spanX, spanY) || 1);
  const placed = points.map(([x, y]) => [Number(((x - left) * scale).toFixed(1)), Number(((y - top) * scale).toFixed(1))] as const);
  return {
    path: placed.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(""),
    width: spanX * scale,
    height: spanY * scale,
    start: placed[0]!,
    end: placed.at(-1)!,
  };
}
