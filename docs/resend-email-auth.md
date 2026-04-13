# Resend email (sign-up OTP and password reset)

Nixsora sends mail via [Resend](https://resend.com) for:

- **Sign up** — after the form is submitted, a **6-digit code** is emailed; entering it creates the account and signs the user in.
- **Forgot password** — a **one-time link** is emailed (`/reset-password?token=…` on your site). The user opens it and sets a new password. Links expire in **1 hour**.

**Sign in** uses email and password only (no email code).

## Environment variables

Add to the **root** `.env` (loaded by `server/src/config/loadEnv.js`):

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (for sign-up & reset email in production) | API key from the Resend dashboard. |
| `PUBLIC_APP_URL` | Recommended in production | Site base URL for reset links, e.g. `https://nixsora.com` (no trailing slash). If unset, the first `CLIENT_ORIGIN` value is used. |
| `RESEND_FROM` | Optional | Full **From** line, e.g. `Nixsora <no-reply@nixsora.com>`. If unset, the API builds `RESEND_FROM_NAME <RESEND_FROM_EMAIL>` (see below). |
| `RESEND_FROM_EMAIL` | If `RESEND_FROM` unset | Mailbox address verified in Resend. With only an API key and no email, dev defaults to `onboarding@resend.dev`. |
| `RESEND_FROM_NAME` | No | Display name before `<…>`; defaults to **`APP_PUBLIC_NAME`** (default `Nixsora`). Example result: `Nixsora <no-reply@nixsora.com>`. |
| `APP_PUBLIC_NAME` | No | Used in subjects and bodies; defaults to `Nixsora`. |

Other deployment variables (e.g. **`AUTH_JWT_SECRET`** in production) are separate from Resend.

## Behaviour without `RESEND_API_KEY`

If the key is missing:

- **Development** — sign-up OTP and reset URLs are logged to the server console so you can still test. **Sign in** still works (password only).
- **Production** — **sign-up** returns **503** until a key is set. Forgot-password responds with `{ ok: true }` without sending mail.

## Resend dashboard checklist

1. Create an API key; set `RESEND_API_KEY` in root `.env`.
2. Verify your domain and set **From** (either `RESEND_FROM` or `RESEND_FROM_EMAIL` + optional `RESEND_FROM_NAME`).
3. Set `PUBLIC_APP_URL=https://yourdomain.com` so reset emails point at the live site.

## API routes (reference)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/signup` | Validate; send sign-up OTP; returns `signup_challenge`. |
| `POST` | `/api/auth/signup/verify-otp` | Verify OTP; create user; session cookie. |
| `POST` | `/api/auth/signin` | Check email + password; session cookie (no email OTP). |
| `POST` | `/api/auth/forgot-password` | Send reset link email (always `{ ok: true }` for privacy). |
| `POST` | `/api/auth/reset-password` | `{ token, new_password }` — token from email link query string. |
| `POST` | `/api/auth/me/password` | Signed-in user: `{ current_password, new_password }`. |

Sign-up OTP codes expire in **10 minutes**. Reset links expire in **1 hour**.
