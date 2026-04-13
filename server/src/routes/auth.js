const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const config = require("../config");
const { getDb } = require("../db");
const {
  isEmailConfigured,
  sendSignupOtpEmail,
  sendPasswordResetLinkEmail,
} = require("../services/emailResend");
const {
  ensurePendingSignupIndexes,
  replacePendingSignup,
  findPendingSignupById,
  deletePendingSignupById,
} = require("../services/pendingSignup");
const {
  ensureUserIndexes,
  buildValidatedSignupPayload,
  insertUserFromSignupPayload,
  findUserByEmail,
  findUserById,
  publicUser,
  getImageBuffer,
  updateUserProfile,
  setUserAvatar,
  setPasswordResetOnUser,
  findUserByPasswordResetLookupHash,
  clearPasswordResetOnUser,
  updateUserPasswordPlain,
} = require("../services/users");

const router = express.Router();

function jwtSecret() {
  const s = config.authJwtSecret;
  if (config.nodeEnv === "production" && !s) {
    throw new Error("AUTH_JWT_SECRET is required in production");
  }
  return s || "dev-only-nixsor-auth-change-me";
}

function cookieOpts() {
  const maxAge = 14 * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    maxAge,
    sameSite: "lax",
    path: "/",
    secure: Boolean(config.authCookieSecure),
  };
}

function signToken(userId) {
  return jwt.sign({ sub: String(userId), v: 1 }, jwtSecret(), { expiresIn: "14d" });
}

const OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_LINK_TTL_MS = 60 * 60 * 1000;

function hashPasswordResetLookup(rawToken, secret) {
  const t = String(rawToken || "").trim();
  if (!t) return "";
  return crypto.createHmac("sha256", secret).update(`pwdreset:${t}`).digest("hex");
}

function hashOtp(kind, userId, plain, secret) {
  return crypto.createHmac("sha256", secret).update(`${kind}:${userId}:${plain}`).digest("hex");
}

