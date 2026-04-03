const config = require("../config");
const {
  latestTrend,
  trendPointDaysAgo,
  mergePreviewFields,
} = require("./cards");

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

  const cards = db.collection(config.cardsCollection);
  const cursor = cards.find(
    { trend: { $exists: true, $ne: [] } },
    { projection: { card_key: 1, title: 1, price_currency: 1, trend: 1 } }
  );

  const scored = [];
  for await (const doc of cursor) {
    const trend = doc.trend || [];
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
