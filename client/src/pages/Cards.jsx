import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCards } from "../api.js";
import CardTitleLink from "../components/CardTitleLink.jsx";
import PageHelmet from "../components/PageHelmet.jsx";

function feedbackTone(pct) {
  if (typeof pct !== "number") return "na";
  if (pct >= 99) return "good";
  if (pct >= 97) return "warn";
  return "bad";
}

function formatPriceDisplay(price, currency) {
  if (price == null || price === "") return "—";
  const n = Number(price);
  const num = Number.isFinite(n) ? n.toFixed(2) : String(price);
  const cur = (currency || "USD").trim();
  return cur === "USD" || cur === "$" ? `$${num}` : `${num} ${cur}`;
}

function formatFreshnessLine(lastSeenIso, trendDate) {
  if (lastSeenIso) {
    const t = new Date(lastSeenIso).getTime();
    if (!Number.isFinite(t)) return trendDate ? `As of ${trendDate}` : "—";
    const diff = Math.max(0, Date.now() - t);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h < 72) return `${h}h ${m}m`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }
  return trendDate ? `As of ${trendDate}` : "—";
}

function rowSubtitle(c) {
  if (c.seller_username) return `Seller · ${c.seller_username}`;
  const key = c.card_key || "";
  return key.length > 56 ? `${key.slice(0, 56)}…` : key;
}

function cardEbayListingUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

