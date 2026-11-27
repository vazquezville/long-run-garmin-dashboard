# Long Run

Going through your data in Garmin isn't the friendliest experience, so I decided to build this page. It runs locally and puts running first, with sleep, steps and the rest one step behind.

Built with Astro on the Garmin Connect Personal API. This is an independent project, not affiliated with or endorsed by Garmin.

## Requirements

- Node.js 22.23.4 or newer
- [pnpm](https://pnpm.io)
- A Garmin Connect account

## Setup

1. Run `pnpm install`.
2. Copy the example environment file with `cp .env.example .env`.
3. Create a Personal API key at <https://connect.garmin.com/app/settings/personalApiToken> and paste it into `.env` after `GARMIN_API_KEY=`.
4. Run `pnpm build`, then `pnpm start`, and open <http://localhost:4321>.

While working on the code, use `pnpm dev` instead of step 4.

## Pages

| Page | Address | Content |
| --- | --- | --- |
| Training | `/` | Running by week, month, year, last X days or all time, with training load, heart rate zones, running form and records |
| Runs | `/runs` | Every run, filtered by type, year, distance and name, sorted by date, distance, pace or load |
| Run | `/run/<id>` | One run from the list: route, watch laps, kilometer splits, charts along the distance, running form and heart rate zones |
| Health | `/health` | Sleep, recovery, daily activity, body and other sports, for periods of up to a year |

The address keeps the period, such as `?week=2026-11-23`, `?month=2026-04`, `?year=2026`, `?days=45` or `?all`.

Session types come from the activity name (long run, intervals, tempo, easy, race) and otherwise from Garmin's training label.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local server that reloads when the code changes |
| `pnpm astro dev stop` | Stops the server when it runs in the background |
| `pnpm build` | Builds the server into `dist/` |
| `pnpm start` | Runs the built server, from the project folder |
| `pnpm probe` | Calls the API endpoints and prints the shape of each response |
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
- Laps come from the original FIT file, and show when they differ from plain kilometer splits.
- Training load counts every sport, and compares 7 days with the weekly average of 4 weeks.
- Sleep, heart rate, steps and stress appear on Training for periods of up to a year.
- `.cache/` contains your health data. Do not publish it.
- The server has no login. Keep it on your own machine.
