import { formatPhotonSuggestion } from "./utils/photonLocation.js";

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

const PHOTON_API = "https://photon.komoot.io/api/";

/** Place search (OpenStreetMap via Photon). No API key. @param {AbortSignal} [signal] */
export async function fetchLocationSuggestions(query, signal) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const r = await fetch(`${PHOTON_API}?q=${encodeURIComponent(q)}&limit=8&lang=en`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!r.ok) return [];
  const data = await r.json();
  const list = (data.features || [])
    .map((f) => formatPhotonSuggestion(f))
    .filter(Boolean);
  return list;
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

// ---- Contact (public) ----

export function sendContactMessage(payload) {
  return authFetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
}

const JOB_APP_TIMEOUT_MS = 90_000;

/** Public multipart application (cookies included for human-check when enabled). */
export async function submitJobApplication(formData) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JOB_APP_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/api/job-applications`, {
      method: "POST",
      body: formData,
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
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(`Request timeout after ${JOB_APP_TIMEOUT_MS / 1000}s.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Admin ----

export function fetchAdminUsers(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetch(`/api/admin/users?${q}`);
}

export function deleteAdminUser(userId) {
  return authFetch(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export function fetchAdminCards(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetch(`/api/admin/cards?${q}`);
}

export function deleteAdminCard(cardKey) {
  return authFetch(`/api/admin/cards/${encodeURIComponent(cardKey)}`, { method: "DELETE" });
}

export function fetchAdminCommunityArticles() {
  return authFetch("/api/admin/community/articles");
}

export function fetchAdminJobApplications(params = {}) {
  const q = new URLSearchParams(params).toString();
  return authFetch(`/api/admin/job-applications?${q}`);
}

/** Binary resume file for an application (admin only). */
export async function fetchAdminJobApplicationResumeBlob(applicationId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const r = await fetch(
      `${BASE}/api/admin/job-applications/${encodeURIComponent(applicationId)}/resume`,
      {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      }
    );
    if (!r.ok) {
      const text = await r.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { error: text };
        }
      }
      throw new Error(formatApiError(body, r));
    }
    return r.blob();
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(`Request timeout after ${AUTH_TIMEOUT_MS / 1000}s.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function deleteAdminCommunityArticle(articleId) {
  return authFetch(`/api/admin/community/articles/${encodeURIComponent(articleId)}`, { method: "DELETE" });
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

/** Turnstile / human gate: requires cookies (same-site or CORS credentials). */
export async function fetchHumanStatus() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/api/human/status`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
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

export function verifyHumanToken(token) {
  return authFetch("/api/human/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
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

export function requestPasswordReset(email) {
  return authFetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordWithToken(token, new_password) {
  return authFetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });
}

export function changePassword(current_password, new_password) {
  return authFetch("/api/auth/me/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password, new_password }),
  });
}

export function signOut() {
  return authFetch("/api/auth/signout", { method: "POST" });
}

/** Sign-up step 1: validates and emails a 6-digit verification code. */
export function signUpRequestOtp(email, password, display_name) {
  return authFetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name }),
  });
}

/** Sign-up step 2: verifies OTP and sets the session cookie. */
export function signUpVerifyOtp(signup_challenge, otp) {
  return authFetch("/api/auth/signup/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signup_challenge, otp }),
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

// ---- Doc chat (public) ----
export function sendDocChatMessage(payload) {
  return authFetch("/api/doc-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
}
