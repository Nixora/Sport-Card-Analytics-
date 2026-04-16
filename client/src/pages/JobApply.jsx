import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchLocationSuggestions, submitJobApplication } from "../api.js";
import { isValidJobApplyEmail, isValidJobApplyPhone } from "../utils/jobApplyFormat.js";

function normalizeJobs(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((j) => ({
    ...j,
    tags: Array.isArray(j.tags) ? j.tags : [],
    sections: Array.isArray(j.sections) ? j.sections : [],
  }));
}

function isHttpUrl(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function linkedinEmptyTemplate(linkedin) {
  const t = String(linkedin || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
  return t === "https://www.linkedin.com/in" || t === "https://linkedin.com/in";
}

function hasAnySocial(l, g, tw) {
  const lin = String(l || "").trim();
  if (isHttpUrl(g) || isHttpUrl(tw)) return true;
  if (!isHttpUrl(lin) || linkedinEmptyTemplate(lin)) return false;
  return true;
}

export default function JobApply() {
  const { jobId: jobIdParam } = useParams();
  const { t, tx } = useLanguage();
  const jobs = useMemo(() => normalizeJobs(tx("careers.jobs")), [tx]);
  const jobId = String(jobIdParam || "").trim().toLowerCase();

  const job = useMemo(() => jobs.find((j) => j.id === jobId) || null, [jobs, jobId]);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("https://www.linkedin.com/in/");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [sentOk, setSentOk] = useState(false);
  const [sending, setSending] = useState(false);

  const [locSuggestions, setLocSuggestions] = useState([]);
  const [locOpen, setLocOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const skipLocSearchRef = useRef(false);
  const locBlurTimer = useRef(null);

  useEffect(() => {
    return () => window.clearTimeout(locBlurTimer.current);
  }, []);

  useEffect(() => {
    const q = location.trim();
    if (skipLocSearchRef.current) {
      skipLocSearchRef.current = false;
      return;
    }
    if (q.length < 2) {
      setLocSuggestions([]);
      setLocOpen(false);
      setLocLoading(false);
      return;
    }

    const abort = new AbortController();
    const timer = window.setTimeout(async () => {
      setLocLoading(true);
      try {
        const rows = await fetchLocationSuggestions(q, abort.signal);
        if (!abort.signal.aborted) {
          setLocSuggestions(rows);
          setLocOpen(rows.length > 0);
        }
      } catch {
        if (!abort.signal.aborted) {
          setLocSuggestions([]);
          setLocOpen(false);
        }
      } finally {
        if (!abort.signal.aborted) setLocLoading(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [location]);

  const pickLocation = useCallback((label) => {
    skipLocSearchRef.current = true;
    setLocation(label.slice(0, 200));
    setLocSuggestions([]);
    setLocOpen(false);
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError("");
      setSentOk(false);

      if (!job) {
        setFormError(t("jobApply.errInvalidJob"));
        return;
      }
      if (!name.trim() || name.trim().length < 2) {
        setFormError(t("jobApply.errNeedName"));
        return;
      }
      if (!location.trim()) {
        setFormError(t("jobApply.errNeedLocation"));
        return;
      }
      if (!isValidJobApplyPhone(phone)) {
        setFormError(t("jobApply.errPhoneFormat"));
        return;
      }
      if (!isValidJobApplyEmail(email)) {
        setFormError(t("jobApply.errEmailFormat"));
        return;
      }
      const hasSocial = hasAnySocial(linkedin, github, twitter);
      if (!hasSocial) {
        setFormError(t("jobApply.errNeedSocial"));
        return;
      }
      if (!resumeFile) {
        setFormError(t("jobApply.errNeedResume"));
        return;
      }

      const fd = new FormData();
      fd.append("job_id", job.id);
      fd.append("job_title", job.title || job.id);
      fd.append("name", name.trim());
      fd.append("location", location.trim());
      fd.append("phone", phone.trim());
      fd.append("email", email.trim().toLowerCase());
      fd.append("social_linkedin", linkedin.trim());
      fd.append("social_github", github.trim());
      fd.append("social_x", twitter.trim());
      fd.append("resume", resumeFile, resumeFile.name);

      setSending(true);
      try {
        await submitJobApplication(fd);
        setSentOk(true);
        setResumeFile(null);
      } catch (err) {
        setFormError(String(err?.message || t("jobApply.errGeneric")));
      } finally {
        setSending(false);
      }
    },
    [job, name, location, phone, email, linkedin, github, twitter, resumeFile, t],
  );

  const helmetDesc = t("jobApply.metaDescription");

  return (
    <div className="contact-page job-apply-page">
      <PageHelmet
        title={job ? `${t("jobApply.pageTitle")}: ${job.title}` : t("jobApply.pageTitle")}
        description={helmetDesc}
      />

      <div className="job-apply-page__inner">
        <p className="job-apply-page__back muted">
          <Link className="contact-page__back-link" to="/careers">
            {t("jobApply.backToCareers")}
          </Link>
        </p>

        {!job ? (
          <div className="panel job-apply-page__panel">
            <h1 className="job-apply-page__title">{t("jobApply.pageTitle")}</h1>
            <p className="err">{t("jobApply.errInvalidJob")}</p>
          </div>
        ) : (
          <>
            <header className="job-apply-page__header">
              <h1 className="job-apply-page__title">{t("jobApply.heading")}</h1>
              <p className="job-apply-page__job muted">
                <span className="job-apply-page__job-label">{t("jobApply.jobLabel")}:</span> {job.title}
              </p>
              <p className="job-apply-page__intro muted">{t("jobApply.intro")}</p>
            </header>

            <section className="contact-page__form-section job-apply-page__form-section" aria-labelledby="job-apply-form-heading">
              <div className="contact-page__form-panel">
                <h2 id="job-apply-form-heading" className="contact-page__form-title">
                  {t("jobApply.heading")}
                </h2>

                {sentOk ? (
                  <p className="job-apply-page__success" role="status">
                    {t("jobApply.success")}
                  </p>
                ) : (
                  <form className="contact-page__form" onSubmit={onSubmit} noValidate>
                    {formError ? <p className="err job-apply-page__form-err">{formError}</p> : null}

                    <label className="contact-page__field">
                      <span className="contact-page__label">{t("jobApply.fields.name")}</span>
                      <input
                        className="contact-page__input"
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                        maxLength={120}
                        required
                      />
                    </label>

                    <div className="contact-page__field job-apply-page__loc-wrap">
                      <span className="contact-page__label">{t("jobApply.fields.location")}</span>
                      <p className="muted job-apply-page__hint job-apply-page__hint--tight">{t("jobApply.locationSearchHint")}</p>
                      <input
                        className="contact-page__input"
                        type="text"
                        name="location"
                        autoComplete="off"
                        value={location}
                        onChange={(ev) => setLocation(ev.target.value)}
                        onFocus={() => {
                          if (locSuggestions.length) setLocOpen(true);
                        }}
                        onBlur={() => {
                          locBlurTimer.current = window.setTimeout(() => setLocOpen(false), 200);
                        }}
                        maxLength={200}
                        required
                        aria-autocomplete="list"
                        aria-expanded={locOpen}
                        aria-controls="job-apply-loc-list"
                      />
                      {locLoading ? (
                        <p className="muted job-apply-page__loc-loading" aria-live="polite">
                          {t("jobApply.locSearching")}
                        </p>
                      ) : null}
                      {locOpen && locSuggestions.length > 0 ? (
                        <ul id="job-apply-loc-list" className="job-apply-page__loc-dd" role="listbox">
                          {locSuggestions.map((s, i) => (
                            <li key={`${i}-${s.label.slice(0, 48)}`} role="presentation">
                              <button
                                type="button"
                                className="job-apply-page__loc-opt"
                                role="option"
                                onMouseDown={(ev) => ev.preventDefault()}
                                onClick={() => {
                                  window.clearTimeout(locBlurTimer.current);
                                  pickLocation(s.label);
                                }}
                              >
                                {s.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="muted job-apply-page__attr">{t("jobApply.locationSearchPoweredBy")}</p>
                    </div>

                    <div className="contact-page__form-row">
                      <label className="contact-page__field">
                        <span className="contact-page__label">{t("jobApply.fields.phone")}</span>
                        <input
                          className="contact-page__input"
                          type="tel"
                          name="phone"
                          autoComplete="tel"
                          value={phone}
                          onChange={(ev) => setPhone(ev.target.value)}
                          maxLength={24}
                          required
                        />
                      </label>
                      <label className="contact-page__field">
                        <span className="contact-page__label">{t("jobApply.fields.email")}</span>
                        <input
                          className="contact-page__input"
                          type="email"
                          name="email"
                          autoComplete="email"
                          value={email}
                          onChange={(ev) => setEmail(ev.target.value)}
                          onBlur={(ev) => setEmail(ev.target.value.trim().toLowerCase())}
                          maxLength={200}
                          required
                        />
                      </label>
                    </div>

                    <p className="muted job-apply-page__hint">{t("jobApply.socialHint")}</p>

                    <label className="contact-page__field">
                      <span className="contact-page__label">{t("jobApply.fields.linkedin")}</span>
                      <input
                        className="contact-page__input"
                        type="url"
                        name="social_linkedin"
                        inputMode="url"
                        placeholder="https://www.linkedin.com/in/…"
                        value={linkedin}
                        onChange={(ev) => setLinkedin(ev.target.value)}
                        maxLength={500}
                      />
                    </label>

                    <label className="contact-page__field">
                      <span className="contact-page__label">{t("jobApply.fields.github")}</span>
                      <input
                        className="contact-page__input"
                        type="url"
                        name="social_github"
                        inputMode="url"
                        placeholder="https://github.com/…"
                        value={github}
                        onChange={(ev) => setGithub(ev.target.value)}
                        maxLength={500}
                      />
                    </label>

                    <label className="contact-page__field">
                      <span className="contact-page__label">{t("jobApply.fields.twitter")}</span>
                      <input
                        className="contact-page__input"
                        type="url"
                        name="social_x"
                        inputMode="url"
                        placeholder="https://x.com/…"
                        value={twitter}
                        onChange={(ev) => setTwitter(ev.target.value)}
                        maxLength={500}
                      />
                    </label>

                    <label className="contact-page__field">
                      <span className="contact-page__label">{t("jobApply.fields.resume")}</span>
                      <input
                        className="contact-page__input"
                        type="file"
                        name="resume"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(ev) => setResumeFile(ev.target.files?.[0] || null)}
                        required
                      />
                      <span className="muted job-apply-page__file-hint">{t("jobApply.resumeHint")}</span>
                    </label>

                    <div className="contact-page__form-actions">
                      <button type="submit" className="contact-page__submit" disabled={sending}>
                        {sending ? t("jobApply.submitting") : t("jobApply.submit")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
