import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { fetchCards } from "../api.js";

function safeImgUrl(u) {
  if (typeof u !== "string") return null;
  const s = u.trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : null;
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

function fmtMoney(m) {
  if (!m) return "—";
  if (m.value == null) return m.raw || "—";
  const v = m.value.toFixed(2);
  if (m.currency === "USD") return `$${v}`;
  if (m.currency === "EUR") return `€${v}`;
  return `${v}${m.raw ? ` (${m.raw})` : ""}`;
}

function fmtDelta(delta, currency) {
  if (delta == null || !Number.isFinite(delta)) return "—";
  const sign = delta > 0 ? "+" : "";
  const abs = Math.abs(delta).toFixed(2);
  if (currency === "USD") return `${sign}$${abs}`;
  if (currency === "EUR") return `${sign}€${abs}`;
  return `${sign}${abs} ${currency || ""}`.trim();
}

// Simple client-side FX for visibility only (not financial advice).
// Adjust any time; or we can move this to an API-provided rate later.
const EUR_TO_USD = 1.08;

function spreadLabel({ ebayPrice, ebayCurrency, otherMoney }) {
  if (ebayPrice == null || !Number.isFinite(ebayPrice) || !otherMoney?.value) return null;
  const curA = otherMoney.currency || null;
  const curB = ebayCurrency || null;

  // If currency matches (or missing), compute directly.
  if (!curA || !curB || curA === curB) {
    const delta = ebayPrice - otherMoney.value;
    const pct =
      otherMoney.value !== 0 ? Math.round((delta / otherMoney.value) * 10_000) / 100 : null;
    return { delta, pct, currency: curB || curA || null, fx: false };
  }

  // If EUR vs USD, convert EUR→USD for a rough spread.
  if (curA === "EUR" && curB === "USD") {
    const otherUsd = otherMoney.value * EUR_TO_USD;
    const delta = ebayPrice - otherUsd;
    const pct =
      otherUsd !== 0 ? Math.round((delta / otherUsd) * 10_000) / 100 : null;
    return { delta, pct, currency: "USD", fx: true };
  }

  // Unsupported pair for now.
  return null;
}

function rangeClassName(s) {
  // Color by direction/magnitude for quick recognition:
  // - teal: eBay cheaper than compare (good buy on eBay)
  // - pink: eBay more expensive than compare
  // - slate: roughly equal / tiny delta
  const pct = typeof s?.pct === "number" ? s.pct : null;
  if (pct == null) return "mp-pill--violet";
  if (Math.abs(pct) < 2) return "mp-pill--slate";
  return pct < 0 ? "mp-pill--teal" : "mp-pill--pink";
}

function readMatchScore(obj) {
  if (!obj || typeof obj !== "object") return null;
  const raw =
    obj.match_score ??
    obj.matchScore ??
    obj.score ??
    obj.similarity ??
    obj.similarity_score ??
    obj.similarityScore ??
    null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function fmtScore(v) {
  if (v == null) return "—";
  if (v <= 1) return `${Math.round(v * 1000) / 10}%`;
  return String(Math.round(v * 10) / 10);
}

export default function Alerts() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = await fetchCards({
          page,
          limit,
          sort: "recency",
          compareOnly: "true",
        });
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
  }, [page]);

  const rows = useMemo(() => {
    const items = data?.items || [];
    return items
      .map((c) => {
        const v = c.compare_vinted || null;
        const cw = c.compare_catawiki || null;
        if (!v && !cw) return null;

        const ebay = c.latest_trend?.price != null ? Number(c.latest_trend.price) : null;
        const ebayCur = c.price_currency || "USD";
        const vPrice = parseMoney(v?.price_incl_text || v?.price_text);
        const cPrice = parseMoney(cw?.price_text);

        return {
          card_key: c.card_key,
          title: c.title || c.card_key,
          ebayPrice: ebay,
          ebayCurrency: ebayCur,
          ebayUrl: c.preview_listing_url || null,
          ebayImg: safeImgUrl(c.preview_image_url),
          vinted: v,
          vintedPrice: vPrice,
          vintedImg: safeImgUrl(v?.photo_url),
          vintedScore: readMatchScore(v),
          catawiki: cw,
          catawikiPrice: cPrice,
          catawikiImg: safeImgUrl(cw?.photo_url),
          catawikiScore: readMatchScore(cw),
          updatedAt: c.compare_updated_at || null,
        };
      })
      .filter(Boolean);
  }, [data]);

  const totalPages = data ? Math.max(1, Math.ceil((data.total || 0) / (data.limit || limit))) : 1;

  return (
    <div className="cards-page cards-page--light" style={{ paddingBottom: 18 }}>
      <PageHelmet
        breadcrumb="comparison-alert"
        description="Compare eBay asking price with Vinted and Catawiki discovery prices."
      />
      {err && <p className="err">{err}</p>}
      {!data && !err && <p className="muted">Loading…</p>}

      {data && rows.length === 0 && (
        <p className="muted">
          No compare rows found yet. Run the marketplace-first ingest so `compare_vinted` / `compare_catawiki` exist.
        </p>
      )}

      {data && rows.length > 0 && (
        <div className="mp-list" role="list" aria-label="Comparison rows">
          {rows.map((r) => {
            const detailTo = `/cards/${encodeURIComponent(r.card_key)}`;
            const ebayLabel =
              r.ebayPrice != null ? `${r.ebayPrice} ${r.ebayCurrency || ""}` : "—";
            return (
              <article key={r.card_key} className="mp-row" role="listitem">
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="mp-pill mp-pill--muted" title="Source">
                      eBay
                    </span>
                    <div className="mp-row__thumb" title="eBay image">
                      {r.ebayUrl ? (
                        <a
                          className="mp-row__thumb-link"
                          href={r.ebayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open eBay listing"
                          aria-label="Open eBay listing"
                        >
                          {r.ebayImg ? (
                            <img src={r.ebayImg} alt="" loading="lazy" />
                          ) : (
                            <span className="mp-row__thumb-placeholder">No eBay image</span>
                          )}
                        </a>
                      ) : (
                        <Link
                          className="mp-row__thumb-link"
                          to={detailTo}
                          title="Open card detail"
                          aria-label="Open card detail"
                        >
                          {r.ebayImg ? (
                            <img src={r.ebayImg} alt="" loading="lazy" />
                          ) : (
                            <span className="mp-row__thumb-placeholder">No eBay image</span>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>

                  {r.vintedImg ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="mp-pill mp-pill--muted" title="Source">
                        Vinted
                      </span>
                      <div className="mp-row__thumb" title="Vinted image">
                        <a
                          href={r.vintedImg}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open Vinted image"
                          style={{ display: "block", width: "100%", height: "100%" }}
                        >
                          <img src={r.vintedImg} alt="" loading="lazy" />
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {r.catawikiImg ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="mp-pill mp-pill--muted" title="Source">
                        Catawiki
                      </span>
                      <div className="mp-row__thumb" title="Catawiki image">
                        <a
                          href={r.catawikiImg}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open Catawiki image"
                          style={{ display: "block", width: "100%", height: "100%" }}
                        >
                          <img src={r.catawikiImg} alt="" loading="lazy" />
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mp-row__mid">
                  <Link className="mp-row__title" to={detailTo}>
                    {r.title}
                  </Link>
                  <p className="mp-row__sub muted">
                    {r.updatedAt ? `Compare updated ${new Date(r.updatedAt).toISOString().slice(0, 10)}` : "—"}
                  </p>

                  <div className="mp-row__pills">
                    <span className="mp-pill mp-pill--muted" title="eBay latest median ask">
                      eBay: {ebayLabel}
                    </span>
                    {r.vinted && (
                      <>
                        <span className="mp-pill mp-pill--muted" title="Vinted listing price">
                          Vinted: {fmtMoney(r.vintedPrice)}
                        </span>
                        <span className="mp-pill mp-pill--slate" title="Vinted match score">
                          Match score: {fmtScore(r.vintedScore)}
                        </span>
                        <span className="mp-pill mp-pill--muted" title="Vinted likes">
                          ♥ {Number(r.vinted.likes || 0)}
                        </span>
                      </>
                    )}
                    {r.catawiki && (
                      <>
                        <span className="mp-pill mp-pill--muted" title="Catawiki listing price">
                          Catawiki: {fmtMoney(r.catawikiPrice)}
                        </span>
                        <span className="mp-pill mp-pill--slate" title="Catawiki match score">
                          Match score: {fmtScore(r.catawikiScore)}
                        </span>
                        <span className="mp-pill mp-pill--muted" title="Catawiki likes">
                          ♥ {Number(r.catawiki.likes || 0)}
                        </span>
                      </>
                    )}

                    {(() => {
                      const s = spreadLabel({
                        ebayPrice: r.ebayPrice,
                        ebayCurrency: r.ebayCurrency,
                        otherMoney: r.vintedPrice,
                      });
                      if (!s) return null;
                      return (
                        <span className="mp-pill mp-pill--green" title="eBay − Vinted (same currency only)">
                          Δ Vinted: {fmtDelta(s.delta, s.currency)}{s.fx ? " (FX est)" : ""}
                          {s.pct != null ? ` (${s.pct > 0 ? "+" : ""}${s.pct}%)` : ""}
                        </span>
                      );
                    })()}

                    {(() => {
                      const s = spreadLabel({
                        ebayPrice: r.ebayPrice,
                        ebayCurrency: r.ebayCurrency,
                        otherMoney: r.catawikiPrice,
                      });
                      if (!s) return null;
                      return (
                        <span className="mp-pill mp-pill--green" title="eBay − Catawiki (same currency only)">
                          Δ Catawiki: {fmtDelta(s.delta, s.currency)}{s.fx ? " (FX est)" : ""}
                          {s.pct != null ? ` (${s.pct > 0 ? "+" : ""}${s.pct}%)` : ""}
                        </span>
                      );
                    })()}

                    {r.ebayUrl && (
                      <a
                        className="mp-pill mp-pill--green"
                        href={r.ebayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open eBay listing"
                      >
                        Open eBay
                      </a>
                    )}
                    {r.vinted?.url && (
                      <a
                        className="mp-pill mp-pill--green"
                        href={r.vinted.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Vinted listing"
                      >
                        Open Vinted
                      </a>
                    )}
                    {r.catawiki?.url && (
                      <a
                        className="mp-pill mp-pill--green"
                        href={r.catawiki.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Catawiki listing"
                      >
                        Open Catawiki
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="floating-pager" aria-label="Pagination">
        <button
          type="button"
          className="hero-btn hero-btn--outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>

        <span className="floating-pager__meta">{page}/{totalPages}</span>

        <button
          type="button"
          className="hero-btn hero-btn--outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
