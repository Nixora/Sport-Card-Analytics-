import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AntdSpinDots from "../components/AntdSpinDots.jsx";
import DataLoading from "../components/DataLoading.jsx";
import PageHelmet from "../components/PageHelmet.jsx";
import {
  communityMemberAvatarUrl,
  createCommunityAnswer,
  fetchCommunityArticle,
  fetchCommunityArticles,
  postCommunityHelpful,
} from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function fmtWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconComment() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconLike() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function IconCardThumb() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 15l5-5 4 4 5-6 4 4" />
    </svg>
  );
}

function ForumStats({ views, comments, likes }) {
  const v = views ?? 0;
  const c = comments ?? 0;
  const l = likes ?? 0;
  return (
    <div className="community-forum__stats">
      <span className="community-forum__stat">
        <IconEye />
        {v.toLocaleString()}
      </span>
      <span className="community-forum__stat">
        <IconComment />
        {c.toLocaleString()}
      </span>
      <span className="community-forum__stat">
        <IconLike />
        {l.toLocaleString()}
      </span>
    </div>
  );
}

function AvatarInitial({ name, large }) {
  const ch = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`community-forum__avatar${large ? " community-forum__avatar--lg" : ""}`}
      aria-hidden
    >
      {ch}
    </div>
  );
}

function UserAvatar({ userId, name, hasAvatar, large }) {
  const [broken, setBroken] = useState(false);
  const id = String(userId || "").trim();
  const url = hasAvatar && /^[a-f0-9]{24}$/i.test(id) ? communityMemberAvatarUrl(id) : "";
  const showImg = Boolean(url) && !broken;
  if (showImg) {
    return (
      <img
        src={url}
        alt=""
        className={`community-forum__avatar-img${large ? " community-forum__avatar-img--lg" : ""}`}
        onError={() => setBroken(true)}
      />
    );
  }
  return <AvatarInitial name={name} large={large} />;
}

function TagRow({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="profile-ant-tag-list" aria-label="Tags">
      {tags.map((t) => (
        <li key={t} className="profile-ant-tag profile-ant-tag--readonly">
          <span className="profile-ant-tag__text">{t}</span>
        </li>
      ))}
    </ul>
  );
}

function listSnippetParts(excerpt) {
  const t = String(excerpt || "").trim();
  if (!t) return { text: "", showViewMore: false };
  const showViewMore = t.endsWith("…") || t.endsWith("...");
  return { text: t, showViewMore };
}

