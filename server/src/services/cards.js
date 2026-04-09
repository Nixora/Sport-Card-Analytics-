const config = require("../config");
const { cardKeyFromTitle } = require("../utils/cardKey");

const SORT_API = {
  recency: "last_seen_at",
  activity: "trend_last_count",
  price: "trend_last_price",
};

// Title-based filters (ingest flags can miss "PSA10"/"BGS9.5" formats).
const AUTOGRAPH_TITLE_RE = /\b(auto(graph)?|signed)\b/i;
const GRADE_AUTH_TITLE_RE =
  /\b(psa\s*[-#:]?\s*\d{1,2}(\.\d)?|psa\d{1,2}|bgs\s*[-#:]?\s*\d{1,2}(\.\d)?|bgs\d{1,2}(\.\d)?|bvg\s*\d{1,2}(\.\d)?|jsa|beckett|coa)\b/i;

function listingDocQuery(extra = {}) {
  // Ingest (scripts/ingest_ebay.py) stores item docs in a single collection.
  // Back-compat: if any doc_type exists, treat non-card docs as listings.
  return {
    $and: [{ $or: [{ doc_type: { $exists: false } }, { doc_type: "listing" }] }, extra].filter(
      Boolean
    ),
  };
}

function buildListingFilterFromQuery(q) {
  const and = [];

  if (q.compareOnly === "true") {
    and.push({
      $or: [
        { compare_vinted: { $exists: true, $ne: null } },
        { compare_catawiki: { $exists: true, $ne: null } },
      ],
    });
  }

  if (q.autograph === "true") {
    and.push({
      $or: [
        { has_autograph: true },
        { "keyword_flags.has_signed": true },
        { "keyword_flags.has_auto": true },
        { title: { $regex: AUTOGRAPH_TITLE_RE } },
      ],
    });
  }

  if (q.graded === "true") {
    and.push({
      $or: [
        { has_grade_or_auth: true },
        { "keyword_flags.has_psa": true },
        { "keyword_flags.has_bgs": true },
        { "keyword_flags.has_jsa": true },
        { "keyword_flags.has_beckett": true },
        { "keyword_flags.has_coa": true },
        { title: { $regex: GRADE_AUTH_TITLE_RE } },
      ],
    });
  }

  if (q.psa === "true") {
    and.push({
      $or: [
        { "keyword_flags.has_psa": true },
        { title: { $regex: /\bpsa\s*[-#:]?\s*\d{1,2}(\.\d)?\b/i } },
        { title: { $regex: /\bpsa\d{1,2}\b/i } },
      ],
    });
  }

  if (q.bgs === "true") {
    and.push({
      $or: [
        { "keyword_flags.has_bgs": true },
        { title: { $regex: /\bbgs\s*[-#:]?\s*\d{1,2}(\.\d)?\b/i } },
        { title: { $regex: /\bbgs\d{1,2}(\.\d)?\b/i } },
      ],
    });
  }

  return and.length ? { $and: and } : {};
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function median(nums) {
  const arr = (nums || []).map(toNum).filter((n) => n != null).sort((a, b) => a - b);
  const n = arr.length;
  if (!n) return null;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return arr[mid];
  return (arr[mid - 1] + arr[mid]) / 2;
}

function normalizeCardTrendFromItemTrend(trendPriceRows) {
  // trendPriceRows: [{date, prices:[...], currency}]
  const out = [];
  for (const row of trendPriceRows || []) {
    const p = median(row.prices || []);
    if (p == null) continue;
    out.push({
      date: row.date,
      price: p,
      count: (row.prices || []).map(toNum).filter((n) => n != null).length,
      price_currency: row.currency || null,
    });
  }
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

function defaultPreview() {
  return {
    preview_image_url: null,
    preview_listing_url: null,
    preview_condition: null,
    compare_vinted: null,
    compare_catawiki: null,
    compare_updated_at: null,
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
      listingDocQuery({}),
      {
        sort: { fetched_at: -1 },
        limit: 8000,
        projection: {
          card_key: 1,
          title: 1,
          image_url: 1,
          item_web_url: 1,
          condition: 1,
          compare_vinted: 1,
          compare_catawiki: 1,
          compare_updated_at: 1,
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
    const key = row.card_key || cardKeyFromTitle(row.title);
    if (!key || !keySet.has(key) || out.has(key)) continue;
    out.set(key, {
      preview_image_url: row.image_url || null,
      preview_listing_url: row.item_web_url || null,
      preview_condition: row.condition ?? null,
      compare_vinted: row.compare_vinted || null,
      compare_catawiki: row.compare_catawiki || null,
      compare_updated_at: row.compare_updated_at || null,
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
  const cursor = items
    .find(listingDocQuery(q), { projection: { card_key: 1, title: 1 } })
    .limit(5000);
  const keys = new Set();
  for await (const doc of cursor) {
    const k = doc.card_key || cardKeyFromTitle(doc.title);
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

  const match = buildListingFilterFromQuery(query);

  const items = db.collection(config.ebayItemsCollection);

  const pipeline = [
    { $match: listingDocQuery({ ...match, card_key: { $exists: true, $ne: null } }) },
    { $project: { card_key: 1, title: 1, price_currency: 1, first_seen_at: 1, last_seen_at: 1, trend: 1 } },
    { $unwind: { path: "$trend", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: { card_key: "$card_key", date: "$trend.date" },
        card_key: { $last: "$card_key" },
        date: { $last: "$trend.date" },
        title: { $last: "$title" },
        price_currency: { $last: "$trend.price_currency" },
        first_seen_at: { $min: "$first_seen_at" },
        last_seen_at: { $max: "$last_seen_at" },
        prices: { $push: "$trend.price_value" },
      },
    },
    {
      $addFields: {
        day_count: { $size: "$prices" },
        // Used for DB-level sorting only. Display still uses median in JS post-processing.
        day_price_sort: {
          $avg: {
            $map: {
              input: "$prices",
              as: "p",
              in: {
                $convert: {
                  input: "$$p",
                  to: "double",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
        },
      },
    },
    { $sort: { card_key: 1, date: 1 } },
    {
      $group: {
        _id: "$card_key",
        card_key: { $last: "$card_key" },
        title: { $last: "$title" },
        price_currency: { $last: "$price_currency" },
        first_seen_at: { $last: "$first_seen_at" },
        last_seen_at: { $last: "$last_seen_at" },
        trend_prices: { $push: { date: "$date", prices: "$prices", currency: "$price_currency" } },
        trend_sort: { $push: { date: "$date", count: "$day_count", price: "$day_price_sort" } },
      },
    },
    {
      $addFields: {
        latest_sort: { $arrayElemAt: ["$trend_sort", -1] },
      },
    },
    {
      $addFields: {
        // DB-level sort keys (client display uses JS median/count for latest_trend)
        trend_last_count: { $ifNull: ["$latest_sort.count", 0] },
        trend_last_price: { $ifNull: ["$latest_sort.price", 0] },
      },
    },
    // Deterministic sorting: break ties by card_key so refresh doesn't reshuffle.
    { $sort: { [sortField]: order, card_key: 1 } },
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
              trend_last_price: 1,
              trend_last_count: 1,
              trend_prices: 1,
            },
          },
        ],
      },
    },
  ];

  const agg = await items.aggregate(pipeline).toArray();
  const facet = agg[0] || { data: [], metadata: [] };
  const total = facet.metadata[0]?.total ?? 0;
  let itemsOut = (facet.data || []).map((c) => {
    const trend = normalizeCardTrendFromItemTrend(c.trend_prices || []);
    const last = latestTrend(trend);
    const prev7 = last ? trendPointDaysAgo(trend, last.date, 7) : null;
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

  itemsOut = await mergePreviewFields(db, itemsOut);

  return { items: itemsOut, total, page, limit };
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
  const items = db.collection(config.ebayItemsCollection);

  const latestListing = await items.findOne(listingDocQuery({ card_key: cardKey }), {
    sort: { fetched_at: -1 },
    projection: {
      additional_image_urls: 1,
      buying_options: 1,
      categories: 1,
      fetched_at: 1,
    },
  });

  const pipeline = [
    { $match: listingDocQuery({ card_key: cardKey }) },
    { $project: { card_key: 1, title: 1, price_currency: 1, first_seen_at: 1, last_seen_at: 1, trend: 1 } },
    { $unwind: { path: "$trend", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: { date: "$trend.date" },
        date: { $last: "$trend.date" },
        title: { $last: "$title" },
        price_currency: { $last: "$trend.price_currency" },
        first_seen_at: { $min: "$first_seen_at" },
        last_seen_at: { $max: "$last_seen_at" },
        prices: { $push: "$trend.price_value" },
      },
    },
    { $sort: { date: 1 } },
    {
      $group: {
        _id: cardKey,
        card_key: { $last: cardKey },
        title: { $last: "$title" },
        price_currency: { $last: "$price_currency" },
        first_seen_at: { $last: "$first_seen_at" },
        last_seen_at: { $last: "$last_seen_at" },
        trend_prices: { $push: { date: "$date", prices: "$prices", currency: "$price_currency" } },
      },
    },
  ];

  const rows = await items.aggregate(pipeline).toArray();
  const doc = rows[0];
  if (!doc) return null;
  const trend = normalizeCardTrendFromItemTrend(doc.trend_prices || []);
  const last = latestTrend(trend);
  const previews = await fetchPreviewsForKeys(db, new Set([cardKey]));
  const preview = previews.get(cardKey) || defaultPreview();
  return {
    card_key: cardKey,
    title: doc.title,
    price_currency: doc.price_currency,
    first_seen_at: doc.first_seen_at,
    last_seen_at: doc.last_seen_at,
    trend,
    latest_trend: last,
    preview_listing_url: preview.preview_listing_url,
    preview_image_url: preview.preview_image_url,
    seller_username: preview.seller_username || null,
    seller_feedback_percentage: preview.seller_feedback_percentage ?? null,
    seller_feedback_score: preview.seller_feedback_score ?? null,
    compare_vinted: preview.compare_vinted || null,
    compare_catawiki: preview.compare_catawiki || null,
    additional_image_urls: latestListing?.additional_image_urls || [],
    buying_options: latestListing?.buying_options || [],
    categories: latestListing?.categories || [],
    all_data: doc,
    disclaimer: config.disclaimerAskingSample,
  };
}

async function listingsForCard(db, cardKey, lim = 20) {
  const limit = Math.min(100, Math.max(1, lim));
  const items = db.collection(config.ebayItemsCollection);
  return items
    .find(listingDocQuery({ card_key: cardKey }), { sort: { fetched_at: -1 }, limit })
    .toArray();
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
