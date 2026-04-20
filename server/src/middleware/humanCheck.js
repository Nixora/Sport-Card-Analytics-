const config = require("../config");

/**
 * GET/HEAD paths that are intentionally readable without Turnstile (catalog + health + public profiles).
 * Mounted under `/api`, so `req.path` is the suffix (e.g. `/cards`, `/meta`).
 */
function isPublicCatalogReadApi(req) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const p = req.path || "";
  if (p === "/health" || p === "/meta") return true;
  if (p === "/integrations/nixsora-next/health") return true;
  if (p === "/cards" || p.startsWith("/cards/")) return true;
  if (p === "/sellers" || p.startsWith("/sellers/")) return true;
  if (p === "/coverage" || p === "/movers") return true;
  if (p === "/community/articles" || p.startsWith("/community/articles/")) return true;
  if (p.startsWith("/users/public/")) return true;
  return false;
}

/** Block /api/* until Turnstile verification cookie is set (when human check is enabled). */
function humanCheckApi(req, res, next) {
  if (!config.humanCheckEnabled) {
    next();
    return;
  }
  if (req.method === "OPTIONS") {
    next();
    return;
  }
  if (!config.humanCheckRequireForPublicReads && isPublicCatalogReadApi(req)) {
    next();
    return;
  }
  if (
    config.mainBackendBffSecret &&
    req.get("x-nixsora-bff-secret") === config.mainBackendBffSecret
  ) {
    next();
    return;
  }
  if (req.path.startsWith("/human/")) {
    next();
    return;
  }
  if (req.cookies[config.humanCookieName] === "1") {
    next();
    return;
  }
  res.status(403).json({
    error: "Human verification required",
    code: "HUMAN_REQUIRED",
  });
}

module.exports = { humanCheckApi };
