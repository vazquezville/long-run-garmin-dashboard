# Long Run

Personal running dashboard for Garmin Connect data, built with Astro.

## Setup

1. Create a Personal API key at <https://connect.garmin.com/app/settings/personalApiToken>.
2. Add it to `.env` as `GARMIN_API_KEY=your-key`.
3. Run `pnpm install`.
4. Run `pnpm build`, then `pnpm start`, and open <http://localhost:4321>.

While working on the code, use `pnpm dev` instead of step 4.

## Pages

| Page | Content |
| --- | --- |
| Training | Running by week, month, year, last X days or all time |
| Runs | Every run, filtered by type, year, distance and name, sorted by date, distance, pace or load |
| Run | One run from the list: route, splits, charts along the distance, running form and heart rate zones |
| Activities, Daily, Sleep | The last 7, 28 or 90 days |
| Month | Any month with activities, as a calendar with its charts |
| Year | Any year with activities, with a day by day map and monthly totals |
| Fitness | Long term fitness and body trends |

The address keeps the Training period, such as `/?week=2026-11-23`, `/?month=2026-04`, `/?year=2026`, `/?days=45` or `/?all`.

Session types come from the activity name (long run, intervals, tempo, easy, race) and otherwise from Garmin's training label.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local server that reloads when the code changes |
| `pnpm astro dev stop` | Stops the server when it runs in the background |
| `pnpm build` | Builds the server into `dist/` |
| `pnpm start` | Runs the built server, from the project folder |
| `pnpm probe` | Calls every endpoint and prints the shape of each response |
| `pnpm refresh` | Deletes the local cache |
| `pnpm test` | Unit tests |
| `pnpm check` | Type checking |

## Data

- The key is only read on the server and never reaches the browser.
- Pages are built on each visit, so `dist/` holds code only.
- Data is cached in `.cache/`: 30 minutes for the last week, 7 days up to three months old and 30 days beyond.
- The full activity history refreshes once a day, and the last 90 days follow the rules above.
- The first visit to an older period takes longer while it downloads.
- Opening a run downloads its samples and GPS route, about 1 MB, and caches them like the rest.
- Routes are drawn from the GPS points alone, with no map service.
- Sleep, heart rate, steps and stress appear on Training for periods of up to a year.
- `.cache/` contains your health data. Do not publish it.
- The server has no login. Keep it on your own machine.
