import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function normalizeJobs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((j) => ({
    ...j,
    tags: Array.isArray(j.tags) ? j.tags : [],
    sections: Array.isArray(j.sections) ? j.sections : [],
  }));
}

export default function Careers() {
  const { t, tx } = useLanguage();
  const jobs = useMemo(() => normalizeJobs(tx("careers.jobs")), [tx]);
  const labels = useMemo(() => tx("careers.labels") || {}, [tx]);
  const jobTypes = useMemo(() => tx("careers.jobTypes") || {}, [tx]);

  const [selectedId, setSelectedId] = useState(() => jobs[0]?.id || "");

  useEffect(() => {
    if (typeof window === "undefined" || !jobs.length) return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && jobs.some((j) => j.id === hash)) {
      setSelectedId(hash);
    }
  }, [jobs]);

  useEffect(() => {
    if (!jobs.length) return;
    if (!jobs.some((j) => j.id === selectedId)) {
      setSelectedId(jobs[0].id);
    }
  }, [jobs, selectedId]);

  const selectJob = useCallback((id) => {
    setSelectedId(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    }
  }, []);

  const selected = useMemo(() => jobs.find((j) => j.id === selectedId) || jobs[0] || null, [jobs, selectedId]);

  const resolveCompany = useCallback(
    (job) => (job?.companyKey && labels[job.companyKey] ? labels[job.companyKey] : job?.company || labels.company || "Nixsora"),
    [labels]
  );

  const resolveLocation = useCallback(
    (job) => (job?.locationKey && labels[job.locationKey] ? labels[job.locationKey] : job?.location || ""),
    [labels]
  );

  const resolveJobType = useCallback(
    (job) => (job?.jobTypeKey && jobTypes[job.jobTypeKey] ? jobTypes[job.jobTypeKey] : job?.jobType || ""),
    [jobTypes]
  );

  const applyTo = selected ? `/careers/apply/${encodeURIComponent(selected.id)}` : "/careers";

  const onShare = useCallback(() => {
    if (!selected || typeof window === "undefined") return;
    const url = `${window.location.origin}/careers#${selected.id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }, [selected]);

  return (
    <div className="careers-page">
      <PageHelmet breadcrumb="careers" description={t("careers.metaDescription")} />
      <header className="careers-page__header">
        <h1 className="careers-page__title">{t("careers.pageTitle")}</h1>
        <p className="careers-page__intro muted">{t("careers.intro")}</p>
      </header>

      <div className="careers-layout" aria-busy={false}>
        <aside className="careers-list-wrap" aria-label={t("careers.listAria")}>
          <ul className="careers-list">
            {jobs.map((job) => {
              const active = job.id === selected?.id;
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    className={`careers-card${active ? " careers-card--active" : ""}`}
                    onClick={() => selectJob(job.id)}
                    aria-current={active ? "true" : undefined}
                  >
                    <div className="careers-card__top">
                      <div className="careers-card__badges">
                        {job.badge === "new" ? (
                          <span className="careers-card__badge careers-card__badge--new">{t("careers.labels.new")}</span>
                        ) : null}
                        {job.badge === "easy" ? (
                          <span className="careers-card__badge careers-card__badge--easy">{t("careers.labels.easilyApply")}</span>
                        ) : null}
                      </div>
                      <span className="careers-card__actions" aria-hidden="true">
                        <span className="careers-card__icon careers-card__icon--ghost" title={t("careers.labels.save")} />
                        <span className="careers-card__icon careers-card__icon--ghost" title={t("careers.labels.notInterested")} />
                      </span>
                    </div>
                    <span className="careers-card__title">{job.title}</span>
                    <p className="careers-card__meta">
                      {resolveCompany(job)}
                      <span className="careers-card__dot" aria-hidden="true">
                        {" "}
                        ·{" "}
                      </span>
                      {resolveLocation(job)}
                    </p>
                    {job.salaryLine ? (
                      <div className="careers-card__salary">
                        <span className="careers-card__salary-check" aria-hidden="true">
                          ✓
                        </span>
                        {job.salaryLine}
                      </div>
                    ) : null}
                    <ul className="careers-card__tags">
                      {job.tags.slice(0, 5).map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="careers-detail" aria-label={t("careers.detailAria")}>
          {selected ? (
            <>
              <div className="careers-detail__banner" role="presentation">
                <p className="careers-detail__banner-text">Future-proof your career.</p>
              </div>
              <div className="careers-detail__head">
                <div className="careers-detail__logo" aria-hidden="true">
                  N
                </div>
                <div>
                  <h2 className="careers-detail__title">{selected.title}</h2>
                  <p className="careers-detail__sub muted">
                    {resolveCompany(selected)}
                    <span className="careers-detail__dot"> · </span>
                    {resolveLocation(selected)}
                    <span className="careers-detail__dot"> · </span>
                    {selected.salaryLine}
                    <span className="careers-detail__dot"> · </span>
                    {resolveJobType(selected)}
                  </p>
                </div>
              </div>

              <div className="careers-detail__panels">
                <div className="careers-detail__panel">
                  <span className="careers-detail__panel-label">{t("careers.labels.pay")}</span>
                  <div className="careers-detail__pay-pill">{selected.salaryLine}</div>
                </div>
                <div className="careers-detail__panel">
                  <span className="careers-detail__panel-label">{t("careers.labels.jobType")}</span>
                  <span className="careers-detail__type-pill">{resolveJobType(selected)}</span>
                </div>
              </div>

              <h3 className="careers-detail__section-kicker">{t("careers.labels.jobDetails")}</h3>
              {selected.summary ? <p className="careers-detail__lead">{selected.summary}</p> : null}

              {selected.sections.map((sec, i) => (
                <div key={`${selected.id}-sec-${i}`} className="careers-detail__block">
                  {sec.heading ? <h4 className="careers-detail__h">{sec.heading}</h4> : null}
                  {Array.isArray(sec.paragraphs)
                    ? sec.paragraphs.map((p, pi) => (
                        <p key={pi} className="careers-detail__p">
                          {p}
                        </p>
                      ))
                    : null}
                  {Array.isArray(sec.bullets) && sec.bullets.length ? (
                    <ul className="careers-detail__ul">
                      {sec.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </>
          ) : (
            <p className="muted">{t("careers.selectJobHint")}</p>
          )}

          <div className="careers-detail__toolbar" role="group" aria-label={t("careers.labels.applyOnline")}>
            <button type="button" className="careers-detail__tool careers-detail__tool--ghost" title={t("careers.labels.save")} aria-label={t("careers.labels.save")} />
            <button type="button" className="careers-detail__tool careers-detail__tool--ghost" title={t("careers.labels.notInterested")} aria-label={t("careers.labels.notInterested")} />
            <button type="button" className="careers-detail__tool careers-detail__tool--ghost" onClick={onShare} title={t("careers.labels.share")} aria-label={t("careers.labels.share")} />
            <Link className="careers-detail__apply" to={applyTo}>
              {t("careers.labels.applyOnline")}
              <span className="careers-detail__apply-icon" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
