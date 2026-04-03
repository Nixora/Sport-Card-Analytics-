import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCard, fetchCardListings } from "../api.js";
import PageHelmet from "../components/PageHelmet.jsx";

const FLAG_LABELS = {
  has_signed: "Signed",
  has_auto: "Auto",
  has_psa: "PSA",
  has_bgs: "BGS",
  has_jsa: "JSA",
  has_beckett: "Beckett",
  has_coa: "COA",
  has_autograph: "Autograph",
  has_grade_or_auth: "Grade / auth",
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function trendPriceStats(trend) {
  if (!Array.isArray(trend) || trend.length === 0) return null;
  const prices = trend.map((p) => toNum(p?.price)).filter((n) => n != null);
  if (prices.length === 0) return null;
  const sum = prices.reduce((a, b) => a + b, 0);
  return {
    days: prices.length,
    avg: Math.round((sum / prices.length) * 100) / 100,
    low: Math.min(...prices),
    high: Math.max(...prices),
  };
}

function formatCondition(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    if (typeof raw.conditionDisplayName === "string") return raw.conditionDisplayName;
    if (typeof raw.conditionId === "string") return `Condition ${raw.conditionId}`;
  }
  return null;
}

function uniqueConditions(listings) {
  const seen = new Set();
  const out = [];
  for (const li of listings || []) {
    const label = formatCondition(li.condition);
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

function mergeKeywordFlagKeys(listings) {
  const keys = new Set();
  for (const li of listings || []) {
    const kf = li.keyword_flags;
    if (!kf || typeof kf !== "object") continue;
    for (const [k, v] of Object.entries(kf)) {
      if (v === true) keys.add(k);
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

function flagPillClass(key) {
  if (key === "has_autograph") return "pill pill--autograph";
  if (key === "has_grade_or_auth") return "pill pill--grade";
  if (key === "has_psa") return "pill pill--psa";
  if (key === "has_bgs") return "pill pill--bgs";
  if (key === "has_jsa") return "pill pill--jsa";
  if (key === "has_beckett") return "pill pill--beckett";
  if (key === "has_coa") return "pill pill--coa";
  return "pill pill--keyword";
}

function formatFlagLabel(key) {
  if (FLAG_LABELS[key]) return FLAG_LABELS[key];
  return key.replace(/^has_/i, "").replace(/_/g, " ");
}

/** SVG median-ask trend from daily trend rows */
function TrendLineChart({ series, currency }) {
  const valid = useMemo(
    () =>
      series
        .map((p) => ({ date: String(p.date ?? ""), price: toNum(p.price), count: p.count }))
        .filter((p) => p.price != null),
    [series]
  );

  if (valid.length < 2) {
    return <p className="muted card-detail-empty">Not enough history to plot a trend.</p>;
  }

  const w = 1000;
  const h = 340;
  const pad = { l: 58, r: 28, t: 28, b: 52 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const prices = valid.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const spread = maxP - minP || 1;
  const n = valid.length;
  const step = n > 1 ? iw / (n - 1) : 0;
  const pathPts = valid.map((p, i) => {
    const x = pad.l + i * step;
    const y = pad.t + ih - ((p.price - minP) / spread) * ih;
    return [x, y];
  });
  const baseY = pad.t + ih;
  const lineD = pathPts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const areaD =
    `M ${pathPts[0][0]} ${baseY} ` +
    pathPts.map(([x, y]) => `L ${x} ${y}`).join(" ") +
    ` L ${pathPts[pathPts.length - 1][0]} ${baseY} Z`;
  const cur = (currency || "").trim();

  return (
    <div className="card-detail-trend-chart-wrap">
      <svg
        className="card-detail-trend-chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Median ask over time"
      >
        <defs>
          <linearGradient id="cardDetailTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(74, 168, 255, 0.28)" />
            <stop offset="100%" stopColor="rgba(74, 168, 255, 0)" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + ih * (1 - t);
          return (
            <line
              key={t}
              x1={pad.l}
              y1={y}
              x2={w - pad.r}
              y2={y}
              stroke="rgba(100, 160, 220, 0.12)"
              strokeWidth="1"
            />
          );
        })}
        <path d={areaD} fill="url(#cardDetailTrendFill)" />
        <path
          d={lineD}
          fill="none"
          stroke="#7ec8ff"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pathPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#0c2239" stroke="#bfe2ff" strokeWidth="1.75" />
        ))}
        <text x={pad.l} y={h - 16} fill="#8eb6da" fontSize="13" fontFamily="system-ui, sans-serif">
          {valid[0].date}
        </text>
        <text
          x={w - pad.r}
          y={h - 16}
          textAnchor="end"
          fill="#8eb6da"
          fontSize="13"
          fontFamily="system-ui, sans-serif"
        >
          {valid[valid.length - 1].date}
        </text>
        <text
          x={pad.l}
          y={pad.t - 6}
          fill="#c8dbf0"
          fontSize="14"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          {maxP.toFixed(2)}
          {cur ? ` ${cur}` : ""}
        </text>
        <text
          x={pad.l}
          y={baseY + 22}
          fill="#c8dbf0"
          fontSize="14"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          {minP.toFixed(2)}
          {cur ? ` ${cur}` : ""}
        </text>
      </svg>
    </div>
  );
}

