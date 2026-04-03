const config = require("../config");
const { cardKeyFromTitle } = require("../utils/cardKey");

const SORT_API = {
  recency: "last_seen_at",
  activity: "trend_last_count",
  price: "trend_last_price",
};

function defaultPreview() {
  return {
    preview_image_url: null,
    preview_listing_url: null,
    seller_username: null,
    seller_feedback_percentage: null,
    seller_feedback_score: null,
    flags: {
      has_autograph: false,
      has_grade_or_auth: false,
      has_psa: false,
      has_bgs: false,
      has_jsa: false,
      has_beckett: false,
      has_coa: false,
    },
    sample_listing_fetched_at: null,
  };
}

function toNumberOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Latest eBay listing fields for each card_key (from recent ebay_items scan).
 * @param {import('mongodb').Db} db
 * @param {Set<string>} keySet
 */
async function fetchPreviewsForKeys(db, keySet) {
  const out = new Map();
  if (!keySet || keySet.size === 0) return out;
  const items = db.collection(config.ebayItemsCollection);
  const rows = await items
    .find(
      {},
      {
        sort: { fetched_at: -1 },
        limit: 8000,
        projection: {
          title: 1,
          image_url: 1,
          item_web_url: 1,
          seller_username: 1,
          seller_feedback_percentage: 1,
          seller_feedback_score: 1,
          seller_feedback_percentag: 1,
          seller_feedback_socre: 1,
          has_autograph: 1,
          has_grade_or_auth: 1,
          keyword_flags: 1,
          fetched_at: 1,
        },
      }
    )
    .toArray();

  for (const row of rows) {
    const key = cardKeyFromTitle(row.title);
    if (!key || !keySet.has(key) || out.has(key)) continue;
    out.set(key, {
      preview_image_url: row.image_url || null,
      preview_listing_url: row.item_web_url || null,
      seller_username: row.seller_username || null,
      seller_feedback_percentage: toNumberOrNull(
        row.seller_feedback_percentage ?? row.seller_feedback_percentag
      ),
      seller_feedback_score: toNumberOrNull(
        row.seller_feedback_score ?? row.seller_feedback_socre
      ),
      flags: {
        has_autograph: !!row.has_autograph,
        has_grade_or_auth: !!row.has_grade_or_auth,
        has_psa: !!row.keyword_flags?.has_psa,
        has_bgs: !!row.keyword_flags?.has_bgs,
        has_jsa: !!row.keyword_flags?.has_jsa,
        has_beckett: !!row.keyword_flags?.has_beckett,
        has_coa: !!row.keyword_flags?.has_coa,
      },
      sample_listing_fetched_at: row.fetched_at || null,
    });
  }
  return out;
}

function latestTrend(trend) {
  if (!Array.isArray(trend) || trend.length === 0) return null;
  const sorted = [...trend].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return sorted[sorted.length - 1];
}

function trendPointDaysAgo(trend, latestDateStr, days) {
  if (!Array.isArray(trend) || !latestDateStr) return null;
  const latest = new Date(`${latestDateStr}T00:00:00Z`);
  if (Number.isNaN(latest.getTime())) return null;
  const target = new Date(latest);
  target.setUTCDate(target.getUTCDate() - days);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  const key = `${y}-${m}-${d}`;
  const exact = trend.find((p) => p && p.date === key);
  if (exact) return exact;
  let best = null;
  const sorted = [...trend].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  for (const p of sorted) {
    if (p && String(p.date) <= key) best = p;
  }
  return best;
}

async function cardKeysMatchingListings(db, filters) {
  const q = {};
  if (filters.autograph === "true") q.has_autograph = true;
  if (filters.graded === "true") q.has_grade_or_auth = true;
  if (filters.psa === "true") q["keyword_flags.has_psa"] = true;
  if (filters.bgs === "true") q["keyword_flags.has_bgs"] = true;
  if (Object.keys(q).length === 0) return null;

  const items = db.collection(config.ebayItemsCollection);
  const cursor = items.find(q, { projection: { title: 1 } }).limit(5000);
  const keys = new Set();
  for await (const doc of cursor) {
    const k = cardKeyFromTitle(doc.title);
    if (k) keys.add(k);
  }
  return keys;
}

/**
 * Card list with facet paging. Pipeline uses $unwind/$group instead of $sortArray for older MongoDB.
 * @param {import('mongodb').Db} db
 */
