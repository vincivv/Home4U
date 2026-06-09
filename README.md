# Home4U

Home4U is a full-stack interior design planning app that helps renters and first-time apartment dwellers turn a room photo, target style, and budget into a structured makeover plan.

The project combines a React workspace with a FastAPI backend for authentication, project persistence, image upload handling, style scoring, recommendation generation, and optional AI-assisted room feedback.

![Home4U product tour concept](docs/mockups/home4u-product-tour-concept.png)

## Highlights

- Authenticated user accounts with JWT-based session handling and login rate limiting.
- Room project dashboard for creating, saving, and revisiting design plans.
- Image upload pipeline with file validation, static asset serving, and scan-quality feedback.
- Weighted style resemblance scoring against structured design tags and style metadata.
- Budget-aware recommendations with prioritized action items and shopping search links.
- Workspace flow for selecting room type, design intensity, lighting, and budget tier.
- Persisted analysis-run history for QA, diagnostics, and reproducible project results.
- Production-minded backend details including request IDs, response timing headers, CORS controls, Alembic migrations, and systemd/nginx deployment assets.
- Frontend smoke tests, accessibility-focused tests, hook tests, and backend smoke tests.

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | React, Vite, React Router, Framer Motion, Lucide React |
| Backend | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| Data | PostgreSQL, SQLAlchemy, Alembic migrations |
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
  auth, projects, styles, search, recommendations
        |
        v
SQLAlchemy data layer
  PostgreSQL DATABASE_URL
```

The frontend talks to `/api` by default. In development, Vite strips `/api` and proxies requests to `http://127.0.0.1:8000`. In production, the provided nginx config follows the same routing pattern.

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

Start from `application/backend/.env.example` for local backend configuration. PostgreSQL is required for local development and deployment. Set `DATABASE_URL` to your PostgreSQL connection string, for example:

```bash
DATABASE_URL=postgresql+psycopg://home4u:password@localhost:5432/home4u
```

Local development defaults to that example URL if `DATABASE_URL` is omitted. Production must set `DATABASE_URL` explicitly.

Never commit `.env`, API keys, local databases, uploaded images, virtual environments, or `node_modules`. The root `.gitignore` is configured for those files.

## Database Migrations

Fresh PostgreSQL database:

```bash
cd application/backend
./run_migrations.sh upgrade
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

## Project Structure

```text
application/
  backend/
    app/
      api/        FastAPI route modules
      core/       settings, database, env loading
      models/     SQLAlchemy models
      schemas/    Pydantic schemas
      services/   scoring, recommendations, AI helpers
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
  mockups/        product and flow visuals
```

## Resume Summary

Built a full-stack interior design planning application with React, FastAPI, SQLAlchemy, JWT auth, image uploads, budget-aware recommendation scoring, Alembic migrations, and frontend/backend test coverage.

More detailed resume bullets are in [docs/RESUME_NOTES.md](docs/RESUME_NOTES.md).

## License

This project currently includes an MIT license. Confirm ownership and team permission before publishing a public copy.