export default function CardDetail() {
  const { cardKey } = useParams();
  const [card, setCard] = useState(null);
  const [listings, setListings] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, l] = await Promise.all([
          fetchCard(cardKey),
          fetchCardListings(cardKey, 100),
        ]);
        if (!cancelled) {
          setCard(c);
          setListings(l);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(String(e.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cardKey]);

  const listingRows = listings?.listings ?? [];

  const trendRows = useMemo(
    () => [...(card?.trend || [])].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [card?.trend]
  );

  const stats = useMemo(() => trendPriceStats(trendRows), [trendRows]);
  const conditions = useMemo(() => uniqueConditions(listingRows), [listingRows]);
  const flagKeys = useMemo(() => mergeKeywordFlagKeys(listingRows), [listingRows]);

  const slug = card?.card_key ?? cardKey ?? "";
  const cur = card?.price_currency || "";
  const breadcrumbTrail = slug
    ? `marketplace-comparison / ${slug}`
    : "marketplace-comparison";

  const lastSeenShort =
    card?.last_seen_at && !Number.isNaN(new Date(card.last_seen_at).getTime())
      ? new Date(card.last_seen_at).toISOString().slice(0, 10)
      : null;

  const firstSeenShort =
    card?.first_seen_at && !Number.isNaN(new Date(card.first_seen_at).getTime())
      ? new Date(card.first_seen_at).toISOString().slice(0, 10)
      : null;

  return (
    <>
      <PageHelmet
        breadcrumb={breadcrumbTrail}
        description={
          card
            ? `Trends, listings, conditions, and keyword signals for ${card.card_key} on Nixsor.`
            : "Card detail on Nixsor."
        }
      />
      <div className="card-detail-page card-detail-page--fullscreen">
        <nav className="card-detail-nav" aria-label="Card">
          <Link className="card-detail-nav__back" to="/marketplace-comparison">
            ← Marketplace
          </Link>
        </nav>

        {err && <p className="err card-detail-err">{err}</p>}
        {!card && !err && (
          <div className="card-detail-skeleton card-detail-skeleton--plain">
            <p className="muted">Loading card…</p>
          </div>
        )}

        {card && (
          <>
            <header className="card-detail-top">
              <div className="card-detail-top__media">
                {card.preview_image_url ? (
                  <img src={card.preview_image_url} alt="" className="card-detail-top__img" />
                ) : (
                  <div className="card-detail-top__placeholder muted">No preview image</div>
                )}
              </div>
              <div className="card-detail-top__body">
                <h1 className="card-detail-top__title">
                  {card.preview_listing_url &&
                  typeof card.preview_listing_url === "string" &&
                  /^https?:\/\//i.test(card.preview_listing_url) ? (
                    <a
                      href={card.preview_listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-detail-top__title-link"
                    >
                      {card.title}
                      <span className="card-detail-top__ext" aria-hidden>
                        ↗
                      </span>
                    </a>
                  ) : (
                    card.title
                  )}
                </h1>
                <p className="card-detail-top__key">{card.card_key}</p>

                {card.latest_trend && (
                  <div className="card-detail-snap" aria-label="Latest trend snapshot">
                    <span>
                      <strong>{card.latest_trend.price}</strong> {cur && <span>{cur}</span>}
                      <span className="card-detail-snap__sep">·</span>
                      <span className="muted">N {card.latest_trend.count}</span>
                      <span className="card-detail-snap__sep">·</span>
                      <span className="muted">{card.latest_trend.date}</span>
                    </span>
                  </div>
                )}

                <div className="card-detail-top-flags">
                  <div className="card-detail-top-flags__col">
                    <h3 className="card-detail-top-flags__title">Condition</h3>
                    {!listings && <p className="muted card-detail-top-flags__empty">Loading…</p>}
                    {listings && conditions.length === 0 && (
                      <p className="muted card-detail-top-flags__empty">None in sample.</p>
                    )}
                    {conditions.length > 0 && (
                      <ul className="card-detail-keyword-row card-detail-keyword-row--compact">
                        {conditions.map((c) => (
                          <li key={c}>
                            <span className="pill pill--condition">{c}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="card-detail-top-flags__col">
                    <h3 className="card-detail-top-flags__title">Keyword flags</h3>
                    {!listings && <p className="muted card-detail-top-flags__empty">Loading…</p>}
                    {listings && !flagKeys.length && (
                      <p className="muted card-detail-top-flags__empty">None in sample.</p>
                    )}
                    {flagKeys.length > 0 && (
                      <ul className="card-detail-keyword-row card-detail-keyword-row--compact">
                        {flagKeys.map((k) => (
                          <li key={k}>
                            <span className={flagPillClass(k)}>{formatFlagLabel(k)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <dl className="card-detail-meta card-detail-meta--plain">
                  <div>
                    <dt>Currency</dt>
                    <dd>{card.price_currency || "—"}</dd>
                  </div>
                  <div>
                    <dt>First seen</dt>
                    <dd>{firstSeenShort || "—"}</dd>
                  </div>
                  <div>
                    <dt>Last seen</dt>
                    <dd>{lastSeenShort || "—"}</dd>
                  </div>
                </dl>
              </div>
            </header>

            <section className="card-detail-section card-detail-section--plain">
              <div className="card-detail-section__head">
                <h2 className="card-detail-section__title">Price trend</h2>
                <p className="card-detail-section__sub muted">Median ask by day (sample)</p>
              </div>
              <TrendLineChart series={trendRows} currency={cur} />
              {stats && (
                <ul className="card-detail-stat-line">
                  <li>
                    <span className="muted">Avg</span> <strong>{stats.avg}</strong> {cur}
                  </li>
                  <li>
                    <span className="muted">Low</span> <strong>{stats.low}</strong> {cur}
                  </li>
                  <li>
                    <span className="muted">High</span> <strong>{stats.high}</strong> {cur}
                  </li>
                  <li className="card-detail-stat-line__days muted">{stats.days} days</li>
                </ul>
              )}
            </section>

            <section className="card-detail-section card-detail-section--plain">
              <div className="card-detail-section__head">
                <h2 className="card-detail-section__title">Daily trend</h2>
                <p className="card-detail-section__sub muted">Median ask and sample size by day</p>
              </div>
              {trendRows.length === 0 && <p className="muted card-detail-empty">No trend points yet.</p>}
              {trendRows.length > 0 && (
                <div className="card-detail-table-scroll card-detail-table-scroll--plain">
                  <table className="card-detail-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Median ask</th>
                        <th>N</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendRows.map((p) => (
                        <tr key={p.date}>
                          <td>{p.date}</td>
                          <td className="card-detail-table__num">
                            {p.price} {cur}
                          </td>
                          <td className="card-detail-table__num">{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card-detail-section card-detail-section--plain">
              <div className="card-detail-section__head">
                <h2 className="card-detail-section__title">Recent listings</h2>
                <p className="card-detail-section__sub muted">Sample rows matched to this card key</p>
              </div>
              {!listings && <p className="muted card-detail-empty">Loading listings…</p>}
              {listings?.listings?.length === 0 && (
                <p className="muted card-detail-empty">No recent rows matched this card_key.</p>
              )}
              {listings && listingRows.length > 0 && (
                <div className="card-detail-table-scroll card-detail-table-scroll--plain">
                  <table className="card-detail-table card-detail-table--listings">
                    <thead>
                      <tr>
                        <th className="card-detail-table__th-thumb"> </th>
                        <th>Price</th>
                        <th>Condition</th>
                        <th>Title</th>
                        <th className="card-detail-table__action-head"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {listingRows.map((li) => (
                        <tr key={li.item_id || li._id}>
                          <td>
                            {li.image_url ? (
                              <img
                                src={li.image_url}
                                alt=""
                                className="card-detail-listing-thumb"
                              />
                            ) : (
                              <span className="card-detail-listing-thumb card-detail-listing-thumb--empty">
                                —
                              </span>
                            )}
                          </td>
                          <td className="card-detail-table__price">
                            <span className="card-detail-table__price-val">{li.price_value}</span>
                            <span className="muted">{li.price_currency || ""}</span>
                          </td>
                          <td className="card-detail-table__cond">
                            {formatCondition(li.condition) || "—"}
                          </td>
                          <td className="card-detail-table__title-cell">
                            {(li.title || "").slice(0, 100)}
                            {(li.title || "").length > 100 ? "…" : ""}
                          </td>
                          <td className="card-detail-table__action">
                            {li.item_web_url ? (
                              <a
                                className="card-detail-link-out"
                                href={li.item_web_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View ↗
                              </a>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
