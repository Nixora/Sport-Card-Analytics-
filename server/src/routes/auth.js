const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");
const { getDb } = require("../db");
const {
  ensureUserIndexes,
  createUser,
  findUserByEmail,
  findUserById,
  publicUser,
  getImageBuffer,
  updateUserProfile,
  setUserAvatar,
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

router.post("/signup", async (req, res, next) => {
  try {
    const db = await getDb();
    await ensureUserIndexes(db);

    const user = await createUser(db, {
      email: req.body?.email,
      password: req.body?.password,
      display_name: req.body?.display_name,
    });

    const token = signToken(user._id);
    res.cookie(config.authCookieName, token, cookieOpts());
    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    if (e?.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
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

router.post("/signout", (_req, res) => {
  res.clearCookie(config.authCookieName, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireUser, (req, res) => {
  res.json({ user: publicUser(req.authUser) });
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
