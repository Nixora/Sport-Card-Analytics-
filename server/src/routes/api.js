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

const router = express.Router();

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

module.exports = router;
