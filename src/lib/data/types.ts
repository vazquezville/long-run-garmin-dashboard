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

export interface Day {
  date: string;
  isToday: boolean;
  steps: number | null;
  stepGoal: number | null;
  distanceKm: number | null;
  activeKcal: number | null;
  restingHr: number | null;
  moderateMin: number | null;
  vigorousMin: number | null;
  stress: number | null;
  batteryHigh: number | null;
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
}

export interface Vo2Reading {
  date: string;
  value: number;
}

export interface WeightReading {
  date: string;
  kg: number;
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
