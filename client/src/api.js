const BASE = import.meta.env.VITE_API_URL || "";
const REQUEST_TIMEOUT_MS = 15_000;

/** Prefer server `message` (e.g. Mongo / stack detail in dev) when JSON `error` is generic. */
function formatApiError(body, r) {
  const statusBit = `${r.status} ${r.statusText}`;
  if (!body) return statusBit;
  const err = body.error || statusBit;
  const detail = body.message != null ? String(body.message).trim() : "";
  if (detail && !String(err).includes(detail)) {
    return `${err}: ${detail}`;
  }
  return err;
}

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

export function fetchSellers(params = {}) {
  const q = new URLSearchParams(params).toString();
  return getJson(`/api/sellers?${q}`);
}

export function fetchSellerProfile(sellerUsername, params = {}) {
  const q = new URLSearchParams(params).toString();
  return getJson(`/api/sellers/${encodeURIComponent(sellerUsername)}?${q}`);
}

export function fetchCommunityArticles() {
  return getJson("/api/community/articles");
}

export function fetchCommunityArticle(id) {
  return getJson(`/api/community/articles/${encodeURIComponent(id)}`);
}

export function createCommunityArticle(payload) {
  return authFetch("/api/community/articles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createCommunityAnswer(articleId, body) {
  return authFetch(`/api/community/articles/${encodeURIComponent(articleId)}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export function postCommunityHelpful(articleId) {
  return authFetch(`/api/community/articles/${encodeURIComponent(articleId)}/helpful`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

/** @param {string} displayNameLc lowercase unique slug (spaces allowed; encoded in URL) */
export function fetchPublicProfile(displayNameLc) {
  const key = encodeURIComponent(String(displayNameLc || "").trim().toLowerCase());
  return getJson(`/api/users/public/${key}/profile`);
}

/** Avatar image URL for a public profile (no auth). */
export function publicProfileAvatarUrl(displayNameLc) {
  const key = encodeURIComponent(String(displayNameLc || "").trim().toLowerCase());
  return `${BASE}/api/users/public/${key}/avatar`;
}

export function publicProfilePath(displayNameLc) {
  return `/u/${encodeURIComponent(String(displayNameLc || "").trim().toLowerCase())}`;
}

/** Avatar image for a community author (Mongo user id). Returns 404 if none. */
export function communityMemberAvatarUrl(userId) {
  const id = String(userId || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(id)) return "";
  return `${BASE}/api/users/community/${encodeURIComponent(id)}/avatar`;
}

const AUTH_TIMEOUT_MS = 30_000;

async function authFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await r.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text };
      }
    }
    if (!r.ok) {
      throw new Error(formatApiError(body, r));
    }
    return body;
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(`Request timeout after ${AUTH_TIMEOUT_MS / 1000}s.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMe() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (r.status === 401) return { user: null };
    const text = await r.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text };
      }
    }
    if (!r.ok) {
      throw new Error(formatApiError(body, r));
    }
    return body;
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(`Request timeout after ${AUTH_TIMEOUT_MS / 1000}s.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function signIn(email, password) {
  return authFetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function signOut() {
  return authFetch("/api/auth/signout", { method: "POST" });
}

export function signUp(email, password, display_name) {
  return authFetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name }),
  });
}

/** Signed-in user's profile image URL (same origin / proxied API). */
export function profileImageUrl(imageId) {
  return `${BASE}/api/auth/me/images/${encodeURIComponent(imageId)}`;
}

export function updateProfile(payload) {
  return authFetch("/api/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadProfileAvatar(file) {
  const fd = new FormData();
  fd.append("avatar", file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/api/auth/me/avatar`, {
      method: "POST",
      body: fd,
      credentials: "include",
      signal: controller.signal,
    });
    const text = await r.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text };
      }
    }
    if (!r.ok) {
      throw new Error(formatApiError(body, r));
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}