export default function Cards() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const [sort, setSort] = useState("recency");
  const [page, setPage] = useState(1);
  const [autograph, setAutograph] = useState(false);
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = { page, limit: 25, sort };
    if (autograph) params.autograph = "true";
    if (graded) params.graded = "true";
    (async () => {
      try {
        const body = await fetchCards(params);
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
  }, [sort, page, autograph, graded]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="cards-page cards-page--light">
      <PageHelmet
        breadcrumb="marketplace-comparison"
        description="Browse cards, compare asking prices from your ingest sample, filters, and table view on Nixsor."
      />
      {err && <p className="err">{err}</p>}
      {!data && !err && <p className="muted">Loading…</p>}
      {data && (
        <div className="cards-layout">
          <section>
            {viewMode === "cards" ? (
              <div className="cards-grid">
                {data.items.map((c) => {
                  const ebayUrl = cardEbayListingUrl(c.preview_listing_url);
                  const detailTo = `/cards/${encodeURIComponent(c.card_key)}`;
                  const fullTitle = c.title || c.card_key;
                  const cap = 72;
                  const titleLabel =
                    fullTitle.length > cap ? `${fullTitle.slice(0, cap)}…` : fullTitle;
                  const thumbInner =
                    c.preview_image_url ? (
                      <img
                        src={c.preview_image_url}
                        alt={c.title || c.card_key}
                        loading="lazy"
                      />
                    ) : (
                      <div className="card-placeholder">No image</div>
                    );
                  return (
                    <article className="card-tile" key={c.card_key}>
                      <div className="card-media">
                        {ebayUrl ? (
                          <a
                            className="card-tile__media-hit"
                            href={ebayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View listing on eBay"
                            aria-label="View listing on eBay"
                          >
                            {thumbInner}
                          </a>
                        ) : (
                          <Link
                            className="card-tile__media-hit"
                            to={detailTo}
                            title="Open card detail"
                            aria-label="Open card detail"
                          >
                            {thumbInner}
                          </Link>
                        )}
                      </div>
                      <div className="card-body">
                        <h3 className="card-tile__title-heading">
                          <Link className="card-tile__title" to={detailTo} title="Open card detail">
                            {titleLabel}
                          </Link>
                        </h3>
                        <div className="badge-row">
                            {c.flags?.has_autograph && <span className="pill pill--autograph">Autograph</span>}
                            {c.flags?.has_grade_or_auth && <span className="pill pill--grade">Grade/Auth</span>}
                            {c.flags?.has_psa && <span className="pill pill--psa">PSA</span>}
                            {c.flags?.has_bgs && <span className="pill pill--bgs">BGS</span>}
                            {c.flags?.has_jsa && <span className="pill pill--jsa">JSA</span>}
                            {c.flags?.has_beckett && <span className="pill pill--beckett">Beckett</span>}
                            {c.flags?.has_coa && <span className="pill pill--coa">COA</span>}
                          </div>
                          <div className="card-stats">
                            <div>
                              <span className="muted">Latest median ask</span>
                              <strong>
                                {c.latest_trend?.price != null
                                  ? `${c.latest_trend.price} ${c.price_currency || ""}`
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span className="muted">Listings (N)</span>
                              <strong>{c.latest_trend?.count ?? "—"}</strong>
                            </div>
                            <div>
                              <span className="muted">7d %</span>
                              <strong>{c.change_7d_pct != null ? `${c.change_7d_pct}%` : "—"}</strong>
                            </div>
                            <div>
                              <span className="muted">Trend date</span>
                              <strong>{c.latest_trend?.date || "—"}</strong>
                            </div>
                            <div>
                              <span className="muted">First seen</span>
                              <strong>
                                {c.first_seen_at
                                  ? new Date(c.first_seen_at).toISOString().slice(0, 10)
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span className="muted">Last seen</span>
                              <strong>
                                {c.last_seen_at
                                  ? new Date(c.last_seen_at).toISOString().slice(0, 10)
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span className="muted">Seller</span>
                              <strong>{c.seller_username || "—"}</strong>
                            </div>
                            <div>
                              <span className="muted">Feedback</span>
                              <strong
                                className={`feedback-badge feedback-badge--${feedbackTone(c.seller_feedback_percentage)}`}
                              >
                                {c.seller_feedback_percentage != null || c.seller_feedback_score != null
                                  ? `${c.seller_feedback_percentage ?? "—"}% (${c.seller_feedback_score ?? "—"})`
                                  : "—"}
                              </strong>
                            </div>
                          </div>
                        </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mp-list-wrap panel">
                <div className="table-filters-header mp-filters">
                  <div className="row-tools table-filters-row">
                    <label>
                      <span className="ui-icon" aria-hidden="true">◫</span> View
                      <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                        <option value="cards">Card list</option>
                        <option value="table">List view</option>
                      </select>
                    </label>
                    <label>
                      <span className="ui-icon" aria-hidden="true">↕</span> Sort{" "}
                      <select value={sort} onChange={(e) => setSort(e.target.value)}>
                        <option value="recency">Last seen</option>
                        <option value="activity">Activity (count)</option>
                        <option value="price">Price</option>
                      </select>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={autograph}
                        onChange={(e) => {
                          setAutograph(e.target.checked);
                          setPage(1);
                        }}
                      />{" "}
                      <span className="ui-icon" aria-hidden="true">✍</span> Autograph (from titles)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={graded}
                        onChange={(e) => {
                          setGraded(e.target.checked);
                          setPage(1);
                        }}
                      />{" "}
                      <span className="ui-icon" aria-hidden="true">✓</span> Grade/auth keywords
                    </label>
                    <div className="filters-pager">
                      <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        Prev
                      </button>
                      <span className="muted">
                        Page {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mp-list" role="list">
                  {data.items.map((c) => {
                    const ebayUrl = cardEbayListingUrl(c.preview_listing_url);
                    const fresh = formatFreshnessLine(c.last_seen_at, c.latest_trend?.date);
                    const count = c.latest_trend?.count ?? 0;
                    return (
                      <article key={c.card_key} className="mp-row" role="listitem">
                        <div className="mp-row__thumb">
                          {ebayUrl ? (
                            <a
                              className="mp-row__thumb-link"
                              href={ebayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View listing on eBay"
                              aria-label="View listing on eBay"
                            >
                              {c.preview_image_url ? (
                                <img src={c.preview_image_url} alt="" loading="lazy" />
                              ) : (
                                <span className="mp-row__thumb-placeholder">No image</span>
                              )}
                            </a>
                          ) : (
                            <Link
                              className="mp-row__thumb-link"
                              to={`/cards/${encodeURIComponent(c.card_key)}`}
                              title="Open card detail"
                              aria-label="Open card detail"
                            >
                              {c.preview_image_url ? (
                                <img src={c.preview_image_url} alt="" loading="lazy" />
                              ) : (
                                <span className="mp-row__thumb-placeholder">No image</span>
                              )}
                            </Link>
                          )}
                        </div>
                        <div className="mp-row__mid">
                          <CardTitleLink
                            className="mp-row__title"
                            cardKey={c.card_key}
                            text={c.title || c.card_key}
                            maxLen={110}
                          />
                          <p className="mp-row__sub">{rowSubtitle(c)}</p>
                          <div className="mp-row__price-row">
                            <span className="mp-row__price">
                              {formatPriceDisplay(c.latest_trend?.price, c.price_currency)}
                            </span>
                            {fresh !== "—" && <span className="mp-row__fresh">{fresh}</span>}
                          </div>
                          <div className="mp-row__pills">
                            {count >= 2 && (
                              <span className="mp-pill mp-pill--green" title="Multiple listings">
                                {count} listings
                              </span>
                            )}
                            {c.change_7d_pct != null && (
                              <span className="mp-pill mp-pill--red">
                                7d {c.change_7d_pct > 0 ? "+" : ""}
                                {c.change_7d_pct}%
                              </span>
                            )}
                            {c.flags?.has_autograph && <span className="mp-pill mp-pill--red">AUTO</span>}
                            {c.flags?.has_psa && <span className="mp-pill mp-pill--muted">PSA</span>}
                            {c.flags?.has_bgs && <span className="mp-pill mp-pill--muted">BGS</span>}
                            {c.flags?.has_jsa && <span className="mp-pill mp-pill--muted">JSA</span>}
                            {c.flags?.has_grade_or_auth && !c.flags?.has_psa && !c.flags?.has_bgs && (
                              <span className="mp-pill mp-pill--muted">GRADED</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
          <aside className={`panel cards-filter-card ${viewMode === "table" ? "is-hidden" : ""}`}>
            <h2>Cards ({data.total})</h2>
            <h3>Filters</h3>
            <div className="row-tools row-tools--stack">
              <label>
                View
                <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                  <option value="cards">Card list</option>
                  <option value="table">List view</option>
                </select>
              </label>
              <label>
                Sort{" "}
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recency">Last seen</option>
                  <option value="activity">Activity (count)</option>
                  <option value="price">Price</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={autograph}
                  onChange={(e) => {
                    setAutograph(e.target.checked);
                    setPage(1);
                  }}
                />{" "}
                Autograph (from titles)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={graded}
                  onChange={(e) => {
                    setGraded(e.target.checked);
                    setPage(1);
                  }}
                />{" "}
                Grade/auth keywords
              </label>
              <div className="filters-pager">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </button>
                <span className="muted">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
