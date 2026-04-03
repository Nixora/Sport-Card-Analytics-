import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import HeroHeadlineTypewriter from "../components/HeroHeadlineTypewriter.jsx";
import HeroSourceImageFlow from "../components/HeroSourceImageFlow.jsx";
import heroPlatformImg from "../assets/hero-platform.png";
import heroSportsSpread from "../assets/sports-cards.jpg";
import heroCardStock1 from "../assets/hero-card-01.jpg";
import heroCardStock2 from "../assets/hero-card-02.jpg";
import heroCardStock3 from "../assets/hero-card-03.jpg";
import heroCardStill from "../assets/hero-sports-card-ref.png";
import whyRealtimeImg from "../assets/why-realtime.png";
import whyCompareImg from "../assets/why-compare.png";
import whyAlertsImg from "../assets/why-alerts.png";
import whyForecastImg from "../assets/why-forecast.png";
import whyPortfolioImg from "../assets/why-portfolio.png";
import featureCompareImg from "../assets/features/feature-compare.jpg";
import featureAnalyticsImg from "../assets/features/feature-analytics.jpg";
import featureAlertsImg from "../assets/features/feature-alerts.jpg";
import featureGradingImg from "../assets/features/feature-grading.jpg";
import featureCommunityImg from "../assets/features/feature-community.jpg";

/** Decorative candlesticks: 0–1 where 1 = top of chart (highest price). Not real market data. */
const HERO_CANDLE_OHLC = [
  { o: 0.66, h: 0.69, l: 0.63, c: 0.67 },
  { o: 0.67, h: 0.71, l: 0.65, c: 0.7 },
  { o: 0.7, h: 0.72, l: 0.685, c: 0.69 },
  { o: 0.69, h: 0.695, l: 0.67, c: 0.68 },
  { o: 0.68, h: 0.73, l: 0.675, c: 0.72 },
  { o: 0.72, h: 0.73, l: 0.46, c: 0.49 },
  { o: 0.49, h: 0.53, l: 0.44, c: 0.45 },
  { o: 0.45, h: 0.5, l: 0.435, c: 0.48 },
  { o: 0.48, h: 0.64, l: 0.47, c: 0.62 },
  { o: 0.62, h: 0.65, l: 0.59, c: 0.63 },
  { o: 0.63, h: 0.64, l: 0.605, c: 0.615 },
  { o: 0.615, h: 0.65, l: 0.6, c: 0.645 },
  { o: 0.645, h: 0.66, l: 0.63, c: 0.652 },
  { o: 0.652, h: 0.67, l: 0.62, c: 0.64 },
  { o: 0.64, h: 0.648, l: 0.625, c: 0.635 },
  { o: 0.635, h: 0.646, l: 0.628, c: 0.642 },
];

/** Candlestick SVG space — taller/wider so bodies and wicks read like a real chart. */
const CHART_VIEW = { w: 480, h: 160, padX: 24, padY: 14, padYb: 16 };

function heroCandleY(p) {
  const inner = CHART_VIEW.h - CHART_VIEW.padY - CHART_VIEW.padYb;
  return CHART_VIEW.padY + (1 - p) * inner;
}

