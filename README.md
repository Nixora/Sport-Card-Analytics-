# Nixsora (Sports Card Analytics)

Web app for comparing sports card listings across marketplaces, with analytics, alerts, seller views, community, and account features. **Express** serves the API (`/api`) and, in production, the static **Vite/React** build from `client/dist`.

## Requirements

- **Node.js** 18+
- **MongoDB** (local, Docker, or Atlas)

## Install

From the repository root:

```bash
npm install
npm run install:all
```

## Development

Terminal 1 — API (default `http://127.0.0.1:5000`):

```bash
npm run dev:api
```

Terminal 2 — Vite dev server (`http://localhost:5173`, proxies `/api`):

```bash
npm run dev:web
```

## Production build

```bash
npm run build
```

Output: `client/dist/`.

Run production stack (serves UI + API):

```bash
npm run start:prod
```

One-shot build + start:

```bash
npm run prod:vps
```

## Environment

The server reads **`.env` in the repo root** (same folder as `client/` and `server/`). See **`docs/deploy-nixsora-vps.md`** for production variables (`MONGODB_URI`, `AUTH_JWT_SECRET`, `CLIENT_ORIGIN`, etc.).

## Deploy (VPS + domain)

Step-by-step guide: **[docs/deploy-nixsora-vps.md](docs/deploy-nixsora-vps.md)** (Nginx, HTTPS, PM2, `nixsora.com`).

## Repo layout

| Path        | Role                          |
|------------|--------------------------------|
| `client/`  | React (Vite) frontend          |
| `server/`  | Express API + static SPA prod |
| `docs/`    | Deployment notes               |

## Product notes

High-level goals and roadmap bullets live in **`guide.md`**.
