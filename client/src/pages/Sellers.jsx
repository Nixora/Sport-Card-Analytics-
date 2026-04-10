import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { fetchSellers } from "../api.js";

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

function fmtNum(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(n);
}

const SORT_OPTIONS = [
  { value: "card_count", label: "Card count" },
  { value: "feedback_pct", label: "Feedback %" },
  { value: "feedback_score", label: "Feedback score" },
];

export default function Sellers() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = useMemo(() => {
    const page = clamp(toInt(searchParams.get("page"), 1), 1, 1_000_000);
    const sort = searchParams.get("sort") || "card_count";
    const order = (searchParams.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    return { page, sort, order };
  }, [searchParams]);

  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [page, setPage] = useState(initial.page);
  const [sort, setSort] = useState(initial.sort);
  const [order, setOrder] = useState(initial.order);

  const limit = 25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = await fetchSellers({ page, limit, sort, order, cardsLimit: 20 });
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
  }, [page, sort, order]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (page > 1) next.set("page", String(page));
    if (sort && sort !== "card_count") next.set("sort", sort);
    if (order && order !== "desc") next.set("order", order);
    const nextStr = next.toString();
    const curStr = searchParams.toString();
    if (nextStr !== curStr) setSearchParams(next, { replace: true });
  }, [page, sort, order, searchParams, setSearchParams]);

  const totalPages = data ? Math.max(1, Math.ceil((data.total || 0) / (data.limit || limit))) : 1;
  const sellers = data?.items || [];

  return (
    <div className="cards-page cards-page--light seller-page">
      <PageHelmet
        breadcrumb="seller-analysis"
        description="Seller analysis: feedback metrics and distinct card coverage per seller."
      />

      <div className="seller-toolbar panel">
        <div className="row-tools table-filters-row" style={{ alignItems: "flex-end" }}>
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Order
            <select
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setPage(1);
              }}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>

          <div className="filters-pager" style={{ marginLeft: "auto" }}>
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
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
        </div>
      </div>

      {err && <p className="err">{err}</p>}
      {!data && !err && <p className="muted">Loading…</p>}

      {data && sellers.length === 0 && <p className="muted">No seller rows found yet.</p>}

      {data && sellers.length > 0 && (
        <div className="seller-list">
          {sellers.map((s) => (
            <article key={s.seller_username} className="panel seller-row">
              <div className="seller-row__head">
                <div className="seller-row__who">
                  <h2 className="seller-row__name">
                    <Link
                      to={`/sellers/${encodeURIComponent(s.seller_username)}`}
                      className="seller-row__name-link"
                      title="Open seller profile"
                    >
                      {s.seller_username}
                    </Link>
                  </h2>
                  <div className="seller-row__stats">
                    <span className="mp-pill mp-pill--muted" title="Seller feedback percentage">
                      Feedback: {fmtPct(s.seller_feedback_percentage)}
                    </span>
                    <span className="mp-pill mp-pill--muted" title="Seller feedback score">
                      Score: {fmtNum(s.seller_feedback_score)}
                    </span>
                    <span className="mp-pill mp-pill--green" title="Distinct cards (unique card_key)">
                      Cards: {fmtNum(s.card_count)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="seller-cards">
                {(s.cards || []).map((c) => {
                  const img = safeImgUrl(c.image_url);
                  const detailTo = `/cards/${encodeURIComponent(c.card_key)}`;
                  return (
                    <Link key={c.card_key} to={detailTo} className="seller-card" title={c.title || c.card_key}>
                      <div className="seller-card__thumb">
                        {img ? <img src={img} alt="" loading="lazy" /> : <span className="seller-card__ph">No image</span>}
                      </div>
                      <div className="seller-card__meta">
                        <div className="seller-card__title">{c.title || c.card_key}</div>
                        <div className="seller-card__sub muted">{c.card_key}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