function otpMatches(stored, kind, userId, plain) {
  if (!stored?.hash || !stored?.expires_at) return false;
  if (new Date(stored.expires_at) < new Date()) return false;
  const want = hashOtp(kind, userId, String(plain || "").trim(), jwtSecret());
  const a = Buffer.from(want, "utf8");
  const b = Buffer.from(String(stored.hash), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function generateNumericOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function signSignupChallenge(pendingId) {
  return jwt.sign({ sub: String(pendingId), typ: "signup_otp", v: 1 }, jwtSecret(), { expiresIn: "15m" });
}

function readUserId(req) {
  const raw = req.cookies?.[config.authCookieName];
  if (!raw) return null;
  try {
    const p = jwt.verify(raw, jwtSecret());
    if (!p?.sub) return null;
    return String(p.sub);
  } catch {
    return null;
  }
}

async function requireUser(req, res, next) {
  try {
    const id = readUserId(req);
    if (!id) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    const db = await getDb();
    const user = await findUserById(db, id);
    if (!user) {
      res.clearCookie(config.authCookieName, { path: "/" });
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    req.authUser = user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Sets `req.authUser` when a valid session exists; otherwise `null`. Never sends 401. */
async function optionalUser(req, res, next) {
  try {
    const id = readUserId(req);
    if (!id) {
      req.authUser = null;
      next();
      return;
    }
    const db = await getDb();
    const user = await findUserById(db, id);
    req.authUser = user || null;
    next();
  } catch (e) {
    next(e);
  }
}

/** Step 1: validate fields, store pending signup, email 6-digit code, return `signup_challenge` JWT. */
router.post("/signup", async (req, res, next) => {
  try {
    if (config.nodeEnv === "production" && !isEmailConfigured()) {
      res.status(503).json({ error: "Sign-up email is not configured (Resend)" });
      return;
    }

    const db = await getDb();
    await ensureUserIndexes(db);
    await ensurePendingSignupIndexes(db);

    const payload = await buildValidatedSignupPayload(db, {
      email: req.body?.email,
      password: req.body?.password,
      display_name: req.body?.display_name,
    });

    const pendingId = new ObjectId();
    const otp = generateNumericOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const hash = hashOtp("signup", String(pendingId), otp, jwtSecret());
    await replacePendingSignup(db, pendingId, payload, { hash, expires_at: expiresAt });

    try {
      await sendSignupOtpEmail(payload.email, otp);
    } catch (sendErr) {
      await deletePendingSignupById(db, String(pendingId));
      next(sendErr);
      return;
    }

    if (!isEmailConfigured() && config.nodeEnv !== "production") {
      console.warn("[auth] Sign-up OTP for %s (dev, no Resend): %s", payload.email, otp);
    }

    const signup_challenge = signSignupChallenge(String(pendingId));
    res.status(202).json({ signup_challenge, email_masked: maskEmail(payload.email) });
  } catch (e) {
    if (e?.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

/** Step 2: verify emailed code, create user, session cookie. */
router.post("/signup/verify-otp", async (req, res, next) => {
  try {
    const signup_challenge = req.body?.signup_challenge;
    const otp = String(req.body?.otp || "").trim();
    if (!signup_challenge || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }
    let payload;
    try {
      payload = jwt.verify(signup_challenge, jwtSecret());
    } catch {
      res.status(401).json({ error: "Sign-up session expired. Please start again." });
      return;
    }
    if (payload?.typ !== "signup_otp" || !payload?.sub) {
      res.status(400).json({ error: "Invalid sign-up session" });
      return;
    }
    const pendingId = String(payload.sub);
    const db = await getDb();
    const pending = await findPendingSignupById(db, pendingId);
    if (!pending || !otpMatches(pending.signup_otp, "signup", pendingId, otp)) {
      res.status(401).json({ error: "Invalid or expired verification code" });
      return;
    }

    const core = {
      email: pending.email,
      password_hash: pending.password_hash,
      display_name: pending.display_name,
      display_name_lc: pending.display_name_lc,
    };

    let user;
    try {
      user = await insertUserFromSignupPayload(db, core);
    } catch (ins) {
      await deletePendingSignupById(db, pendingId);
      if (ins?.status) {
        res.status(ins.status).json({ error: ins.message });
        return;
      }
      next(ins);
      return;
    }

    await deletePendingSignupById(db, pendingId);
    const token = signToken(user._id);
    res.cookie(config.authCookieName, token, cookieOpts());
    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post("/signin", async (req, res, next) => {
  try {
    const email = req.body?.email;
    const password = req.body?.password;
    const db = await getDb();
    const user = await findUserByEmail(db, email);
    if (!user || !(await bcrypt.compare(String(password || ""), user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = signToken(user._id);
    res.cookie(config.authCookieName, token, cookieOpts());
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

function maskEmail(email) {
  const s = String(email || "").trim();
  const at = s.indexOf("@");
  if (at < 1) return "";
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const show = local.length <= 2 ? local[0] || "*" : `${local.slice(0, 2)}…`;
  return `${show}@${domain}`;
}

/** Always 200 to avoid email enumeration. */
router.post("/forgot-password", async (req, res, next) => {
  try {
    if (config.nodeEnv === "production" && !isEmailConfigured()) {
      res.json({ ok: true });
      return;
    }
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const db = await getDb();
    if (!email) {
      res.json({ ok: true });
      return;
    }
    const user = await findUserByEmail(db, email);
    if (!user) {
      res.json({ ok: true });
      return;
    }
    if (!config.publicAppUrl) {
      if (config.nodeEnv === "production") {
        console.error("[auth] PUBLIC_APP_URL (or CLIENT_ORIGIN) is required for password reset links.");
      }
      res.json({ ok: true });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const lookupHash = hashPasswordResetLookup(rawToken, jwtSecret());
    const userId = String(user._id);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_LINK_TTL_MS);
    await setPasswordResetOnUser(db, userId, { lookup_hash: lookupHash, expires_at: expiresAt });

    const resetUrl = `${config.publicAppUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    try {
      await sendPasswordResetLinkEmail(user.email, resetUrl);
    } catch (sendErr) {
      await clearPasswordResetOnUser(db, userId);
      next(sendErr);
      return;
    }
    if (!isEmailConfigured() && config.nodeEnv !== "production") {
      console.warn("[auth] Password reset link for %s (dev, no Resend): %s", user.email, resetUrl);
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const rawToken = String(req.body?.token || "").trim();
    const newPassword = req.body?.new_password;
    if (!rawToken || !/^[a-f0-9]{64}$/i.test(rawToken)) {
      res.status(400).json({ error: "Invalid or expired reset link" });
      return;
    }
    const db = await getDb();
    const lookupHash = hashPasswordResetLookup(rawToken, jwtSecret());
    const user = await findUserByPasswordResetLookupHash(db, lookupHash);
    const pr = user?.password_reset;
    if (!user || !pr?.lookup_hash || !pr?.expires_at) {
      res.status(400).json({ error: "Invalid or expired reset link" });
      return;
    }
    if (new Date(pr.expires_at) < new Date()) {
      await clearPasswordResetOnUser(db, String(user._id));
      res.status(400).json({ error: "This reset link has expired. Request a new one." });
      return;
    }
    await updateUserPasswordPlain(db, String(user._id), newPassword);
    res.json({ ok: true });
  } catch (e) {
    if (e?.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

router.post("/signout", (_req, res) => {
  res.clearCookie(config.authCookieName, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireUser, (req, res) => {
  res.json({ user: publicUser(req.authUser) });
});

router.post("/me/password", requireUser, async (req, res, next) => {
  try {
    const current = String(req.body?.current_password || "");
    const nextPass = req.body?.new_password;
    if (!(await bcrypt.compare(current, req.authUser.password_hash))) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const db = await getDb();
    const user = await updateUserPasswordPlain(db, String(req.authUser._id), nextPass);
    res.json({ user: publicUser(user) });
  } catch (e) {
    if (e?.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

router.patch("/me", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const body = req.body || {};
    const patch = {
      country: body.country,
      is_ebay_seller: body.is_ebay_seller,
      ebay_seller_username: body.ebay_seller_username,
      favorite_athletes: body.favorite_athletes,
      favorite_sports: body.favorite_sports,
    };
    if (Object.prototype.hasOwnProperty.call(body, "display_name")) {
      if (String(req.authUser.display_name_lc || "").trim()) {
        res.status(400).json({ error: "Display name cannot be changed after it is set" });
        return;
      }
      patch.display_name = body.display_name;
    }
    const user = await updateUserProfile(db, String(req.authUser._id), patch);
    res.json({ user: publicUser(user) });
  } catch (e) {
    if (e?.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1536 * 1024, files: 1 },
});

router.post("/me/avatar", requireUser, avatarUpload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Missing avatar file (field name: avatar)" });
      return;
    }
    const db = await getDb();
    const user = await setUserAvatar(db, String(req.authUser._id), req.file);
    res.json({ user: publicUser(user) });
  } catch (e) {
    if (e?.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Avatar must be at most 1.5 MB" });
      return;
    }
    if (e?.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

/** Serves stored profile images (e.g. avatar) after you add them via profile edit. */
router.get("/me/images/:imageId", requireUser, (req, res) => {
  const { imageId } = req.params;
  const got = getImageBuffer(req.authUser, imageId);
  if (!got) {
    res.status(404).json({ error: "Image not found" });
    return;
  }
  res.setHeader("Content-Type", got.contentType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(got.buffer);
});

module.exports = { router, requireUser, optionalUser };
