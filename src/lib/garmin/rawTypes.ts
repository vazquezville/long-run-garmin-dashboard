// Subset of the API responses that the dashboard reads
type Maybe<T> = T | null | undefined;

export interface RawActivity {
  activityId: number;
  activityName?: Maybe<string>;
  startTimeLocal: string;
  activityType?: Maybe<{ typeKey?: string }>;
  eventType?: Maybe<{ typeKey?: string }>;
  trainingEffectLabel?: Maybe<string>;
  distance?: Maybe<number>;
  duration?: Maybe<number>;
  movingDuration?: Maybe<number>;
  averageSpeed?: Maybe<number>;
  elevationGain?: Maybe<number>;
  calories?: Maybe<number>;
  averageHR?: Maybe<number>;
  activityTrainingLoad?: Maybe<number>;
  hrTimeInZone_1?: Maybe<number>;
  hrTimeInZone_2?: Maybe<number>;
  hrTimeInZone_3?: Maybe<number>;
  hrTimeInZone_4?: Maybe<number>;
  hrTimeInZone_5?: Maybe<number>;
  fastestSplit_1000?: Maybe<number>;
  fastestSplit_5000?: Maybe<number>;
  fastestSplit_10000?: Maybe<number>;
  fastestSplit_21098?: Maybe<number>;
  fastestSplit_42195?: Maybe<number>;
  averageRunningCadenceInStepsPerMinute?: Maybe<number>;
  avgStrideLength?: Maybe<number>;
  avgGroundContactTime?: Maybe<number>;
  avgVerticalOscillation?: Maybe<number>;
  avgVerticalRatio?: Maybe<number>;
  avgPower?: Maybe<number>;
}

export interface RawActivityDetail {
  summaryDTO?: Maybe<{
    maxHR?: Maybe<number>;
    elevationLoss?: Maybe<number>;
    trainingEffect?: Maybe<number>;
    anaerobicTrainingEffect?: Maybe<number>;
    avgGradeAdjustedSpeed?: Maybe<number>;
  }>;
  splitSummaries?: Maybe<Array<{ splitType?: string; noOfSplits?: number; distance?: number; duration?: number }>>;
}

// Time series of an activity, one row per sample
export interface RawActivityMetrics {
  metricDescriptors?: Maybe<Array<{ metricsIndex: number; key: string }>>;
  activityDetailMetrics?: Maybe<Array<{ metrics: Array<number | null> }>>;
  geoPolylineDTO?: Maybe<{ polyline?: Maybe<Array<{ lat?: Maybe<number>; lon?: Maybe<number>; valid?: Maybe<boolean> }>> }>;
}

export interface RawDailySummary {
  calendarDate: string;
  includesWellnessData?: Maybe<boolean>;
  movement?: Maybe<{ steps?: Maybe<{ goal?: Maybe<number>; value?: Maybe<number>; distanceInMeters?: Maybe<number> }> }>;
  calories?: Maybe<{ burnedActive?: Maybe<number> }>;
  heartRate?: Maybe<{ restingValue?: Maybe<number> }>;
  intensityMinutes?: Maybe<{ moderate?: Maybe<number>; vigorous?: Maybe<number> }>;
  stress?: Maybe<{ avgLevel?: Maybe<number> }>;
  bodyBattery?: Maybe<{ maxValue?: Maybe<number> }>;
}

export interface RawNight {
  calendarDate?: Maybe<string>;
  sleepTimeSeconds?: Maybe<number>;
  deepSleepSeconds?: Maybe<number>;
  lightSleepSeconds?: Maybe<number>;
  remSleepSeconds?: Maybe<number>;
  awakeSleepSeconds?: Maybe<number>;
  sleepStartTimestampLocal?: Maybe<number>;
  sleepEndTimestampLocal?: Maybe<number>;
  avgHeartRate?: Maybe<number>;
  avgSleepStress?: Maybe<number>;
  sleepScores?: Maybe<{ overall?: Maybe<{ value?: Maybe<number>; qualifierKey?: Maybe<string> }> }>;
}

export interface RawHrv {
  hrvSummaries?: Array<{ calendarDate: string; lastNightAvg?: Maybe<number> }>;
}

export interface RawVo2Max {
  generic?: Maybe<{ calendarDate?: Maybe<string>; vo2MaxPreciseValue?: Maybe<number> }>;
}

export interface RawWeightSummary {
  summaryDate: string;
  latestWeight?: Maybe<{ weight?: Maybe<number> }>;
}

interface RawComponent {
  value?: Maybe<number>;
  targetValue?: Maybe<number>;
}

export interface RawFitnessAge {
  chronologicalAge?: Maybe<number>;
  fitnessAge?: Maybe<number>;
  achievableFitnessAge?: Maybe<number>;
  components?: Maybe<{ bmi?: RawComponent; rhr?: RawComponent; vigorousDaysAvg?: RawComponent; vigorousMinutesAvg?: RawComponent }>;
}

export interface RawHeartRateZones {
  sport?: Maybe<string>;
  zone1Floor?: Maybe<number>;
  zone2Floor?: Maybe<number>;
  zone3Floor?: Maybe<number>;
  zone4Floor?: Maybe<number>;
  zone5Floor?: Maybe<number>;
  maxHeartRateUsed?: Maybe<number>;
}
