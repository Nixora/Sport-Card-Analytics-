import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 72);
}

export default function Faq() {
  const { t, tx } = useLanguage();
  const [activeAnchorId, setActiveAnchorId] = useState("");
  const activeAnchorIdRef = useRef("");

  const sections = useMemo(() => {
    const raw = tx("faq.sections");
    if (!Array.isArray(raw)) return [];
    return raw.map((s) => ({
      ...s,
      summary: s.summary || "",
      items: Array.isArray(s.items) ? s.items : [],
    }));
  }, [tx]);

  const onThisPage = useMemo(() => {
    return sections.map((s) => ({
      id: s.id,
      title: s.title,
      items: s.items.slice(0, 6).map((it) => {
        const qid = `${s.id}-${slugify(it.q)}`;
        return { id: qid, q: it.q };
      }),
    }));
  }, [sections]);

  useEffect(() => {
    const ids = [];
    for (const s of onThisPage) {
      if (s?.id) ids.push(s.id);
      for (const it of s.items || []) {
        if (it?.id) ids.push(it.id);
      }
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!elements.length) return;

    // Initialize highlight (first visible or first id).
    if (!activeAnchorIdRef.current) {
      activeAnchorIdRef.current = ids[0] || "";
      setActiveAnchorId(activeAnchorIdRef.current);
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
        const topMost = visible[0]?.target?.id;
        if (!topMost) return;
        if (activeAnchorIdRef.current === topMost) return;
        activeAnchorIdRef.current = topMost;
        setActiveAnchorId(topMost);
      },
      {
        // Favor the element closest to the top of viewport.
        root: null,
        threshold: [0.15, 0.35, 0.6],
        rootMargin: `-${Math.round(window.innerHeight * 0.18)}px 0px -${Math.round(
          window.innerHeight * 0.7,
        )}px 0px`,
      },
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [onThisPage]);

  return (
    <div className="faq-doc">
      <PageHelmet breadcrumb="faq" description={t("faq.helmetDescription")} />

      <header className="faq-doc__head">
        <h1 className="faq-doc__title">
          {t("faq.title")}
          <Link className="faq-doc__read-more" to="/product">
            {t("faq.readMore")} →
          </Link>
        </h1>
        <p className="faq-doc__lede">{t("faq.lede")}</p>
      </header>

      <div className="faq-doc__layout">
        <main className="faq-doc__main">
          <section className="faq-doc__topics" aria-labelledby="faq-topics-heading">
            <h2 id="faq-topics-heading" className="faq-doc__h2">
              {t("faq.topicsTitle")}
            </h2>
            <div className="faq-doc__table-wrap" role="region" aria-label={t("faq.topicsAria")}>
              <table className="faq-doc__table">
                <thead>
                  <tr>
                    <th scope="col">{t("faq.topicsColTopic")}</th>
                    <th scope="col">{t("faq.topicsColContent")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <a className="faq-doc__table-link" href={`#${s.id}`}>
                          {s.title}
                        </a>
                      </td>
                      <td className="faq-doc__table-muted">{s.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {sections.map((s) => (
            <section key={s.id} id={s.id} className="faq-doc__section" aria-labelledby={`faq-sec-${s.id}`}>
              <h2 id={`faq-sec-${s.id}`} className="faq-doc__h2">
                {s.title}
              </h2>
              {s.summary ? <p className="faq-doc__section-lede">{s.summary}</p> : null}

              <div className="faq-doc__qa">
                {s.items.map((it) => {
                  const qid = `${s.id}-${slugify(it.q)}`;
                  return (
                    <article key={qid} id={qid} className="faq-doc__item" aria-labelledby={`${qid}-h`}>
                      <h3 id={`${qid}-h`} className="faq-doc__q">
                        {it.q}
                      </h3>
                      <div className="faq-doc__a">
                        {it.a ? <p>{it.a}</p> : null}
                        {it.aLinkPrivacy ? (
                          <p>
                            {it.aBefore}
                            <Link className="faq-doc__inline-link" to="/privacy-policy">
                              {it.aLinkPrivacy}
                            </Link>
                            {it.aAfter}
                          </p>
                        ) : null}
                        {it.aLinkContact ? (
                          <p>
                            {it.aBefore}
                            <Link className="faq-doc__inline-link" to="/contact">
                              {it.aLinkContact}
                            </Link>
                            {it.aAfter}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </main>

        <aside className="faq-doc__aside" aria-label="On this page">
          <div className="faq-doc__aside-card">
            <h2 className="faq-doc__aside-title">{t("faq.onThisPage")}</h2>
            <nav className="faq-doc__aside-nav" aria-label={t("faq.onThisPage")}>
              <ul className="faq-doc__aside-list">
                {onThisPage.map((s) => (
                  <li key={`otp-${s.id}`} className="faq-doc__aside-li">
                    <a
                      className={`faq-doc__aside-link${activeAnchorId === s.id ? " is-active" : ""}`}
                      href={`#${s.id}`}
                      onClick={() => setActiveAnchorId(s.id)}
                    >
                      {s.title}
                    </a>
                    {s.items.length ? (
                      <ul className="faq-doc__aside-sub">
                        {s.items.map((it) => (
                          <li key={`otp-${it.id}`}>
                            <a
                              className={`faq-doc__aside-sublink${activeAnchorId === it.id ? " is-active" : ""}`}
                              href={`#${it.id}`}
                              onClick={() => setActiveAnchorId(it.id)}
                            >
                              {it.q}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}

