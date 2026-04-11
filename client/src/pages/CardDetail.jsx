import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

function IconSeller() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ flex: "0 0 auto" }}
    >
      <path
        d="M20 21a8 8 0 10-16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function safeImgUrl(u) {
  if (typeof u !== "string") return null;
  const s = u.trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : null;
}

function safeText(v) {
  if (v == null) return "";
  return String(v).trim();
}

function parseMoney(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const isEur = s.includes("€");
  const isUsd = s.includes("$");
  const currency = isEur ? "EUR" : isUsd ? "USD" : null;
  const num = s
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const v = Number(num);
  if (!Number.isFinite(v)) return { currency, raw: s, value: null };
  return { currency, raw: s, value: v };
}

const EUR_TO_USD = 1.08;

/** SVG median-ask trend from daily trend rows */
function TrendLineChart({ series, currency, compareLines = [] }) {
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

  const [hoverIdx, setHoverIdx] = useState(null);

  const w = 1000;
  const h = 340;
  const pad = { l: 58, r: 28, t: 28, b: 52 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const prices = valid.map((p) => p.price);
  const maxRaw = Math.max(...prices);
  const minP = 0;
  const maxP = Math.max(1, maxRaw * 1.2);
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

  const overlayLines = (compareLines || [])
    .map((ln) => ({
      ...ln,
      value: toNum(ln?.value),
    }))
    .filter((ln) => ln.value != null && ln.value >= 0);

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

        {/* comparison price lines */}
        {overlayLines.map((ln) => {
          const y = pad.t + ih - ((ln.value - minP) / spread) * ih;
          return (
            <g key={ln.key || ln.label || ln.value}>
              <line
                x1={pad.l}
                y1={y}
                x2={w - pad.r}
                y2={y}
                stroke={ln.color || "#ec4899"}
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.9"
              />
            </g>
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
        {pathPts.map(([x, y], i) => {
          const isHover = hoverIdx === i;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={isHover ? "8" : "5"}
              fill={isHover ? "#7ec8ff" : "#0d456d"}
              stroke={isHover ? "#e6f3ff" : "#bfe2ff"}
              strokeWidth={isHover ? "2.25" : "1.75"}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}

        {hoverIdx != null && pathPts[hoverIdx] && (
          <g pointerEvents="none">
            {(() => {
              const [x, y] = pathPts[hoverIdx];
              const p = valid[hoverIdx];
              const price = toNum(p?.price);
              const label = `${p?.date || ""}  ${price != null ? price.toFixed(2) : ""}${
                cur ? ` ${cur}` : ""
              }`;
              const padX = 10;
              const padY = 7;
              const fontSize = 13;
              const approxW = Math.max(120, label.length * 7.2);
              const bw = approxW + padX * 2;
              const bh = fontSize + padY * 2;
              const bx = Math.min(w - pad.r - bw, Math.max(pad.l, x - bw / 2));
              const by = Math.max(pad.t, y - bh - 14);
              return (
                <>
                  <rect
                    x={bx}
                    y={by}
                    width={bw}
                    height={bh}
                    rx="10"
                    ry="10"
                    fill="rgba(5, 18, 33, 0.92)"
                    stroke="rgba(126, 200, 255, 0.55)"
                    strokeWidth="1"
                  />
                  <text
                    x={bx + bw / 2}
                    y={by + bh / 2 + 4}
                    textAnchor="middle"
                    fill="#e9f4ff"
                    fontSize={String(fontSize)}
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                  >
                    {label}
                  </text>
                </>
              );
            })()}
          </g>
        )}
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
          x={w - pad.r}
          y={baseY + 22}
          textAnchor="end"
          fill="#c8dbf0"
          fontSize="14"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          0.00
          {cur ? ` ${cur}` : ""}
        </text>
      </svg>

      {overlayLines.length > 0 && (
        <div className="mp-row__pills" style={{ marginTop: 10 }}>
          {overlayLines.map((ln) => (
            <span
              key={`legend-${ln.key || ln.label || ln.value}`}
              className="mp-pill mp-pill--muted"
              style={{
                borderLeft: `6px solid ${ln.color || "#ec4899"}`,
                paddingLeft: 8,
              }}
              title="Comparison price line"
            >
              {ln.label}: {ln.value.toFixed(2)} {cur || ""}
              {ln.fx ? " (FX est)" : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareSnapshotChart({ ebayValue, compare, currency }) {
  const ebay = toNum(ebayValue);
  const cmp = toNum(compare?.value);
  if (ebay == null && cmp == null) return null;

  const w = 1000;
  const h = 320;
  const pad = { l: 36, r: 36, t: 22, b: 52 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const maxRaw = Math.max(ebay ?? 0, cmp ?? 0);
  const minY = 0;
  const maxY = Math.max(1, maxRaw * 1.2);
  const spread = maxY - minY || 1;
  const yOf = (v) => pad.t + ih - ((v - minY) / spread) * ih;

  const baseY = pad.t + ih;
  const yE = ebay != null ? yOf(ebay) : null;
  const yC = cmp != null ? yOf(cmp) : null;

  const barW = Math.min(78, iw * 0.11);
  const gap = Math.min(200, iw * 0.18);
  const cx = w / 2;
  const xE = cx - gap / 2 - barW;
  const xC = cx + gap / 2;

  const hE = yE != null ? Math.max(0, baseY - yE) : 0;
  const hC = yC != null ? Math.max(0, baseY - yC) : 0;

  const pct =
    ebay != null && cmp != null && ebay !== 0 ? ((cmp - ebay) / Math.abs(ebay)) * 100 : null;
  const pctText =
    pct == null
      ? null
      : `${pct >= 0 ? "+" : ""}${Math.abs(pct).toFixed(2)}%`;
  const moneyText = (v) => {
    if (v == null) return "";
    const s = Number.isFinite(v) ? v.toFixed(2) : String(v);
    return currency ? `${s} ${currency}` : s;
  };
  const delta = ebay != null && cmp != null ? ebay - cmp : null;
  const deltaText =
    delta == null ? null : `${delta >= 0 ? "" : "-"}${Math.abs(delta).toFixed(2)}`;

  return (
    <div className="card-detail-trend-chart-wrap">
      {pctText ? (
        <p className="muted" style={{ margin: 0, fontWeight: 700 }}>
          Range: {currency ? `${deltaText} ${currency}` : deltaText} ({pctText}){" "}
          <span style={{ fontWeight: 600, opacity: 0.8 }}>
            vs {(compare?.source || "Compare")}
          </span>
          {compare?.fx ? " (FX)" : ""}
        </p>
      ) : null}
      <svg
        className="card-detail-trend-chart"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Compare snapshot bar chart"
      >
        <defs>
          <linearGradient id="cmpBarEbay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ec8ff" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="cmpBarCompare" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={compare?.color || "#a855f7"} />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <filter id="cmpBarShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="rgba(0,0,0,0.25)" />
          </filter>
        </defs>

        {/* baseline */}
        <line
          x1={pad.l}
          y1={baseY}
          x2={w - pad.r}
          y2={baseY}
          stroke="rgba(120, 190, 255, 0.18)"
          strokeWidth="1"
        />

        {/* eBay bar */}
        <g filter="url(#cmpBarShadow)">
          <rect
            x={xE}
            y={baseY - hE}
            width={barW}
            height={hE}
            rx="0"
            ry="0"
            fill="url(#cmpBarEbay)"
            opacity={yE != null ? 1 : 0.25}
          />
          {/* square-off bottom */}
          <rect
            x={xE}
            y={baseY - 2}
            width={barW}
            height="24"
            fill="url(#cmpBarEbay)"
            opacity={yE != null ? 1 : 0.25}
          />
        </g>
        {yE != null && (
          <text
            x={xE + barW / 2}
            y={baseY - hE + 22}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="22"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
          >
            {Math.round(ebay)}
          </text>
        )}
        {currency ? (
          <text
            x={xE + barW / 2}
            y={h - 42}
            textAnchor="middle"
            fill="rgba(203, 213, 225, 0.7)"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {currency}
          </text>
        ) : null}
        <text
          x={xE + barW / 2}
          y={h - 18}
          textAnchor="middle"
          fill="rgba(203, 213, 225, 0.92)"
          fontSize="18"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          eBay
        </text>

        {/* compare bar */}
        <g filter="url(#cmpBarShadow)">
          <rect
            x={xC}
            y={baseY - hC}
            width={barW}
            height={hC}
            rx="0"
            ry="0"
            fill="url(#cmpBarCompare)"
            opacity={yC != null ? 1 : 0.25}
          />
          <rect
            x={xC}
            y={baseY - 2}
            width={barW}
            height="24"
            fill="url(#cmpBarCompare)"
            opacity={yC != null ? 1 : 0.25}
          />
        </g>
        {yC != null && (
          <text
            x={xC + barW / 2}
            y={baseY - hC + 22}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="22"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
          >
            {Math.round(cmp)}
          </text>
        )}
        {currency ? (
          <text
            x={xC + barW / 2}
            y={h - 42}
            textAnchor="middle"
            fill="rgba(203, 213, 225, 0.7)"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {currency}
            {compare?.fx ? " (FX)" : ""}
          </text>
        ) : null}
        <text
          x={xC + barW / 2}
          y={h - 18}
          textAnchor="middle"
          fill="rgba(203, 213, 225, 0.92)"
          fontSize="18"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {compare?.source || "Compare"}
        </text>
      </svg>
    </div>
  );
}

export default function CardDetail() {
  const { cardKey } = useParams();
  const navigate = useNavigate();
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
    ? `marketplace / ${slug}`
    : "marketplace";

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
            ? `Trends, listings, conditions, and keyword signals for ${card.card_key} on Nixsora.`
            : "Card detail on Nixsora."
        }
      />
      <div className="card-detail-page card-detail-page--fullscreen">
        <nav className="card-detail-nav" aria-label="Card">
          <button
            type="button"
            className="card-detail-nav__back"
            onClick={() => {
              // Prefer true back navigation (supports returning to /comparison-alert, etc.)
              // If opened in a new tab with no history, fall back to marketplace.
              if (window.history.length > 1) navigate(-1);
              else navigate("/marketplace");
            }}
          >
            ← Back
          </button>
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    margin: "0 0 0.75rem",
                  }}
                >
                  <p className="card-detail-top__key" style={{ margin: 0 }}>
                    {card.card_key}
                  </p>

                  {card.seller_username && (
                    <p
                      className="muted"
                      style={{
                        margin: 0,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginLeft: "auto",
                        textAlign: "right",
                      }}
                    >
                      <IconSeller />
                      <span>
                        Seller{" "}
                        <Link
                          to={`/sellers/${encodeURIComponent(card.seller_username)}`}
                          className="card-detail-top__seller-link"
                        >
                          <strong style={{ color: "#eef5ff" }}>{card.seller_username}</strong>
                        </Link>
                        {typeof card.seller_feedback_percentage === "number" ? (
                          <span className="muted"> · {card.seller_feedback_percentage}%</span>
                        ) : null}
                        {typeof card.seller_feedback_score === "number" ? (
                          <span className="muted"> ({card.seller_feedback_score})</span>
                        ) : null}
                      </span>
                    </p>
                  )}
                </div>

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
                  <div className="card-detail-top-flags__col">
                    <h3 className="card-detail-top-flags__title">Buying options</h3>
                    {Array.isArray(card.buying_options) && card.buying_options.length > 0 ? (
                      <ul className="card-detail-keyword-row card-detail-keyword-row--compact">
                        {card.buying_options.map((opt) => (
                          <li key={String(opt)}>
                            <span className="pill pill--keyword">{String(opt)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted card-detail-top-flags__empty">—</p>
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
                  <div>
                    <dt>Categories</dt>
                    <dd>
                      {Array.isArray(card.categories) && card.categories.length > 0 ? (
                        <div className="mp-row__pills card-detail-meta__pills" style={{ marginTop: 0 }}>
                          {card.categories
                            .map((c) => (c?.categoryName ? String(c.categoryName).trim() : ""))
                            .filter(Boolean)
                            .map((name) => (
                              <span key={name} className="mp-pill mp-pill--muted">
                                {name}
                              </span>
                            ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </header>

            {(() => {
              const addImgs = Array.isArray(card.additional_image_urls)
                ? card.additional_image_urls.map(safeImgUrl).filter(Boolean)
                : [];
              const compareImgs = [
                safeImgUrl(card.compare_catawiki?.photo_url),
                safeImgUrl(card.compare_vinted?.photo_url),
              ].filter(Boolean);
              if (addImgs.length === 0 && compareImgs.length === 0) return null;
              return (
              <section className="card-detail-section card-detail-section--plain">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 18,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <p className="muted" style={{ marginTop: 0, marginBottom: 10, fontWeight: 800 }}>
                      Additional images (eBay)
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {addImgs.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: 140,
                              height: 140,
                              borderRadius: 0,
                              overflow: "hidden",
                              border: "1px solid rgba(120, 190, 255, 0.22)",
                              display: "block",
                              background: "rgba(15, 45, 75, 0.25)",
                            }}
                            title="Open image"
                            aria-label="Open image"
                          >
                            <img
                              src={url}
                              alt=""
                              loading="lazy"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          </a>
                        ))}
                      {addImgs.length === 0 && (
                        <p className="muted" style={{ margin: 0 }}>
                          No additional images found for this card.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="muted" style={{ marginTop: 0, marginBottom: 10, fontWeight: 800 }}>
                      Comparison
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {[
                        {
                          src: safeImgUrl(card.compare_catawiki?.photo_url),
                          href: card.compare_catawiki?.url,
                          label: "Catawiki",
                          priceText: safeText(card.compare_catawiki?.price_text),
                        },
                        {
                          src: safeImgUrl(card.compare_vinted?.photo_url),
                          href: card.compare_vinted?.url,
                          label: "Vinted",
                          priceText: safeText(
                            card.compare_vinted?.price_incl_text || card.compare_vinted?.price_text
                          ),
                        },
                      ]
                        .filter((x) => x.src)
                        .map((x) => {
                          const href = typeof x.href === "string" && x.href.startsWith("http") ? x.href : x.src;
                          return (
                            <a
                              key={x.label}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                width: 140,
                                height: 140,
                                borderRadius: 0,
                                overflow: "hidden",
                                border: "1px solid rgba(236, 72, 153, 0.25)",
                                display: "block",
                                background: "rgba(15, 45, 75, 0.25)",
                                position: "relative",
                              }}
                              title={`Open ${x.label}`}
                              aria-label={`Open ${x.label}`}
                            >
                              <img
                                src={x.src}
                                alt=""
                                loading="lazy"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                              <span
                                style={{
                                  position: "absolute",
                                  left: 8,
                                  bottom: 8,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                  color: "#0d456d",
                                  background: "rgba(255,255,255,0.92)",
                                  padding: "4px 7px",
                                  borderRadius: 0,
                                }}
                              >
                                {x.label}
                              </span>
                              {x.priceText ? (
                                <span
                                  style={{
                                    position: "absolute",
                                    right: 8,
                                    bottom: 8,
                                    fontSize: 11,
                                    fontWeight: 900,
                                    letterSpacing: "0.02em",
                                    color: "#0d456d",
                                    background: "rgba(255,255,255,0.92)",
                                    padding: "4px 7px",
                                    borderRadius: 0,
                                  }}
                                  title={`${x.label} price`}
                                >
                                  {x.priceText}
                                </span>
                              ) : null}
                            </a>
                          );
                        })}
                      {compareImgs.length === 0 && (
                          <p className="muted" style={{ margin: 0 }}>
                            No compare images found for this card yet.
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              </section>
              );
            })()}

            <section className="card-detail-section card-detail-section--plain">
              <div className="card-detail-section__head">
                <h2 className="card-detail-section__title">Price trend</h2>
                <p className="card-detail-section__sub muted">Median ask by day (sample)</p>
              </div>
              {(() => {
                const candidates = [
                  {
                    key: "cata",
                    src: "Catawiki",
                    fetched_at: card.compare_catawiki?.fetched_at,
                    money: parseMoney(card.compare_catawiki?.price_text),
                    color: "#ec4899",
                  },
                  {
                    key: "vinted",
                    src: "Vinted",
                    fetched_at: card.compare_vinted?.fetched_at,
                    money: parseMoney(
                      card.compare_vinted?.price_incl_text || card.compare_vinted?.price_text
                    ),
                    color: "#0ea5a4",
                  },
                ].filter((c) => c.money?.value != null);

                candidates.sort((a, b) =>
                  String(b.fetched_at || "").localeCompare(String(a.fetched_at || ""))
                );
                const best = candidates[0] || null;

                let compare = null;
                if (best) {
                  let v = best.money.value;
                  let fx = false;
                  if (best.money.currency === "EUR" && cur === "USD") {
                    v = v * EUR_TO_USD;
                    fx = true;
                  }
                  compare = {
                    label: `Compare (${best.src})`,
                    source: best.src,
                    value: v,
                    fx,
                    color: best.color,
                  };
                }

                return (
                  <div className="card-detail-trend-grid">
                    <div className="card-detail-trend-grid__col">
                      <TrendLineChart series={trendRows} currency={cur} compareLines={[]} />
                    </div>
                    <div className="card-detail-trend-grid__col">
                      <CompareSnapshotChart
                        ebayValue={card.latest_trend?.price}
                        compare={compare}
                        currency={cur}
                      />
                    </div>
                  </div>
                );
              })()}
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
