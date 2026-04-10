const { ObjectId, Binary } = require("mongodb");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const config = require("../config");

const BCRYPT_ROUNDS = 11;
const AVATAR_MAX_BYTES = 1536 * 1024;
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function splitList(raw) {
  if (raw == null) return [];
  const s = String(raw).trim();
  if (!s) return [];
  return s
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function usersCol(db) {
  return db.collection(config.usersCollection);
}

async function ensureUserIndexes(db) {
  const c = usersCol(db);
  await c.createIndex({ email: 1 }, { unique: true });
  await c.createIndex({ display_name_lc: 1 }, { unique: true, sparse: true });
}

/** @param {unknown} raw */
function parseDisplayName(raw) {
  const display_name = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!display_name) {
    const e = new Error("Display name is required");
    e.status = 400;
    throw e;
  }
  if (display_name.length < 2) {
    const e = new Error("Display name must be at least 2 characters");
    e.status = 400;
    throw e;
  }
  if (display_name.length > 40) {
    const e = new Error("Display name must be at most 40 characters");
    e.status = 400;
    throw e;
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.'-]{1,39}$/u.test(display_name)) {
    const e = new Error(
      "Display name may only use letters, numbers, spaces, and . _ ' -"
    );
    e.status = 400;
    throw e;
  }
  const display_name_lc = display_name.toLowerCase();
  return { display_name, display_name_lc };
}

/**
 * @param {import('mongodb').Db} db
 * @param {{ email: string, password: string, display_name: string }} input
 */
async function createUser(db, input) {
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const e = new Error("Invalid email");
    e.status = 400;
    throw e;
  }
  const password = String(input.password || "");
  if (password.length < 8) {
    const e = new Error("Password must be at least 8 characters");
    e.status = 400;
    throw e;
  }

  const { display_name, display_name_lc } = parseDisplayName(input.display_name);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const doc = {
    email,
    password_hash: passwordHash,
    display_name,
    display_name_lc,
    is_ebay_seller: false,
    ebay_seller_username: null,
    favorite_athletes: [],
    favorite_sports: [],
    country: null,
    images: [],
    avatar: null,
    created_at: new Date(),
  };

  try {
    const r = await usersCol(db).insertOne(doc);
    return { ...doc, _id: r.insertedId };
  } catch (err) {
    if (err && err.code === 11000) {
      const key = err.keyPattern ? Object.keys(err.keyPattern)[0] : "";
      if (key === "display_name_lc") {
        const e = new Error("This display name is already taken");
        e.status = 409;
        throw e;
      }
      const e = new Error("An account with this email already exists");
      e.status = 409;
      throw e;
    }
    throw err;
  }
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} userId
 * @param {{
 *   country?: string | null,
 *   is_ebay_seller?: boolean,
 *   ebay_seller_username?: string | null,
 *   favorite_athletes?: string[],
 *   favorite_sports?: string[],
 *   display_name?: string,
 * }} patch
 */
async function updateUserProfile(db, userId, patch) {
  let oid;
  try {
    oid = new ObjectId(userId);
  } catch {
    const e = new Error("Invalid user");
    e.status = 400;
    throw e;
  }

  const isEbay = Boolean(patch.is_ebay_seller);
  let ebayUsername = null;
  if (isEbay) {
    const u = String(patch.ebay_seller_username || "").trim();
    if (!u) {
      const e = new Error("eBay seller username is required when you are a seller");
      e.status = 400;
      throw e;
    }
    ebayUsername = u;
  }

  const country =
    patch.country == null || String(patch.country).trim() === ""
      ? null
      : String(patch.country).trim().slice(0, 120);

  const athletes = Array.isArray(patch.favorite_athletes)
    ? patch.favorite_athletes.map((x) => String(x).trim()).filter(Boolean).slice(0, 200)
    : splitList(patch.favorite_athletes);

  const sports = Array.isArray(patch.favorite_sports)
    ? patch.favorite_sports.map((x) => String(x).trim()).filter(Boolean).slice(0, 200)
    : splitList(patch.favorite_sports);

  const $set = {
    is_ebay_seller: isEbay,
    ebay_seller_username: ebayUsername,
    favorite_athletes: athletes,
    favorite_sports: sports,
    country,
    updated_at: new Date(),
  };

  if (Object.prototype.hasOwnProperty.call(patch, "display_name")) {
    const cur = await usersCol(db).findOne({ _id: oid }, { projection: { display_name_lc: 1 } });
    if (cur?.display_name_lc) {
      const e = new Error("Display name cannot be changed after it is set");
      e.status = 400;
      throw e;
    }
    const { display_name, display_name_lc } = parseDisplayName(patch.display_name);
    const taken = await usersCol(db).findOne({
      display_name_lc,
      _id: { $ne: oid },
    });
    if (taken) {
      const e = new Error("This display name is already taken");
      e.status = 409;
      throw e;
    }
    $set.display_name = display_name;
    $set.display_name_lc = display_name_lc;
  }

  const ur = await usersCol(db).updateOne({ _id: oid }, { $set });
  if (ur.matchedCount === 0) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }
  const next = await findUserById(db, userId);
  if (!next) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }
  return next;
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} userId
 * @param {{ buffer: Buffer, mimetype: string }} file
 */