function MarketStateIcon({ name, className = "" }) {
  const svgProps = {
    className,
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };
  const s = { stroke: "currentColor", strokeWidth: 1.65, strokeLinecap: "round", strokeLinejoin: "round" };

  switch (name) {
    case "column-growth":
      return (
        <svg {...svgProps}>
          <path {...s} d="M3 3v18h18" />
          <path {...s} d="M7 16l4-4 3 3 6-7" />
          <path {...s} d="M17 8v4h4" />
        </svg>
      );
    case "column-challenges":
      return (
        <svg {...svgProps}>
          <path {...s} d="M12 9v4" />
          <path {...s} d="M12 17h.01" />
          <path {...s} d="M10.3 3.6h3.4l8.3 14.8a1 1 0 01-.9 1.5H2.9a1 1 0 01-.9-1.5L10.3 3.6z" />
        </svg>
      );
    case "investors":
      return (
        <svg {...svgProps}>
          <path {...s} d="M4 19V9M10 19v-6M16 19v-9M22 19V5" />
        </svg>
      );
    case "marketplaces":
      return (
        <svg {...svgProps}>
          <path {...s} d="M6 22V8h12v14" />
          <path {...s} d="M6 12h12" />
          <path {...s} d="M10 6V2h4v4" />
          <circle {...s} cx="9" cy="17" r="1" strokeWidth="1.3" />
          <circle {...s} cx="15" cy="17" r="1" strokeWidth="1.3" />
        </svg>
      );
    case "grading":
      return (
        <svg {...svgProps}>
          <path {...s} d="M12 2l3 7 7 .6-5.3 5.1 1.5 7.3L12 18l-6.2 3.8 1.5-7.3L2 9.6 9 9l3-7z" />
        </svg>
      );
    case "fragmented":
      return (
        <svg {...svgProps}>
          <rect {...s} x="3" y="3" width="7" height="7" rx="1.2" />
          <rect {...s} x="14" y="3" width="7" height="7" rx="1.2" />
          <rect {...s} x="8.5" y="14" width="7" height="7" rx="1.2" />
          <path {...s} d="M6.5 10l-1.5 2M17.5 10l1.5 2M12 14v2.5" strokeDasharray="1.8 2" />
        </svg>
      );
    case "volatile":
      return (
        <svg {...svgProps}>
          <path {...s} d="M3 18l4-6 4 4 4-9 4 5" />
          <circle {...s} cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle {...s} cx="11" cy="16" r="1.5" fill="currentColor" stroke="none" />
          <circle {...s} cx="15" cy="7" r="1.5" fill="currentColor" stroke="none" />
          <circle {...s} cx="19" cy="14" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "uncertain":
      return (
        <svg {...svgProps}>
          <circle {...s} cx="12" cy="12" r="9" />
          <path {...s} d="M9.5 10a2.5 2.5 0 114 2q-.8.45-.8 1.2V14" />
          <path {...s} d="M12 17h.01" />
        </svg>
      );
    case "bell-alerts":
      return (
        <svg {...svgProps}>
          <path {...s} d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path {...s} d="M13.7 19a2 2 0 11-3.4 0" />
        </svg>
      );
    case "community-users":
      return (
        <svg {...svgProps}>
          <path {...s} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle {...s} cx="9" cy="7" r="4" />
          <path {...s} d="M23 21v-2a4 4 0 00-3-3.87" />
          <path {...s} d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle {...s} cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

const MARKET_GROWTH_ROWS = [
  {
    icon: "investors",
    keyword: "Investor demand",
    points: [
      "Alternative-investment framing",
      "Rare & autographed focus",
      "Broader than hobby-only buyers",
    ],
  },
  {
    icon: "marketplaces",
    keyword: "Online liquidity",
    points: ["eBay, StockX, auctions", "Real-time pricing visibility", "National / global reach"],
  },
  {
    icon: "grading",
    keyword: "Grading & trust",
    points: ["PSA, Beckett, etc.", "Standardized condition signal", "Grade tightly linked to price"],
  },
];

const MARKET_CHALLENGE_ROWS = [
  {
    icon: "fragmented",
    keyword: "No single pane of glass",
    points: [
      "Scattered buy/sell venues",
      "No one place to compare prices",
      "Cross-marketplace performance opaque",
    ],
  },
  {
    icon: "volatile",
    keyword: "Messy price signals",
    points: ["Wide spread by platform", "Condition changes the comp", "News & player performance noise"],
  },
  {
    icon: "uncertain",
    keyword: "Hard to call upside",
    points: ["Which cards will run?", "Opaque drivers of demand", "Unpredictable short-term swings"],
  },
];

const WHY_PLATFORM_CARDS = [
  {
    id: "realtime",
    image: whyRealtimeImg,
    overline: "Real-time visibility",
    keyword: "Live prices & trends",
    body: "Latest asks and listing context, with direction over days and weeks—so you catch moves before the window closes.",
    ctaTo: "/marketplace-comparison",
  },
  {
    id: "compare",
    image: whyCompareImg,
    overline: "Cross-market context",
    keyword: "Compare the same card everywhere",
    body: "One card, many platforms—side-by-side context for clearer buy, sell, or pass decisions without juggling tabs.",
    ctaTo: "/marketplace-comparison",
  },
  {
    id: "alerts",
    image: whyAlertsImg,
    overline: "Stay ahead",
    keyword: "Smart price alerts",
    body: "Get nudges on spikes, drops, or new comps, and set targets so you can act when it matters—not after the fact.",
    ctaTo: "/alerts",
  },
  {
    id: "forecast",
    image: whyForecastImg,
    overline: "Modeling & framing",
    keyword: "Predictive signals",
    body: "Blend history with trend modeling for forward-looking ranges—not promises—so investments are easier to reason about.",
    ctaTo: "/marketplace-comparison",
  },
  {
    id: "portfolio",
    image: whyPortfolioImg,
    overline: "Your collection",
    keyword: "Portfolio in one view",
    body: "Holdings, performance snapshot, and where you’re concentrated—so gaps and risk show up at a glance.",
    ctaTo: "/marketplace-comparison",
  },
];

const WHY_CAROUSEL_AUTOPLAY_MS = 5500;

/** Feature row imagery: Unsplash License (https://unsplash.com/license). Shutterstock not used (paid license). */
const FEATURE_CARDS = [
  {
    id: "compare",
    title: "Marketplace comparison",
    summary: "Same card across major venues—fewer tabs, clearer comps.",
    bullets: [
      "Aggregate asks and sales context across listings.",
      "Side-by-side view of the same card on major venues.",
      "Less tab chaos, cleaner comp workflow.",
    ],
    image: featureCompareImg,
    to: "/marketplace-comparison",
    cta: "Open comparison",
  },
  {
    id: "analytics",
    title: "Analytics & trends",
    summary: "Trend stats, movers, and history-aware context on every card.",
    bullets: [
      "Trend stats and keyword tags on any card.",
      "Movers and listing depth on the home feed.",
      "History-aware median asks for context.",
    ],
    image: featureAnalyticsImg,
    to: "/marketplace-comparison",
    cta: "Open a card",
  },
  {
    id: "alerts",
    title: "Smart alerts",
    summary: "Price moves you define—notify when it matters.",
    bullets: [
      "Targets for spikes, drops, or new comps.",
      "Choose what should ping you first.",
      "Act while the window is still open.",
    ],
    image: featureAlertsImg,
    to: "/alerts",
    cta: "Set alerts",
  },
  {
    id: "grading",
    title: "Grading lens",
    summary: "PSA, BGS, and how grade ties to liquidity.",
    bullets: [
      "PSA, BGS, and spread between services.",
      "Raw vs slabbed framing on the same screen.",
      "See how grade ties to liquidity.",
    ],
    image: featureGradingImg,
    to: "/marketplace-comparison",
    cta: "Browse cards",
  },
  {
    id: "community",
    title: "Long-term partnership",
    summary: "Shared research and notes beyond single listings.",
    bullets: [],
    image: featureCommunityImg,
    to: "/community",
    cta: "Join community",
  },
];

/** Stock sports imagery (Unsplash License) + project assets; swap files in /assets anytime. */
const HERO_FLOATING_CARDS = [
  { src: heroSportsSpread, objectPosition: "32% 44%", key: "spread" },
  { src: heroCardStill, key: "still" },
  { src: heroCardStock1, key: "u1" },
  { src: heroCardStock2, key: "u2" },
  { src: heroCardStock3, key: "u3" },
];

export default function Dashboard() {
  const [heroHeadlineDone, setHeroHeadlineDone] = useState(false);
  const [whySlide, setWhySlide] = useState(0);
  const [whyCarouselHover, setWhyCarouselHover] = useState(false);
  const [whyReduceMotion, setWhyReduceMotion] = useState(false);
  const whyLen = WHY_PLATFORM_CARDS.length;
  const whyActive = WHY_PLATFORM_CARDS[whySlide];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setWhyReduceMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (whyReduceMotion || whyCarouselHover) return;
    const id = window.setInterval(() => {
      setWhySlide((i) => (i + 1) % whyLen);
    }, WHY_CAROUSEL_AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [whyLen, whyReduceMotion, whyCarouselHover, whySlide]);

  const featuresSectionRef = useRef(null);
  const featuresBoardRef = useRef(null);
  const featuresSpineRef = useRef(null);
  const [featuresMarkerPct, setFeaturesMarkerPct] = useState(0);
  const [featuresActivePhase, setFeaturesActivePhase] = useState(0);
  const [featuresMarkerBump, setFeaturesMarkerBump] = useState(false);
  const featuresSkipFirstBumpRef = useRef(true);
  const [featuresNodePct, setFeaturesNodePct] = useState(() =>
    FEATURE_CARDS.map((_, i) =>
      FEATURE_CARDS.length <= 1 ? 50 : (i / (FEATURE_CARDS.length - 1)) * 100,
    ),
  );
  const [featuresStackTimeline, setFeaturesStackTimeline] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const onMq = () => setFeaturesStackTimeline(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    const updateFeaturesScrollMarker = () => {
      const board = featuresBoardRef.current;
      const spine = featuresSpineRef.current;
      if (!board || !spine) return;
      const leftCells = board.querySelectorAll(".home-features__cell-left");
      if (!leftCells.length) return;

      const spineRect = spine.getBoundingClientRect();
      const centers = Array.from(leftCells).map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });

      const nodeP =
        spineRect.height > 0.5
          ? centers.map((cy) =>
              Math.max(0, Math.min(100, ((cy - spineRect.top) / spineRect.height) * 100)),
            )
          : centers.map((_, i) =>
              FEATURE_CARDS.length <= 1 ? 50 : (i / (FEATURE_CARDS.length - 1)) * 100,
            );
      setFeaturesNodePct(nodeP);

      const vh = window.innerHeight;
      const anchorY = vh * 0.36;
      const n = centers.length;

      let activeIndex = 0;
      if (n <= 1) activeIndex = 0;
      else if (anchorY < (centers[0] + centers[1]) / 2) activeIndex = 0;
      else if (anchorY >= (centers[n - 2] + centers[n - 1]) / 2) activeIndex = n - 1;
      else {
        for (let i = 1; i < n - 1; i++) {
          const low = (centers[i - 1] + centers[i]) / 2;
          const high = (centers[i] + centers[i + 1]) / 2;
          if (anchorY >= low && anchorY < high) {
            activeIndex = i;
            break;
          }
        }
      }

      setFeaturesActivePhase(activeIndex);
      setFeaturesMarkerPct(nodeP[activeIndex] ?? 0);
    };

    updateFeaturesScrollMarker();
    window.addEventListener("scroll", updateFeaturesScrollMarker, { passive: true });
    window.addEventListener("resize", updateFeaturesScrollMarker);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFeaturesScrollMarker) : null;
    if (ro) {
      if (featuresBoardRef.current) ro.observe(featuresBoardRef.current);
      if (featuresSectionRef.current) ro.observe(featuresSectionRef.current);
    }
    return () => {
      window.removeEventListener("scroll", updateFeaturesScrollMarker);
      window.removeEventListener("resize", updateFeaturesScrollMarker);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }, [featuresStackTimeline]);

  useEffect(() => {
    if (featuresSkipFirstBumpRef.current) {
      featuresSkipFirstBumpRef.current = false;
      return;
    }
    setFeaturesMarkerBump(true);
    const t = window.setTimeout(() => setFeaturesMarkerBump(false), 420);
    return () => window.clearTimeout(t);
  }, [featuresActivePhase]);

  return (
    <>
      <PageHelmet
        isHome
        title="Sports Card Analytics"
        description="Compare sports card prices across marketplaces. Analytics, alerts, grading insights, and community — powered by Nixsor."
      />
      <section
        className="home-hero home-hero--visual"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(8, 28, 48, 0.94) 0%, rgba(10, 40, 66, 0.82) 42%, rgba(5, 10, 18, 0.58) 100%), url(${heroPlatformImg})`,
        }}
      >
        <div className="home-hero-decor" aria-hidden>
          <div className="home-hero-decor__grid" />
          <svg
            className="home-hero-trend"
            viewBox={`0 0 ${CHART_VIEW.w} ${CHART_VIEW.h}`}
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="home-hero-trend__candles">
              {HERO_CANDLE_OHLC.map((d, i) => {
                const n = HERO_CANDLE_OHLC.length;
                const span = CHART_VIEW.w - 2 * CHART_VIEW.padX;
                const cx = CHART_VIEW.padX + (i * (span / (n - 1)));
                const bw = 11;
                const yO = heroCandleY(d.o);
                const yH = heroCandleY(d.h);
                const yL = heroCandleY(d.l);
                const yC = heroCandleY(d.c);
                const bodyTop = Math.min(yO, yC);
                const bodyH = Math.max(1.6, Math.abs(yC - yO) || 1.6);
                const bull = d.c >= d.o;
                const fill = bull ? "#02c076" : "#f84960";
                return (
                  <g
                    key={`c-${i}`}
                    className="home-hero-candle"
                    style={{ animationDelay: `${0.03 + i * 0.038}s` }}
                  >
                    <line
                      x1={cx}
                      x2={cx}
                      y1={yH}
                      y2={yL}
                      stroke={fill}
                      strokeWidth="1.65"
                      strokeLinecap="round"
                      opacity="0.95"
                    />
                    <rect
                      x={cx - bw / 2}
                      y={bodyTop}
                      width={bw}
                      height={bodyH}
                      fill={fill}
                      rx="1.1"
                      ry="1.1"
                    />
                  </g>
                );
              })}
            </g>
          </svg>
          {HERO_FLOATING_CARDS.map((card, index) => (
            <div
              key={card.key}
              className={`home-hero-card home-hero-card--${index}`}
              aria-hidden
            >
              <img
                src={card.src}
                alt=""
                className="home-hero-card__img"
                {...(card.objectPosition
                  ? { style: { objectPosition: card.objectPosition } }
                  : {})}
                loading="eager"
                decoding="async"
              />
            </div>
          ))}
        </div>
        <div className="home-hero-inner">
          <HeroHeadlineTypewriter onTypingComplete={() => setHeroHeadlineDone(true)} />
          <div
            className={`home-hero-ctas${heroHeadlineDone ? " home-hero-ctas--visible" : ""}`}
          >
            <Link className="hero-btn hero-btn--solid" to="/marketplace-comparison">
              <span className="hero-btn__label">Get Started</span>
            </Link>
            <a className="hero-btn hero-btn--outline" href="#market-state">
              <span className="hero-btn__label">Learn More</span>
            </a>
          </div>
        </div>
        <HeroSourceImageFlow />
      </section>

      <section id="market-state" className="home-market-state">
        <h2>Current sports card market state</h2>
        <p className="muted home-market-state__lead">
          Market snapshot — what&apos;s helping adoption, and what still breaks workflows for
          collectors and investors.
        </p>

        <div className="home-market-state__group">
          <header className="home-market-state__group-head">
            <span className="home-market-state__group-icon" aria-hidden>
              <MarketStateIcon name="column-growth" />
            </span>
            <div className="home-market-state__group-titles">
              <span className="home-market-state__group-kicker">Tailwinds</span>
              <h3 className="home-market-state__group-title">What&apos;s fueling the market</h3>
              <p className="home-market-state__group-sub muted">3 market drivers</p>
            </div>
          </header>
          <div className="home-market-state__cards">
            {MARKET_GROWTH_ROWS.map((row) => (
              <article key={row.icon} className="home-market-state__card home-market-state__card--tailwind">
                <h4 className="home-market-state__card-keyword">{row.keyword}</h4>
                <span className="home-market-state__card-icon" aria-hidden>
                  <MarketStateIcon name={row.icon} />
                </span>
                <ul className="home-market-state__card-points">
                  {row.points.map((pt, j) => (
                    <li key={`${row.icon}-p-${j}`}>{pt}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <p className="home-market-state__bridge">
          Despite the growth, the market faces several challenges:
        </p>

        <div className="home-market-state__group">
          <header className="home-market-state__group-head">
            <span className="home-market-state__group-icon home-market-state__group-icon--caution" aria-hidden>
              <MarketStateIcon name="column-challenges" />
            </span>
            <div className="home-market-state__group-titles">
              <span className="home-market-state__group-kicker home-market-state__group-kicker--caution">
                Headwinds
              </span>
              <h3 className="home-market-state__group-title">Where collectors still struggle</h3>
              <p className="home-market-state__group-sub muted">3 common pain points</p>
            </div>
          </header>
          <div className="home-market-state__cards">
            {MARKET_CHALLENGE_ROWS.map((row) => (
              <article key={row.icon} className="home-market-state__card home-market-state__card--headwind">
                <h4 className="home-market-state__card-keyword">{row.keyword}</h4>
                <span className="home-market-state__card-icon home-market-state__card-icon--caution" aria-hidden>
                  <MarketStateIcon name={row.icon} />
                </span>
                <ul className="home-market-state__card-points">
                  {row.points.map((pt, j) => (
                    <li key={`${row.icon}-p-${j}`}>{pt}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why-platform" className="home-why-platform" aria-labelledby="why-platform-heading">
        <h2 id="why-platform-heading">Why Do We Need This Platform?</h2>
        <p className="muted home-why-platform__lead">
          Visibility • comparison • speed • modeling • portfolio — without the wall of text.
        </p>

        <div
          className="home-why-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Why this platform"
          onMouseEnter={() => setWhyCarouselHover(true)}
          onMouseLeave={() => setWhyCarouselHover(false)}
        >
          <div className="home-why-carousel__banner" aria-live="polite">
            <div className="home-why-carousel__media">
              <img
                key={whyActive.id}
                src={whyActive.image}
                alt=""
                className="home-why-carousel__img"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="home-why-carousel__panel">
              <div key={whyActive.id} className="home-why-carousel__panel-inner">
                <p className="anim-line home-why-carousel__overline">{whyActive.overline}</p>
                <h3 className="anim-line anim-line--delay-1 home-why-carousel__title">{whyActive.keyword}</h3>
                <p className="anim-line anim-line--delay-2 home-why-carousel__body">{whyActive.body}</p>
                <Link
                  className="anim-line anim-line--delay-3 home-why-carousel__cta"
                  to={whyActive.ctaTo}
                >
                  Learn more
                  <span className="home-why-carousel__cta-chev" aria-hidden>
                    ›
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <nav className="home-why-carousel__nav" aria-label="Carousel slides">
            <button
              type="button"
              className="home-why-carousel__arrow"
              aria-label="Previous slide"
              onClick={() => setWhySlide((i) => (i - 1 + whyLen) % whyLen)}
            >
              ‹
            </button>
            <div className="home-why-carousel__steps">
              {WHY_PLATFORM_CARDS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  className={`home-why-carousel__step${i === whySlide ? " is-active" : ""}`}
                  aria-label={`Slide ${i + 1}: ${item.keyword}`}
                  aria-current={i === whySlide ? "true" : undefined}
                  onClick={() => setWhySlide(i)}
                >
                  {String(i + 1).padStart(2, "0")}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="home-why-carousel__arrow"
              aria-label="Next slide"
              onClick={() => setWhySlide((i) => (i + 1) % whyLen)}
            >
              ›
            </button>
          </nav>
        </div>
      </section>

      <section
        id="features"
        ref={featuresSectionRef}
        className="home-features"
        aria-labelledby="features-heading"
      >
        <div className="home-features__shell home-features__shell--timeline">
          <header className="home-features__intro home-features__intro--centered">
            <h2 id="features-heading" className="home-features__heading">
              Why this platform: from browse to conviction
            </h2>
            <p className="home-features__dek">
              Compare listings, read the tape, set alerts, respect grading—and stay plugged in with
              peers. Scroll to follow your place on the path.
            </p>
          </header>

          <div
            ref={featuresBoardRef}
            className={`home-features__timeline-board${featuresStackTimeline ? " is-stacked" : ""}`}
          >
            <div
              className="home-features__timeline-grid"
              style={{
                gridTemplateRows: `repeat(${
                  featuresStackTimeline ? FEATURE_CARDS.length * 2 : FEATURE_CARDS.length
                }, auto)`,
              }}
            >
              <div
                ref={featuresSpineRef}
                className={`home-features__cell-spine${featuresStackTimeline ? " is-mobile-hidden" : ""}`}
                style={{ gridColumn: 2, gridRow: "1 / -1" }}
                aria-hidden
              >
                <span className="home-features__rail-line" />
                {featuresNodePct.map((pct, ni) => (
                  <span
                    key={`node-${FEATURE_CARDS[ni].id}`}
                    className={`home-features__rail-node${ni === featuresActivePhase ? " is-active" : ""}`}
                    style={{ top: `${pct}%` }}
                  />
                ))}
                <span className="home-features__rail-endcap" />
                <span
                  className={`home-features__scroll-marker${featuresMarkerBump ? " is-bump" : ""}`}
                  style={{ top: `${featuresMarkerPct}%` }}
                />
              </div>

              {FEATURE_CARDS.flatMap((item, i) => [
                <div
                  key={`L-${item.id}`}
                  className={`home-features__cell-left${i === featuresActivePhase ? " is-active-phase" : ""}`}
                  style={{
                    gridColumn: 1,
                    gridRow: featuresStackTimeline ? 2 * i + 1 : i + 1,
                  }}
                >
                  <Link
                    to={item.to}
                    className="home-features__phase-disc"
                    aria-label={`Platform step ${i + 1}: ${item.title}`}
                  >
                    <div className="home-features__phase-img">
                      <img
                        src={item.image}
                        alt=""
                        width={220}
                        height={220}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="home-features__phase-label" aria-hidden>
                      <span className="home-features__phase-kicker">Platform</span>
                      <span className="home-features__phase-num">{i + 1}</span>
                    </div>
                  </Link>
                </div>,
                <div
                  key={`R-${item.id}`}
                  className={`home-features__cell-right${i === featuresActivePhase ? " is-active-phase" : ""}`}
                  style={{
                    gridColumn: featuresStackTimeline ? 1 : 3,
                    gridRow: featuresStackTimeline ? 2 * i + 2 : i + 1,
                  }}
                >
                  <div className="home-features__phase-copy">
                    <Link to={item.to} className="home-features__phase-title-link">
                      <h3 className="home-features__phase-title">{item.title}</h3>
                    </Link>
                    {item.bullets.length > 0 ? (
                      <ul className="home-features__phase-list">
                        {item.bullets.map((b, j) => (
                          <li key={`${item.id}-b-${j}`}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="home-features__phase-solo">{item.summary}</p>
                    )}
                    <Link className="home-features__phase-cta" to={item.to}>
                      {item.cta}
                      <span className="home-features__phase-cta-chev" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </div>
                </div>,
              ])}
            </div>
          </div>

          <p className="home-features__photo-credit">
            Stock photos from{" "}
            <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">
              Unsplash
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
