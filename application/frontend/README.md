# Home4U Frontend

React/Vite client for Home4U.

## Stack

- React
- Vite
- React Router
- Framer Motion
- Lucide React
- Vitest and Testing Library

## Local Development

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The frontend runs at `http://127.0.0.1:5173`.

API requests use `/api` by default. In development, `vite.config.js` proxies `/api` to the FastAPI backend at `http://127.0.0.1:8000` and proxies `/uploads` for uploaded room images.

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run preview
```

## Source Layout

```text
src/
  components/  shared UI components
  context/     auth, API health, and ambience state
  pages/       route-level screens
  services/    API client helpers
  styles/      shared tokens and CSS
  test/        frontend test setup
  utils/       design and style helpers
```