async function setUserAvatar(db, userId, file) {
  let oid;
  try {
    oid = new ObjectId(userId);
  } catch {
    const e = new Error("Invalid user");
    e.status = 400;
    throw e;
  }
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    const e = new Error("Missing image file");
    e.status = 400;
    throw e;
  }
  if (file.buffer.length > AVATAR_MAX_BYTES) {
    const e = new Error("Avatar must be at most 1.5 MB");
    e.status = 400;
    throw e;
  }
  const mt = String(file.mimetype || "").toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mt)) {
    const e = new Error("Only JPEG, PNG, GIF, and WebP images are allowed");
    e.status = 400;
    throw e;
  }

  const avatar = {
    id: crypto.randomUUID(),
    contentType: mt,
    data: new Binary(file.buffer),
  };

  const ur = await usersCol(db).updateOne(
    { _id: oid },
    { $set: { avatar, updated_at: new Date() } }
  );
  if (ur.matchedCount === 0) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }
  const next = await findUserById(db, userId);
  if (!next) {
    const e = new Error("User not found");
    e.status = 404;
    throw e;
  }
  return next;
}

async function findUserByEmail(db, email) {
  const em = String(email || "")
    .trim()
    .toLowerCase();
  if (!em) return null;
  return usersCol(db).findOne({ email: em });
}

async function findUserById(db, id) {
  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  return usersCol(db).findOne({ _id: oid });
}

/**
 * @param {import('mongodb').Db} db
 * @param {string} displayNameLc lowercase, trimmed (URL slug decoded)
 */
async function findUserByDisplayNameLc(db, displayNameLc) {
  const key = String(displayNameLc || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  return usersCol(db).findOne({ display_name_lc: key });
}

/** Public profile for other users — no email or internal ids. */
function publicProfileView(user) {
  if (!user) return null;
  return {
    display_name: user.display_name || null,
    display_name_lc: user.display_name_lc || null,
    country: user.country || null,
    is_ebay_seller: Boolean(user.is_ebay_seller),
    ebay_seller_username: user.ebay_seller_username || null,
    favorite_athletes: user.favorite_athletes || [],
    favorite_sports: user.favorite_sports || [],
    has_avatar: Boolean(user.avatar && user.avatar.id && user.avatar.data != null),
  };
}

function publicUser(user) {
  if (!user) return null;
  const images = Array.isArray(user.images) ? user.images : [];
  const av = user.avatar && user.avatar.id ? user.avatar : null;
  return {
    id: String(user._id),
    email: user.email,
    display_name: user.display_name || null,
    display_name_lc: user.display_name_lc || null,
    is_ebay_seller: Boolean(user.is_ebay_seller),
    ebay_seller_username: user.ebay_seller_username || null,
    favorite_athletes: user.favorite_athletes || [],
    favorite_sports: user.favorite_sports || [],
    country: user.country || null,
    avatar: av
      ? { id: av.id, contentType: av.contentType || "application/octet-stream" }
      : null,
    images: images.map((im) => ({
      id: im.id,
      contentType: im.contentType || "application/octet-stream",
    })),
    created_at: user.created_at || null,
  };
}

function bufferFromBinary(raw) {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw?.buffer != null) return Buffer.from(raw.buffer);
  return Buffer.from(raw);
}

function getImageBuffer(user, imageId) {
  if (user?.avatar?.id === imageId && user.avatar.data != null) {
    return {
      buffer: bufferFromBinary(user.avatar.data),
      contentType: user.avatar.contentType || "application/octet-stream",
    };
  }
  const images = Array.isArray(user?.images) ? user.images : [];
  const im = images.find((x) => x && x.id === imageId);
  if (!im || im.data == null) return null;
  return {
    buffer: bufferFromBinary(im.data),
    contentType: im.contentType || "application/octet-stream",
  };
}

module.exports = {
  ensureUserIndexes,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByDisplayNameLc,
  publicUser,
  publicProfileView,
  getImageBuffer,
  updateUserProfile,
  setUserAvatar,
  splitList,
  ALLOWED_IMAGE_MIME,
  AVATAR_MAX_BYTES,
};
