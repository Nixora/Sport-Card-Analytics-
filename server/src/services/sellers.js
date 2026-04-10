const config = require("../config");

function toInt(v, fallback) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function listingDocQuery(extra = {}) {
  // Backward compatible: older docs may not have doc_type
  return {
    ...extra,
    $and: [
      {
        $or: [{ doc_type: "listing" }, { doc_type: { $exists: false } }],
      },
    ],
  };
}

function orderNum(order) {
  return String(order || "").toLowerCase() === "asc" ? 1 : -1;
}

async function listSellers(db, q) {
  const page = clamp(toInt(q.page, 1), 1, 1_000_000);
  const limit = clamp(toInt(q.limit, 25), 1, 100);
  const cardsLimit = clamp(toInt(q.cardsLimit, 20), 1, 50);

  const sortId = String(q.sort || "card_count").toLowerCase();
  const allowedSort = new Set(["card_count", "feedback_pct", "feedback_score", "seller_username"]);
  const sortKey = allowedSort.has(sortId) ? sortId : "card_count";
  const order = orderNum(q.order);

  const items = db.collection(config.ebayItemsCollection);

  const match = listingDocQuery({
    seller_username: { $exists: true, $ne: null, $ne: "" },
    card_key: { $exists: true, $ne: null, $ne: "" },
  });

  // We want distinct card_key per seller (card_count), and a preview list.
  // Strategy:
  // - sort listings by fetched_at desc
  // - group by (seller_username, card_key) to get latest listing per card for that seller
  // - sort again by fetched_at desc
  // - group by seller_username to get seller-level stats + list of cards (latest first)
  const pipeline = [
    { $match: match },
    { $sort: { fetched_at: -1 } },
    {
      $group: {
        _id: { seller_username: "$seller_username", card_key: "$card_key" },
        seller_username: { $first: "$seller_username" },
        card_key: { $first: "$card_key" },
        title: { $first: "$title" },
        image_url: { $first: "$image_url" },
        item_web_url: { $first: "$item_web_url" },
        condition: { $first: "$condition" },
        fetched_at: { $first: "$fetched_at" },
        seller_feedback_percentage: { $first: "$seller_feedback_percentage" },
        seller_feedback_score: { $first: "$seller_feedback_score" },
        // common misspellings seen in collection
        seller_feedback_percentag: { $first: "$seller_feedback_percentag" },
        seller_feedback_socre: { $first: "$seller_feedback_socre" },
      },
    },
    { $sort: { fetched_at: -1 } },
    {
      $group: {
        _id: "$seller_username",
        seller_username: { $first: "$seller_username" },
        last_fetched_at: { $first: "$fetched_at" },
        seller_feedback_percentage: {
          $first: { $ifNull: ["$seller_feedback_percentage", "$seller_feedback_percentag"] },
        },
        seller_feedback_score: {
          $first: { $ifNull: ["$seller_feedback_score", "$seller_feedback_socre"] },
        },
        card_count: { $sum: 1 },
        cards: {
          $push: {
            card_key: "$card_key",
            title: "$title",
            image_url: "$image_url",
            item_web_url: "$item_web_url",
            condition: "$condition",
            fetched_at: "$fetched_at",
          },
        },
      },
    },
    {
      $addFields: {
        sort_card_count: { $ifNull: ["$card_count", 0] },
        sort_feedback_pct: { $ifNull: ["$seller_feedback_percentage", -1] },
        sort_feedback_score: { $ifNull: ["$seller_feedback_score", -1] },
      },
    },
    {
      $sort: {
        ...(sortKey === "card_count"
          ? { sort_card_count: order, seller_username: 1 }
          : sortKey === "feedback_pct"
            ? { sort_feedback_pct: order, seller_username: 1 }
            : sortKey === "feedback_score"
              ? { sort_feedback_score: order, seller_username: 1 }
              : sortKey === "seller_username"
                ? { seller_username: order }
                : { sort_card_count: order, seller_username: 1 }),
      },
    },
    {
      $project: {
        _id: 0,
        seller_username: 1,
        seller_feedback_percentage: 1,
        seller_feedback_score: 1,
        card_count: 1,
        last_fetched_at: 1,
        cards: { $slice: ["$cards", cardsLimit] },
      },
    },
    {
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        metadata: [{ $count: "total" }],
      },
    },
  ];

  const agg = await items.aggregate(pipeline, { allowDiskUse: true }).toArray();
  const facet = agg[0] || { data: [], metadata: [] };
  const total = facet.metadata[0]?.total ?? 0;

  return {
    items: facet.data || [],
    total,
    page,
    limit,
    sort: sortKey,
    order: String(q.order || "desc").toLowerCase() === "asc" ? "asc" : "desc",
    cardsLimit,
  };
}

