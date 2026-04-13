import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import featureCommunityImg from "../assets/features/feature-community.jpg";

const SUPPORT_EMAIL = "support@example.com";

const TOPIC_KEYS = ["general", "account", "data", "billing", "privacy", "other"];

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

function IconMail() {
  return (
    <svg className="contact-page__card-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.65" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg className="contact-page__card-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="contact-page__card-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.65" />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg className="contact-page__form-title-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Contact() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [mailOpened, setMailOpened] = useState(false);

  const topicOptions = useMemo(
    () => TOPIC_KEYS.map((key) => ({ value: key, label: t(`contact.topics.${key}`) })),
    [t],
  );

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setFormError("");
      setMailOpened(false);

      const trimmedMsg = message.trim();
      if (!trimmedMsg) {
        setFormError(t("contact.formNeedMessage"));
        return;
      }
      if (!isValidEmail(email)) {
        setFormError(t("contact.formNeedEmail"));
        return;
      }
      if (!topic) {
        setFormError(t("contact.formNeedTopic"));
        return;
      }

      const topicLabel = t(`contact.topics.${topic}`);
      const subject = `${t("contact.subjectPrefix")} ${topicLabel}`;
      const body = [
        t("contact.mailBodyName", {
          name: name.trim() || t("contact.mailBodyNotProvided"),
        }),
        t("contact.mailBodyEmail", { email: email.trim() }),
        t("contact.mailBodyTopic", { topic: topicLabel }),
        "",
        t("contact.mailBodyMessageHeader"),
        trimmedMsg,
        "",
        "---",
        t("contact.mailBodySentFrom"),
      ].join("\n");

      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      setMailOpened(true);
    },
    [name, email, topic, message, t],
  );

  return (
    <div className="contact-page">
      <PageHelmet breadcrumb="contact" description={t("contact.helmetDescription")} />

      <div className="contact-page__split">
        <div className="contact-page__split-col contact-page__split-col--left">
          <header className="contact-page__header">
            <div className="contact-page__hero-wrap">
              <img
                className="contact-page__hero"
                src={featureCommunityImg}
                width={960}
                height={540}
                alt={t("contact.heroAlt")}
                decoding="async"
              />
            </div>
            <h1 className="contact-page__title">{t("contact.title")}</h1>
            <p className="contact-page__lede muted">{t("contact.lede")}</p>
          </header>

          <div className="contact-page__grid">
            <a className="contact-page__card contact-page__card--link" href={`mailto:${SUPPORT_EMAIL}`}>
              <div className="contact-page__card-head">
                <span className="contact-page__card-icon-wrap" aria-hidden>
                  <IconMail />
                </span>
                <h2 className="contact-page__card-title">{t("contact.emailTitle")}</h2>
              </div>
              <p className="contact-page__card-text">{t("contact.emailText")}</p>
              <p className="contact-page__card-cta">{SUPPORT_EMAIL}</p>
            </a>

            <div className="contact-page__card">
              <div className="contact-page__card-head">
                <span className="contact-page__card-icon-wrap" aria-hidden>
                  <IconPin />
                </span>
                <h2 className="contact-page__card-title">{t("contact.mailingTitle")}</h2>
              </div>
              <address className="contact-page__card-address">
                {t("contact.addressBrand")}
                <br />
                {t("contact.addressStreet")}
                <br />
                {t("contact.addressCity")}
                <br />
                {t("contact.addressCountry")}
              </address>
            </div>

            <div className="contact-page__card">
              <div className="contact-page__card-head">
                <span className="contact-page__card-icon-wrap" aria-hidden>
                  <IconClock />
                </span>
                <h2 className="contact-page__card-title">{t("contact.responseTitle")}</h2>
              </div>
              <p className="contact-page__card-text">{t("contact.responseText")}</p>
              <p className="contact-page__card-text contact-page__card-text--tight">
                {t("contact.responsePrivacyBefore")}
                <Link className="contact-page__inline-link" to="/privacy-policy">
                  {t("contact.responsePrivacyLink")}
                </Link>
                {t("contact.responseMid")}
                <Link className="contact-page__inline-link" to="/community">
                  {t("contact.responseCommunityLink")}
                </Link>
                {t("contact.responseEnd")}
              </p>
            </div>
          </div>

          <p className="contact-page__back muted">
            <Link className="contact-page__back-link" to="/">
              {t("common.backHome")}
            </Link>
          </p>
        </div>

        <div className="contact-page__split-col contact-page__split-col--right">
          <section className="contact-page__form-section" aria-labelledby="contact-form-heading">
            <div className="contact-page__form-panel">
              <div className="contact-page__form-head">
                <span className="contact-page__form-icon-wrap" aria-hidden>
                  <IconSend />
                </span>
                <div>
                  <h2 id="contact-form-heading" className="contact-page__form-title">
                    {t("contact.formTitle")}
                  </h2>
                  <p className="contact-page__form-sub muted">
                    {t("contact.formSub", { email: SUPPORT_EMAIL })}
                  </p>
                </div>
              </div>

              <form className="contact-page__form" onSubmit={onSubmit} noValidate>
                <div className="contact-page__form-row">
                  <label className="contact-page__field">
                    <span className="contact-page__label">{t("contact.labelName")}</span>
                    <input
                      className="contact-page__input"
                      type="text"
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(ev) => setName(ev.target.value)}
                      placeholder={t("contact.phName")}
                      maxLength={120}
                    />
                  </label>
                  <label className="contact-page__field">
                    <span className="contact-page__label">{t("contact.labelEmail")}</span>
                    <input
                      className="contact-page__input"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      placeholder={t("contact.phEmail")}
                      maxLength={254}
                    />
                  </label>
                </div>

                <label className="contact-page__field contact-page__field--full">
                  <span className="contact-page__label">{t("contact.labelTopic")}</span>
                  <select
                    className="contact-page__select"
                    name="topic"
                    required
                    value={topic}
                    onChange={(ev) => setTopic(ev.target.value)}
                    aria-invalid={formError && !topic ? true : undefined}
                  >
                    <option value="" disabled hidden>
                      {t("contact.topicPlaceholder")}
                    </option>
                    {topicOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="contact-page__field contact-page__field--full">
                  <span className="contact-page__label">{t("contact.labelMessage")}</span>
                  <textarea
                    className="contact-page__textarea"
                    name="message"
                    required
                    rows={6}
                    value={message}
                    onChange={(ev) => setMessage(ev.target.value)}
                    placeholder={t("contact.phMessage")}
                    maxLength={8000}
                  />
                </label>

                {formError ? (
                  <p className="contact-page__form-error" role="alert">
                    {formError}
                  </p>
                ) : null}
                {mailOpened && !formError ? (
                  <p className="contact-page__form-success" role="status">
                    {t("contact.successMail")}
                    <a className="contact-page__inline-link" href={`mailto:${SUPPORT_EMAIL}`}>
                      {SUPPORT_EMAIL}
                    </a>
                    .
                  </p>
                ) : null}

                <div className="contact-page__form-actions">
                  <button type="submit" className="contact-page__submit">
                    {t("contact.submitBtn")}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
