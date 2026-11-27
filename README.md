# Logbook

Personal dashboard for Garmin Connect data, built with Astro.

## Setup

1. Create a Personal API key at <https://connect.garmin.com/app/settings/personalApiToken>.
2. Add it to `.env` as `GARMIN_API_KEY=your-key`.
3. Run `pnpm install` and `pnpm dev`, then open <http://localhost:4321>.

## Pages

| Page | Content |
| --- | --- |
| Overview, Activities, Daily, Sleep | The last 7, 28 or 90 days |
| Month | Any month with activities, as a calendar with its charts |
| Year | Any year with activities, with a day by day map and monthly totals |
| Fitness | Long term fitness and body trends |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local server that reloads data from the cache or the API |
| `pnpm astro dev stop` | Stops the server when it runs in the background |
| `pnpm build` | Static snapshot in `dist/` |
| `pnpm preview` | Serves the snapshot |
| `pnpm probe` | Calls every endpoint and prints the shape of each response |
| `pnpm refresh` | Deletes the local cache |
| `pnpm test` | Unit tests |
| `pnpm check` | Type checking |

## Data

- The key is only read on the server and never reaches the browser.
- Data is cached in `.cache/`: 30 minutes for the last week, 7 days up to three months old and 30 days beyond.
- The list of available months refreshes once a day.
- `pnpm build` creates a page for every month and year, so the first one takes a couple of minutes.
- `.cache/` and `dist/` contain your health data. Do not publish them.
- Publishing the dashboard needs a server adapter and a login first.
