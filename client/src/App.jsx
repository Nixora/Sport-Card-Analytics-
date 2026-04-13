import { lazy, Suspense, useLayoutEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import PageRouteFallback from "./components/PageRouteFallback.jsx";
import Dashboard from "./pages/Dashboard.jsx";

const Cards = lazy(() => import("./pages/Cards.jsx"));
const CardDetail = lazy(() => import("./pages/CardDetail.jsx"));
const Alerts = lazy(() => import("./pages/Alerts.jsx"));
const Community = lazy(() => import("./pages/Community.jsx"));
const CommunityNew = lazy(() => import("./pages/CommunityNew.jsx"));
const Premium = lazy(() => import("./pages/Premium.jsx"));
const Sellers = lazy(() => import("./pages/Sellers.jsx"));
const SellerProfile = lazy(() => import("./pages/SellerProfile.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const FAQ = lazy(() => import("./pages/FAQ.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

function RedirectAnalyticsToCard() {
  const { cardKey } = useParams();
  return <Navigate to={`/cards/${encodeURIComponent(cardKey)}`} replace />;
}

export default function App() {
  const layoutRef = useRef(null);
  const headerRef = useRef(null);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const header = headerRef.current;
    if (!layout || !header) return;
    const syncHeaderHeight = () => {
      layout.style.setProperty("--site-header-height", `${header.offsetHeight}px`);
    };
    syncHeaderHeight();
    const ro = new ResizeObserver(syncHeaderHeight);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const normalizedPath =
    pathname === "/cards" ? "/marketplace" : pathname;
  const showBodyPath = normalizedPath !== "/";
  let bodyPathLabel = "";
  if (normalizedPath.startsWith("/cards/")) {
    const cardKey = decodeURIComponent(normalizedPath.replace("/cards/", ""));
    bodyPathLabel = `home / marketplace / ${cardKey}`;
  } else if (normalizedPath.startsWith("/analytics/")) {
    const cardKey = decodeURIComponent(normalizedPath.replace("/analytics/", ""));
    bodyPathLabel = `home / marketplace / ${cardKey}`;
  } else if (normalizedPath === "/community/new") {
    bodyPathLabel = "home / community / new";
  } else if (normalizedPath.startsWith("/community/") && normalizedPath !== "/community") {
    const tail = decodeURIComponent(normalizedPath.replace(/^\/community\//, ""));
    bodyPathLabel = `home / community / ${tail}`;
  } else if (normalizedPath.startsWith("/u/")) {
    const slug = decodeURIComponent(normalizedPath.replace(/^\/u\//, ""));
    bodyPathLabel = `home / profile / ${slug}`;
  } else {
    bodyPathLabel = `home / ${normalizedPath.replace(/^\//, "")}`;
  }

  const marketplaceListRoute = normalizedPath === "/marketplace";
  const communityShellRoute =
    normalizedPath === "/community" ||
    normalizedPath === "/community/new" ||
    normalizedPath.startsWith("/community/");
  const privacyShellRoute =
    normalizedPath === "/privacy-policy" ||
    normalizedPath === "/contact" ||
    normalizedPath === "/faq";

  return (
    <div ref={layoutRef} className="layout">
      <SiteHeader ref={headerRef} />
      <main className={`site-main${isHome ? " site-main--home" : ""}`} id="main-content">
        <div
          className={`content-shell${marketplaceListRoute ? " content-shell--marketplace" : ""}${communityShellRoute ? " content-shell--community" : ""}${privacyShellRoute ? " content-shell--privacy" : ""}`}
        >
          {showBodyPath && <p className="body-path-label">{bodyPathLabel}</p>}
          <Suspense fallback={<PageRouteFallback />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/marketplace" element={<Cards />} />
              <Route path="/marketplace-comparison" element={<Navigate to="/marketplace" replace />} />
              <Route path="/cards" element={<Navigate to="/marketplace" replace />} />
              <Route path="/cards/:cardKey" element={<CardDetail />} />
              <Route path="/analytics" element={<Navigate to="/marketplace" replace />} />
              <Route path="/analytics/:cardKey" element={<RedirectAnalyticsToCard />} />
              <Route path="/comparison-alert" element={<Alerts />} />
              <Route path="/alerts" element={<Navigate to="/comparison-alert" replace />} />
              <Route path="/seller-analysis" element={<Sellers />} />
              <Route path="/sellers/:sellerUsername" element={<SellerProfile />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/community/new" element={<CommunityNew />} />
              <Route path="/community/:articleId" element={<Community />} />
              <Route path="/community" element={<Community />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/u/:displayName" element={<Profile />} />
              <Route path="/sign-in" element={<Navigate to="/" replace />} />
              <Route path="/sign-up" element={<Navigate to="/" replace />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
