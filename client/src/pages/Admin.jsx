import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DataLoading from "../components/DataLoading.jsx";
import PageHelmet from "../components/PageHelmet.jsx";
import {
  deleteAdminCard,
  deleteAdminCommunityArticle,
  deleteAdminUser,
  fetchAdminCards,
  fetchAdminCommunityArticles,
  fetchAdminJobApplications,
  fetchAdminJobApplicationResumeBlob,
  fetchAdminUsers,
} from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

function fmtDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return String(s);
  }
}

function ConfirmBtn({ className = "", label, confirmText, onConfirm, disabled }) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={async () => {
        // eslint-disable-next-line no-alert
        const ok = window.confirm(confirmText || "Are you sure?");
        if (!ok) return;
        await onConfirm();
      }}
    >
      {label}
    </button>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = Boolean(user?.is_admin);

  const [tab, setTab] = useState("users"); // users | cards | community | applications

  // Users
  const [userQ, setUserQ] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersData, setUsersData] = useState(null);
  const [usersErr, setUsersErr] = useState("");
  const [usersBusyId, setUsersBusyId] = useState("");

  // Cards
  const [cardsPage, setCardsPage] = useState(1);
  const [cardsData, setCardsData] = useState(null);
  const [cardsErr, setCardsErr] = useState("");
  const [cardsBusyKey, setCardsBusyKey] = useState("");

  // Community
  const [commData, setCommData] = useState(null);
  const [commErr, setCommErr] = useState("");
  const [commBusyId, setCommBusyId] = useState("");

  // Job applications
  const [appsPage, setAppsPage] = useState(1);
  const [appsData, setAppsData] = useState(null);
  const [appsErr, setAppsErr] = useState("");
  const [appsBusyId, setAppsBusyId] = useState("");

  const canLoad = !authLoading && isAdmin;

  useEffect(() => {
    if (!canLoad || tab !== "users") return;
    let cancelled = false;
    setUsersErr("");
    (async () => {
      try {
        const body = await fetchAdminUsers({ page: String(usersPage), limit: "50", q: userQ.trim() });
        if (!cancelled) setUsersData(body);
      } catch (e) {
        if (!cancelled) setUsersErr(e?.message || "Could not load users");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoad, tab, usersPage, userQ]);

  useEffect(() => {
    if (!canLoad || tab !== "cards") return;
    let cancelled = false;
    setCardsErr("");
    (async () => {
      try {
        const body = await fetchAdminCards({ page: String(cardsPage), limit: "50", sort: "recency" });
        if (!cancelled) setCardsData(body);
      } catch (e) {
        if (!cancelled) setCardsErr(e?.message || "Could not load cards");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoad, tab, cardsPage]);

  useEffect(() => {
    if (!canLoad || tab !== "community") return;
    let cancelled = false;
    setCommErr("");
    (async () => {
      try {
        const body = await fetchAdminCommunityArticles();
        if (!cancelled) setCommData(body);
      } catch (e) {
        if (!cancelled) setCommErr(e?.message || "Could not load community");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoad, tab]);

  useEffect(() => {
    if (!canLoad || tab !== "applications") return;
    let cancelled = false;
    setAppsErr("");
    (async () => {
      try {
        const body = await fetchAdminJobApplications({ page: String(appsPage), limit: "50" });
        if (!cancelled) setAppsData(body);
      } catch (e) {
        if (!cancelled) setAppsErr(e?.message || "Could not load applications");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoad, tab, appsPage]);

  const usersTotalPages = useMemo(() => {
    const total = usersData?.total || 0;
    const limit = usersData?.limit || 50;
    return Math.max(1, Math.ceil(total / limit));
  }, [usersData]);

  const cardsTotalPages = useMemo(() => {
    const total = cardsData?.total || 0;
    const limit = cardsData?.limit || 50;
    return Math.max(1, Math.ceil(total / limit));
  }, [cardsData]);

  const appsTotalPages = useMemo(() => {
    const total = appsData?.total || 0;
    const limit = appsData?.limit || 50;
    return Math.max(1, Math.ceil(total / limit));
  }, [appsData]);

  if (authLoading) {
    return (
      <div className="cards-page cards-page--light admin-page">
        <PageHelmet breadcrumb="admin" description="Admin console." />
        <DataLoading variant="section" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="cards-page cards-page--light admin-page">
        <PageHelmet breadcrumb="admin" description="Admin console." />
        <div className="panel admin-page__panel">
          <h1 className="admin-page__title">Admin</h1>
          <p className="muted">Sign in required.</p>
          <Link to="/" className="admin-page__link">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="cards-page cards-page--light admin-page">
        <PageHelmet breadcrumb="admin" description="Admin console." />
        <div className="panel admin-page__panel">
          <h1 className="admin-page__title">Admin</h1>
          <p className="err">Admin access required.</p>
          <p className="muted" style={{ marginTop: 0 }}>
            Add your email to <code>ADMIN_EMAILS</code> in the root <code>.env</code>, then restart the API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cards-page cards-page--light admin-page">
      <PageHelmet breadcrumb="admin" description="Admin console." />

      <header className="admin-page__head">
        <h1 className="admin-page__title">Admin</h1>
        <p className="muted admin-page__subtitle">Signed in as {user.email}</p>
      </header>

      <div className="admin-page__tabs" role="tablist" aria-label="Admin sections">
        <button
          type="button"
          className={`admin-page__tab${tab === "users" ? " is-active" : ""}`}
          onClick={() => setTab("users")}
          role="tab"
          aria-selected={tab === "users"}
        >
          Users
        </button>
        <button
          type="button"
          className={`admin-page__tab${tab === "cards" ? " is-active" : ""}`}
          onClick={() => setTab("cards")}
          role="tab"
          aria-selected={tab === "cards"}
        >
          Cards
        </button>
        <button
          type="button"
          className={`admin-page__tab${tab === "community" ? " is-active" : ""}`}
          onClick={() => setTab("community")}
          role="tab"
          aria-selected={tab === "community"}
        >
          Community
        </button>
        <button
          type="button"
          className={`admin-page__tab${tab === "applications" ? " is-active" : ""}`}
          onClick={() => setTab("applications")}
          role="tab"
          aria-selected={tab === "applications"}
        >
          Job applications
        </button>
      </div>

      {tab === "users" ? (
        <div className="panel admin-page__panel">
          <div className="admin-page__panel-head">
            <h2 className="admin-page__h">User management</h2>
            <div className="admin-page__tools">
              <input
                className="admin-page__search"
                placeholder="Search email or display name…"
                value={userQ}
                onChange={(e) => {
                  setUsersPage(1);
                  setUserQ(e.target.value);
                }}
              />
            </div>
          </div>

          {usersErr ? <p className="err">{usersErr}</p> : null}
          {!usersData ? (
            <DataLoading variant="section" />
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Display</th>
                      <th>Created</th>
                      <th>Admin</th>
                      <th>Profile</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(usersData.items || []).map((u) => (
                      <tr key={u.id}>
                        <td className="admin-table__mono">{u.email}</td>
                        <td>{u.display_name || "—"}</td>
                        <td className="admin-table__mono">{fmtDate(u.created_at)}</td>
                        <td>{u.is_admin ? "yes" : "no"}</td>
                        <td>
                          {u.display_name_lc ? (
                            <Link to={`/u/${encodeURIComponent(u.display_name_lc)}`}>open</Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <ConfirmBtn
                            className="admin-page__btn admin-page__btn--danger"
                            label={usersBusyId === u.id ? "Deleting…" : "Delete"}
                            disabled={usersBusyId === u.id}
                            confirmText={`Delete user ${u.email}? This cannot be undone.`}
                            onConfirm={async () => {
                              setUsersBusyId(u.id);
                              try {
                                await deleteAdminUser(u.id);
                                const body = await fetchAdminUsers({
                                  page: String(usersPage),
                                  limit: "50",
                                  q: userQ.trim(),
                                });
                                setUsersData(body);
                              } catch (e) {
                                setUsersErr(e?.message || "Could not delete user");
                              } finally {
                                setUsersBusyId("");
                              }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                    {usersData.items?.length ? null : (
                      <tr>
                        <td colSpan={6} className="muted">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="admin-page__pager">
                <button
                  type="button"
                  className="admin-page__btn"
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  disabled={usersPage <= 1}
                >
                  Prev
                </button>
                <span className="muted">
                  Page {usersPage} / {usersTotalPages}
                </span>
                <button
                  type="button"
                  className="admin-page__btn"
                  onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                  disabled={usersPage >= usersTotalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "cards" ? (
        <div className="panel admin-page__panel">
          <div className="admin-page__panel-head">
            <h2 className="admin-page__h">Card management</h2>
          </div>
          {cardsErr ? <p className="err">{cardsErr}</p> : null}
          {!cardsData ? (
            <DataLoading variant="section" />
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Card key</th>
                      <th>Title</th>
                      <th>Last seen</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(cardsData.items || []).map((c) => (
                      <tr key={c.card_key}>
                        <td className="admin-table__mono">
                          <Link to={`/cards/${encodeURIComponent(c.card_key)}`}>{c.card_key}</Link>
                        </td>
                        <td>{c.title || "—"}</td>
                        <td className="admin-table__mono">{fmtDate(c.last_seen_at || c.last_seen || c.lastSeenAt)}</td>
                        <td style={{ textAlign: "right" }}>
                          <ConfirmBtn
                            className="admin-page__btn admin-page__btn--danger"
                            label={cardsBusyKey === c.card_key ? "Deleting…" : "Delete"}
                            disabled={cardsBusyKey === c.card_key}
                            confirmText={`Delete all listings for card_key: ${c.card_key}? This removes raw items in the DB.`}
                            onConfirm={async () => {
                              setCardsBusyKey(c.card_key);
                              try {
                                await deleteAdminCard(c.card_key);
                                const body = await fetchAdminCards({
                                  page: String(cardsPage),
                                  limit: "50",
                                  sort: "recency",
                                });
                                setCardsData(body);
                              } catch (e) {
                                setCardsErr(e?.message || "Could not delete card");
                              } finally {
                                setCardsBusyKey("");
                              }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                    {cardsData.items?.length ? null : (
                      <tr>
                        <td colSpan={4} className="muted">
                          No cards found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="admin-page__pager">
                <button
                  type="button"
                  className="admin-page__btn"
                  onClick={() => setCardsPage((p) => Math.max(1, p - 1))}
                  disabled={cardsPage <= 1}
                >
                  Prev
                </button>
                <span className="muted">
                  Page {cardsPage} / {cardsTotalPages}
                </span>
                <button
                  type="button"
                  className="admin-page__btn"
                  onClick={() => setCardsPage((p) => Math.min(cardsTotalPages, p + 1))}
                  disabled={cardsPage >= cardsTotalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "applications" ? (
        <div className="panel admin-page__panel">
          <div className="admin-page__panel-head">
            <h2 className="admin-page__h">Job applications</h2>
          </div>
          {appsErr ? <p className="err">{appsErr}</p> : null}
          {!appsData ? (
            <DataLoading variant="section" />
          ) : (
            <>
              <div className="admin-table-wrap admin-table-wrap--wide">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Submitted</th>
                      <th>Job</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Location</th>
                      <th>More</th>
                      <th>Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(appsData.items || []).map((row) => (
                      <tr key={row.id}>
                        <td className="admin-table__mono">{fmtDate(row.created_at)}</td>
                        <td>
                          <div className="admin-page__stack">
                            <span className="admin-table__mono">{row.job_id}</span>
                            <span className="muted admin-page__small">{row.job_title}</span>
                          </div>
                        </td>
                        <td>{row.name || "—"}</td>
                        <td className="admin-table__mono">{row.email || "—"}</td>
                        <td className="admin-table__mono">{row.phone || "—"}</td>
                        <td>{row.location || "—"}</td>
                        <td>
                          <details className="admin-page__inline-details">
                            <summary className="admin-page__inline-details-sum">View</summary>
                            <dl className="admin-page__app-dl">
                              {row.social_linkedin ? (
                                <>
                                  <dt>LinkedIn</dt>
                                  <dd>
                                    <a href={row.social_linkedin} target="_blank" rel="noopener noreferrer">
                                      {row.social_linkedin}
                                    </a>
                                  </dd>
                                </>
                              ) : null}
                              {row.social_github ? (
                                <>
                                  <dt>GitHub</dt>
                                  <dd>
                                    <a href={row.social_github} target="_blank" rel="noopener noreferrer">
                                      {row.social_github}
                                    </a>
                                  </dd>
                                </>
                              ) : null}
                              {row.social_x ? (
                                <>
                                  <dt>X / Twitter</dt>
                                  <dd>
                                    <a href={row.social_x} target="_blank" rel="noopener noreferrer">
                                      {row.social_x}
                                    </a>
                                  </dd>
                                </>
                              ) : null}
                            </dl>
                          </details>
                        </td>
                        <td>
                          {row.has_resume ? (
                            <button
                              type="button"
                              className="admin-page__btn"
                              disabled={appsBusyId === row.id}
                              onClick={async () => {
                                setAppsBusyId(row.id);
                                try {
                                  const blob = await fetchAdminJobApplicationResumeBlob(row.id);
                                  const name = row.resume_filename || "resume";
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = name;
                                  a.rel = "noopener";
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                } catch (e) {
                                  setAppsErr(e?.message || "Download failed");
                                } finally {
                                  setAppsBusyId("");
                                }
                              }}
                            >
                              {appsBusyId === row.id ? "Downloading…" : "Download"}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                    {appsData.items?.length ? null : (
                      <tr>
                        <td colSpan={8} className="muted">
                          No applications yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="admin-page__pager">
                <button
                  type="button"
                  className="admin-page__btn"
                  onClick={() => setAppsPage((p) => Math.max(1, p - 1))}
                  disabled={appsPage <= 1}
                >
                  Prev
                </button>
                <span className="muted">
                  Page {appsPage} / {appsTotalPages}
                </span>
                <button
                  type="button"
                  className="admin-page__btn"
                  onClick={() => setAppsPage((p) => Math.min(appsTotalPages, p + 1))}
                  disabled={appsPage >= appsTotalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "community" ? (
        <div className="panel admin-page__panel">
          <div className="admin-page__panel-head">
            <h2 className="admin-page__h">Community management</h2>
          </div>
          {commErr ? <p className="err">{commErr}</p> : null}
          {!commData ? (
            <DataLoading variant="section" />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Created</th>
                    <th>Views</th>
                    <th>Replies</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(commData.articles || []).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/community/${encodeURIComponent(a.id)}`}>{a.title}</Link>
                      </td>
                      <td>{a.authorDisplayName || "—"}</td>
                      <td className="admin-table__mono">{fmtDate(a.createdAt)}</td>
                      <td className="admin-table__mono">{Number(a.viewCount || 0).toLocaleString()}</td>
                      <td className="admin-table__mono">{Number(a.answerCount || 0).toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <ConfirmBtn
                          className="admin-page__btn admin-page__btn--danger"
                          label={commBusyId === a.id ? "Deleting…" : "Delete"}
                          disabled={commBusyId === a.id}
                          confirmText={`Delete community article "${a.title}"? This cannot be undone.`}
                          onConfirm={async () => {
                            setCommBusyId(a.id);
                            try {
                              await deleteAdminCommunityArticle(a.id);
                              const body = await fetchAdminCommunityArticles();
                              setCommData(body);
                            } catch (e) {
                              setCommErr(e?.message || "Could not delete article");
                            } finally {
                              setCommBusyId("");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {commData.articles?.length ? null : (
                    <tr>
                      <td colSpan={6} className="muted">
                        No posts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

