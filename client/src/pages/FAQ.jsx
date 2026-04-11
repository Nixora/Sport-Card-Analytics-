import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
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

const SECTIONS = [
  {
    id: "marketplace",
    title: "Marketplace & search",
    Icon: IconMarket,
    items: [
      {
        q: "What is the marketplace?",
        a: "The marketplace is where you browse cards from your ingested sample, compare asking prices across sources, and open detail pages for trends and filters. It is not a checkout cart — we surface analytics, not live checkout with sellers.",
      },
      {
        q: "Why do prices differ from what I see on eBay or an auction house?",
        a: "Listings change constantly. Nixsora reflects the data you have ingested and when it was last updated. Medians and samples depend on your query, filters, and ingest schedule — not real-time sold prices everywhere.",
      },
      {
        q: "Can I compare the same card across multiple marketplaces?",
        a: "Yes, that is the core idea. Use marketplace filters and comparison views where available. Coverage depends on which sources you have connected and how card keys are normalized in your setup.",
      },
    ],
  },
  {
    id: "data",
    title: "Data & accuracy",
    Icon: IconData,
    items: [
      {
        q: "Is this financial or investment advice?",
        a: "No. Charts and alerts are informational. Card markets are volatile; always do your own research before buying or selling.",
      },
      {
        q: "What does “median ask” mean here?",
        a: "Typically it is a median of asking prices from listings in your current sample, not a guaranteed fair market value (FMV) for sold cards. Wording on the product may vary as we refine labels.",
      },
      {
        q: "Are you affiliated with eBay or other marketplaces?",
        a: "No. Nixsora is independent. We may display data that originated from public listings according to your configuration, but we are not endorsed by those platforms unless stated otherwise.",
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts & Premium",
    Icon: IconBell,
    items: [
      {
        q: "How do price alerts work?",
        a: "You configure thresholds or saved searches (where the product supports them). When new data matches your rules, we can notify you by email or in-app, depending on your plan and settings.",
      },
      {
        q: "What is Premium?",
        a: "Premium is a planned tier with more alerts, history, and seats for teams. The Premium page shows placeholder plans until billing is connected.",
      },
    ],
  },
  {
    id: "account",
    title: "Account, privacy & support",
    Icon: IconUser,
    items: [
      {
        q: "How do I change my profile or password?",
        a: "Open Profile from the header when signed in. Use the edit flow there to update display name, tags, or avatar where supported. Password changes follow the same auth settings your deployment uses.",
      },
      {
        q: "Where is your Privacy Policy?",
        a: (
          <>
            See our{" "}
            <Link className="faq-page__inline-link" to="/privacy-policy">
              Privacy Policy
            </Link>{" "}
            for how we handle personal information.
          </>
        ),
      },
      {
        q: "Who can I contact for help?",
        a: (
          <>
            Visit{" "}
            <Link className="faq-page__inline-link" to="/contact">
              Contact
            </Link>{" "}
            for email and the message form, or write to the support address shown there.
          </>
        ),
      },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="faq-page">
      <PageHelmet
        breadcrumb="faq"
        description="Frequently asked questions about Nixsora — marketplace, data, alerts, Premium, and support."
      />

      <header className="faq-page__header">
        <div className="faq-page__hero-wrap">
          <img
            className="faq-page__hero"
            src={heroFaqImg}
            width={960}
            height={540}
            alt="Marketplace comparison and card listings in Nixsora."
            decoding="async"
          />
        </div>
        <div className="faq-page__title-row">
          <span className="faq-page__title-icon" aria-hidden>
            <IconFaqMark className="faq-page__svg" />
          </span>
          <h1 className="faq-page__title">Frequently asked questions</h1>
        </div>
        <p className="faq-page__lede muted">
          Quick answers about the marketplace, how we show prices, alerts, and your account. For legal terms, use the Privacy Policy; for one-on-one help, use Contact.
        </p>

        <nav className="faq-page__jump" aria-label="FAQ sections">
          {SECTIONS.map((s) => (
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
          <p className="faq-page__banner-text">Stay ahead with alerts when your saved criteria match new listings.</p>
        </div>
      </div>

      <div className="faq-page__sections">
        {SECTIONS.map((section) => {
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
                    <div className="faq-page__answer">{item.a}</div>
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
          Still stuck?{" "}
          <Link className="faq-page__inline-link" to="/contact">
            Send us a message
          </Link>{" "}
          or ask in{" "}
          <Link className="faq-page__inline-link" to="/community">
            Community
          </Link>
          .
        </span>
      </p>

      <p className="faq-page__back muted">
        <Link className="faq-page__back-link" to="/">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
