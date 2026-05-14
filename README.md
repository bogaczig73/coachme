# Betri CoachMe

Endurance coaching platform — a modern rebuild of TrainingPeaks with first-class coach ↔ athlete chat.

## Repo layout

```
betri-coachme/
├── apps/
│   ├── web/        # Next.js 15 (App Router) — Vercel
│   └── worker/     # Node worker for FIT parsing, recalc jobs — Railway
├── packages/
│   ├── db/         # Drizzle schema + client (Postgres)
│   ├── domain/     # Pure TS: TSS, PMC math, FIT helpers
│   └── types/      # Shared TS types
├── pnpm-workspace.yaml
└── turbo.json
```

## Stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 15 + TypeScript + Tailwind v4 |
| DB | Postgres (Neon recommended) + Drizzle ORM |
| Worker | Node + tsx (Railway) — Phase 1 will add BullMQ + Redis |
| File storage | Cloudflare R2 or Vercel Blob (Phase 1) |
| Auth | Auth.js v5 — Google OAuth (Garmin OAuth in Phase 1) |
| Real-time chat | Pusher / Ably / Supabase Realtime (Phase 3) |

## Phases

- **Phase 0 (this)** — monorepo scaffold, OAuth sign-in, athlete/coach role selection, empty dashboards
- **Phase 1** — Garmin OAuth, FIT upload, parse on worker, activity list
- **Phase 2** — Workout analysis (streams chart, laps, map, NP/IF/TSS)
- **Phase 3** — Coach ↔ Athlete relationship, per-workout chat
- **Phase 4** — Calendar, planned workouts
- **Phase 5** — TSS / CTL / ATL / TSB / PMC
- **Phase 6** — Workout builder, FIT export
- **Phase 7+** — Strength, plans marketplace, AI coach, mobile (React Native)

## Getting started

```bash
# 1. install
pnpm install

# 2. provision DB (Neon free tier)
#    https://neon.tech/ → create project → copy connection string
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), Google OAuth creds

# 3. db migrations
pnpm db:generate
pnpm db:migrate

# 4. run
pnpm dev
```

Open http://localhost:3000.

### Google OAuth setup

1. https://console.cloud.google.com/apis/credentials → Create OAuth client → Web app
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy client ID + secret into `.env`

## Deployment

- **apps/web** → Vercel. Set `Root Directory: apps/web`, env vars, framework: Next.js.
- **apps/worker** → Railway. Same env vars. Start command: `pnpm --filter @betri/worker start`.
- **DB** → Neon. Use the pooled connection string for the web app, direct for migrations.