async function listCards(db, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
  const sortApi = SORT_API[query.sort] ? query.sort : "recency";
  const sortField = SORT_API[sortApi];
  const order = query.order === "asc" ? 1 : -1;

  let allowedKeys = await cardKeysMatchingListings(db, query);
  const match = {};
  if (allowedKeys && allowedKeys.size === 0) {
    return { items: [], total: 0, page, limit };
  }
  if (allowedKeys) match.card_key = { $in: [...allowedKeys] };

  const cards = db.collection(config.cardsCollection);

  const pipeline = [
    { $match: match },
    {
      $unwind: {
        path: "$trend",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $sort: { card_key: 1, "trend.date": 1 } },
    {
      $group: {
        _id: "$card_key",
        title: { $last: "$title" },
        price_currency: { $last: "$price_currency" },
        first_seen_at: { $last: "$first_seen_at" },
        last_seen_at: { $last: "$last_seen_at" },
        trend: {
          $push: "$trend",
        },
        trend_last: { $last: "$trend" },
      },
    },
    {
      $addFields: {
        trend: {
          $filter: {
            input: "$trend",
            as: "t",
            cond: { $ne: ["$$t", null] },
          },
        },
      },
    },
    {
      $addFields: {
        card_key: "$_id",
      },
    },
    {
      $addFields: {
        trend_last_price: {
          $convert: {
            input: "$trend_last.price",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
        trend_last_count: { $ifNull: ["$trend_last.count", 0] },
      },
    },
    { $sort: { [sortField]: order } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              card_key: 1,
              title: 1,
              price_currency: 1,
              first_seen_at: 1,
              last_seen_at: 1,
              trend: 1,
              trend_last_price: 1,
              trend_last_count: 1,
            },
          },
        ],
      },
    },
  ];

  const agg = await cards.aggregate(pipeline).toArray();
  const facet = agg[0] || { data: [], metadata: [] };
  const total = facet.metadata[0]?.total ?? 0;
  let items = (facet.data || []).map((c) => {
    const last = latestTrend(c.trend);
    const prev7 = last ? trendPointDaysAgo(c.trend, last.date, 7) : null;
    let change7dPct = null;
    if (
      last &&
      prev7 &&
      typeof last.price === "number" &&
      typeof prev7.price === "number" &&
      prev7.price !== 0
    ) {
      change7dPct =
        Math.round(((last.price - prev7.price) / prev7.price) * 10_000) / 100;
    }
    return {
      card_key: c.card_key,
      title: c.title,
      price_currency: c.price_currency,
      first_seen_at: c.first_seen_at,
      last_seen_at: c.last_seen_at,
      latest_trend: last,
      change_7d_pct: change7dPct,
    };
  });

  items = await mergePreviewFields(db, items);

  return { items, total, page, limit };
}

async function mergePreviewFields(db, items) {
  if (!items.length) return items;
  const keySet = new Set(items.map((i) => i.card_key));
  const previews = await fetchPreviewsForKeys(db, keySet);
  return items.map((item) => ({
    ...item,
    ...(previews.get(item.card_key) || defaultPreview()),
  }));
}

async function getCardByKey(db, cardKey) {
  if (!cardKey) return null;
  const cards = db.collection(config.cardsCollection);
  const doc = await cards.findOne({ card_key: cardKey });
  if (!doc) return null;
  const last = latestTrend(doc.trend);
  const previews = await fetchPreviewsForKeys(db, new Set([cardKey]));
  const preview = previews.get(cardKey) || defaultPreview();
  return {
    card_key: doc.card_key,
    title: doc.title,
    price_currency: doc.price_currency,
    first_seen_at: doc.first_seen_at,
    last_seen_at: doc.last_seen_at,
    trend: doc.trend || [],
    latest_trend: last,
    preview_listing_url: preview.preview_listing_url,
    preview_image_url: preview.preview_image_url,
    all_data: doc,
    disclaimer: config.disclaimerAskingSample,
  };
}

async function listingsForCard(db, cardKey, lim = 20) {
  const limit = Math.min(100, Math.max(1, lim));
  const items = db.collection(config.ebayItemsCollection);
  const recent = await items
    .find({}, { sort: { fetched_at: -1 }, limit: 2000 })
    .toArray();
  const matched = recent.filter((d) => cardKeyFromTitle(d.title) === cardKey);
  return matched.slice(0, limit);
}

module.exports = {
  listCards,
  getCardByKey,
  listingsForCard,
  latestTrend,
  trendPointDaysAgo,
  SORT_API,
  mergePreviewFields,
  fetchPreviewsForKeys,
};
