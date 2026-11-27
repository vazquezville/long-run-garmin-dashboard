import type { Sport } from "./data/types.ts";

// Fixed order, so sports are always listed the same way
export const sportOrder: Sport[] = ["run", "walk", "strength", "ride", "swim", "other"];

export const sportLabels: Record<Sport, string> = {
  run: "Running",
  walk: "Walking",
  strength: "Strength",
  ride: "Cycling",
  swim: "Swimming",
  other: "Other",
};
