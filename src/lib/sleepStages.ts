// Stacking order, from the bottom of the chart up
export const sleepStages = [
  { key: "deepSec", label: "Deep", color: "var(--sleepDeep)" },
  { key: "lightSec", label: "Light", color: "var(--sleepLight)" },
  { key: "remSec", label: "REM", color: "var(--sleepRem)" },
  { key: "awakeSec", label: "Awake", color: "var(--sleepAwake)" },
] as const;
