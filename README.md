# Project APEX — Crust Issues

AI-powered multi-branch bakery/retail operating system, built on the stack
specified in the original Phase 1 proposal: **Next.js + FastAPI (Python) +
SQLAlchemy + PostgreSQL (Supabase-compatible) + Prophet + Gemini API**,
designed for **Vercel + Render** deployment.

This is a from-scratch rebuild of the same product that was prototyped on
AppDeploy, now on the originally proposed technology stack for teams that
need that exact stack for grading, portfolio, or infrastructure reasons.

## Architecture

```
apps/web/                Next.js (App Router, TS, Tailwind) — storefront + admin dashboard
services/business-api/   FastAPI — auth (JWT/RBAC), catalog, orders, inventory, waste, reviews
services/ai-service/     FastAPI — Prophet forecasting, Gemini sentiment + summaries, APScheduler
scripts/simulate_business.py   Seed script — 6 branches, ~120 products, 365 days of orders
```

Matches the proposal's service boundaries:
- The Next.js app **only ever calls the Business API** (`/api/ai/*` proxies to
  the AI service — the frontend never talks to it directly).
- The AI service has its own SQLAlchemy models pointed at the **same Postgres
  database**, used **read-only** for business tables; it owns three small
  cache tables (`ai_forecast_cache`, `ai_alerts_cache`, `ai_summary_cache`) that
  it does read/write, matching "cache the result" in the original spec.
- Sentiment classification is stateless in the AI service (it returns a label,
  never writes) — the Business API performs the actual write. This is a small,
  deliberate refinement over the original proposal's document, which said the
  AI service is read-only but also implied it writes sentiment scores; this
  design keeps that read-only guarantee literally true.

## Local setup

### Option A — Docker Compose (fastest)

```bash
cp services/business-api/.env.example services/business-api/.env
cp services/ai-service/.env.example services/ai-service/.env
cp apps/web/.env.local.example apps/web/.env.local

docker compose up --build
```

Then seed data:
```bash
docker compose exec business-api python /app/../../scripts/simulate_business.py
# or, simpler, run it locally against the dockerized Postgres (see Option B, step 4)
```

- Storefront: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin
- Business API docs: http://localhost:8000/docs
- AI service docs: http://localhost:8001/docs

### Option B — Run natively (what was used to build/verify this repo)

```bash
# 1. Postgres
createdb project_apex   # or point DATABASE_URL at Supabase directly

# 2. Business API
cd services/business-api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# 3. AI service (separate terminal)
cd services/ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001

# 4. Seed demo data (separate terminal, business-api venv active)
cd services/business-api
python ../../scripts/simulate_business.py
# creates owner@crustissues.com / password123

# 5. Web app (separate terminal)
cd apps/web
npm install
cp .env.local.example .env.local
npm run dev
```

## Deploying to the proposed production stack

### 1. Database — Supabase
1. Create a project at supabase.com.
2. Project Settings → Database → Connection string (URI). Use the "Transaction"
   pooler string for serverless-friendly connections.
3. Set this as `DATABASE_URL` for **both** services (same database).

**Read-only DB role for the AI service** (optional, but matches the proposal's
security intent — the AI service should not have write access to transactional
tables): in the Supabase SQL editor,
```sql
CREATE ROLE ai_service_ro LOGIN PASSWORD 'choose-a-strong-password';
GRANT CONNECT ON DATABASE postgres TO ai_service_ro;
GRANT USAGE ON SCHEMA public TO ai_service_ro;
GRANT SELECT ON branches, products, inventory, orders, order_items, waste_logs, reviews TO ai_service_ro;
GRANT ALL ON ai_forecast_cache, ai_alerts_cache, ai_summary_cache TO ai_service_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ai_service_ro;
```
Then use `ai_service_ro`'s connection string as the AI service's `DATABASE_URL`.

### 2. Backend services — Render
Create **two** "Web Service" instances, each pointed at this repo:

| Setting | Business API | AI Service |
|---|---|---|
| Root directory | `services/business-api` | `services/ai-service` |
| Environment | Docker (uses the included Dockerfile) | Docker |
| Env vars | `DATABASE_URL`, `JWT_SECRET`, `AI_SERVICE_URL` (the AI service's Render URL), `CORS_ORIGINS` (your Vercel URL) | `DATABASE_URL` (read-only role), `GEMINI_API_KEY`, `CORS_ORIGINS` (Business API's Render URL) |

Get a `GEMINI_API_KEY` at https://aistudio.google.com/apikey. If omitted, the
AI service still runs — sentiment falls back to a rating-based heuristic and
the executive summary falls back to a filled-in template.

Run the seed script once against the production database (from your machine,
with `DATABASE_URL` pointed at Supabase):
```bash
cd services/business-api
DATABASE_URL="<supabase-uri>" python ../../scripts/simulate_business.py
```

### 3. Frontend — Vercel
1. Import this repo, set **Root Directory** to `apps/web`.
2. Env var: `NEXT_PUBLIC_API_URL` = your Business API's Render URL.
3. Deploy.

### 4. Cron jobs
The AI service runs its own scheduler in-process via APScheduler
(`nightly-forecast` 00:30, `stock-check` hourly, `daily-summary` 07:00,
Asia/Karachi) — no separate cron infrastructure needed as long as the Render
service stays running (use Render's "Web Service", not "Background Worker",
so it stays warm; a paid Render plan is recommended for genuinely persistent
scheduling — free-tier services can spin down when idle and skip scheduled runs).

## What's simplified vs. the original proposal

- **Redis + RQ** (fallback burst queue for bulk sentiment scoring) is not
  wired up — at this data volume it wasn't needed, matching the proposal's
  own reasoning for treating it as a reserve-only component. The batch
  classify endpoint (`POST /api/reviews/classify-pending`) does the same job
  synchronously in small batches (20 at a time).
- **Alembic** is included in `requirements.txt` but this repo ships with
  `Base.metadata.create_all()` for simplicity; run `alembic revision
  --autogenerate` once you're ready to manage schema changes as migrations
  instead of implicit table creation.
- The Next.js frontend uses client components with JWT stored in
  `localStorage` throughout, rather than server components + httpOnly
  cookies — a reasonable simplification for a project of this scope, but
  worth hardening (httpOnly cookies, CSRF protection) before handling real
  customer data.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Recharts |
| Business API | FastAPI, SQLAlchemy, python-jose (JWT), passlib (bcrypt) |
| AI Service | FastAPI, Prophet, pandas, APScheduler, google-genai (Gemini) |
| Database | PostgreSQL (Supabase-compatible) |
| Deployment | Vercel (web) + Render (both APIs) + Supabase (database) |
