export type SessionKind = "easy" | "long" | "tempo" | "interval" | "race" | "run";

export const sessionKinds: Record<SessionKind, { label: string; color: string }> = {
  easy: { label: "Easy", color: "var(--easy)" },
  long: { label: "Long", color: "var(--long)" },
  tempo: { label: "Tempo", color: "var(--tempo)" },
  interval: { label: "Intervals", color: "var(--interval)" },
  race: { label: "Race", color: "var(--race)" },
  run: { label: "Run", color: "var(--muted)" },
};

// First match wins, so a hilly long run stays long
const nameRules: Array<[pattern: RegExp, kind: SessionKind]> = [
  [/long run/i, "long"],
  [/interval|repeats|hill/i, "interval"],
  [/tempo|threshold/i, "tempo"],
  [/easy|recovery/i, "easy"],
  [/marathon|maraton|løpet|\brace\b/i, "race"],
];

// Garmin's own label, used when the name says nothing
const labelKinds: Record<string, SessionKind> = {
  RECOVERY: "easy",
  AEROBIC_BASE: "easy",
  TEMPO: "tempo",
  LACTATE_THRESHOLD: "tempo",
  VO2MAX: "interval",
  ANAEROBIC_CAPACITY: "interval",
  SPEED: "interval",
};

export function toSessionKind(name: string, trainingLabel?: string | null, eventType?: string | null): SessionKind {
  if (eventType === "race") return "race";
  return nameRules.find(([pattern]) => pattern.test(name))?.[1] ?? labelKinds[trainingLabel ?? ""] ?? "run";
}

const planPrefix = /^(?:.*? - )?W\d+ \w{3} /;

// Training plans add a place, a week number and brackets that Garmin cuts short
export const sessionName = (name: string) => (planPrefix.test(name) ? name.replace(planPrefix, "").replace(/\s*\([^)]*\)?$/, "") : name);
