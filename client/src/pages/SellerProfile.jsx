import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { fetchSellerProfile } from "../api.js";

function toInt(v, fallback) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function safeImgUrl(u) {
  if (typeof u !== "string") return null;
  const s = u.trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : null;
}

function fmtPct(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n}%`;
}

function fmtMoney(v, cur) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  const num = n.toFixed(2);
  const c = (cur || "").trim();
  if (c === "USD") return `$${num}`;
  if (!c) return num;
  return `${num} ${c}`;
}

function toNum(v) {
  if (v == null) return null;
  // Handle Mongo extended JSON (Decimal128 / Double) if it ever appears
  if (typeof v === "object") {
    const dec = v.$numberDecimal ?? v.$numberDouble ?? v.value ?? null;
    if (dec != null) return toNum(dec);
  }
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  if (typeof v === "string") {
    const p = Number.parseFloat(v.replace(/[^\d.\-]/g, ""));
    return Number.isFinite(p) ? p : null;
  }
  return null;
}

function SellerCardPriceChart({ cards }) {
  const rows = useMemo(() => {
    const base = (cards || [])
      .map((c) => ({
        card_key: c.card_key,
        title: c.title || c.card_key,
        img: safeImgUrl(c.image_url),
        value: toNum(c.latest_trend?.price),
        currency: c.price_currency || c.latest_trend?.price_currency || "",
      }))
      .filter((r) => r.card_key && r.value != null);

    // Show more bars like your screenshot; keep it capped.
    return base.sort((a, b) => b.value - a.value).slice(0, 28);
  }, [cards]);

  const [hoverKey, setHoverKey] = useState(null);

  if (rows.length === 0) return null;

  const w = 1100;
  const h = 390;
  const pad = { l: 44, r: 18, t: 16, b: 120 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const maxV = Math.max(...rows.map((r) => r.value), 1);
  const yOf = (v) => pad.t + ih - (v / maxV) * ih;

  const barGap = 18;
  const barW = Math.max(8, Math.min(22, (iw - barGap * (rows.length - 1)) / rows.length));
  const thumbSize = 26;
  const thumbY = pad.t + ih + 18;

  const hoverIdx = hoverKey ? rows.findIndex((r) => r.card_key === hoverKey) : -1;
  const hoverRow = hoverIdx >= 0 ? rows[hoverIdx] : null;

  return (
    <div className="seller-price-chart panel">
      <svg
        className="seller-price-chart__svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Seller card prices bar chart"
        onMouseLeave={() => setHoverKey(null)}
      >
        <defs>
          <linearGradient id="sellerBarDefault" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.95)" />
            <stop offset="100%" stopColor="rgba(91, 33, 182, 0.95)" />
          </linearGradient>
          <linearGradient id="sellerBarHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.95)" />
            <stop offset="100%" stopColor="rgba(21, 128, 61, 0.95)" />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line
          x1={pad.l}
          y1={pad.t + ih}
          x2={w - pad.r}
          y2={pad.t + ih}
          stroke="rgba(46, 93, 137, 0.5)"
          strokeWidth="1"
        />

        {rows.map((r, i) => {
          const x = pad.l + i * (barW + barGap);
          const y = yOf(r.value);
          const bh = pad.t + ih - y;
          const isHover = hoverKey === r.card_key;
          return (
            <g
              key={r.card_key}
              onMouseEnter={() => setHoverKey(r.card_key)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={bh}
                fill={isHover ? "url(#sellerBarHover)" : "url(#sellerBarDefault)"}
                opacity={isHover ? 1 : 0.92}
              />
              <text
                x={x + barW / 2}
                y={Math.max(pad.t + 14, y + 16)}
                textAnchor="middle"
                fill="rgba(255,255,255,0.95)"
                fontSize="12"
                fontWeight="800"
                fontFamily="system-ui, sans-serif"
              >
                {Math.round(r.value)}
              </text>

              {/* thumbnail on x-axis */}
              <g
                transform={`translate(${x + barW / 2 - thumbSize / 2}, ${thumbY})`}
                onMouseEnter={() => setHoverKey(r.card_key)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x="0"
                  y="0"
                  width={thumbSize}
                  height={thumbSize}
                  rx="8"
                  ry="8"
                  fill="rgba(13, 40, 64, 0.45)"
                  stroke={isHover ? "rgba(34, 197, 94, 0.85)" : "rgba(46, 93, 137, 0.45)"}
                  strokeWidth="1"
                />
                {r.img ? (
                  <image
                    href={r.img}
                    x="1"
                    y="1"
                    width={thumbSize - 2}
                    height={thumbSize - 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath=""
                  />
                ) : (
                  <text
                    x={thumbSize / 2}
                    y={thumbSize / 2 + 4}
                    textAnchor="middle"
                    fill="rgba(155, 184, 216, 0.85)"
                    fontSize="12"
                    fontWeight="900"
                    fontFamily="system-ui, sans-serif"
                  >
                    —
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* tooltip */}
        {hoverRow && (() => {
          const i = hoverIdx;
          const x = pad.l + i * (barW + barGap) + barW / 2;
          const y = yOf(hoverRow.value);
          const label = `${hoverRow.title} · ${fmtMoney(hoverRow.value, hoverRow.currency)}`;
          const fontSize = 13;
          const padX = 10;
          const padY = 8;
          const approxW = Math.min(520, Math.max(160, label.length * 7.1));
          const bw = approxW + padX * 2;
          const bh = fontSize + padY * 2;
          const bx = Math.min(w - pad.r - bw, Math.max(pad.l, x - bw / 2));
          const by = Math.max(pad.t, y - bh - 14);
          return (
            <g pointerEvents="none">
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                rx="12"
                ry="12"
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
                fontWeight="800"
                fontFamily="system-ui, sans-serif"
              >
                {label}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

export default function SellerProfile() {
  const { sellerUsername } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = useMemo(() => {
    const page = clamp(toInt(searchParams.get("page"), 1), 1, 1_000_000);
    const view = (searchParams.get("view") || "chart").toLowerCase();
    const viewMode = view === "table" ? "table" : "chart";
    return { page, viewMode };
  }, [searchParams]);

  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(initial.page);
  const [viewMode, setViewMode] = useState(initial.viewMode);

  const limit = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = await fetchSellerProfile(sellerUsername, { sort: "price", order: "desc", cardsLimit: 400 });
        if (!cancelled) {
          setData(body);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(String(e.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerUsername]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set("page", String(page));
    if (viewMode && viewMode !== "chart") next.set("view", viewMode);
    const nextStr = next.toString();
    const curStr = searchParams.toString();
    if (nextStr !== curStr) setSearchParams(next, { replace: true });
  }, [page, viewMode, searchParams, setSearchParams]);

  const allCards = data?.cards || [];
  const totalPages = data ? Math.max(1, Math.ceil((allCards.length || 0) / limit)) : 1;
  const cards = allCards.slice((page - 1) * limit, (page - 1) * limit + limit);

  const { minCard, maxCard } = useMemo(() => {
    let min = null;
    let max = null;
    for (const c of allCards) {
      const p = toNum(c?.latest_trend?.price);
      if (p == null) continue;
      const minP = toNum(min?.latest_trend?.price);
      const maxP = toNum(max?.latest_trend?.price);
      if (!min || minP == null || p < minP) min = c;
      if (!max || maxP == null || p > maxP) max = c;
    }
    return { minCard: min, maxCard: max };
  }, [allCards]);

  const maxCur = maxCard?.price_currency || maxCard?.latest_trend?.price_currency || "";
  const minCur = minCard?.price_currency || minCard?.latest_trend?.price_currency || "";

  return (
    <div className="cards-page cards-page--light seller-profile-page">
      <PageHelmet
        breadcrumb={`sellers / ${sellerUsername || ""}`}
        description={`Seller profile for ${sellerUsername || ""}: feedback metrics and card list.`}
      />

      {err && <p className="err">{err}</p>}
      {!data && !err && <p className="muted">Loading…</p>}

      {data && (
        <>
          <div className="panel seller-profile-head">
            <div className="seller-profile-head__top">
              <div>
                <p className="muted" style={{ margin: 0 }}>
                  Seller
                </p>
                <h2 className="seller-profile-head__name">
                  <span className="seller-profile-head__icon" aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 21a8 8 0 10-16 0"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 13a5 5 0 100-10 5 5 0 000 10z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {data.seller_username}
                </h2>
              </div>
              <div className="seller-profile-head__pills">
                <span className="mp-pill mp-pill--muted">Feedback: {fmtPct(data.seller_feedback_percentage)}</span>
                <span className="mp-pill mp-pill--muted">Score: {data.seller_feedback_score ?? "—"}</span>
                <span className="mp-pill mp-pill--green">Cards: {data.card_count ?? "—"}</span>
                <span className="mp-pill mp-pill--muted" title="Max price card (latest median ask)">
                  Max:{" "}
                  {maxCard ? (
                    <Link
                      to={`/cards/${encodeURIComponent(maxCard.card_key)}`}
                      className="seller-pill-link"
                      title={maxCard.title || maxCard.card_key}
                    >
                      {fmtMoney(maxCard.latest_trend?.price, maxCur)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="mp-pill mp-pill--muted" title="Min price card (latest median ask)">
                  Min:{" "}
                  {minCard ? (
                    <Link
                      to={`/cards/${encodeURIComponent(minCard.card_key)}`}
                      className="seller-pill-link"
                      title={minCard.title || minCard.card_key}
                    >
                      {fmtMoney(minCard.latest_trend?.price, minCur)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="seller-profile-content">
            <button
              type="button"
              className="seller-view-toggle hero-btn hero-btn--outline"
              onClick={() => setViewMode((m) => (m === "chart" ? "table" : "chart"))}
              title={viewMode === "chart" ? "Switch to table mode" : "Switch to chart mode"}
            >
              {viewMode === "chart" ? "Table" : "Chart"}
            </button>

            {viewMode === "chart" ? <SellerCardPriceChart cards={allCards || []} /> : null}

            {viewMode === "table" ? (
              <div className="panel seller-profile-list">
                <div className="card-detail-table-scroll card-detail-table-scroll--plain">
                  <table className="card-detail-table">
                    <thead>
                      <tr>
                        <th className="card-detail-table__th-thumb">Card</th>
                        <th>Title</th>
                        <th>Price</th>
                        <th>N</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cards.map((c) => {
                        const img = safeImgUrl(c.image_url);
                        const cur = c.price_currency || c.latest_trend?.price_currency || "";
                        const to = `/cards/${encodeURIComponent(c.card_key)}`;
                        return (
                          <tr key={c.card_key}>
                            <td className="card-detail-table__th-thumb">
                              <Link to={to} title="Open card detail">
                                {img ? (
                                  <img
                                    src={img}
                                    alt=""
                                    loading="lazy"
                                    style={{
                                      width: 46,
                                      height: 46,
                                      objectFit: "cover",
                                      borderRadius: 10,
                                      display: "block",
                                    }}
                                  />
                                ) : (
                                  <span className="mp-row__thumb-placeholder">—</span>
                                )}
                              </Link>
                            </td>
                            <td className="card-detail-table__title-cell">
                              <Link to={to} className="mp-row__title" style={{ fontSize: "0.98rem" }}>
                                {c.title || c.card_key}
                              </Link>
                              <div className="muted" style={{ fontSize: "0.78rem" }}>
                                {c.card_key}
                              </div>
                            </td>
                            <td className="card-detail-table__price">
                              <span className="card-detail-table__price-val">
                                {fmtMoney(c.latest_trend?.price, cur)}
                              </span>
                            </td>
                            <td className="card-detail-table__num">{c.latest_trend?.count ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="filters-pager" style={{ marginTop: 14, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>
                    <span className="muted">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

