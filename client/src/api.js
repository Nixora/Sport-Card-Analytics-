const BASE = import.meta.env.VITE_API_URL || "";
const REQUEST_TIMEOUT_MS = 15_000;

async function getJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`${r.status} ${t || r.statusText}`);
    }
    return r.json();
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(
        `Request timeout after ${REQUEST_TIMEOUT_MS / 1000}s. Check API server and SSH tunnel.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchMeta() {
  return getJson("/api/meta");
}

export function fetchCoverage() {
  return getJson("/api/coverage");
}

export function fetchCards(params) {
  const q = new URLSearchParams(params).toString();
  return getJson(`/api/cards?${q}`);
}

export function fetchCard(cardKey) {
  return getJson(`/api/cards/${encodeURIComponent(cardKey)}`);
}

export function fetchCardListings(cardKey, limit = 20) {
  return getJson(
    `/api/cards/${encodeURIComponent(cardKey)}/listings?limit=${limit}`
  );
}

export function fetchMovers(params = {}) {
  const q = new URLSearchParams(params).toString();
  return getJson(`/api/movers?${q}`);
}
