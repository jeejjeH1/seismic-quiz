# Seismic Quiz

A **real-time** quiz platform — hosts build quizzes, players join with a 6-digit room code, and a live leaderboard updates after every question.

## Live

| Service | URL |
|---|---|
| Website | http://seismic-quiz.duckdns.org |
| Socket server | same domain, `/socket.io/` path |

Self-hosted on a single Ubuntu server: **Nginx** (reverse proxy + WebSocket) → **Next.js** (port 3000) + **Socket.IO** (port 4000), managed by **PM2**, with local **PostgreSQL** and **Redis**. No third-party cloud services required.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind |
| Realtime engine | Express + Socket.IO (`backend/`) |
| Database | PostgreSQL + Prisma ORM |
| Live leaderboard / rooms | Redis (Sorted Sets) |
| Process manager | PM2 (auto-restart + boot persistence) |
| Reverse proxy | Nginx (HTTP + WebSocket upgrade) |

## Architecture

Two independent processes share one PostgreSQL database:

- **Frontend** (repo root): pages + API routes (quiz CRUD, CSV export) — talks to PostgreSQL only
- **Socket backend** (`backend/`): the real-time game engine (state machine, scoring, room sync) — talks to PostgreSQL + Redis; CORS controlled via `CORS_ORIGIN`

## Visual Identity

| Usage | Color |
|---|---|
| Primary | `#825A6D` |
| Background | `#161616` |
| Surface | `#282826` |
| Muted text | `#D4D4D4` |
| Lines | `#A4A3A1` |

Font: Inter. Minimal dark theme, high contrast, quiz-themed animated backdrop (floating A/B/C/D tiles, podium, distribution chart, countdown ring, seismic wave).

## Local Development

Prerequisites: Node.js ≥ 18, PostgreSQL and Redis running (or Docker):

```bash
docker run -d --name sq-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=seismic_quiz -p 5432:5432 postgres:16
docker run -d --name sq-redis -p 6379:6379 redis:7
```

```bash
npm install                          # frontend + prisma generate
cd backend && npm install && cd ..   # socket backend
npx prisma db push                   # from repo root — schema lives in /prisma
npm run dev:all                      # frontend :3000 + socket :4000 together
```

Open `http://localhost:3000`.

### Environment Variables

**Root (`.env`):**
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seismic_quiz?schema=public"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"   # or "" for same-origin behind a proxy
```

**Socket backend (`backend/.env`):**
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seismic_quiz?schema=public"
REDIS_URL="redis://localhost:6379"
CORS_ORIGIN="http://localhost:3000"
```

> Note: the backend's `prisma generate` points at the root schema (`../prisma/schema.prisma`) — keep `backend/` inside this repo.

## Server Deployment (single box)

```bash
# 1) install runtime
apt install -y nodejs nginx redis-server postgresql
npm i -g pm2

# 2) code + env
git clone <repo> /root/seismic && cd /root/seismic
# create .env and backend/.env (see above; use localhost URLs)

# 3) database
npx prisma generate && npx prisma db push

# 4) frontend production build
npm run build

# 5) processes
pm2 start npm --name seismic-web -- start
pm2 start backend/start-socket.sh --name seismic-socket
pm2 save && pm2 startup

# 6) nginx: reverse proxy / -> :3000, /socket.io/ -> :4000 (with WS upgrade)
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page + quick join by room code |
| `/dashboard` | Host panel: quiz list + create quiz |
| `/dashboard/[quizId]` | Question editor (4 options + per-question timer + correct answer picker) |
| `/host/[code]` | Live host control room: start, reveal, next question, live stats, invite link, CSV export |
| `/quiz/[code]` | Player flow: lobby → question → answer → results (color-coded options, timer bar, confetti) |
| `/leaderboard/[code]` | Public live leaderboard (for projector display) |

## Socket.IO Events

**Client → Server:** `join_room`, `watch_room`, `host_auth`, `submit_answer`, `host_start_quiz`, `host_reveal_answer`, `host_next_question`, `leaderboard_request`, `sync_request`

**Server → Client:** `new_question`, `show_correct_answer`, `leaderboard_update`, `players_update`, `stats_update`, `quiz_finished`

## Scoring

Correct answer earns up to `1000 × (time remaining ÷ question duration)` points — faster answers score more. Scores accumulate in Redis (Sorted Set) and are persisted to PostgreSQL.

## Project Structure

```
backend/
  server.mjs                standalone Express + Socket.IO server
  src/game-server.mjs       realtime game engine (state machine + scoring + distribution)
  start-socket.sh           PM2 entry (node --env-file=.env server.mjs)
prisma/schema.prisma        Quiz, Question, Participant models (shared)
src/app/...                 frontend pages + API routes
src/components/             Leaderboard (rank animation + medals), CountdownRing, TimerBar, Backdrop
render.yaml                 Render blueprint (optional cloud deploy)
Dockerfile (backend/)       optional docker runtime
```

## Testing Multiplayer

Open two browsers (or one normal + one incognito); one hosts, others join with the room code.
