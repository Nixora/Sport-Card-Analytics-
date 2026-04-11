import { useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";

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

const PLANS = [
  {
    name: "Starter",
    tag: null,
    blurb: "Track a focused slice of the market.",
    priceMonthly: "$0",
    priceAnnual: "$0",
    points: ["Marketplace comparison", "Basic trend views", "Email support"],
    cta: "Get started",
    ctaTo: "/marketplace",
    featured: false,
  },
  {
    name: "Pro",
    tag: "Most popular",
    blurb: "More alerts, history, and workflow room.",
    priceMonthly: "$29",
    priceAnnual: "$24",
    points: ["Everything in Starter", "Saved searches & alerts", "Longer trend history", "Priority support"],
    cta: "Coming soon",
    ctaTo: null,
    featured: true,
  },
  {
    name: "Team",
    tag: null,
    blurb: "Shared workspace for small shops or breakers.",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    points: ["Everything in Pro", "Multiple seats", "Export-friendly reporting", "Onboarding call"],
    cta: "Contact sales",
    ctaTo: "/contact",
    featured: false,
  },
];

export default function Premium() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="pricing-page">
      <PageHelmet
        breadcrumb="premium"
        description="Nixsora Pricing — Starter, Pro, and Team plans for marketplace analytics and alerts."
      />

      <div className="pricing-page__glow" aria-hidden />

      <header className="pricing-page__header">
        <p className="pricing-page__eyebrow">Pricing</p>
        <h1 className="pricing-page__title">Plans for every collector</h1>
        <p className="pricing-page__lede muted">
          Compare tiers and pick the depth you need. Billing goes live later — prices are placeholders you can replace anytime.
        </p>

        <div className="pricing-page__toggle" role="group" aria-label="Billing period">
          <button
            type="button"
            className={`pricing-page__toggle-btn${annual ? " is-active" : ""}`}
            onClick={() => setAnnual(true)}
          >
            Annual
            <span className="pricing-page__toggle-hint">Save ~17%</span>
          </button>
          <button
            type="button"
            className={`pricing-page__toggle-btn${!annual ? " is-active" : ""}`}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
        </div>
      </header>

      <div className="pricing-page__grid" role="list">
        {PLANS.map((plan) => {
          const price = annual ? plan.priceAnnual : plan.priceMonthly;
          const isCustom = price === "Custom";
          const ctaClass = `pricing-card__cta${plan.featured ? " pricing-card__cta--primary" : ""}`;
          return (
            <article
              key={plan.name}
              className={`pricing-card${plan.featured ? " pricing-card--featured" : ""}`}
              role="listitem"
            >
              {plan.tag ? <span className="pricing-card__badge">{plan.tag}</span> : null}
              <div className="pricing-card__top">
                <h2 className="pricing-card__name">{plan.name}</h2>
                <p className="pricing-card__blurb">{plan.blurb}</p>
                <div className="pricing-card__price-block">
                  <span className="pricing-card__price">{price}</span>
                  {!isCustom ? <span className="pricing-card__period">/mo</span> : null}
                </div>
                <p className="pricing-card__price-note">
                  {isCustom
                    ? "Tailored to your team"
                    : annual
                      ? "Per month, billed annually"
                      : "Billed monthly"}
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
                <button type="button" className={ctaClass} disabled={plan.cta === "Coming soon"}>
                  {plan.cta}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <p className="pricing-page__footnote muted">
        Taxes may apply. Team pricing is set with sales. Questions?{" "}
        <Link className="pricing-page__link" to="/contact">
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}
