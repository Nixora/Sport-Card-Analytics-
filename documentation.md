# Nixsora (Sports Card Analytics) — Project Documentation

This repository contains **Nixsora**, a sports card analytics product that:

1. **Collects listing data from marketplaces** (eBay + optional cross-market comparisons to Vinted and Catawiki) and stores it in MongoDB.
2. Serves a **web analytics system** (React + Express API) to browse cards, view trends, run comparisons, track sellers, and use community/account features.

> Note on ingestion code: the Node/React app expects that listing documents are already present in MongoDB (see **Data model** below). The server source includes references to ingestion scripts (for example `scripts/ingest_ebay.py`), but **those Python files are not present in this repository**. This doc explains the expected behavior and document shape so you can run/restore ingestion scripts from your own pipeline.

---

## Repo structure

| Path | Purpose |
|---|---|
| `client/` | Vite + React frontend |
| `server/` | Express API (and serves the built SPA in production) |
| `docs/` | Deployment notes and operational docs |
| `requirements.txt` | Python dependencies for ingestion/enrichment scripts (not included here) |

---

## High-level architecture

### Data flow

1. **Ingestion (Python)** pulls listing snapshots from marketplaces (eBay primary) and writes them to MongoDB.
2. **API (Express)** reads MongoDB and provides endpoints like:
   - `/api/cards` (list cards)
   - `/api/cards/:cardKey` (card detail + trend)
   - `/api/cards/:cardKey/listings` (raw listings sample)
   - `/api/movers`, `/api/sellers`, `/api/coverage`, `/api/community/*`, `/api/auth/*`
3. **UI (React)** calls the API and renders:
   - marketplace list + filters
   - card detail with trend chart and sample listings
   - comparison/alerts view
   - seller analysis
   - community posts
   - FAQ / privacy / contact

### Technology

- **Frontend**: React + Vite (`client/`)
- **Backend**: Node.js + Express (`server/`)
- **Database**: MongoDB
- **Auth**: cookie-based JWT sessions (`/api/auth/*`)
- **Optional**: Cloudflare Turnstile “human check” gate
- **Email**: Resend (OTP sign-up + password reset)

---

## Setup (local development)

### Prerequisites

- Node.js **18+**
- MongoDB (local / Docker / Atlas)

### Install

From repo root:

```bash
npm install
npm run install:all
```

### Run (dev)

API (Express):

```bash
npm run dev:api
```

Web (Vite):

```bash
npm run dev:web
```

- Web: `http://localhost:5173`
- API: `http://127.0.0.1:5000`

---

## Environment variables (server)

The server reads a **root** `.env` file (repo root). Common variables:

- **Mongo**
  - `MONGODB_URI` (default `mongodb://localhost:27017`)
  - `MONGODB_DB` (default `sports_cards`)
  - `MONGODB_COLLECTION` (default `ebay_items`)
- **CORS / web**
  - `CLIENT_ORIGIN` (comma-separated; dev defaults to `http://localhost:5173`)
  - `WEB_DIST` (optional explicit path to `client/dist` for prod serving)
- **Auth**
  - `AUTH_JWT_SECRET` (**required in production**)
  - `AUTH_COOKIE_NAME` (default `nixsor_auth`)
  - `AUTH_COOKIE_SECURE` (`true` when behind HTTPS)
- **Resend email**
  - `RESEND_API_KEY`
  - `RESEND_FROM` or `RESEND_FROM_EMAIL` (+ optional `RESEND_FROM_NAME`)
  - `PUBLIC_APP_URL` (used for password-reset links; falls back to `CLIENT_ORIGIN`)
- **Optional: Turnstile human check**
  - `HUMAN_CHECK_ENABLED=true`
  - `TURNSTILE_SECRET_KEY`
  - Client also needs `VITE_TURNSTILE_SITE_KEY` and `VITE_HUMAN_CHECK_ENABLED=true`

See `docs/deploy-nixsora-vps.md` and `docs/human-check-turnstile.md` for production guidance.

---

## Data model (MongoDB)

The app is designed around a **single primary collection** (default: `ebay_items`) that stores *listing snapshots* (and historically may also include other doc types).

### Listing documents

Server logic treats documents as “listings” when:

- `doc_type` is missing, **or**
- `doc_type === "listing"`

Key fields used by the API/UI (inferred from `server/src/services/cards.js`):

- **Identification**
  - `card_key` (string): normalized identifier for grouping listings into a card page
  - `title` (string): listing title
  - `item_web_url` (string): marketplace URL
  - `image_url` (string): listing image URL
- **Timing**
  - `fetched_at` (date): when this snapshot was ingested
  - `first_seen_at` / `last_seen_at` (date): first/last detection for that card/listing
- **Price + trend**
  - `trend`: array of `{ date, price_value, price_currency }`-like points (server aggregates daily medians)
  - `price_currency`
- **Flags (ingest + title regex)**
  - `has_autograph` (boolean)
  - `has_grade_or_auth` (boolean)
  - `keyword_flags`: `{ has_psa, has_bgs, has_jsa, has_beckett, has_coa, ... }`
