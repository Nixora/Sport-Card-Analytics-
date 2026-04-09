const config = require("../config");

function listingDocQuery(extra = {}) {
  return {
    $and: [
      { $or: [{ doc_type: { $exists: false } }, { doc_type: "listing" }] },
      extra,
    ].filter(Boolean),
  };
}

/**
 * @param {import('mongodb').Db} db
 */
async function getCoverage(db) {
  const items = db.collection(config.ebayItemsCollection);

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
      items.distinct("card_key", listingDocQuery({ card_key: { $exists: true, $ne: null } })).then((a) => a.length),
      items.countDocuments(listingDocQuery({ fetched_at: { $gte: startUtc } })),
      items.findOne(listingDocQuery({}), {
        sort: { fetched_at: -1 },
        projection: { fetched_at: 1 },
      }),
      items.findOne(listingDocQuery({}), { sort: { last_seen_at: -1 }, projection: { last_seen_at: 1 } }),
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
