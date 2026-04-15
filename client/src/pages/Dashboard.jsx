import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import CookieConsentBanner from "../components/CookieConsentBanner.jsx";
import HeroHeadlineTypewriter from "../components/HeroHeadlineTypewriter.jsx";
import HeroSourceImageFlow from "../components/HeroSourceImageFlow.jsx";
import heroPlatformImg from "../assets/hero-platform.png";
import heroSportsSpread from "../assets/sports-cards.jpg";
import heroCardStock1 from "../assets/hero-card-01.jpg";
import heroCardStock2 from "../assets/hero-card-02.jpg";
import heroCardStock3 from "../assets/hero-card-03.jpg";
import heroCardStill from "../assets/hero-sports-card-ref.png";
import communityTeamImg from "../assets/community-team.jpg";
import whyRealtimeImg from "../assets/why-realtime.png";
import whyCompareImg from "../assets/why-compare.png";
import whyAlertsImg from "../assets/why-alerts.png";
import whyForecastImg from "../assets/why-forecast.png";
import whyPortfolioImg from "../assets/why-portfolio.png";
import LoadingHubMark from "../components/LoadingHubMark.jsx";
import featureCompareImg from "../assets/features/feature-compare.jpg";
import featureAnalyticsImg from "../assets/features/feature-analytics.jpg";
import featureAlertsImg from "../assets/features/feature-alerts.jpg";
import featureGradingImg from "../assets/features/feature-grading.jpg";
import featureCommunityImg from "../assets/features/feature-community.jpg";
import featureResearchImg from "../assets/features/feature-research.jpg";

const WHY_IMAGE_BY_ID = {
  realtime: whyRealtimeImg,
  compare: whyCompareImg,
  alerts: whyAlertsImg,
  forecast: whyForecastImg,
  portfolio: whyPortfolioImg,
};

const FEATURE_IMAGE_BY_ID = {
  compare: featureCompareImg,
  analytics: featureAnalyticsImg,
  alerts: featureAlertsImg,
  grading: featureGradingImg,
  community: featureCommunityImg,
};

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

const WHY_CAROUSEL_AUTOPLAY_MS = 5500;

/** Stock sports imagery (Unsplash License) + project assets; swap files in /assets anytime. */
const HERO_FLOATING_CARDS = [
  { src: heroSportsSpread, objectPosition: "32% 44%", key: "spread" },
  { src: heroCardStill, key: "still" },
  { src: heroCardStock1, key: "u1" },
  { src: heroCardStock2, key: "u2" },
  { src: heroCardStock3, key: "u3" },
];

