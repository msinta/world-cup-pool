# Guardian Capital — World Cup Pool 2026

An internal office pool web app for the 2026 FIFA World Cup. Participants pick teams across six tiers, earn points as their teams advance and score goals, and compete for a prize pool.

## Features

- **Entries** — participants submit picks (2 teams per tier, 12 total) with an access code
- **Leaderboard** — live standings with points breakdown per team; picks hidden until the tournament starts
- **Matches** — upcoming fixtures, results, and a visual knockout bracket
- **Admin** — manage entries, trigger live match sync from football-data.org

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Match Data | football-data.org API via Supabase Edge Function |
| Hosting | Netlify (deployed via GitHub Actions) |

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Start dev server
npm run dev
```

### Required environment variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `VITE_ADMIN_PIN` | PIN to unlock the Admin tab |

## Deployment

Pushes to `main` automatically deploy to Netlify via GitHub Actions (`.github/workflows/deploy.yml`).

**Required GitHub Secrets:**

| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `VITE_ADMIN_PIN` | Admin panel PIN |
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token |
| `NETLIFY_SITE_ID` | Netlify site ID |

## Match Sync

Live match data is fetched from football-data.org through a **Supabase Edge Function** (`supabase/functions/fetch-matches`). The API key is stored as a Supabase secret (`FOOTBALL_API_KEY`) — never in the client bundle.

From the Admin panel → **Match Sync** tab → **Sync Now** to pull latest results. The function also runs on a schedule every 2 hours during the tournament.

## Scoring

| Event | Points |
|---|---|
| Win | 2 |
| Draw | 1 |
| Advance to Round of 32 | 3 |
| Advance to Round of 16 | 8 |
| Advance to Quarter-Final | 10 |
| Advance to Semi-Final | 12 |
| Advance to Final | 15 |
| Win World Cup | 25 |

Goals scored act as a tiebreaker.
