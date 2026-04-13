# Deploy Nixsora on a VPS (nixsora.com)

This app runs as **one Node process**: Express serves the **built React app** from `client/dist` and the **REST API** under `/api`. Put **Nginx** (or Caddy) in front for HTTPS and your domain.

Your server path may look like `~/Sport-Card-Analytics` or `~/Sports_card_Analytics` — replace `APP` below with your real directory.

---

## 1. DNS

At your domain registrar (or DNS host):

| Type | Name | Value        |
|------|------|--------------|
| A    | `@`  | Your VPS IPv4 |
| A    | `www`| Your VPS IPv4 |

Wait until records resolve (often a few minutes; sometimes up to 48h).

---

## 2. Server packages

SSH in:

```bash
ssh root@sports-card-bot-es
```

Install **Node.js 18+** (example with NodeSource on Debian/Ubuntu):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential
node -v   # should be v18+ or v20+
```

Install **Nginx** and (recommended) **Certbot**:

```bash
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
```

**MongoDB**: use MongoDB Atlas, or install MongoDB on the same VPS, or another host. Set `MONGODB_URI` accordingly.

Firewall (UFW example):

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 3. Code on the VPS

If the repo is already at e.g. `~/Sport-Card-Analytics`:

```bash
cd ~/Sport-Card-Analytics   # your actual path
git pull origin main        # or your branch
```

If the folder name is wrong, clone fresh:

```bash
cd ~
git clone <your-repo-url> Sport-Card-Analytics
cd Sport-Card-Analytics
```

---

## 4. Environment file (repo root)

The server loads **`.env` from the monorepo root** (three levels above `server/src/config`), i.e. next to `client/` and `server/`.

Create or edit **`/root/Sport-Card-Analytics/.env`** (adjust path):

```env
NODE_ENV=production

# API
API_PORT=5000
API_LISTEN_HOST=0.0.0.0

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=sports_cards

# Auth (required in production — use a long random string)
AUTH_JWT_SECRET=9Xv$Kq7!Lm2@Rz#5BfP8&HyT

# HTTPS site — comma-separated, no spaces after commas
CLIENT_ORIGIN=https://nixsora.com,https://www.nixsora.com

# Send auth cookies only over HTTPS
AUTH_COOKIE_SECURE=true
```

Generate a secret (on the VPS):

```bash
openssl rand -base64 48
```

Paste the output as `AUTH_JWT_SECRET`.

Optional: if the built UI is not at `client/dist`, set:

```env
WEB_DIST=/full/path/to/client/dist
```

---

## 5. Install dependencies and build the web app

From the **repository root** (where `package.json` has `install:all` and `build`):

```bash
cd ~/Sport-Card-Analytics
npm install
npm run install:all
npm run build
```

This produces `client/dist/`. Express will serve it automatically when `NODE_ENV=production` and the folder exists.

---

## 6. Run the app (quick test)

```bash
cd ~/Sport-Card-Analytics
npm run start:prod
```

You should see logs like API listening on `http://0.0.0.0:5000` and static files from `client/dist`.

Stop with `Ctrl+C`, then use a process manager (next step).

---

## 7. Keep it running with PM2

```bash
npm install -g pm2
cd ~/Sport-Card-Analytics
```

Start using the same script as production (from repo root):

```bash
pm2 start npm --name nixsora -- run start:prod
pm2 save
pm2 startup systemd -u root --hp /root
# run the command PM2 prints, if any
```

After each deploy:

```bash
cd ~/Sport-Card-Analytics
git pull
npm run install:all
npm run build
pm2 restart nixsora
```

---

## 8. Nginx reverse proxy

Create `/etc/nginx/sites-available/nixsora`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name nixsora.com www.nixsora.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:

```bash
ln -sf /etc/nginx/sites-available/nixsora /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 9. HTTPS (Let’s Encrypt)

```bash
certbot --nginx -d nixsora.com -d www.nixsora.com
```

Certbot will adjust the Nginx config for TLS. Renewals are usually automatic via a timer.

Ensure `.env` has:

- `CLIENT_ORIGIN=https://nixsora.com,https://www.nixsora.com`
- `AUTH_COOKIE_SECURE=true`
- `PUBLIC_APP_URL=https://nixsora.com` (no trailing slash) so password-reset emails link to the live site.
- `RESEND_API_KEY` and a verified **From** address — either `RESEND_FROM=Nixsora <no-reply@nixsora.com>` or `RESEND_FROM_EMAIL` + optional `RESEND_FROM_NAME`. Verify **nixsora.com** in [Resend](https://resend.com) and add DNS records as instructed.

Then restart the app:

```bash
pm2 restart nixsora
```

---

## 10. How requests flow

- Browser → `https://nixsora.com` → Nginx → `http://127.0.0.1:5000`
- React is built with **relative** API calls (`VITE_API_URL` unset), so `/api/...` hits the same host — no extra CORS setup for the SPA.
- `app.set("trust proxy", 1)` is already set for correct IP / TLS awareness behind Nginx.

---

## 11. Checklist

- [ ] DNS A records for `@` and `www` point to the VPS  
- [ ] `client/dist` exists after `npm run build`  
- [ ] Root `.env`: `NODE_ENV=production`, `AUTH_JWT_SECRET`, `MONGODB_URI`, `CLIENT_ORIGIN` (HTTPS URLs), `PUBLIC_APP_URL`, `AUTH_COOKIE_SECURE=true`, `RESEND_API_KEY`, Resend **From** (`RESEND_FROM` or `RESEND_FROM_EMAIL` + `RESEND_FROM_NAME`)  
- [ ] MongoDB reachable from the VPS  
- [ ] PM2 (or systemd) keeps `npm run start:prod` running  
- [ ] Nginx proxies to `API_PORT` (default 5000)  
- [ ] Certbot issued certificates and HTTPS works  

---

## 12. Common issues

| Symptom | What to check |
|--------|----------------|
| **502 Bad Gateway** | `pm2 status`, `pm2 logs nixsora`, confirm app listens on `5000` and Nginx `proxy_pass` matches. |
| **CORS errors** | `CLIENT_ORIGIN` must include the exact browser origin (`https://nixsora.com`, etc.). |
| **Blank page / 404 on refresh** | Rebuild client (`npm run build`); confirm `client/dist` exists; Express SPA fallback only runs in production with `webDist` set. |
| **FATAL: AUTH_JWT_SECRET** | Set a non-empty secret in root `.env`. |
| **503 / database errors** | MongoDB URI, firewall, and that `mongod` (or Atlas IP allowlist) allows the VPS. |
| **503 on sign-up (“Resend” / email)** | Set `RESEND_API_KEY` and a verified **From** for sign-up OTP. Sign-in does not use Resend. |
| **Reset email has wrong / broken link** | Set `PUBLIC_APP_URL=https://nixsora.com` (and rebuild/restart). Links use that host + `/reset-password?token=…`. |

---

## 13. Optional: deploy script

On the server, `~/Sport-Card-Analytics/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git pull
npm run install:all
npm run build
pm2 restart nixsora
```

```bash
chmod +x deploy.sh
```

Run `./deploy.sh` after pushing to Git.

---

*Paths like `root@sports-card-bot-es` and `~/Sport-Card-Analytics` are examples; use your real SSH user, host, and project directory.*
