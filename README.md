# Home4U

Home4U is a full-stack interior design planning app for renters and first-time apartment dwellers who want practical room makeover guidance before buying furniture or decor. Users can create room projects, upload room photos, compare design styles, and receive budget-aware recommendations that turn a broad design goal into an actionable plan.

The project is built as a production-style web application with a React frontend, FastAPI backend, PostgreSQL persistence, authentication, file uploads, schema migrations, automated smoke tests, and deployment assets for an AWS/Linux environment.

## Product Overview

Home4U is designed around a real user workflow:

1. Create an account and start a room project.
2. Upload a room image and choose room details such as style direction, lighting, budget, and design intensity.
3. Generate a design analysis with style fit, scan-quality feedback, room-state diagnostics, and prioritized recommendations.
4. Save projects and revisit recommendations over time.

The core product goal is to make interior design planning more approachable for users who need realistic suggestions, budget tradeoffs, and a clear next step.

## Key Features

- JWT-based authentication with normalized login handling and rate limiting.
- Room project dashboard for creating, saving, filtering, and revisiting design plans.
- Image upload pipeline with file validation, upload limits, static asset serving, and scan-quality feedback.
- Weighted style matching against structured design tags and style metadata.
- Budget-aware recommendation engine with priorities, cost estimates, explanations, and shopping-oriented action items.
- Persisted analysis history for reproducible project results and QA diagnostics.
- Optional AI-assisted room feedback providers with provider configuration kept outside the repo.
- Production-focused backend middleware for request IDs, response timing, CORS, security headers, and structured error responses.
- PostgreSQL-only data layer with Alembic migrations.
- Frontend smoke tests, accessibility tests, hook tests, and backend API smoke tests.

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Framer Motion, Lucide React |
| Backend | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| Database | PostgreSQL, Alembic migrations |
| Auth and Security | JWT, bcrypt, login throttling, request diagnostics, security headers |
| Testing | Vitest, Testing Library, Node test runner, FastAPI smoke tests |
| Deployment | Nginx reverse proxy, systemd service, shell deployment scripts |

## Architecture

```text
React + Vite frontend
  /api/* proxy
  /uploads/* proxy
        |
        v
FastAPI backend
  auth, projects, styles, search, recommendations, analysis
        |
        v
SQLAlchemy data layer
  PostgreSQL via DATABASE_URL
```

The frontend talks to `/api` by default. In development, Vite strips `/api` and proxies requests to `http://127.0.0.1:8000`. In production, nginx serves the frontend and reverse-proxies API and upload traffic to the FastAPI service.

## Local Setup

### Prerequisites

- Python 3.12
- Node.js 18 or newer
- npm
- PostgreSQL 14 or newer

### Backend

```bash
cd application/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
./run_migrations.sh upgrade head
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API runs at `http://127.0.0.1:8000`.

Useful backend URLs:

- Health check: `http://127.0.0.1:8000/health`
- Swagger docs: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd application/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The app runs at `http://127.0.0.1:5173`.

## Environment

Start from `application/backend/.env.example` for local backend configuration. PostgreSQL is required for local development and deployment.

```bash
DATABASE_URL=postgresql+psycopg://home4u:password@localhost:5432/home4u
HOME4U_SECRET_KEY=replace-with-a-long-random-secret
```

Production secrets belong outside the repository, commonly in `/etc/home4u/home4u.env` on the server. Do not commit `.env`, API keys, local databases, uploaded images, virtual environments, or dependency folders.

## Database Migrations

Fresh PostgreSQL database:

```bash
cd application/backend
./run_migrations.sh upgrade head
```

Existing PostgreSQL database that already matches the current schema:

```bash
cd application/backend
./run_migrations.sh stamp head
```

## Verification

Frontend:

```bash
cd application/frontend
npm run lint
npm run test
npm run build
```

Backend:

```bash
cd application/backend
source .venv/bin/activate
./run_smoke_tests.sh
```

## Deployment Notes

The `application/deployment` folder contains production-oriented assets for a Linux/AWS deployment:

- `deploy.sh` bootstraps a fresh server.
- `deploy_fix.sh` performs repeat deployments with migrations and an atomic frontend release swap.
- `home4u-backend.service` runs FastAPI under systemd.
- `nginx.conf` and `nginx-ssl.conf` route frontend, API, health, and upload traffic.

A production server must provide:

- PostgreSQL database reachable through `DATABASE_URL`.
- `HOME4U_SECRET_KEY` set outside the repo.
- Python, Node.js, npm, nginx, and systemd.

## Project Structure

```text
application/
  backend/
    app/
      api/        FastAPI route modules
      core/       settings, database, env loading
      models/     SQLAlchemy models
      schemas/    Pydantic schemas
      services/   analysis, recommendations, AI helpers
      utils/      auth and shared dependencies
    alembic/      database migrations
  frontend/
    src/
      components/ shared UI components
      context/    auth, API health, ambience state
      pages/      route-level screens
      services/   API client
      styles/     design tokens and shared CSS
docs/
  mockups/        early product planning visuals
```

## Resume Summary

Built a full-stack interior design planning application with React, FastAPI, PostgreSQL, SQLAlchemy, JWT auth, image uploads, budget-aware recommendation scoring, Alembic migrations, production deployment scripts, and frontend/backend test coverage.