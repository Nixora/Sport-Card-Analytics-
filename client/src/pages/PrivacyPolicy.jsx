import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";

import heroAnalyticsImg from "../assets/analytics-screen.jpg";
import communityTeamImg from "../assets/community-team.jpg";
import featureResearchImg from "../assets/features/feature-research.jpg";
import featureAnalyticsImg from "../assets/features/feature-analytics.jpg";
import featureCommunityImg from "../assets/features/feature-community.jpg";
import featureGradingImg from "../assets/features/feature-grading.jpg";
import featureAlertsImg from "../assets/features/feature-alerts.jpg";
import featureCompareImg from "../assets/features/feature-compare.jpg";

function SvgFrame({ children }) {
  return (
    <svg
      className="privacy-page__svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconPolicyDoc() {
  return (
    <SvgFrame>
      <path
        d="M7 3h7l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4M9 12h6M9 15h6M9 9h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgFrame>
  );
}

function IconCalendar() {
  return (
    <SvgFrame>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9h16M8 5V3M16 5V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgFrame>
  );
}

function IconInfo() {
  return (
    <SvgFrame>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 10v6M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgFrame>
  );
}

function IconTeam() {
  return (
    <SvgFrame>
      <path
        d="M5 20V10l7-4 7 4v10M9 20v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgFrame>
  );
}

function IconInbox() {
  return (
    <SvgFrame>
      <path
        d="M4 6a1 1 0 011-1h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M4 9l3 3h10l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </SvgFrame>
  );
}

function IconGears() {
  return (
    <SvgFrame>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </SvgFrame>
  );
}

function IconShare() {
  return (
    <SvgFrame>
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 10.5L15.5 6.5M8.5 13.5l7 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgFrame>
  );
}

function IconVault() {
  return (
    <SvgFrame>
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 10V8a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
    </SvgFrame>
  );
}

function IconSliders() {
  return (
    <SvgFrame>
      <path d="M5 8h10M5 16h10M9 5v6M15 13v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="8" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="16" r="2" stroke="currentColor" strokeWidth="1.6" />
    </SvgFrame>
  );
}

function IconMail() {
  return (
    <SvgFrame>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </SvgFrame>
  );
}

function IconArrowBack() {
  return (
    <SvgFrame>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgFrame>
  );
}

const SECTIONS = [
  {
    title: "Who we are",
    Icon: IconTeam,
    image: communityTeamImg,
    imageAlt: "Colleagues collaborating at a laptop, representing the Nixsora team.",
    body: [
      "Nixsora (“we”, “us”) provides sports card marketplace analytics, alerts, and community features. This policy describes how we handle information when you use our website and related services.",
    ],
  },
  {
    title: "Information we collect",
    Icon: IconInbox,
    image: featureResearchImg,
    imageAlt: "Hands reviewing notes and a laptop, suggesting research and collected information.",
    body: [
      "Account details you provide, such as email address and display name, when you register or update your profile.",
      "Usage data needed to operate the product, including approximate device and log information (for example, pages viewed and general diagnostic events).",
      "Content you choose to submit in community or support channels.",
    ],
  },
  {
    title: "How we use information",
    Icon: IconGears,
    image: featureAnalyticsImg,
    imageAlt: "Analytics dashboard and charts illustrating product usage of data.",
    body: [
      "To provide, secure, and improve the service — including personalization of charts, alerts, and community features you opt into.",
      "To communicate with you about your account, product updates, or support requests.",
      "To meet legal obligations and protect the safety and integrity of our users and the platform.",
    ],
  },
  {
    title: "Sharing",
    Icon: IconShare,
    image: featureCommunityImg,
    imageAlt: "Community discussion and shared content in a social feed layout.",
    body: [
      "We do not sell your personal information. We may share data with service providers who assist us under strict confidentiality, or when required by law.",
      "Public profile fields or community posts you publish may be visible to other users as designed in the product.",
    ],
  },
  {
    title: "Retention & security",
    Icon: IconVault,
    image: featureGradingImg,
    imageAlt: "Graded sports card in a protective case, symbolizing careful handling and storage.",
    body: [
      "We retain information only as long as needed for the purposes above, unless a longer period is required by law.",
      "We use reasonable technical and organizational measures to protect data; no method of transmission over the internet is completely secure.",
    ],
  },
  {
    title: "Your choices",
    Icon: IconSliders,
    image: featureAlertsImg,
    imageAlt: "Alert and notification controls in the product interface.",
    body: [
      "You may access or update certain profile information in your account settings where available.",
      "You can contact us to ask questions about this policy or to exercise applicable privacy rights in your jurisdiction.",
    ],
  },
  {
    title: "Contact",
    Icon: IconMail,
    image: featureCompareImg,
    imageAlt: "Marketplace comparison view in the Nixsora application.",
    body: [
      "Questions about privacy: support@example.com (replace with your production address before launch).",
      "We may update this policy from time to time; the “Last updated” date below will change when we do.",
    ],
  },
];

function PrivacySectionCard({ section: s, index, reduceMotion }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setInView(true);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduceMotion]);

  const SecIcon = s.Icon;
  const motionClass = reduceMotion ? "" : " privacy-page__section--motion";
  const visibleClass = inView ? " privacy-page__section--inview" : "";

  return (
    <section
      ref={ref}
      className={`privacy-page__section${motionClass}${visibleClass}`}
      style={{ "--privacy-i": index }}
    >
      <div className="privacy-page__section-media">
        <img className="privacy-page__section-img" src={s.image} alt={s.imageAlt} width={800} height={450} loading="lazy" />
        <div className="privacy-page__section-media-shine" aria-hidden />
      </div>
      <div className="privacy-page__section-body">
        <div className="privacy-page__section-head">
          <div className="privacy-page__section-icon" aria-hidden>
            <SecIcon />
          </div>
          <h2 className="privacy-page__section-title">{s.title}</h2>
        </div>
        {s.body.map((p) => (
          <p key={p} className="privacy-page__p">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function PrivacyPolicy() {
  const updated = "April 11, 2026";
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className={`privacy-page${reduceMotion ? "" : " privacy-page--motion"}`}>
      <PageHelmet
        breadcrumb="privacy policy"
        description="How Nixsora collects, uses, and protects your information."
      />
      <header className="privacy-page__header">
        <div className="privacy-page__intro">
          <div className={`privacy-page__hero-wrap${reduceMotion ? "" : " privacy-page__hero-wrap--motion"}`}>
            <img
              className="privacy-page__hero privacy-page__hero--photo"
              src={heroAnalyticsImg}
              width={1200}
              height={675}
              alt="Analytics workspace with charts representing how Nixsora processes marketplace data."
              decoding="async"
            />
            <img
              className="privacy-page__hero-badge"
              src="/privacy-hero.svg"
              width={160}
              height={90}
              alt=""
              decoding="async"
            />
          </div>
          <div className="privacy-page__intro-copy">
            <div className="privacy-page__title-row">
              <span className="privacy-page__inline-icon" aria-hidden>
                <IconPolicyDoc />
              </span>
              <h1 className="privacy-page__title">Privacy Policy</h1>
            </div>
            <p className="privacy-page__meta muted">
              <span className="privacy-page__inline-icon" aria-hidden>
                <IconCalendar />
              </span>
              <span>Last updated: {updated}</span>
            </p>
            <p className="privacy-page__lede muted">
              <span className="privacy-page__inline-icon privacy-page__inline-icon--top" aria-hidden>
                <IconInfo />
              </span>
              <span>
                This page explains what information we collect, why we collect it, and the choices you have. It is a
                general template — have counsel review it before you rely on it for compliance.
              </span>
            </p>
            <ul className="privacy-page__highlights" aria-label="Policy highlights">
              <li>No sale of personal data</li>
              <li>{"Account & usage data described below"}</li>
              <li>Contact us for privacy questions</li>
            </ul>
          </div>
        </div>
      </header>

      <div className="privacy-page__sections">
        {SECTIONS.map((s, index) => (
          <PrivacySectionCard key={s.title} section={s} index={index} reduceMotion={reduceMotion} />
        ))}
      </div>

      <p className="privacy-page__back muted">
        <Link className="privacy-page__back-link" to="/">
          <span className="privacy-page__inline-icon" aria-hidden>
            <IconArrowBack />
          </span>
          <span>Back to home</span>
        </Link>
      </p>
    </div>
  );
}
