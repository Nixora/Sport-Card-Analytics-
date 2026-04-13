import { useMemo } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import heroFaqImg from "../assets/features/feature-compare.jpg";
import bannerAlertsImg from "../assets/features/feature-alerts.jpg";

function Svg({ children, className }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {children}
    </svg>
  );
}

function IconFaqMark({ className }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="M9.8 9.3a2.2 2.2 0 014.1 1.1c0 1.5-1.2 2-1.8 2.8-.3.4-.4.9-.4 1.4V15M12 17.2h.01"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function IconMarket({ className }) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h10M4 17h14" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <rect x="14" y="10" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.65" />
    </Svg>
  );
}

function IconData({ className }) {
  return (
    <Svg className={className}>
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="1.65" />
      <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6" stroke="currentColor" strokeWidth="1.65" />
      <path d="M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" stroke="currentColor" strokeWidth="1.65" />
    </Svg>
  );
}

function IconBell({ className }) {
  return (
    <Svg className={className}>
      <path
        d="M6 10a6 6 0 1112 0c0 3.1 1.3 4 2.5H3.5C4.7 14 6 13.1 6 10zM10 18h4"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconUser({ className }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.65" />
      <path
        d="M5.5 19.5v-1c0-2.5 2-4.5 6.5-4.5s6.5 2 6.5 4.5v1"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const SECTION_ICONS = {
  marketplace: IconMarket,
  data: IconData,
  alerts: IconBell,
  account: IconUser,
};

function FaqAnswer({ item }) {
  if (item?.a && typeof item.a === "string") return item.a;
  if (item?.aLinkPrivacy) {
    return (
      <>
        {item.aBefore}
        <Link className="faq-page__inline-link" to="/privacy-policy">
          {item.aLinkPrivacy}
        </Link>
        {item.aAfter}
      </>
    );
  }
  if (item?.aLinkContact) {
    return (
      <>
        {item.aBefore}
        <Link className="faq-page__inline-link" to="/contact">
          {item.aLinkContact}
        </Link>
        {item.aAfter}
      </>
    );
  }
  return null;
}

export default function FAQ() {
  const { t, tx } = useLanguage();
  const sections = useMemo(() => {
    const raw = tx("faq.sections");
    if (!Array.isArray(raw)) return [];
    return raw.map((s) => ({
      ...s,
      Icon: SECTION_ICONS[s.id] || IconFaqMark,
    }));
  }, [tx]);

  return (
    <div className="faq-page">
      <PageHelmet breadcrumb="faq" description={t("faq.helmetDescription")} />

      <header className="faq-page__header">
        <div className="faq-page__hero-wrap">
          <img
            className="faq-page__hero"
            src={heroFaqImg}
            width={960}
            height={540}
            alt={t("faq.heroAlt")}
            decoding="async"
          />
        </div>
        <div className="faq-page__title-row">
          <span className="faq-page__title-icon" aria-hidden>
            <IconFaqMark className="faq-page__svg" />
          </span>
          <h1 className="faq-page__title">{t("faq.title")}</h1>
        </div>
        <p className="faq-page__lede muted">{t("faq.lede")}</p>

        <nav className="faq-page__jump" aria-label={t("faq.jumpLabel")}>
          {sections.map((s) => (
            <a key={s.id} className="faq-page__jump-link" href={`#${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>
      </header>

      <div className="faq-page__banner" role="presentation">
        <img
          className="faq-page__banner-img"
          src={bannerAlertsImg}
          width={800}
          height={360}
          alt=""
          decoding="async"
        />
        <div className="faq-page__banner-caption">
          <span className="faq-page__banner-icon" aria-hidden>
            <IconBell className="faq-page__svg" />
          </span>
          <p className="faq-page__banner-text">{t("faq.bannerText")}</p>
        </div>
      </div>

      <div className="faq-page__sections">
        {sections.map((section) => {
          const CatIcon = section.Icon;
          return (
            <section key={section.id} id={section.id} className="faq-page__section" aria-labelledby={`faq-h-${section.id}`}>
              <div className="faq-page__section-head">
                <div className="faq-page__section-icon" aria-hidden>
                  <CatIcon className="faq-page__svg" />
                </div>
                <h2 id={`faq-h-${section.id}`} className="faq-page__section-title">
                  {section.title}
                </h2>
              </div>
              <div className="faq-page__list">
                {section.items.map((item) => (
                  <details key={item.q} className="faq-page__item">
                    <summary className="faq-page__summary">
                      <span className="faq-page__summary-chevron" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M9 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {item.q}
                    </summary>
                    <div className="faq-page__answer">
                      <FaqAnswer item={item} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="faq-page__footer-note muted">
        <span className="faq-page__footer-icon" aria-hidden>
          <IconFaqMark className="faq-page__svg faq-page__svg--sm" />
        </span>
        <span>
          {t("faq.footerStill")}{" "}
          <Link className="faq-page__inline-link" to="/contact">
            {t("faq.footerSend")}
          </Link>{" "}
          {t("faq.footerOrAsk")}{" "}
          <Link className="faq-page__inline-link" to="/community">
            {t("header.navCommunity")}
          </Link>
          {t("faq.footerEnd")}
        </span>
      </p>

      <p className="faq-page__back muted">
        <Link className="faq-page__back-link" to="/">
          {t("common.backHome")}
        </Link>
      </p>
    </div>
  );
}
