import type { Sport } from "./data/types.ts";

// Fixed order and color so a sport never changes color between views
export const sportOrder: Sport[] = ["run", "walk", "strength", "ride", "swim", "other"];

export const sports: Record<Sport, { label: string; color: string }> = {
  run: { label: "Running", color: "var(--run)" },
  walk: { label: "Walking", color: "var(--walk)" },
  strength: { label: "Strength", color: "var(--strength)" },
  ride: { label: "Cycling", color: "var(--ride)" },
  swim: { label: "Swimming", color: "var(--swim)" },
  other: { label: "Other", color: "var(--other)" },
};
