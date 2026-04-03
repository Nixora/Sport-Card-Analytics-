import PageHelmet from "../components/PageHelmet.jsx";

const PLANS = [
  {
    name: "Starter",
    tag: null,
    blurb: "Track a focused slice of the market.",
    points: ["Marketplace comparison", "Basic trend views", "Email support"],
  },
  {
    name: "Pro",
    tag: "Popular",
    blurb: "More alerts, history, and workflow room.",
    points: ["Everything in Starter", "Saved searches & alerts", "Longer trend history", "Priority support"],
  },
  {
    name: "Team",
    tag: null,
    blurb: "Shared workspace for small shops or breakers.",
    points: ["Everything in Pro", "Multiple seats", "Export-friendly reporting", "Onboarding call"],
  },
];

export default function Premium() {
  return (
    <div className="premium-page">
      <PageHelmet
        breadcrumb="premium"
        description="Nixsor Premium — plans and features (placeholder layout)."
      />
      <header className="premium-page__header">
        <h1 className="premium-page__title">Premium</h1>
        <p className="premium-page__lede muted">
          Placeholder cards for future pricing — swap copy, CTAs, and tiers anytime.
        </p>
      </header>

      <div className="premium-cards" role="list">
        {PLANS.map((plan) => (
          <article
            key={plan.name}
            className={`premium-card${plan.tag ? " premium-card--highlight" : ""}`}
            role="listitem"
          >
            {plan.tag && <span className="premium-card__badge">{plan.tag}</span>}
            <h2 className="premium-card__name">{plan.name}</h2>
            <p className="premium-card__blurb muted">{plan.blurb}</p>
            <ul className="premium-card__list">
              {plan.points.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <button type="button" className="premium-card__cta" disabled>
              Coming soon
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
