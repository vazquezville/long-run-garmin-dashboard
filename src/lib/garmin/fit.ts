import { unzipSync } from "fflate";
import FitParser from "fit-file-parser";
import type { RawLap } from "./rawTypes.ts";

// Reads the laps of the recording inside the downloaded archive
export async function readLaps(archive: Uint8Array): Promise<RawLap[]> {
  const recording = Object.entries(unzipSync(archive)).find(([name]) => name.toLowerCase().endsWith(".fit"))?.[1];
  // Manual uploads may carry another format, which has no laps to read
  if (!recording) return [];
  const parsed = await new FitParser({ force: true }).parseAsync(recording.slice().buffer as ArrayBuffer);
  return (parsed.laps ?? []).map(({ intensity, total_distance, total_timer_time, avg_heart_rate }) => ({
    intensity,
    total_distance,
    total_timer_time,
    avg_heart_rate,
  }));
}
