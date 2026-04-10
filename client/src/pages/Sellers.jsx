import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { fetchSellers } from "../api.js";

const ALLOWED_SORT = ["card_count", "feedback_pct", "feedback_score", "seller_username"];

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

/** Horizontal deck: back layers left, front (newest preview) right. */
const PREVIEW_STACK_MAX = 6;
const STACK_STEP_PX = 22;

function SellerPreviewStack({ cards }) {
  const list = (cards || [])
    .slice(0, PREVIEW_STACK_MAX)
    .map((c) => ({
      card_key: c.card_key,
      title: c.title,
      img: safeImgUrl(c.image_url),
    }))
    .filter((c) => c.card_key != null && String(c.card_key).trim() !== "");
  const n = list.length;
  if (n === 0) return null;
  const cardW = 48;
  const cardH = 66;
  const stackW = (n - 1) * STACK_STEP_PX + cardW;
  return (
    <div
      className="seller-stack"
      style={{
        width: `${stackW}px`,
        height: `${cardH + 10}px`,
        "--seller-stack-w": `${cardW}px`,
        "--seller-stack-h": `${cardH}px`,
      }}
    >
      {list.map((c, i) => {
        const cardTo = `/cards/${encodeURIComponent(c.card_key)}`;
        return (
          <Link
            key={c.card_key}
            to={cardTo}
            className="seller-stack__link"
            title={c.title || c.card_key}
            style={{
              zIndex: i + 1,
              "--seller-tx": `${i * STACK_STEP_PX}px`,
            }}
          >
            {c.img ? (
              <img src={c.img} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="seller-stack__ph" aria-hidden />
            )}
          </Link>
        );
      })}
    </div>
  );
}

function SortTh({ id, label, currentSort, order, onSort, align = "left" }) {
  const active = currentSort === id;
  const ariaSort = active ? (order === "asc" ? "ascending" : "descending") : "none";
  return (
    <th
      scope="col"
      className={align === "right" ? "seller-directory__th-sort seller-directory__th-sort--end" : "seller-directory__th-sort"}
      aria-sort={ariaSort}
    >
      <button type="button" className="seller-directory__sort-btn" onClick={() => onSort(id)}>
        <span className="seller-directory__sort-label">{label}</span>
        {active ? (
          <span className="seller-directory__sort-arrow" aria-hidden>
            {order === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </th>
  );
}

export default function Sellers() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = useMemo(() => {
    const page = clamp(toInt(searchParams.get("page"), 1), 1, 1_000_000);
    const sortRaw = searchParams.get("sort") || "card_count";
    const sort = ALLOWED_SORT.includes(sortRaw) ? sortRaw : "card_count";
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
    setPage(initial.page);
    setSort(initial.sort);
    setOrder(initial.order);
  }, [initial.page, initial.sort, initial.order]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = await fetchSellers({ page, limit, sort, order, cardsLimit: PREVIEW_STACK_MAX });
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

  function onHeaderSort(columnId) {
    setPage(1);
    if (sort === columnId) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
      return;
    }
    setSort(columnId);
    setOrder(columnId === "seller_username" ? "asc" : "desc");
  }

  const totalPages = data ? Math.max(1, Math.ceil((data.total || 0) / (data.limit || limit))) : 1;
  const sellers = data?.items || [];

  return (
    <div className="cards-page cards-page--light seller-page">
      <PageHelmet
        breadcrumb="seller-analysis"
        description="Seller analysis: feedback metrics and distinct card coverage per seller."
      />

      {err && <p className="err">{err}</p>}
      {!data && !err && <p className="muted">Loading…</p>}

      {data && sellers.length === 0 && <p className="muted">No seller rows found yet.</p>}

      {data && (
        <div className="floating-pager" aria-label="Pagination">
          <button
            type="button"
            className="hero-btn hero-btn--outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="floating-pager__meta">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            className="hero-btn hero-btn--outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {data && sellers.length > 0 && (
        <div className="panel seller-directory">
          <div className="card-detail-table-scroll seller-directory__scroll">
            <table className="card-detail-table seller-directory__table">
              <thead>
                <tr>
                  <th className="seller-directory__th-preview" scope="col">
                    Preview
                  </th>
                  <SortTh
                    id="seller_username"
                    label="Username"
                    currentSort={sort}
                    order={order}
                    onSort={onHeaderSort}
                  />
                  <SortTh
                    id="feedback_pct"
                    label="Feedback"
                    currentSort={sort}
                    order={order}
                    onSort={onHeaderSort}
                  />
                  <SortTh
                    id="feedback_score"
                    label="Score"
                    currentSort={sort}
                    order={order}
                    onSort={onHeaderSort}
                  />
                  <SortTh
                    id="card_count"
                    label="Cards"
                    currentSort={sort}
                    order={order}
                    onSort={onHeaderSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => {
                  const profileTo = `/sellers/${encodeURIComponent(s.seller_username)}`;
                  const stack = <SellerPreviewStack cards={s.cards} />;
                  return (
                    <tr key={s.seller_username}>
                      <td className="seller-directory__td-preview">{stack ?? <span className="muted">—</span>}</td>
                      <td className="seller-directory__td-user">
                        <Link to={profileTo} className="seller-directory__user-link">
                          {s.seller_username}
                        </Link>
                      </td>
                      <td className="card-detail-table__num">{fmtPct(s.seller_feedback_percentage)}</td>
                      <td className="card-detail-table__num">{fmtNum(s.seller_feedback_score)}</td>
                      <td className="card-detail-table__num seller-directory__td-count">{fmtNum(s.card_count)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
