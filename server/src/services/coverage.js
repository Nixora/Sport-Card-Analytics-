const config = require("../config");

/**
 * @param {import('mongodb').Db} db
 */
async function getCoverage(db) {
  const items = db.collection(config.ebayItemsCollection);
  const cards = db.collection(config.cardsCollection);

  const now = new Date();
  const startUtc = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  const [cardCount, listingsToday, lastListing, lastCardUpdate] =
    await Promise.all([
      cards.estimatedDocumentCount(),
      items.countDocuments({ fetched_at: { $gte: startUtc } }),
      items.findOne({}, { sort: { fetched_at: -1 }, projection: { fetched_at: 1 } }),
      cards.findOne({}, { sort: { last_seen_at: -1 }, projection: { last_seen_at: 1 } }),
    ]);

  return {
    cardsTrackedApprox: cardCount,
    listingsIngestedToday: listingsToday,
    lastListingFetchedAt: lastListing?.fetched_at ?? null,
    lastCardSeenAt: lastCardUpdate?.last_seen_at ?? null,
    marketplaceId: config.ebayMarketplaceId,
    searchQueryUsed: config.ebaySearchQuery || null,
    disclaimer: config.disclaimerAskingSample,
  };
}

module.exports = { getCoverage };