- **Cross-market compare (optional)**
  - `compare_vinted` (object or value)
  - `compare_catawiki` (object or value)
  - `compare_updated_at` (date)
- **Seller (optional)**
  - `seller_username`
  - `seller_feedback_percentage` / `seller_feedback_score`

### Why the server uses medians

The UI generally displays a **median asking price** per day (not sold FMV). The API aggregates:

- for each `card_key` + day: collect price samples
- compute a median for that day
- compute day counts for “liquidity”/sample-size context

This approach is more robust to outliers than a simple average.

---

## Part 1 — Ingestion (Python) concept

The ingestion pipeline is responsible for:

1. **Querying eBay listings**
2. Normalizing titles into `card_key`
3. Storing listing snapshots into MongoDB
4. (Optional) Enriching listings with:
   - Vinted comparisons (`compare_vinted`)
   - Catawiki comparisons (`compare_catawiki`)
   - seller fields
   - keyword flags (autograph/grade/auth)

### Python dependencies

See `requirements.txt`:

- `pymongo` (Mongo writes)
- `requests` / `urllib3` (HTTP calls)
- `beautifulsoup4`, `selenium`, `webdriver-manager` (for enrichment workflows such as Vinted)

### What your ingestion must produce

For the web app to work as designed, your ingestion should ensure:

- Mongo contains a **single listings collection** (default `ebay_items`)
- each listing has a stable `card_key`
- each listing contains price + timestamps and (ideally) a `trend` structure
- optional compare fields exist when you want comparison pages to show data

If you already have ingestion scripts in another folder/repo, align their output with the schema above.

---

## Part 2 — Analytics system (Web app)

### Main pages (UI)

- **Home**: product narrative + platform explainer + careers banner
- **Marketplace** (`/marketplace`): browse card groups with filters and sorting
- **Card detail** (`/cards/:cardKey`): trend + listing sample + compare fields
- **Comparison & alerts** (`/comparison-alert`): cross-market compare rows when `compare_*` fields exist
- **Seller analysis** (`/seller-analysis`, `/sellers/:sellerUsername`)
- **Community** (`/community`)
- **FAQ** (`/faq`)
- **Privacy policy** (`/privacy-policy`)
- **Contact** (`/contact`)

### Filters & sort (Marketplace)

Backend supports query flags like:

- `compareOnly=true` (only cards with Vinted/Catawiki compare data)
- `autograph=true`
- `graded=true`
- `psa=true`
- `bgs=true`
- sort options: `recency`, `activity`, `price` (see `/api/meta`)

### API endpoints (core)

Public:

- `GET /api/health`
- `GET /api/meta`
- `GET /api/coverage`
- `GET /api/cards`
- `GET /api/cards/:cardKey`
- `GET /api/cards/:cardKey/listings`
- `GET /api/movers`
- `GET /api/sellers`
- `GET /api/sellers/:sellerUsername`
- `GET /api/community/articles`
- `GET /api/community/articles/:id`

Auth (cookie session):

- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `POST /api/auth/signup`
- `POST /api/auth/signup/verify-otp`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/auth/me/password`
- `POST /api/auth/me/avatar`

Admin (requires signed-in user and email in `ADMIN_EMAILS`):

- `GET /api/admin/users`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/cards`
- `DELETE /api/admin/cards/:cardKey`
- `GET /api/admin/community/articles`
- `DELETE /api/admin/community/articles/:id`

---

## Production build & run

Build the web UI:

```bash
npm run build
```

Run production server (serves API + built UI):

```bash
npm run start:prod
```

One-shot:

```bash
npm run prod:vps
```

---

## Troubleshooting

### “No data” / empty marketplace

Symptoms:
- Marketplace shows 0 cards, comparison page empty, movers empty.

Checks:
- Mongo is running and `MONGODB_URI` is correct
- Your ingestion wrote documents into `MONGODB_DB` + `MONGODB_COLLECTION`
- Documents include `card_key` and `trend` (or at least prices that your pipeline transforms into `trend`)

### Compare page empty

`compareOnly=true` cards require:
- `compare_vinted` or `compare_catawiki` to exist and be non-null

### Auth issues in production

- Ensure `AUTH_JWT_SECRET` is set
- If served over HTTPS, set `AUTH_COOKIE_SECURE=true`
- Ensure `CLIENT_ORIGIN` matches your deployed site origin

### Password reset email doesn’t work

- Set `PUBLIC_APP_URL` (or ensure `CLIENT_ORIGIN` points to the correct public URL)
- Configure Resend variables (`RESEND_API_KEY`, sender)

---

## Next steps (recommended)

If you want this documentation to be *fully accurate* to your ingestion code, add the ingestion scripts into this repo (or point me to the folder/repo they live in). Then I can update `documentation.md` with:

- exact Python commands and entrypoints
- exact collection names and indexes
- exact fields written per source (eBay/Vinted/Catawiki)
- sample `.env` for ingestion jobs

