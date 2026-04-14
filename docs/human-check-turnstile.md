# Human check (Cloudflare Turnstile)

The app can require a one-time **human verification** before most `/api/*` routes work. It uses **Cloudflare Turnstile** (no separate “HumanCheck” service): the client shows the widget, the server verifies the token with Cloudflare and sets an **httpOnly** cookie.

---

## How it is wired

| Piece | Role |
|--------|------|
| `client/src/components/HumanGate.jsx` | On load, calls `/api/human/status`. If verification is required and the cookie is missing, renders Turnstile; on success calls `/api/human/verify`. |
| `client/src/main.jsx` | Wraps the app in `<HumanGate>`. |
| `client/src/api.js` | `fetchHumanStatus()` → `GET /api/human/status`; `verifyHumanToken()` → `POST /api/human/verify` (with credentials). |
| `server/src/routes/human.js` | Implements `/api/human/status` and `/api/human/verify` (server-side Turnstile `siteverify`). |
| `server/src/middleware/humanCheck.js` | When enabled, returns **403** for `/api/*` except `/api/human/*` and **OPTIONS**, until the human cookie is set. |
| `server/src/index.js` | Registers `/api/human` **before** the human-check middleware so status/verify stay reachable. |

Order matters: human routes must be mounted before `humanCheckApi` (already done in this repo).

---

## Environment variables

### API (Node / Express)

| Variable | Required when | Description |
|----------|----------------|-------------|
| `HUMAN_CHECK_ENABLED` | Using the gate | Set to `true` to turn the feature on (also requires a non-empty secret below). |
| `TURNSTILE_SECRET_KEY` | Using the gate | Secret key from the Cloudflare Turnstile widget (server only). |

Human check is **enabled** only if `HUMAN_CHECK_ENABLED=true` **and** `TURNSTILE_SECRET_KEY` is non-empty (see `server/src/config/index.js`).

Optional:

| Variable | Default | Description |
|----------|---------|-------------|
| `HUMAN_COOKIE_NAME` | `nix_human` | Name of the verification cookie. |
| `HUMAN_COOKIE_MAX_AGE_SEC` | `604800` | Cookie lifetime (minimum 3600 in config). |
| `AUTH_COOKIE_SECURE` | — | When `true`, the human cookie is `Secure` (use behind HTTPS). |

### Client (Vite build)

| Variable | Description |
|----------|-------------|
| `VITE_TURNSTILE_SITE_KEY` | **Site key** (public) from the same Turnstile widget. Required for the widget to render when the server says verification is required. |
| `VITE_API_URL` | Base URL of the API (e.g. empty for same-origin prod, or `http://localhost:5000` in dev if the UI is on another port). Must match how you call the API elsewhere so `/api/human/*` and cookies work. |

The server response from `/api/human/status` is the source of truth for `required` / `verified`. A `VITE_HUMAN_CHECK_ENABLED` variable is **not** read by the current client code.

---

## Cloudflare Turnstile setup

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Turnstile** and create a widget.
2. Add your **production domain** (and localhost if you test locally) to the widget’s allowed hostnames.
3. Copy the **site key** → client env as `VITE_TURNSTILE_SITE_KEY`.
4. Copy the **secret key** → server env as `TURNSTILE_SECRET_KEY`.

---

## Local development

- **Same origin** (e.g. API and built client served by Express): set API env vars, set `VITE_TURNSTILE_SITE_KEY` before `npm run build` (or in Vite env for `npm run dev` if you proxy to the API).
- **Split origins** (Vite on `:5173`, API on `:5000`): set `VITE_API_URL` to the API origin, ensure CORS allows credentials (the server already uses `credentials: true` for configured origins), and add your dev UI origin to `CLIENT_ORIGINS` (or equivalent) on the server so cookies and CORS align.

Requests to `/api/human/status` and `/api/human/verify` use `credentials: "include"` so the **httpOnly** cookie is sent and stored for the API’s origin.

---

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| “Site key” / widget missing message | `VITE_TURNSTILE_SITE_KEY` set and client rebuilt or dev server restarted. |
| 403 on API after passing the widget | Cookie not set: HTTPS vs `AUTH_COOKIE_SECURE`, wrong `VITE_API_URL` (verify goes to a different host), or browser blocking third-party cookies if API and UI are on unrelated domains. |
| Turnstile loads but verify fails | Secret key matches the site key’s widget, server can reach `https://challenges.cloudflare.com/turnstile/v0/siteverify`, token not expired (complete challenge promptly). |
| API never requires verification | `HUMAN_CHECK_ENABLED` not `true` or `TURNSTILE_SECRET_KEY` empty. |

Helmet CSP in `server/src/index.js` already allows Turnstile scripts and frames from `https://challenges.cloudflare.com`.

---

## Related files

- `server/src/routes/human.js` — status + verify handlers  
- `server/src/middleware/humanCheck.js` — API gate  
- `server/src/config/index.js` — `humanCheckEnabled` and cookie settings  
- `client/src/components/HumanGate.jsx` — UI gate + Turnstile  
- `client/src/index.css` — `.human-gate*` styles  
