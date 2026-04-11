import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import featureCommunityImg from "../assets/features/feature-community.jpg";

const SUPPORT_EMAIL = "support@example.com";

const TOPIC_OPTIONS = [
  { value: "general", label: "General question" },
  { value: "account", label: "Account & login" },
  { value: "data", label: "Data & marketplace coverage" },
  { value: "billing", label: "Billing & Premium" },
  { value: "privacy", label: "Privacy & data" },
  { value: "other", label: "Other" },
];

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [mailOpened, setMailOpened] = useState(false);

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setFormError("");
      setMailOpened(false);

      const trimmedMsg = message.trim();
      if (!trimmedMsg) {
        setFormError("Please enter a message.");
        return;
      }
      if (!isValidEmail(email)) {
        setFormError("Please enter a valid email address so we can reply.");
        return;
      }
      if (!topic) {
        setFormError("Please choose a topic.");
        return;
      }

      const topicLabel = TOPIC_OPTIONS.find((t) => t.value === topic)?.label || topic;
      const subject = `[Nixsora contact] ${topicLabel}`;
      const body = [
        `Name: ${name.trim() || "(not provided)"}`,
        `Email: ${email.trim()}`,
        `Topic: ${topicLabel}`,
        "",
        "Message:",
        trimmedMsg,
        "",
        "---",
        "Sent from the Nixsora contact form.",
      ].join("\n");

      const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      setMailOpened(true);
    },
    [name, email, topic, message]
  );

  return (
    <div className="contact-page">
      <PageHelmet
        breadcrumb="contact"
        description="Contact Nixsora — email, mailing address, and how we respond to support requests."
      />

      <header className="contact-page__header">
        <div className="contact-page__hero-wrap">
          <img
            className="contact-page__hero"
            src={featureCommunityImg}
            width={960}
            height={540}
            alt="Community and discussion features in the Nixsora product."
            decoding="async"
          />
        </div>
        <h1 className="contact-page__title">Contact us</h1>
        <p className="contact-page__lede muted">
          Questions about your account, marketplace data, or billing? Reach out by email or mail. Replace the placeholder
          address and inbox with your production details before launch.
        </p>
      </header>

      <div className="contact-page__grid">
        <a className="contact-page__card contact-page__card--link" href={`mailto:${SUPPORT_EMAIL}`}>
          <span className="contact-page__card-icon-wrap" aria-hidden>
            <IconMail />
          </span>
          <h2 className="contact-page__card-title">Email</h2>
          <p className="contact-page__card-text">We read every message. For the fastest help, include your account email and a short summary.</p>
          <p className="contact-page__card-cta">{SUPPORT_EMAIL}</p>
        </a>

        <div className="contact-page__card">
          <span className="contact-page__card-icon-wrap" aria-hidden>
            <IconPin />
          </span>
          <h2 className="contact-page__card-title">Mailing address</h2>
          <address className="contact-page__card-address">
            Nixsora
            <br />
            1095 E. Salter Drive
            <br />
            Phoenix, AZ 85024
            <br />
            United States
          </address>
        </div>

        <div className="contact-page__card">
          <span className="contact-page__card-icon-wrap" aria-hidden>
            <IconClock />
          </span>
          <h2 className="contact-page__card-title">Response time</h2>
          <p className="contact-page__card-text">
            We aim to reply within one to two business days. Complex data or partnership questions may take a little longer.
          </p>
          <p className="contact-page__card-text contact-page__card-text--tight">
            For how we handle personal data, see our{" "}
            <Link className="contact-page__inline-link" to="/privacy-policy">
              Privacy Policy
            </Link>
            . General product questions are also welcome in{" "}
            <Link className="contact-page__inline-link" to="/community">
              Community
            </Link>
            .
          </p>
        </div>
      </div>

      <section className="contact-page__form-section" aria-labelledby="contact-form-heading">
        <div className="contact-page__form-panel">
          <div className="contact-page__form-head">
            <span className="contact-page__form-icon-wrap" aria-hidden>
              <IconSend />
            </span>
            <div>
              <h2 id="contact-form-heading" className="contact-page__form-title">
                Send us a message
              </h2>
              <p className="contact-page__form-sub muted">
                Submitting opens your email app with a draft to {SUPPORT_EMAIL}. You can edit the message before sending.
              </p>
            </div>
          </div>

          <form className="contact-page__form" onSubmit={onSubmit} noValidate>
            <div className="contact-page__form-row">
              <label className="contact-page__field">
                <span className="contact-page__label">Your name</span>
                <input
                  className="contact-page__input"
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Jane Collector"
                  maxLength={120}
                />
              </label>
              <label className="contact-page__field">
                <span className="contact-page__label">Your email</span>
                <input
                  className="contact-page__input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@example.com"
                  maxLength={254}
                />
              </label>
            </div>

            <label className="contact-page__field contact-page__field--full">
              <span className="contact-page__label">Topic</span>
              <select
                className="contact-page__select"
                name="topic"
                required
                value={topic}
                onChange={(ev) => setTopic(ev.target.value)}
                aria-invalid={formError && !topic ? true : undefined}
              >
                <option value="" disabled hidden>
                  Choose a topic
                </option>
                {TOPIC_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="contact-page__field contact-page__field--full">
              <span className="contact-page__label">Message</span>
              <textarea
                className="contact-page__textarea"
                name="message"
                required
                rows={6}
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                placeholder="Tell us what you need help with…"
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
                If your mail program did not open, email us directly at{" "}
                <a className="contact-page__inline-link" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            ) : null}

            <div className="contact-page__form-actions">
              <button type="submit" className="contact-page__submit">
                Open in email app
              </button>
            </div>
          </form>
        </div>
      </section>

      <p className="contact-page__back muted">
        <Link className="contact-page__back-link" to="/">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
