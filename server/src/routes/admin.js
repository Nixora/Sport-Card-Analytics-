const express = require("express");
const { ObjectId } = require("mongodb");
const config = require("../config");
const { getDb } = require("../db");
const { listCards } = require("../services/cards");
const community = require("../services/community");

const router = express.Router();

function isAdminEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  const list = Array.isArray(config.adminEmails) ? config.adminEmails : [];
  return list.includes(e);
}

function requireAdmin(req, res, next) {
  if (!req.authUser) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  if (!isAdminEmail(req.authUser.email)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

function usersCol(db) {
  return db.collection(config.usersCollection);
}

function parseObjectId(id) {
  const s = String(id || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(s)) return null;
  try {
    return new ObjectId(s);
  } catch {
    return null;
  }
}

// ---- Users ----

router.get("/users", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const q = String(req.query.q || "").trim().toLowerCase();
    const filter = q
      ? {
          $or: [
            { email: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { display_name_lc: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      usersCol(db).countDocuments(filter),
      usersCol(db)
        .find(filter, {
          projection: {
            password_hash: 0,
            password_reset: 0,
            images: 0,
            avatar: 0,
          },
        })
        .sort({ created_at: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const items = rows.map((u) => ({
      id: String(u._id),
      email: u.email || "",
      display_name: u.display_name || null,
      display_name_lc: u.display_name_lc || null,
      is_admin: isAdminEmail(u.email),
      created_at: u.created_at || null,
      country: u.country || null,
      is_ebay_seller: Boolean(u.is_ebay_seller),
      ebay_seller_username: u.ebay_seller_username || null,
    }));

    res.json({ items, total, page, limit });
  } catch (e) {
    next(e);
  }
});

router.delete("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const oid = parseObjectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }
    const selfId = String(req.authUser?._id || "");
    if (selfId && selfId === String(oid)) {
      res.status(400).json({ error: "You cannot delete your own user" });
      return;
    }
    const db = await getDb();
    const r = await usersCol(db).deleteOne({ _id: oid });
    if (r.deletedCount === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---- Cards ----

router.get("/cards", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const sort = req.query.sort || "recency";
    const order = req.query.order || "desc";
    const body = await listCards(db, { ...req.query, page, limit, sort, order });
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.delete("/cards/:cardKey", requireAdmin, async (req, res, next) => {
  try {
    const key = decodeURIComponent(String(req.params.cardKey || "")).trim();
    if (!key) {
      res.status(400).json({ error: "Missing card key" });
      return;
    }
    const db = await getDb();
    const items = db.collection(config.ebayItemsCollection);
    const r = await items.deleteMany({ card_key: key });
    res.json({ ok: true, deleted: r.deletedCount || 0 });
  } catch (e) {
    next(e);
  }
});

// ---- Community ----

router.get("/community/articles", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const articles = await community.listArticleSummaries(db);
    res.json({ articles });
  } catch (e) {
    next(e);
  }
});

router.delete("/community/articles/:id", requireAdmin, async (req, res, next) => {
  try {
    const oid = parseObjectId(req.params.id);
    if (!oid) {
      res.status(400).json({ error: "Invalid article id" });
      return;
    }
    const db = await getDb();
    const col = db.collection(config.communityArticlesCollection);
    const r = await col.deleteOne({ _id: oid });
    if (r.deletedCount === 0) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = { router, requireAdmin, isAdminEmail };

