import type { SessionKind } from "../sessionKind.ts";

export type Sport = "run" | "walk" | "strength" | "ride" | "swim" | "other";

export interface Activity {
  id: number;
  name: string;
  date: string;
  time: string;
  sport: Sport;
  // Type of running session, meaningful for runs only
  kind: SessionKind;
  distanceKm: number;
  durationSec: number;
  movingSec: number;
  speedKmh: number | null;
  paceSecPerKm: number | null;
  elevationGain: number | null;
  calories: number | null;
  avgHr: number | null;
  trainingLoad: number | null;
  zoneSec: number[];
  fastest: { km1: number | null; km5: number | null; km10: number | null; half: number | null; marathon: number | null };
  form: {
    cadence: number | null;
    strideM: number | null;
    groundContactMs: number | null;
    oscillationCm: number | null;
    verticalRatio: number | null;
    powerW: number | null;
  };
}

export interface ActivityBucket {
  label: string;
  title: string;
  isPartial: boolean;
  items: Activity[];
}

export interface Day {
  date: string;
  isToday: boolean;
  steps: number | null;
  stepGoal: number | null;
  distanceKm: number | null;
  restingKcal: number | null;
  activeKcal: number | null;
  restingHr: number | null;
  minHr: number | null;
  maxHr: number | null;
  moderateMin: number | null;
  vigorousMin: number | null;
  intensityGoal: number | null;
  stress: number | null;
  batteryLow: number | null;
  batteryHigh: number | null;
  batteryCharged: number | null;
  batteryDrained: number | null;
}

export interface Night {
  date: string;
  totalSec: number;
  deepSec: number;
  lightSec: number;
  remSec: number;
  awakeSec: number;
  score: number | null;
  scoreLabel: string | null;
  bedtime: string | null;
  wakeTime: string | null;
  avgHr: number | null;
  avgStress: number | null;
}

export interface HrvReading {
  date: string;
  value: number;
  balancedLow: number | null;
  balancedHigh: number | null;
  status: string | null;
}

export interface Vo2Reading {
  date: string;
  value: number;
}

export interface WeightReading {
  date: string;
  kg: number;
  bmi: number | null;
  bodyFat: number | null;
}

export interface FitnessFactor {
  value: number | null;
  target: number | null;
}

export interface FitnessAge {
  age: number;
  fitnessAge: number;
  achievableAge: number | null;
  bmi: FitnessFactor;
  restingHr: FitnessFactor;
  vigorousDays: FitnessFactor;
  vigorousMinutes: FitnessFactor;
}

export interface HeartRateZone {
  zone: number;
  from: number;
  to: number | null;
}