module.exports = {
  listSellers,
  getSellerProfile,
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function median(nums) {
  const arr = (nums || []).map(toNum).filter((n) => n != null).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  if (arr.length % 2 === 1) return arr[mid];
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

function latestTrend(trend) {
  if (!Array.isArray(trend) || !trend.length) return null;
  const sorted = [...trend].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return sorted[sorted.length - 1];
}

async function getSellerProfile(db, sellerUsername, q = {}) {
  const seller = String(sellerUsername || "").trim();
  if (!seller) return null;

  // Return a capped list of distinct cards for this seller.
  // Frontend will compute min/max and handle pagination UX.
  const cardsLimit = clamp(toInt(q.cardsLimit, 200), 1, 500);

  const items = db.collection(config.ebayItemsCollection);

  // 1) Latest listing per (seller, card_key) + seller feedback metrics.
  const baseMatch = listingDocQuery({
    seller_username: seller,
    card_key: { $exists: true, $ne: null, $ne: "" },
  });

  const cardRows = await items
    .aggregate(
      [
        { $match: baseMatch },
        { $sort: { fetched_at: -1 } },
        {
          $group: {
            _id: "$card_key",
            card_key: { $first: "$card_key" },
            title: { $first: "$title" },
            image_url: { $first: "$image_url" },
            item_web_url: { $first: "$item_web_url" },
            condition: { $first: "$condition" },
            fetched_at: { $first: "$fetched_at" },
            seller_feedback_percentage: { $first: "$seller_feedback_percentage" },
            seller_feedback_score: { $first: "$seller_feedback_score" },
            seller_feedback_percentag: { $first: "$seller_feedback_percentag" },
            seller_feedback_socre: { $first: "$seller_feedback_socre" },
          },
        },
        { $sort: { fetched_at: -1, card_key: 1 } },
        { $limit: cardsLimit },
      ],
      { allowDiskUse: true }
    )
    .toArray();

  if (!cardRows.length) return null;

  const feedbackPct =
    cardRows[0]?.seller_feedback_percentage ?? cardRows[0]?.seller_feedback_percentag ?? null;
  const feedbackScore =
    cardRows[0]?.seller_feedback_score ?? cardRows[0]?.seller_feedback_socre ?? null;

  const allCardKeys = cardRows.map((r) => r.card_key).filter(Boolean);

  // 2) Compute per-card latest median ask (same aggregation idea as cards.js, but limited to seller's card_keys).
  const sort = String(q.sort || "price").toLowerCase();
  const order = orderNum(q.order);
  const sortField =
    sort === "card_count"
      ? "latest_sort.count"
      : sort === "recency"
        ? "latest_sort.date"
        : "latest_sort.price";

  const priceAgg = await items
    .aggregate(
      [
        { $match: listingDocQuery({ card_key: { $in: allCardKeys } }) },
        { $project: { card_key: 1, price_currency: 1, trend: 1 } },
        { $unwind: "$trend" },
        {
          $project: {
            card_key: 1,
            date: "$trend.date",
            price: "$trend.price_value",
            currency: { $ifNull: ["$trend.price_currency", "$price_currency"] },
          },
        },
        {
          $group: {
            _id: { card_key: "$card_key", date: "$date" },
            card_key: { $first: "$card_key" },
            date: { $first: "$date" },
            price_currency: { $last: "$currency" },
            prices: { $push: "$price" },
          },
        },
        {
          $group: {
            _id: "$card_key",
            card_key: { $first: "$card_key" },
            price_currency: { $last: "$price_currency" },
            trend_prices: { $push: { date: "$date", prices: "$prices", currency: "$price_currency" } },
          },
        },
      ],
      { allowDiskUse: true }
    )
    .toArray();

  const priceByKey = new Map();
  for (const row of priceAgg) {
    const trend = normalizeCardTrendFromItemTrend(row.trend_prices || []);
    const last = latestTrend(trend);
    priceByKey.set(row.card_key, {
      latest_trend: last,
      price_currency: row.price_currency || last?.price_currency || null,
    });
  }

  const enriched = cardRows.map((r) => {
    const p = priceByKey.get(r.card_key) || {};
    return {
      card_key: r.card_key,
      title: r.title,
      image_url: r.image_url,
      item_web_url: r.item_web_url,
      condition: r.condition,
      fetched_at: r.fetched_at,
      latest_trend: p.latest_trend || null,
      price_currency: p.price_currency || null,
    };
  });

  // sort cards for list
  const sortable = enriched.map((c) => ({
    ...c,
    latest_sort: {
      price: toNum(c.latest_trend?.price) ?? -1,
      count: toNum(c.latest_trend?.count) ?? -1,
      date: String(c.latest_trend?.date || ""),
    },
  }));
  sortable.sort((a, b) => {
    const av = sortField.split(".")[1] ? a.latest_sort[sortField.split(".")[1]] : null;
    const bv = sortField.split(".")[1] ? b.latest_sort[sortField.split(".")[1]] : null;
    if (av < bv) return -1 * order;
    if (av > bv) return 1 * order;
    return String(a.card_key).localeCompare(String(b.card_key));
  });

  const totalCards = sortable.length;
  const outCards = sortable.map((c) => {
    const { latest_sort, ...rest } = c;
    return rest;
  });

  return {
    seller_username: seller,
    seller_feedback_percentage: feedbackPct,
    seller_feedback_score: feedbackScore,
    card_count: totalCards,
    cards: outCards,
    total: totalCards,
    sort: sort || "price",
    order: String(q.order || "desc").toLowerCase() === "asc" ? "asc" : "desc",
    cardsLimit,
  };
}

