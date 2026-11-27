import { listDays, type DateRange } from "../garmin/ranges.ts";
import type { RawActivity, RawDailySummary, RawFitnessAge, RawHeartRateZones, RawHrv, RawNight, RawVo2Max, RawWeightSummary } from "../garmin/rawTypes.ts";
import { toSessionKind } from "../sessionKind.ts";
import type { Activity, Day, FitnessAge, FitnessFactor, HeartRateZone, HrvReading, Night, Sport, Vo2Reading, WeightReading } from "./types.ts";

const byDate = (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date);
const isInRange = (date: string, { start, end }: DateRange) => date >= start && date <= end;

// Zero and negative values mean "no reading" for vitals
const positive = (value: number | null | undefined): number | null => (value != null && value > 0 ? value : null);

// Lower cadences come from sensor dropouts, not from running
const minCadence = 100;
const toCadence = (value: number | null | undefined): number | null => (value != null && value >= minCadence ? value : null);

const sportRules: Array<[pattern: RegExp, sport: Sport]> = [
  [/running/, "run"],
  [/walking|hiking/, "walk"],
  [/strength|fitness_equipment/, "strength"],
  [/cycling|biking|ride/, "ride"],
  [/swimming/, "swim"],
];

export function toSport(typeKey: string): Sport {
  return sportRules.find(([pattern]) => pattern.test(typeKey))?.[1] ?? "other";
}