export default function Dashboard() {
  const { t, tx, locale } = useLanguage();
  const [heroHeadlineDone, setHeroHeadlineDone] = useState(false);
  const [whySlide, setWhySlide] = useState(0);
  const [whyCarouselHover, setWhyCarouselHover] = useState(false);
  const [whyReduceMotion, setWhyReduceMotion] = useState(false);
  const careersFallbacks = useMemo(
    () => [communityTeamImg, heroCardStock2, heroSportsSpread],
    [],
  );

  const marketGrowthRows = tx("dashboard.MARKET_GROWTH_ROWS") ?? [];
  const marketChallengeRows = tx("dashboard.MARKET_CHALLENGE_ROWS") ?? [];

  const whyPlatformCards = useMemo(() => {
    const rows = tx("dashboard.WHY_PLATFORM_CARDS");
    if (!Array.isArray(rows)) return [];
    return rows
      .map((c) => ({ ...c, image: WHY_IMAGE_BY_ID[c.id] }))
      .filter((c) => c.image);
  }, [tx, locale]);

  const featureCards = useMemo(() => {
    const rows = tx("dashboard.FEATURE_CARDS");
    if (!Array.isArray(rows)) return [];
    return rows
      .map((c) => ({ ...c, image: FEATURE_IMAGE_BY_ID[c.id] }))
      .filter((c) => c.image);
  }, [tx, locale]);

  const defaultFeatureNodePct = useMemo(
    () =>
      featureCards.map((_, i) =>
        featureCards.length <= 1 ? 50 : (i / (featureCards.length - 1)) * 100,
      ),
    [featureCards],
  );

  const whyLen = Math.max(1, whyPlatformCards.length);
  const whyActive = whyPlatformCards[whySlide] ?? whyPlatformCards[0];

  useEffect(() => {
    setHeroHeadlineDone(false);
  }, [locale]);

  useEffect(() => {
    setWhySlide((s) => Math.min(s, Math.max(0, whyPlatformCards.length - 1)));
  }, [whyPlatformCards.length]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setWhyReduceMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (whyReduceMotion || whyCarouselHover || whyPlatformCards.length < 1) return;
    const id = window.setInterval(() => {
      setWhySlide((i) => (i + 1) % whyLen);
    }, WHY_CAROUSEL_AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [whyLen, whyReduceMotion, whyCarouselHover, whySlide, whyPlatformCards.length]);

  const featuresSectionRef = useRef(null);
  const featuresBoardRef = useRef(null);
  const featuresSpineRef = useRef(null);
  const [featuresMarkerPct, setFeaturesMarkerPct] = useState(0);
  const [featuresActivePhase, setFeaturesActivePhase] = useState(0);
  const [featuresMarkerBump, setFeaturesMarkerBump] = useState(false);
  const featuresSkipFirstBumpRef = useRef(true);
  const [featuresNodePct, setFeaturesNodePct] = useState(defaultFeatureNodePct);

  useEffect(() => {
    setFeaturesNodePct(defaultFeatureNodePct);
  }, [defaultFeatureNodePct]);

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
              featureCards.length <= 1 ? 50 : (i / (featureCards.length - 1)) * 100,
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
  }, [featureCards.length]);

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
      <PageHelmet isHome title={t("dashboard.helmetTitle")} description={t("dashboard.helmetDescription")} />
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
          <HeroHeadlineTypewriter
            titleLine1={t("dashboard.hero.l1")}
            titleLine2={t("dashboard.hero.l2")}
            subtitle={t("dashboard.hero.sub")}
            onTypingComplete={() => setHeroHeadlineDone(true)}
          />
          <div
            className={`home-hero-ctas${heroHeadlineDone ? " home-hero-ctas--visible" : ""}`}
          >
            <Link className="hero-btn hero-btn--solid" to="/marketplace">
              <span className="hero-btn__label">{t("dashboard.hero.getStarted")}</span>
            </Link>
            <a className="hero-btn hero-btn--outline" href="#market-state">
              <span className="hero-btn__label">{t("dashboard.hero.learnMore")}</span>
            </a>
          </div>
          <p className={`home-hero-sublink${heroHeadlineDone ? " home-hero-sublink--visible" : ""}`}>
            <a href="#about-us">{t("dashboard.hero.exploreLink")}</a>
          </p>
        </div>
        <HeroSourceImageFlow />
      </section>

      <section id="market-state" className="home-market-state">
        <h2>{t("dashboard.marketStateTitle")}</h2>
        <p className="muted home-market-state__lead">{t("dashboard.marketStateLead")}</p>

        <div className="home-market-state__group">
          <header className="home-market-state__group-head">
            <span className="home-market-state__group-icon" aria-hidden>
              <MarketStateIcon name="column-growth" />
            </span>
            <div className="home-market-state__group-titles">
              <span className="home-market-state__group-kicker">{t("dashboard.tailwindsKicker")}</span>
              <h3 className="home-market-state__group-title">{t("dashboard.tailwindsTitle")}</h3>
              <p className="home-market-state__group-sub muted">{t("dashboard.tailwindsSub")}</p>
            </div>
          </header>
          <div className="home-market-state__cards">
            {marketGrowthRows.map((row) => (
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

        <p className="home-market-state__bridge">{t("dashboard.bridge")}</p>

        <div className="home-market-state__group">
          <header className="home-market-state__group-head">
            <span className="home-market-state__group-icon home-market-state__group-icon--caution" aria-hidden>
              <MarketStateIcon name="column-challenges" />
            </span>
            <div className="home-market-state__group-titles">
              <span className="home-market-state__group-kicker home-market-state__group-kicker--caution">
                {t("dashboard.headwindsKicker")}
              </span>
              <h3 className="home-market-state__group-title">{t("dashboard.headwindsTitle")}</h3>
              <p className="home-market-state__group-sub muted">{t("dashboard.headwindsSub")}</p>
            </div>
          </header>
          <div className="home-market-state__cards">
            {marketChallengeRows.map((row) => (
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
        <h2 id="why-platform-heading">{t("dashboard.whySectionTitle")}</h2>
        <p className="muted home-why-platform__lead">{t("dashboard.whySectionLead")}</p>

        <div
          className="home-why-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label={t("dashboard.whyCarouselAria")}
          onMouseEnter={() => setWhyCarouselHover(true)}
          onMouseLeave={() => setWhyCarouselHover(false)}
        >
          {whyActive ? (
            <div className="home-why-carousel__shell" aria-live="polite">
              <div className="home-why-carousel__card">
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
                <div
                  key={whyActive.id}
                  className="home-why-carousel__panel"
                  aria-describedby={`why-slide-${whyActive.id}-desc`}
                >
                  <p className="anim-line home-why-carousel__overline">{whyActive.overline}</p>
                  <h3 className="anim-line anim-line--delay-1 home-why-carousel__title">{whyActive.keyword}</h3>
                  <p id={`why-slide-${whyActive.id}-desc`} className="sr-only">
                    {whyActive.body}
                  </p>
                  <ul className="anim-line anim-line--delay-2 home-why-carousel__tags" aria-label={t("dashboard.whyHighlights")}>
                    {whyActive.tags.map((tag) => (
                      <li key={tag} className="home-why-carousel__tag">
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="anim-line anim-line--delay-3 home-why-carousel__cta"
                    to={whyActive.ctaTo}
                  >
                    {t("dashboard.whyLearnMore")}
                    <span className="home-why-carousel__cta-chev" aria-hidden>
                      ›
                    </span>
                  </Link>
                </div>
              </div>

              <nav className="home-why-carousel__nav" aria-label={t("dashboard.whySlidesNav")}>
                <button
                  type="button"
                  className="home-why-carousel__arrow"
                  aria-label={t("dashboard.whyPrevSlide")}
                  onClick={() => setWhySlide((i) => (i - 1 + whyLen) % whyLen)}
                >
                  ‹
                </button>
                <div className="home-why-carousel__steps" role="tablist" aria-label={t("dashboard.whySlidesNav")}>
                  {whyPlatformCards.map((card, i) => (
                    <button
                      key={`step-${card.id}`}
                      type="button"
                      role="tab"
                      aria-selected={i === whySlide}
                      aria-label={t("dashboard.whySlideStepAria", {
                        index: String(i + 1).padStart(2, "0"),
                        keyword: card.keyword,
                      })}
                      className={`home-why-carousel__step${i === whySlide ? " is-active" : ""}`}
                      onClick={() => setWhySlide(i)}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="home-why-carousel__arrow"
                  aria-label={t("dashboard.whyNextSlide")}
                  onClick={() => setWhySlide((i) => (i + 1) % whyLen)}
                >
                  ›
                </button>
              </nav>
            </div>
          ) : null}
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
              {t("dashboard.featuresHeading")}
            </h2>
            <p className="home-features__dek">{t("dashboard.featuresDek")}</p>
          </header>

          <div
            ref={featuresBoardRef}
            className={`home-features__timeline-board${featuresStackTimeline ? " is-stacked" : ""}`}
          >
            <div
              className="home-features__timeline-grid"
              style={{
                gridTemplateRows: `repeat(${
                  featuresStackTimeline ? featureCards.length * 2 : featureCards.length
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
                    key={`node-${featureCards[ni]?.id ?? ni}`}
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

              {featureCards.flatMap((item, i) => [
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
                    aria-label={t("dashboard.featuresPhaseAria", { step: i + 1, title: item.title })}
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
                      <span className="home-features__phase-kicker">{t("dashboard.featuresPlatformKicker")}</span>
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
            {t("dashboard.featuresPhotoCreditPrefix")}{" "}
            <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">
              Unsplash
            </a>
            {t("dashboard.featuresPhotoCreditSuffix")}
          </p>
        </div>
      </section>

      <section id="about-us" className="home-about-split" aria-labelledby="home-about-split-heading">
        <div className="home-about-split__label-row" aria-hidden>
          <span className="home-about-split__label-text">About us</span>
          <LoadingHubMark className="home-about-split__label-mark" />
        </div>
        <div className="home-about-split__inner">
          <div className="home-about-split__copy">
            <h2 id="home-about-split-heading" className="home-about-split__title">
              We developed a Sports Card Analytics System
            </h2>
            <p className="home-about-split__lead">
              Sports Card Analytics brings marketplace comparison, price movement tracking, and signal-style context into one clean workflow. Monitor supply and demand shifts, validate comps faster, and surface trend cues without bouncing between tabs or spreadsheets.
            </p>

            <div className="home-about-split__contact" aria-label="Contact information">
              <div className="home-about-split__contact-item">
                <span className="home-about-split__contact-ico" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 22s7-4.4 7-11a7 7 0 10-14 0c0 6.6 7 11 7 11z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                <address className="home-about-split__contact-v home-about-split__contact-address">
                  1095 E. Salter Drive
                  <br />
                  Phoenix, AZ 85024
                </address>
              </div>
              <div className="home-about-split__contact-item">
                <span className="home-about-split__contact-ico" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6.6 10.8c1.6 3.2 3.4 5 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.6.6 3.9.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h2.9c.6 0 1 .4 1 1 0 1.3.2 2.7.6 3.9.1.4 0 .8-.3 1.1l-2.2 2.2z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <a className="home-about-split__contact-link home-about-split__contact-v" href="tel:+16025550197">
                  +1 (602) 555-0197
                </a>
              </div>
              <div className="home-about-split__contact-item">
                <span className="home-about-split__contact-ico" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M22 8l-10 7L2 8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <a className="home-about-split__contact-link home-about-split__contact-v" href="mailto:support@nixsora.com">
                  support@nixsora.com
                </a>
              </div>
              <div className="home-about-split__contact-item">
                <span className="home-about-split__contact-ico" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <Link className="home-about-split__contact-link home-about-split__contact-v" to="/contact">
                  Open contact page →
                </Link>
              </div>
            </div>
          </div>

          <div className="home-about-split__media" aria-hidden>
            <img className="home-about-split__img" src={communityTeamImg} alt="" decoding="async" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="home-culture" aria-labelledby="home-culture-heading">
        <header className="home-culture__head">
          <p className="home-culture__eyebrow">Our company culture</p>
          <h2 id="home-culture-heading" className="home-culture__brand">
            NIXSORA
          </h2>
          <p className="home-culture__subtitle">Our Core Values</p>
          <p className="home-culture__lead">
            These values shape our way of working and guide every decision we make as we build smarter analytics for the sports card community.
          </p>
        </header>

        <div className="home-culture__grid" role="list">
          <article className="home-culture__card" role="listitem">
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="home-culture__letter">N</div>
            <h3 className="home-culture__title">Navigating Insightfully</h3>
            <p className="home-culture__body">
              We turn complex market data into clear, actionable insights—so decisions feel confident, not confusing.
            </p>
          </article>

          <article className="home-culture__card" role="listitem">
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0012 2z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="home-culture__letter">I</div>
            <h3 className="home-culture__title">Innovation First</h3>
            <p className="home-culture__body">
              We continuously improve and evolve—building smarter tools that stay ahead of market shifts.
            </p>
          </article>

          <article className="home-culture__card" role="listitem">
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 5h16v12H4z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M9 9h6M9 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="home-culture__letter">X</div>
            <h3 className="home-culture__title">eXperience Matters</h3>
            <p className="home-culture__body">
              We design clean, intuitive workflows that reduce friction and simplify decision-making.
            </p>
          </article>

          <article className="home-culture__card" role="listitem">
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a9 9 0 109 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="home-culture__letter">S</div>
            <h3 className="home-culture__title">Smart Efficiency</h3>
            <p className="home-culture__body">
              We streamline the process so you can compare, track, and act faster—without switching tools.
            </p>
          </article>

          <article className="home-culture__card" role="listitem">
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l3 7 7 .6-5.3 5.1 1.5 7.3L12 18l-6.2 3.8 1.5-7.3L2 9.6 9 9l3-7z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div className="home-culture__letter">O</div>
            <h3 className="home-culture__title">Outcome Driven</h3>
            <p className="home-culture__body">
              We focus on measurable impact—delivering insights that lead to better actions and results.
            </p>
          </article>

          <article className="home-culture__card" role="listitem">
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <div className="home-culture__letter">R</div>
            <h3 className="home-culture__title">Reliability &amp; Trust</h3>
            <p className="home-culture__body">
              We prioritize accuracy and consistency—earning trust through dependable data and systems.
            </p>
          </article>

          <article className="home-culture__card" role="listitem">
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 19V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 15l3-3 3 2 4-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="home-culture__letter">A</div>
            <h3 className="home-culture__title">Analytics with Purpose</h3>
            <p className="home-culture__body">
              We build signals that matter—helping the community make smarter, more informed moves.
            </p>
          </article>

          <a
            className="home-culture__card home-culture__card--opportunity"
            role="listitem"
            href="/careers"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Opportunity — open careers page in a new tab"
          >
            <div className="home-culture__icon" aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21s7-4.4 7-11a7 7 0 10-14 0c0 6.6 7 11 7 11z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M10 11l1.6 1.6L15.5 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="home-culture__title">Opportunity</h3>
            <p className="home-culture__body">
              Choose your path: move fast on your own, or partner with our team to validate comps and build confidence.
            </p>
          </a>
        </div>
      </section>

      <section className="home-culture-work" aria-labelledby="home-culture-work-heading">
        <div className="home-culture-work__copy">
          <p className="home-culture-work__kicker">How we work</p>
          <h2 id="home-culture-work-heading" className="home-culture-work__title">
            A focused team that ships with clarity
          </h2>
          <ul className="home-culture-work__list">
            <li>
              <span className="home-culture-work__check" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8.5 12.2l2.2 2.2 5.1-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              We prioritize signal over noise—data that actually changes decisions.
            </li>
            <li>
              <span className="home-culture-work__check" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8.5 12.2l2.2 2.2 5.1-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              We collaborate in small loops to move faster without breaking quality.
            </li>
            <li>
              <span className="home-culture-work__check" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8.5 12.2l2.2 2.2 5.1-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              We design for collectors first: fewer clicks, cleaner context, clearer outcomes.
            </li>
            <li>
              <span className="home-culture-work__check" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8.5 12.2l2.2 2.2 5.1-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              We document assumptions so insights stay consistent across the product.
            </li>
            <li>
              <span className="home-culture-work__check" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8.5 12.2l2.2 2.2 5.1-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              We care about trust: accuracy, reproducibility, and transparent sources.
            </li>
          </ul>
        </div>

        <div className="home-culture-work__media" aria-hidden>
          <div className="home-culture-work__media-shell">
            <img className="home-culture-work__img" src={communityTeamImg} alt="" decoding="async" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="home-careers-banner" aria-labelledby="home-careers-banner-heading">
        <div className="home-careers-banner__content">
          <p className="home-careers-banner__eyebrow">Careers</p>
          <h2 id="home-careers-banner-heading" className="home-careers-banner__title">
            Build with NIXSORA
          </h2>
          <p className="home-careers-banner__lead muted">
            If you’re excited about sports card analytics, product design, and clean workflows—let’s talk.
          </p>
          <div className="home-careers-banner__ctas" aria-label="Careers actions">
            <a
              className="home-about__cta home-about__cta--primary"
              href="/careers"
              target="_blank"
              rel="noopener noreferrer"
            >
              View careers →
            </a>
          </div>
        </div>

        <div className="home-careers-banner__media" aria-hidden>
          <div className="home-careers-banner__media-grid">
            <img
              className="home-careers-banner__media-img"
              src="/careers/DSC07538.webp"
              alt=""
              loading="lazy"
              decoding="async"
              onError={(ev) => {
                ev.currentTarget.onerror = null;
                ev.currentTarget.src = careersFallbacks[0];
              }}
            />
            <img
              className="home-careers-banner__media-img"
              src="/careers/DSC07577.webp"
              alt=""
              loading="lazy"
              decoding="async"
              onError={(ev) => {
                ev.currentTarget.onerror = null;
                ev.currentTarget.src = careersFallbacks[1];
              }}
            />
            <img
              className="home-careers-banner__media-img"
              src="/careers/DSC07642.webp"
              alt=""
              loading="lazy"
              decoding="async"
              onError={(ev) => {
                ev.currentTarget.onerror = null;
                ev.currentTarget.src = careersFallbacks[2];
              }}
            />
          </div>
          <svg className="home-careers-banner__wave" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M0,40 C180,80 360,80 600,40 C840,0 1020,0 1200,40 L1200,120 L0,120 Z"
              fill="rgba(8, 28, 48, 0.92)"
            />
          </svg>
        </div>
      </section>

      <CookieConsentBanner />
    </>
  );
}
