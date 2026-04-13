import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function IconCheck({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PLAN_ORDER = [
  { id: "starter", ctaTo: "/marketplace", featured: false, customPrice: false },
  { id: "pro", ctaTo: null, featured: true, customPrice: false },
  { id: "team", ctaTo: "/contact", featured: false, customPrice: true },
];

export default function Premium() {
  const { t, tx } = useLanguage();
  const [annual, setAnnual] = useState(true);

  const plans = useMemo(() => {
    const bundle = tx("premium.plans");
    if (!bundle || typeof bundle !== "object") return [];
    return PLAN_ORDER.map((meta) => {
      const p = bundle[meta.id];
      if (!p) return null;
      const priceMonthly = meta.customPrice ? t("premium.priceCustom") : p.priceMonthly;
      const priceAnnual = meta.customPrice ? t("premium.priceCustom") : p.priceAnnual;
      return {
        id: meta.id,
        name: p.name,
        tag: p.tag ?? null,
        blurb: p.blurb,
        points: Array.isArray(p.points) ? p.points : [],
        cta: p.cta,
        ctaTo: meta.ctaTo,
        featured: meta.featured,
        customPrice: meta.customPrice,
        priceMonthly,
        priceAnnual,
      };
    }).filter(Boolean);
  }, [t, tx]);

  return (
    <div className="pricing-page">
      <PageHelmet breadcrumb="premium" description={t("premium.helmetDescription")} />

      <div className="pricing-page__glow" aria-hidden />

      <header className="pricing-page__header">
        <p className="pricing-page__eyebrow">{t("premium.eyebrow")}</p>
        <h1 className="pricing-page__title">{t("premium.title")}</h1>
        <p className="pricing-page__lede muted">{t("premium.lede")}</p>

        <div className="pricing-page__toggle" role="group" aria-label={t("premium.billingGroup")}>
          <button
            type="button"
            className={`pricing-page__toggle-btn${annual ? " is-active" : ""}`}
            onClick={() => setAnnual(true)}
          >
            {t("premium.annual")}
            <span className="pricing-page__toggle-hint">{t("premium.annualHint")}</span>
          </button>
          <button
            type="button"
            className={`pricing-page__toggle-btn${!annual ? " is-active" : ""}`}
            onClick={() => setAnnual(false)}
          >
            {t("premium.monthly")}
          </button>
        </div>
      </header>

      <div className="pricing-page__grid" role="list">
        {plans.map((plan) => {
          const price = annual ? plan.priceAnnual : plan.priceMonthly;
          const isCustom = plan.customPrice;
          const ctaClass = `pricing-card__cta${plan.featured ? " pricing-card__cta--primary" : ""}`;
          return (
            <article
              key={plan.id}
              className={`pricing-card${plan.featured ? " pricing-card--featured" : ""}`}
              role="listitem"
            >
              {plan.tag ? <span className="pricing-card__badge">{plan.tag}</span> : null}
              <div className="pricing-card__top">
                <h2 className="pricing-card__name">{plan.name}</h2>
                <p className="pricing-card__blurb">{plan.blurb}</p>
                <div className="pricing-card__price-block">
                  <span className="pricing-card__price">{price}</span>
                  {!isCustom ? <span className="pricing-card__period">{t("premium.perMo")}</span> : null}
                </div>
                <p className="pricing-card__price-note">
                  {isCustom
                    ? t("premium.noteCustom")
                    : annual
                      ? t("premium.noteAnnual")
                      : t("premium.noteMonthly")}
                </p>
              </div>
              <div className="pricing-card__rule" aria-hidden />
              <ul className="pricing-card__features">
                {plan.points.map((line) => (
                  <li key={line} className="pricing-card__feature">
                    <IconCheck className="pricing-card__check" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {plan.ctaTo ? (
                <Link to={plan.ctaTo} className={ctaClass}>
                  {plan.cta}
                </Link>
              ) : (
                <button type="button" className={ctaClass} disabled={plan.id === "pro"}>
                  {plan.cta}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <p className="pricing-page__footnote muted">
        {t("premium.footnoteBefore")}
        <Link className="pricing-page__link" to="/contact">
          {t("footer.contactUs")}
        </Link>
        .
      </p>
    </div>
  );
}