export default function Community() {
  const { articleId } = useParams();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const replyRef = useRef(null);

  const [list, setList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listErr, setListErr] = useState("");

  const [article, setArticle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(Boolean(articleId));
  const [detailErr, setDetailErr] = useState("");
  const [featured, setFeatured] = useState([]);

  const [answerBody, setAnswerBody] = useState("");
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answerErr, setAnswerErr] = useState("");
  const [helpfulBusy, setHelpfulBusy] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListErr("");
    try {
      const data = await fetchCommunityArticles();
      setList(Array.isArray(data.articles) ? data.articles : []);
    } catch (e) {
      setListErr(e?.message || "Could not load articles");
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadArticle = useCallback(async (id) => {
    setDetailLoading(true);
    setDetailErr("");
    try {
      const data = await fetchCommunityArticle(id);
      setArticle(data.article || null);
    } catch (e) {
      setDetailErr(e?.message || "Could not load article");
      setArticle(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      setFeatured([]);
      setDetailErr("");
      setDetailLoading(false);
      loadList();
      return;
    }
    loadArticle(articleId);
  }, [articleId, loadArticle, loadList]);

  useEffect(() => {
    if (!articleId || !article) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCommunityArticles();
        const rows = Array.isArray(data.articles) ? data.articles : [];
        const others = rows
          .filter((r) => r.id !== articleId)
          .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
          .slice(0, 4);
        if (!cancelled) setFeatured(others);
      } catch {
        if (!cancelled) setFeatured([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId, article?.id]);

  const canCompose = Boolean(user) && !authLoading;

  async function onPostAnswer(e) {
    e.preventDefault();
    setAnswerErr("");
    if (!user || !articleId) return;
    const text = answerBody.trim();
    if (!text) return;
    setAnswerBusy(true);
    try {
      const { article: next } = await createCommunityAnswer(articleId, text);
      setAnswerBody("");
      setArticle(next);
      await loadList();
    } catch (ex) {
      setAnswerErr(ex?.message || "Could not post answer");
    } finally {
      setAnswerBusy(false);
    }
  }

  async function onHelpful() {
    if (!user || !articleId || !article || article.viewerMarkedHelpful || helpfulBusy) return;
    setHelpfulBusy(true);
    try {
      const { article: next } = await postCommunityHelpful(articleId);
      setArticle(next);
      await loadList();
    } catch {
      /* keep UI; optional toast */
    } finally {
      setHelpfulBusy(false);
    }
  }

  const messageTotal = useMemo(() => {
    if (!article) return 1;
    return 1 + (article.answers?.length ?? 0);
  }, [article]);

  const latestAnswerId = article?.answers?.length
    ? article.answers[article.answers.length - 1].id
    : null;

  function scrollToReply() {
    replyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (articleId) {
    return (
      <div className="cards-page cards-page--light community-forum">
        <PageHelmet breadcrumb="community" description={t("community.helmetDescription")} />

        <Link to="/community" className="community-forum__back">
          {t("community.backAllTopics")}
        </Link>

        {detailLoading ? (
          <DataLoading variant="section" />
        ) : detailErr || !article ? (
          <div className="community-forum__card">
            <p className="err">{detailErr || t("community.articleNotFound")}</p>
          </div>
        ) : (
          <div className="community-forum__detail-grid">
            <div>
              <article className="community-forum__post-card">
                <h1 className="community-forum__post-title">{article.title}</h1>

                <div className="community-forum__post-head">
                  <div className="community-forum__post-author">
                    <UserAvatar
                      userId={article.authorId}
                      name={article.authorDisplayName}
                      hasAvatar={Boolean(article.authorHasAvatar)}
                      large
                    />
                    <div className="community-forum__post-author-text">
                      <p className="community-forum__post-username">
                        <span className="community-forum__author-name">{article.authorDisplayName}</span>
                      </p>
                      <p className="community-forum__post-role">{t("community.roleCollector")}</p>
                    </div>
                  </div>
                  <p className="community-forum__post-time">{fmtWhen(article.createdAt)}</p>
                </div>

                <TagRow tags={article.tags} />
                <div className="community-forum__post-body">{article.body}</div>

                <div className="community-forum__post-toolbar">
                  <span>
                    {article.viewCount != null ? (
                      <>
                        {t("community.views", { n: Number(article.viewCount).toLocaleString() })}
                        {" · "}
                      </>
                    ) : null}
                    {t("community.messageOf", { current: 1, total: messageTotal })}
                    {latestAnswerId ? (
                      <>
                        {" · "}
                        <a href={`#answer-${latestAnswerId}`}>{t("community.latestReply")}</a>
                      </>
                    ) : null}
                  </span>
                </div>

                <div className="community-forum__post-actions">
                  <button
                    type="button"
                    className={`community-forum__btn-outline${
                      article.viewerMarkedHelpful ? " community-forum__btn-outline--active" : ""
                    }`}
                    disabled={!user || helpfulBusy || Boolean(article.viewerMarkedHelpful)}
                    onClick={onHelpful}
                    title={
                      !user
                        ? t("community.markHelpfulSignIn")
                        : article.viewerMarkedHelpful
                          ? t("community.markHelpfulYou")
                          : t("community.markHelpful")
                    }
                  >
                    <IconLike />
                    {article.likeCount ?? 0} {t("community.helpfulWord")}
                  </button>
                  <button type="button" className="community-forum__btn-primary" onClick={scrollToReply}>
                    {t("community.reply")}
                  </button>
                </div>
              </article>

              <div className="community-forum__answers-card">
                <h2 className="community-forum__answers-title">
                  {t("community.repliesTitle", { n: article.answers?.length ?? 0 })}
                </h2>
                {article.answers?.length ? (
                  <ul className="community-forum__reply-list">
                    {article.answers.map((a) => (
                      <li key={a.id} id={`answer-${a.id}`} className="community-forum__reply-item">
                        <div className="community-forum__reply-row">
                          <UserAvatar
                            userId={a.authorId}
                            name={a.authorDisplayName}
                            hasAvatar={Boolean(a.authorHasAvatar)}
                          />
                          <div className="community-forum__reply-body">
                            <p className="community-forum__answer-meta">
                              <span className="community-forum__author-name">{a.authorDisplayName}</span>
                              {" · "}
                              {fmtWhen(a.createdAt)}
                            </p>
                            <p className="community-forum__answer-body">{a.body}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted community-forum__hint">{t("community.noRepliesYet")}</p>
                )}
              </div>

              <div id="community-reply" ref={replyRef} className="community-forum__card community-forum__reply-compose">
                <h3 className="community-forum__card-title" style={{ marginTop: 0 }}>
                  {t("community.yourReply")}
                </h3>
                {canCompose ? (
                  <form onSubmit={onPostAnswer}>
                    {answerErr ? <p className="err community-forum__hint">{answerErr}</p> : null}
                    <label className="community-forum__field">
                      <textarea
                        className="community-forum__textarea community-forum__textarea--compact"
                        value={answerBody}
                        onChange={(e) => setAnswerBody(e.target.value)}
                        placeholder={t("community.phReply")}
                        maxLength={8000}
                        rows={4}
                      />
                    </label>
                    <button
                      type="submit"
                      className="community-forum__btn-primary community-forum__submit"
                      disabled={answerBusy || !answerBody.trim()}
                    >
                      {t("community.postReply")}
                    </button>
                  </form>
                ) : (
                  <p className="muted community-forum__hint" style={{ margin: 0 }}>
                    {t("community.signInToReply")}
                  </p>
                )}
              </div>

              <div className="community-forum__footer-links">
                <Link to="/community">{t("community.allForumTopics")}</Link>
                {featured[0] ? <Link to={`/community/${featured[0].id}`}>{t("community.nextTopic")}</Link> : null}
              </div>
            </div>

            <aside className="community-forum__featured">
              <h2 className="community-forum__sidebar-title">{t("community.featuredPosts")}</h2>
              {featured.length === 0 ? (
                <p className="muted community-forum__hint">{t("community.featuredEmpty")}</p>
              ) : (
                featured.map((f) => (
                  <Link key={f.id} to={`/community/${f.id}`} className="community-forum__featured-item">
                    <div className="community-forum__featured-thumb" aria-hidden>
                      <IconCardThumb />
                    </div>
                    <div className="community-forum__featured-body">
                      <p className="community-forum__featured-item-title">{f.title}</p>
                      <ForumStats views={f.viewCount} comments={f.answerCount} likes={f.likeCount} />
                    </div>
                  </Link>
                ))
              )}
            </aside>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cards-page cards-page--light community-forum">
      <PageHelmet breadcrumb="community" description={t("community.helmetDescription")} />

      <header>
        <h1 className="community-forum__page-title">{t("community.pageTitle")}</h1>
        <p className="community-forum__lead">{t("community.pageLead")}</p>
      </header>

      {listLoading ? (
        <div className="community-forum__body-loading" aria-busy="true">
          <DataLoading variant="section" />
        </div>
      ) : (
        <div className="community-forum__list-wrap">
          <div className="community-forum__list-toolbar">
            <h2 className="community-forum__list-heading">{t("community.topicsHeading")}</h2>
            {canCompose ? (
              <Link className="community-forum__new-post" to="/community/new">
                {t("community.newPost")}
              </Link>
            ) : (
              <span className="muted community-forum__hint" style={{ margin: 0 }}>
                {authLoading ? (
                  <span className="community-forum__auth-spin">
                    <AntdSpinDots size="sm" />
                  </span>
                ) : (
                  t("community.signInToPost")
                )}
              </span>
            )}
          </div>
          {listErr ? (
            <p className="err" style={{ padding: "0.65rem 1.15rem 1rem" }}>
              {listErr}
            </p>
          ) : list.length === 0 ? (
            <p className="muted" style={{ padding: "0.65rem 1.15rem 1rem" }}>
              {t("community.noTopics")}
            </p>
          ) : (
            <ul className="community-forum__list">
              {list.map((a) => {
                const { text, showViewMore } = listSnippetParts(a.excerpt);
                const detailPath = `/community/${a.id}`;
                return (
                  <li key={a.id} className="community-forum__list-item">
                    <div className="community-forum__list-row">
                      <AvatarInitial name={a.authorDisplayName} />
                      <div className="community-forum__list-main">
                        <h3 className="community-forum__list-title">
                          <Link to={detailPath}>{a.title}</Link>
                        </h3>
                        <p className="community-forum__list-snippet">
                          {text}
                          {showViewMore ? (
                            <>
                              {" "}
                              <Link to={detailPath} className="community-forum__view-more">
                                {t("community.viewMore")}
                              </Link>
                            </>
                          ) : null}
                        </p>
                        <TagRow tags={a.tags} />
                        <p className="community-forum__list-byline">
                          {t("community.bylineBy")}{" "}
                          <span className="community-forum__author-name">{a.authorDisplayName}</span> •{" "}
                          {t("community.roleCollector")} • {t("community.name")}
                        </p>
                        <ForumStats views={a.viewCount} comments={a.answerCount} likes={a.likeCount} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
