const config = require("../config");
const {
  latestTrend,
  trendPointDaysAgo,
  mergePreviewFields,
} = require("./cards");

function listingDocQuery(extra = {}) {
  return {
    $and: [{ $or: [{ doc_type: { $exists: false } }, { doc_type: "listing" }] }, extra].filter(
      Boolean
    ),
  };
}

/**
 * Top cards by 7d % change in median asking (trend), with count gates.
 * @param {import('mongodb').Db} db
 */
async function getTopMovers(db, query) {
  const minCount = Math.max(
    1,
    parseInt(query.minCount, 10) || config.moversMinCount
  );
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit, 10) || config.moversLimit)
  );

  const items = db.collection(config.ebayItemsCollection);
  const pipeline = [
    { $match: listingDocQuery({ trend: { $exists: true, $ne: [] }, card_key: { $exists: true, $ne: null } }) },
    { $project: { card_key: 1, title: 1, price_currency: 1, trend: 1 } },
    { $unwind: { path: "$trend", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: { card_key: "$card_key", date: "$trend.date" },
        card_key: { $last: "$card_key" },
        date: { $last: "$trend.date" },
        title: { $last: "$title" },
        price_currency: { $last: "$trend.price_currency" },
        prices: { $push: "$trend.price_value" },
      },
    },
    { $sort: { card_key: 1, date: 1 } },
    {
      $group: {
        _id: "$card_key",
        card_key: { $last: "$card_key" },
        title: { $last: "$title" },
        price_currency: { $last: "$price_currency" },
        trend_prices: { $push: { date: "$date", prices: "$prices" } },
      },
    },
  ];

  const scored = [];
  const docs = await items.aggregate(pipeline).toArray();
  for (const doc of docs) {
    // Compute median/count series in JS (same shape as cards service trend[]).
    const trend = (doc.trend_prices || [])
      .map((row) => {
        const nums = (row.prices || [])
          .map((v) => (v == null || v === "" ? null : Number(v)))
          .filter((n) => Number.isFinite(n));
        nums.sort((a, b) => a - b);
        if (!nums.length) return null;
        const mid = Math.floor(nums.length / 2);
        const med = nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        return { date: row.date, price: med, count: nums.length };
      })
      .filter(Boolean);
    const last = latestTrend(trend);
    if (!last || typeof last.price !== "number") continue;
    if ((last.count ?? 0) < minCount) continue;
    const prev = trendPointDaysAgo(trend, last.date, 7);
    if (!prev || typeof prev.price !== "number" || prev.price === 0) continue;
    if ((prev.count ?? 0) < minCount) continue;
    const pct =
      Math.round(((last.price - prev.price) / prev.price) * 10_000) / 100;
    scored.push({
      card_key: doc.card_key,
      title: doc.title,
      price_currency: doc.price_currency,
      latest_date: last.date,
      latest_price: last.price,
      latest_count: last.count,
      prior_date: prev.date,
      prior_price: prev.price,
      prior_count: prev.count,
      change_7d_pct: pct,
    });
  }

  scored.sort((a, b) => Math.abs(b.change_7d_pct) - Math.abs(a.change_7d_pct));
  const top = scored.slice(0, limit);
  return mergePreviewFields(db, top);
}

module.exports = { getTopMovers };
