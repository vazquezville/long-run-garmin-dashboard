const missing = "–";

export function formatNumber(value: number | null, digits = 0): string {
  if (value == null) return missing;
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Pluralizes regular nouns, such as 2 activities or 3 days
export const formatCount = (count: number, noun: string) => `${formatNumber(count)} ${count === 1 ? noun : `${noun.replace(/([^aeiou])y$/, "$1ie")}s`}`;

export function formatCompact(value: number): string {
  return value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

// Hours and minutes, such as 1h 07m
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return missing;
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`;
}

// Race clock, such as 22:29 or 1:45:03
export function formatClock(seconds: number | null): string {
  if (seconds == null) return missing;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

function formatDateWith(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...options });
}

export const formatDay = (date: string) => formatDateWith(date, { month: "short", day: "numeric" });
export const formatWeekday = (date: string) => formatDateWith(date, { weekday: "short", month: "short", day: "numeric" });
export const formatFullDate = (date: string) => formatDateWith(date, { month: "short", day: "numeric", year: "numeric" });
export const formatFullWeekday = (date: string) => formatDateWith(date, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
export const formatWeekdayName = (date: string) => formatDateWith(date, { weekday: "short" });
export const formatMonth = (date: string) => `${formatDateWith(date, { month: "short" })} ’${date.slice(2, 4)}`;

export const formatMonthName = (month: string) => formatDateWith(`${month}-01`, { month: "short" });
export const formatMonthLong = (month: string) => formatDateWith(`${month}-01`, { month: "long" });
export const formatMonthTitle = (month: string) => formatDateWith(`${month}-01`, { month: "long", year: "numeric" });

// Turns API constants like VERY_GOOD into Very good
export function formatLabel(constant: string): string {
  const words = constant.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
