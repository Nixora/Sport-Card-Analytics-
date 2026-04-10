const express = require("express");
const config = require("../config");
const { getDb } = require("../db");
const { getCoverage } = require("../services/coverage");
const {
  listCards,
  getCardByKey,
  listingsForCard,
  SORT_API,
} = require("../services/cards");
const { getTopMovers } = require("../services/movers");
const { listSellers, getSellerProfile } = require("../services/sellers");
const {
  findUserByDisplayNameLc,
  findUserById,
  publicProfileView,
  getImageBuffer,
} = require("../services/users");
const { router: authRouter, requireUser, optionalUser } = require("./auth");
const community = require("../services/community");

const router = express.Router();

router.use("/auth", authRouter);

function normalizePublicProfileSlug(param) {
  return decodeURIComponent(String(param || "").trim()).toLowerCase();
}

router.get("/users/public/:displayName/profile", async (req, res, next) => {
  try {
    const db = await getDb();
    const slug = normalizePublicProfileSlug(req.params.displayName);
    if (!slug) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const u = await findUserByDisplayNameLc(db, slug);
    if (!u) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({ profile: publicProfileView(u) });
  } catch (e) {
    next(e);
  }
});

router.get("/users/community/:userId/avatar", async (req, res, next) => {
  try {
    const s = String(req.params.userId || "").trim();
    if (!/^[a-f0-9]{24}$/i.test(s)) {
      res.status(404).end();
      return;
    }
    const db = await getDb();
    const user = await findUserById(db, s);
    if (!user?.avatar?.id || user.avatar.data == null) {
      res.status(404).end();
      return;
    }
    const got = getImageBuffer(user, user.avatar.id);
    if (!got?.buffer) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", got.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(got.buffer);
  } catch (e) {
    next(e);
  }
});

router.get("/users/public/:displayName/avatar", async (req, res, next) => {
  try {
    const db = await getDb();
    const slug = normalizePublicProfileSlug(req.params.displayName);
    if (!slug) {
      res.status(404).end();
      return;
    }
    const u = await findUserByDisplayNameLc(db, slug);
    if (!u?.avatar?.id) {
      res.status(404).end();
      return;
    }
    const got = getImageBuffer(u, u.avatar.id);
    if (!got?.buffer) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", got.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.send(got.buffer);
  } catch (e) {
    next(e);
  }
});

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sports-card-analytics-api" });
});

router.get("/meta", (_req, res) => {
  res.json({
    marketplaceId: config.ebayMarketplaceId,
    searchQuery: config.ebaySearchQuery || null,
    disclaimer: config.disclaimerAskingSample,
    cardSortOptions: Object.keys(SORT_API),
  });
});

router.get("/coverage", async (_req, res, next) => {
  try {
    const db = await getDb();
    const body = await getCoverage(db);
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/cards", async (req, res, next) => {
  try {
    const db = await getDb();
    const body = await listCards(db, req.query);
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/sellers", async (req, res, next) => {
  try {
    const db = await getDb();
    const body = await listSellers(db, req.query);
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/sellers/:sellerUsername", async (req, res, next) => {
  try {
    const db = await getDb();
    const body = await getSellerProfile(db, req.params.sellerUsername, req.query);
    if (!body) return res.status(404).json({ error: "Seller not found" });
    res.json(body);
  } catch (e) {
    next(e);
  }
});

router.get("/cards/:cardKey", async (req, res, next) => {
  try {
    const db = await getDb();
    const card = await getCardByKey(db, req.params.cardKey);
    if (!card) return res.status(404).json({ error: "Card not found" });
    res.json(card);
  } catch (e) {
    next(e);
  }
});

router.get("/cards/:cardKey/listings", async (req, res, next) => {
  try {
    const db = await getDb();
    const lim = parseInt(req.query.limit, 10) || 20;
    const listings = stripRaw(
      await listingsForCard(db, req.params.cardKey, lim)
    );
    res.json({ card_key: req.params.cardKey, listings });
  } catch (e) {
    next(e);
  }
});

function stripRaw(docs) {
  return docs.map((d) => {
    const { raw_item_summary, ...rest } = d;
    return rest;
  });
}

router.get("/movers", async (req, res, next) => {
  try {
    const db = await getDb();
    const items = await getTopMovers(db, req.query);
    res.json({
      items,
      minCountDefault: config.moversMinCount,
      disclaimer: config.disclaimerAskingSample,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/community/articles", async (_req, res, next) => {
  try {
    const db = await getDb();
    const articles = await community.listArticleSummaries(db);
    res.json({ articles });
  } catch (e) {
    next(e);
  }
});

router.get("/community/articles/:id", optionalUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const viewerId = req.authUser ? String(req.authUser._id) : null;
    const article = await community.getArticleForRead(db, req.params.id, viewerId);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.json({ article });
  } catch (e) {
    next(e);
  }
});

router.post("/community/articles", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const created = await community.createArticle(db, req.authUser, req.body || {});
    res.status(201).json({ article: created });
  } catch (e) {
    if (e.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

router.post("/community/articles/:id/answers", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const article = await community.addAnswer(db, req.params.id, req.authUser, req.body || {});
    res.status(201).json({ article });
  } catch (e) {
    if (e.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

router.post("/community/articles/:id/helpful", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const { article, alreadyVoted } = await community.addHelpfulVote(db, req.params.id, req.authUser);
    res.json({ article, alreadyVoted });
  } catch (e) {
    if (e.status) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    next(e);
  }
});

module.exports = router;