export function toActivities(raw: RawActivity[], range: DateRange): Activity[] {
  const unique = new Map(raw.map((item) => [item.activityId, item]));
  return [...unique.values()]
    .map((item): Activity => {
      const speed = positive(item.averageSpeed);
      const stride = positive(item.avgStrideLength);
      return {
        id: item.activityId,
        name: item.activityName ?? "Activity",
        date: item.startTimeLocal.slice(0, 10),
        time: item.startTimeLocal.slice(11, 16),
        sport: toSport(item.activityType?.typeKey ?? ""),
        kind: toSessionKind(item.activityName ?? "", item.trainingEffectLabel, item.eventType?.typeKey),
        distanceKm: (item.distance ?? 0) / 1000,
        durationSec: item.duration ?? 0,
        movingSec: item.movingDuration ?? item.duration ?? 0,
        speedKmh: speed && speed * 3.6,
        paceSecPerKm: speed && 1000 / speed,
        elevationGain: item.elevationGain ?? null,
        calories: item.calories ?? null,
        avgHr: positive(item.averageHR),
        trainingLoad: item.activityTrainingLoad ?? null,
        zoneSec: [item.hrTimeInZone_1, item.hrTimeInZone_2, item.hrTimeInZone_3, item.hrTimeInZone_4, item.hrTimeInZone_5].map((seconds) => seconds ?? 0),
        fastest: {
          km1: positive(item.fastestSplit_1000),
          km5: positive(item.fastestSplit_5000),
          km10: positive(item.fastestSplit_10000),
          half: positive(item.fastestSplit_21098),
          marathon: positive(item.fastestSplit_42195),
        },
        form: {
          cadence: toCadence(item.averageRunningCadenceInStepsPerMinute),
          strideM: stride && stride / 100,
          groundContactMs: positive(item.avgGroundContactTime),
          oscillationCm: positive(item.avgVerticalOscillation),
          verticalRatio: positive(item.avgVerticalRatio),
          powerW: positive(item.avgPower),
        },
      };
    })
    .filter((activity) => isInRange(activity.date, range))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

// Returns one entry per calendar day, with nulls where the watch recorded nothing
export function toDays(raw: RawDailySummary[], range: DateRange, today: string): Day[] {
  const summaries = new Map(raw.map((item) => [item.calendarDate, item]));
  return listDays(range).map((date): Day => {
    const found = summaries.get(date);
    const item = found?.includesWellnessData === false ? undefined : found;
    const steps = item?.movement?.steps;
    const meters = steps?.distanceInMeters;
    return {
      date,
      isToday: date === today,
      steps: steps?.value ?? null,
      stepGoal: positive(steps?.goal),
      distanceKm: meters != null ? meters / 1000 : null,
      restingKcal: positive(item?.calories?.burnedResting),
      activeKcal: item?.calories?.burnedActive ?? null,
      restingHr: positive(item?.heartRate?.restingValue),
      minHr: positive(item?.heartRate?.minValue),
      maxHr: positive(item?.heartRate?.maxValue),
      moderateMin: item?.intensityMinutes?.moderate ?? null,
      vigorousMin: item?.intensityMinutes?.vigorous ?? null,
      intensityGoal: positive(item?.intensityMinutes?.goal),
      stress: positive(item?.stress?.avgLevel),
      batteryLow: positive(item?.bodyBattery?.minValue),
      batteryHigh: positive(item?.bodyBattery?.maxValue),
      batteryCharged: item?.bodyBattery?.chargedValue ?? null,
      batteryDrained: item?.bodyBattery?.drainedValue ?? null,
    };
  });
}

// Garmin encodes local time as if it were UTC
const toClock = (timestamp: number | null | undefined) => (timestamp != null ? new Date(timestamp).toISOString().slice(11, 16) : null);

export function toNights(raw: RawNight[], range: DateRange): Night[] {
  return raw
    .flatMap((item): Night[] => {
      const date = item.calendarDate;
      const totalSec = positive(item.sleepTimeSeconds);
      if (!date || !totalSec || !isInRange(date, range)) return [];
      return [
        {
          date,
          totalSec,
          deepSec: item.deepSleepSeconds ?? 0,
          lightSec: item.lightSleepSeconds ?? 0,
          remSec: item.remSleepSeconds ?? 0,
          awakeSec: item.awakeSleepSeconds ?? 0,
          score: positive(item.sleepScores?.overall?.value),
          scoreLabel: item.sleepScores?.overall?.qualifierKey ?? null,
          bedtime: toClock(item.sleepStartTimestampLocal),
          wakeTime: toClock(item.sleepEndTimestampLocal),
          avgHr: positive(item.avgHeartRate),
          avgStress: item.avgSleepStress ?? null,
        },
      ];
    })
    .sort(byDate);
}

export function toHrv(raw: NonNullable<RawHrv["hrvSummaries"]>, range: DateRange): HrvReading[] {
  return raw
    .flatMap((item): HrvReading[] => {
      const value = positive(item.lastNightAvg);
      if (!value || !isInRange(item.calendarDate, range)) return [];
      return [
        {
          date: item.calendarDate,
          value,
          balancedLow: item.baseline?.balancedLow ?? null,
          balancedHigh: item.baseline?.balancedUpper ?? null,
          status: item.status ?? null,
        },
      ];
    })
    .sort(byDate);
}

export function toVo2(raw: RawVo2Max[], range: DateRange): Vo2Reading[] {
  return raw
    .flatMap((item): Vo2Reading[] => {
      const date = item.generic?.calendarDate;
      const value = positive(item.generic?.vo2MaxPreciseValue);
      return date && value && isInRange(date, range) ? [{ date, value }] : [];
    })
    .sort(byDate);
}

export function toWeights(raw: RawWeightSummary[], range: DateRange): WeightReading[] {
  return raw
    .flatMap((item): WeightReading[] => {
      const grams = positive(item.latestWeight?.weight);
      if (!grams || !isInRange(item.summaryDate, range)) return [];
      return [{ date: item.summaryDate, kg: grams / 1000, bmi: positive(item.latestWeight?.bmi), bodyFat: positive(item.latestWeight?.bodyFat) }];
    })
    .sort(byDate);
}

export function toFitnessAge(raw: RawFitnessAge | null): FitnessAge | null {
  if (!raw?.chronologicalAge || !raw.fitnessAge) return null;
  const factor = (item: { value?: number | null; targetValue?: number | null } | undefined): FitnessFactor => ({
    value: item?.value ?? null,
    target: item?.targetValue ?? null,
  });
  return {
    age: raw.chronologicalAge,
    fitnessAge: raw.fitnessAge,
    achievableAge: raw.achievableFitnessAge ?? null,
    bmi: factor(raw.components?.bmi),
    restingHr: factor(raw.components?.rhr),
    vigorousDays: factor(raw.components?.vigorousDaysAvg),
    vigorousMinutes: factor(raw.components?.vigorousMinutesAvg),
  };
}

export function toHeartRateZones(raw: RawHeartRateZones[] | null): HeartRateZone[] {
  const profile = raw?.find((item) => item.sport === "DEFAULT") ?? raw?.[0];
  if (!profile) return [];
  const floors = [profile.zone1Floor, profile.zone2Floor, profile.zone3Floor, profile.zone4Floor, profile.zone5Floor];
  return floors.flatMap((from, index): HeartRateZone[] => {
    if (!from) return [];
    const next = floors[index + 1];
    return [{ zone: index + 1, from, to: next ? next - 1 : (profile.maxHeartRateUsed ?? null) }];
  });
}
