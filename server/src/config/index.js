const path = require("path");
const fs = require("fs");

require("./loadEnv");

function req(name, fallback = "") {
  const v = process.env[name];
  return v != null && String(v).trim() !== "" ? String(v).trim() : fallback;
}

/** Absolute path to Vite `client/dist`, or "" if missing / not configured. */
function resolveWebDist() {
  const explicit = req("WEB_DIST", "");
  if (explicit) {
    const abs = path.resolve(explicit);
    return fs.existsSync(abs) ? abs : "";
  }
  const repoClientDist = path.resolve(__dirname, "..", "..", "..", "client", "dist");
  if (fs.existsSync(repoClientDist)) return repoClientDist;
  return "";
}

const clientOrigins = req("CLIENT_ORIGIN", "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function stripTrailingSlashes(s) {
  return String(s || "")
    .trim()
    .replace(/\/+$/, "");
}

/** Base URL for password-reset links in email (e.g. https://nixsora.com). Defaults to first CLIENT_ORIGIN. */
const publicAppUrl =
  stripTrailingSlashes(req("PUBLIC_APP_URL", "")) ||
  stripTrailingSlashes(clientOrigins[0] || "");

/** Strip BOM / CR from .env (Windows) so Resend sees a valid `from` string. */
function normalizeEnvString(s) {
  return String(s || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim();
}

/**
 * Resend requires `email@domain.tld` or `Name <email@domain.tld>` (domain must contain a dot).
 */
function emailPartFromFromLine(s) {
  const t = normalizeEnvString(s);
  if (!t) return "";
  const m = t.match(/<\s*([^<>]+@[^<>]+)\s*>/);
  if (m) return normalizeEnvString(m[1]);
  return t;
}

function isValidResendFromLine(s) {
  const email = emailPartFromFromLine(s);
  if (!email || !email.includes("@")) return false;
  const domain = email.slice(email.indexOf("@") + 1);
  if (!domain.includes(".")) return false;
  return /^[^\s<>]+@[^\s<>]+$/.test(email);
}

function resendDisplayName() {
  const n = (
    normalizeEnvString(req("RESEND_FROM_NAME", "")) ||
    normalizeEnvString(req("APP_PUBLIC_NAME", "Nixsora")) ||
    "App"
  )
    .replace(/[<>]/g, "")
    .trim();
  return n || "App";
}

/**
 * RESEND_FROM_EMAIL must be a bare address (e.g. no-reply@domain.com). If someone sets the full
 * `Name <email>` line here, we extract the email — otherwise the app would build invalid nested `<>`.
 */
function parseBareEmailFromEnv(s) {
  const t = normalizeEnvString(s);
  if (!t) return "";
  const m = t.match(/<\s*([^<>]+@[^<>]+)\s*>/);
  if (m) return normalizeEnvString(m[1]);
  return t;
}

/** Resend test sender; valid for any API key on a free account. */
const RESEND_FALLBACK_FROM_EMAIL = "onboarding@resend.dev";

/**
 * Resend "from" line. Set RESEND_FROM to a full value like `Nixsora <no-reply@nixsora.com>`,
 * or set RESEND_FROM_EMAIL and optionally RESEND_FROM_NAME (defaults to APP_PUBLIC_NAME).
 * With RESEND_API_KEY set, invalid values fall back to `… <onboarding@resend.dev>` so email works in dev and prod.
 */
const resendFromLine = (() => {
  const key = normalizeEnvString(req("RESEND_API_KEY", ""));

  const fromFull = normalizeEnvString(req("RESEND_FROM", ""));
  if (fromFull && isValidResendFromLine(fromFull)) {
    return fromFull;
  }

  let email =
    parseBareEmailFromEnv(req("RESEND_FROM_EMAIL", "")) || (key ? RESEND_FALLBACK_FROM_EMAIL : "");
  if (email && !isValidResendFromLine(email)) {
    email = key ? RESEND_FALLBACK_FROM_EMAIL : "";
  }
  if (!email) return "";

  const line = `${resendDisplayName()} <${email}>`;
  return normalizeEnvString(line);
})();

module.exports = {
  port: parseInt(req("API_PORT", "5000"), 10) || 5000,
  apiListenHost: req("API_LISTEN_HOST", "0.0.0.0"),
  nodeEnv: req("NODE_ENV", "development"),
  mongoUri: req("MONGODB_URI", "mongodb://localhost:27017"),
  mongoDb: req("MONGODB_DB", "sports_cards"),
  ebayItemsCollection: req("MONGODB_COLLECTION", "ebay_items"),
  /**
   * @deprecated db is single-collection now; card docs also live in ebayItemsCollection
   * Kept for backward compatibility with older code paths / envs.
   */
  cardsCollection: req("MONGODB_COLLECTION", "ebay_items"),
  /** @deprecated use clientOrigins */
  clientOrigin: clientOrigins[0] || "http://localhost:5173",
  clientOrigins,
  publicAppUrl,
  webDist: resolveWebDist(),
  ebayMarketplaceId: req("EBAY_MARKETPLACE_ID", "EBAY-US"),
  ebaySearchQuery: req("EBAY_SEARCH_QUERY", ""),
  moversMinCount: Math.max(
    1,
    parseInt(req("DASHBOARD_MOVERS_MIN_COUNT", "2"), 10) || 2
  ),
  moversLimit: Math.min(
    100,
    Math.max(1, parseInt(req("DASHBOARD_MOVERS_LIMIT", "20"), 10) || 20)
  ),
  disclaimerAskingSample:
    "Median asking price from active listings returned by your saved search sample—not sold FMV or full eBay inventory.",
  usersCollection: req("MONGODB_USERS_COLLECTION", "app_users"),
  pendingSignupsCollection: req("MONGODB_PENDING_SIGNUPS_COLLECTION", "app_pending_signups"),
  communityArticlesCollection: req("MONGODB_COMMUNITY_COLLECTION", "app_community_articles"),
  /** HS256 secret for auth cookies; required when NODE_ENV=production */
  authJwtSecret: req("AUTH_JWT_SECRET", ""),
  authCookieName: req("AUTH_COOKIE_NAME", "nixsor_auth"),
  /** Set true behind HTTPS so auth cookie is Secure */
  authCookieSecure: req("AUTH_COOKIE_SECURE", "").toLowerCase() === "true",
  /** Resend API for login OTP and password-reset emails */
  resendApiKey: req("RESEND_API_KEY", ""),
  /** Full From header value for Resend, e.g. `Nixsora <no-reply@nixsora.com>` */
  resendFromLine,
  appPublicName: req("APP_PUBLIC_NAME", "Nixsora"),
  /**
   * First-visit human check (Cloudflare Turnstile). Requires TURNSTILE_SECRET_KEY.
   * Client needs VITE_TURNSTILE_SITE_KEY and VITE_HUMAN_CHECK_ENABLED=true.
   */
  humanCheckEnabled:
    req("HUMAN_CHECK_ENABLED", "").toLowerCase() === "true" &&
    Boolean(req("TURNSTILE_SECRET_KEY", "").trim()),
  turnstileSecretKey: req("TURNSTILE_SECRET_KEY", ""),
  humanCookieName: req("HUMAN_COOKIE_NAME", "nix_human"),
  humanCookieMaxAgeSec: Math.max(
    3600,
    parseInt(req("HUMAN_COOKIE_MAX_AGE_SEC", "604800"), 10) || 604800
  ),
};
