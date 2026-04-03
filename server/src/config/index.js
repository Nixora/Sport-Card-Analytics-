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

module.exports = {
  port: parseInt(req("API_PORT", "5000"), 10) || 5000,
  apiListenHost: req("API_LISTEN_HOST", "0.0.0.0"),
  nodeEnv: req("NODE_ENV", "development"),
  mongoUri: req("MONGODB_URI", "mongodb://localhost:27017"),
  mongoDb: req("MONGODB_DB", "sports_cards"),
  ebayItemsCollection: req("MONGODB_COLLECTION", "ebay_items"),
  cardsCollection: req("MONGODB_CARDS_COLLECTION", "cards"),
  /** @deprecated use clientOrigins */
  clientOrigin: clientOrigins[0] || "http://localhost:5173",
  clientOrigins,
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
};
