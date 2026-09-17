# Snowy's Performance

A full-stack coach/athlete training platform: Next.js frontend, Node/Express +
Prisma backend, Postgres database. Includes auth for coaches and athletes,
team-based data isolation, workout logging, testing data, a program builder,
a fatigue/overtraining engine, and API endpoints ready to connect to WHOOP,
Apple HealthKit, and Garmin.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** JWT, bcrypt password hashing

## Folder structure

```
snowys-performance/
  backend/
    prisma/
      schema.prisma       # Team, User, Program*, WorkoutLog, TestResult,
                           # WearableData, WearableAccountLink
      seed.ts              # demo team + coach + athlete + sample data
    src/
      routes/               # thin Express routers
      controllers/          # request handlers (auth, teams, workouts, tests,
                             # programs, fatigue, integrations)
      services/
        fatigueEngine.ts    # the ACWR-based fatigue/overtraining logic
      middleware/auth.ts     # JWT auth + role guard
      utils/jwt.ts
      app.ts / index.ts
    .env.example
    Dockerfile
  frontend/
    src/
      app/                  # login, register, dashboard/(athletes, programs,
                             # workouts, tests, fatigue)
      components/           # AuthProvider, NavBar
      lib/api.ts             # fetch wrapper + session storage
    .env.local.example
    Dockerfile
  docker-compose.yml
  README.md
```

## Data model & team isolation

Every record (`WorkoutLog`, `TestResult`, `Program`, `WearableData`, etc.)
carries a `teamId`. Every backend query filters by `req.user.teamId` (taken
from the JWT), so one coach's team can never read another team's data.
Within a team, athletes can only read/write their *own* records; coaches can
read/write any athlete's records on their team. This is enforced in each
controller (see `backend/src/controllers/*.ts`), not just in the UI.

## The "AI fatigue/overtraining engine"

`backend/src/services/fatigueEngine.ts` implements the **Acute:Chronic
Workload Ratio (ACWR)** — the athlete's trailing 7-day training volume load
compared against their trailing 4-week average — combined with wearable
recovery data when it's available. This is a real, published heuristic from
the sports-science literature (Gabbett, 2016), not a trained black-box
model, and it's deliberately written to be inspectable: a coach can see
exactly why a flag fired. If you want a learned model later (e.g. trained on
your own injury/soreness outcome data), you can swap the body of
`computeFatigue()` for a call to your model and keep the same return shape —
nothing else in the app needs to change.

## Wearable integrations (WHOOP / Apple HealthKit / Garmin)

Endpoints exist and are wired up, but **none of them are live yet** — each
provider requires you to register a developer app and get real credentials
first:

| Provider | What's implemented | What you still need to do |
|---|---|---|
| **WHOOP** | `GET /api/integrations/whoop/authorize` (builds the OAuth URL), `GET /api/integrations/whoop/callback` (stub — has a clearly marked `TODO` for the real token exchange), `POST /api/integrations/whoop/webhook` (stores incoming recovery/strain events) | Register at developer.whoop.com, set `WHOOP_CLIENT_ID`/`WHOOP_CLIENT_SECRET`/`WHOOP_REDIRECT_URI` in `.env`, fill in the token exchange in `whoopCallback` |
| **Garmin** | `POST /api/integrations/garmin/webhook` (stores incoming events) | Register at developer.garmin.com/gc-developer-program/health-api, point their push callback at this URL, add the OAuth linking flow (same pattern as WHOOP) |
| **Apple HealthKit** | `POST /api/integrations/healthkit/ingest` (authenticated with the athlete's normal platform JWT) | HealthKit has *no server-side API* — you need a small companion iOS app or Shortcut that reads HealthKit on-device and POSTs the numbers here |

All three ultimately land in the same `WearableData` table (`recovery`,
`strain`, `sleepScore`, `restingHR`, plus the raw payload), which is what the
fatigue engine reads from — so once any one of them is wired up for real,
it automatically improves the fatigue flags with no other code changes.

Because webhook events arrive keyed by *the provider's* user id, not yours,
there's a `WearableAccountLink` table mapping `(source, externalUserId) ->
athleteId`, created once an athlete completes that provider's OAuth flow.

## Running it locally

### Option A — Docker (simplest)

```bash
cp backend/.env.example backend/.env      # edit JWT_SECRET at minimum
cp frontend/.env.local.example frontend/.env.local
docker compose up --build
```

Then, in a separate terminal, run migrations + seed data once the DB is up:

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run seed
```

- Frontend: http://localhost:3000
- Backend health check: http://localhost:4000/health

### Option B — Without Docker

Requires Node.js 20+ and a local Postgres instance.

```bash
# 1. Database
createdb training_platform   # or create it via psql / a GUI

# 2. Backend
cd backend
cp .env.example .env          # edit DATABASE_URL/JWT_SECRET if needed
npm install
npx prisma migrate dev --name init
npm run seed                  # optional — creates demo accounts, see below
npm run dev                   # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

### Demo accounts (after `npm run seed`)

- Coach: `coach@example.com` / `password123`
- Athlete: `athlete@example.com` / `password123`

Athlete accounts are invite-only — there's no open self-registration.
Sign in as the coach and use "Invite an Athlete" on the Athletes page to
send a one-time link (copied to your clipboard automatically), or "Add an
Athlete Directly" to set a login and password for them yourself.

## What's intentionally minimal (and where to extend it)

- **Program builder UI** ships with basic create/view; the API already
  supports nested weeks → days → exercises (`POST /api/programs/:id/weeks`,
  `.../weeks/:weekId/days`, `.../days/:dayId/exercises`) — the frontend just
  doesn't have forms for those nested adds yet.
- **Refresh tokens** aren't implemented; JWTs are long-lived (7 days) for
  simplicity. For production, add refresh tokens and shorter access-token
  expiry.
- **Rate limiting / input validation** (e.g. with `zod`) isn't wired in yet —
  add it before exposing this publicly.
- **Wearable webhook signature verification** is noted in comments but not
  implemented — required before trusting WHOOP/Garmin payloads in production.
