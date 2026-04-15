import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import PageRouteFallback from "./components/PageRouteFallback.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { useAuth } from "./context/AuthContext.jsx";

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
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Careers = lazy(() => import("./pages/Careers.jsx"));
const Faq = lazy(() => import("./pages/FAQ.jsx"));
const Product = lazy(() => import("./pages/Product.jsx"));

function RedirectAnalyticsToCard() {
  const { cardKey } = useParams();
  return <Navigate to={`/cards/${encodeURIComponent(cardKey)}`} replace />;
}

function BreadcrumbNav({ items }) {
  return (
    <nav className="body-path-label" aria-label="Breadcrumb">
      {items.map((it, idx) => (
        <span key={`${it.to}-${idx}`} className="body-path-label__item">
          <Link className="body-path-label__link" to={it.to}>
            {idx === 0 ? (
              <span className="body-path-label__home" aria-label="Home">
                <svg
                  className="body-path-label__home-ico"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 10.5L12 4l8 6.5V20a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 20v-9.5z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 21v-7a2 2 0 012-2h0a2 2 0 012 2v7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="body-path-label__home-text">{it.label}</span>
              </span>
            ) : (
              it.label
            )}
          </Link>
          {idx < items.length - 1 ? <span className="body-path-label__sep"> / </span> : null}
        </span>
      ))}
    </nav>
  );
}

export default function App() {
  const layoutRef = useRef(null);
  const headerRef = useRef(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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

  const { pathname, hash } = useLocation();
  const isHome = pathname === "/";
  const normalizedPath =
    pathname === "/cards" ? "/marketplace" : pathname;
  const showBodyPath = normalizedPath !== "/";
  let bodyPathItems = null;
  if (showBodyPath) {
    bodyPathItems = [{ label: "home", to: "/" }];
    if (normalizedPath.startsWith("/cards/")) {
      const cardKey = decodeURIComponent(normalizedPath.replace("/cards/", ""));
      bodyPathItems.push({ label: "marketplace", to: "/marketplace" });
      bodyPathItems.push({ label: cardKey, to: `/cards/${encodeURIComponent(cardKey)}` });
    } else if (normalizedPath.startsWith("/analytics/")) {
      const cardKey = decodeURIComponent(normalizedPath.replace("/analytics/", ""));
      bodyPathItems.push({ label: "marketplace", to: "/marketplace" });
      bodyPathItems.push({ label: cardKey, to: `/cards/${encodeURIComponent(cardKey)}` });
    } else if (normalizedPath === "/community/new") {
      bodyPathItems.push({ label: "community", to: "/community" });
      bodyPathItems.push({ label: "new", to: "/community/new" });
    } else if (normalizedPath.startsWith("/community/") && normalizedPath !== "/community") {
      const tail = decodeURIComponent(normalizedPath.replace(/^\/community\//, ""));
      bodyPathItems.push({ label: "community", to: "/community" });
      bodyPathItems.push({ label: tail, to: `/community/${encodeURIComponent(tail)}` });
    } else if (normalizedPath.startsWith("/u/")) {
      const slug = decodeURIComponent(normalizedPath.replace(/^\/u\//, ""));
      bodyPathItems.push({ label: "profile", to: "/profile" });
      bodyPathItems.push({ label: slug, to: `/u/${encodeURIComponent(slug)}` });
    } else if (normalizedPath.startsWith("/sellers/") && normalizedPath !== "/sellers") {
      const seller = decodeURIComponent(normalizedPath.replace(/^\/sellers\//, ""));
      bodyPathItems.push({ label: "seller-analysis", to: "/seller-analysis" });
      bodyPathItems.push({ label: seller, to: `/sellers/${encodeURIComponent(seller)}` });
    } else if (normalizedPath === "/profile") {
      bodyPathItems.push({ label: "profile", to: "/profile" });
    } else {
      bodyPathItems.push({ label: normalizedPath.replace(/^\//, ""), to: normalizedPath });
    }
  }

  const marketplaceListRoute = normalizedPath === "/marketplace";
  const communityShellRoute =
    normalizedPath === "/community" ||
    normalizedPath === "/community/new" ||
    normalizedPath.startsWith("/community/");
  const privacyShellRoute =
    normalizedPath === "/privacy-policy" || normalizedPath === "/contact";
  const docShellRoute = normalizedPath === "/product";

  // Signed-out users can access a small public set of pages.
  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    const allowed =
      pathname === "/" ||
      pathname === "/marketplace" ||
      pathname === "/cards" ||
      pathname === "/contact" ||
      pathname === "/privacy-policy" ||
      pathname === "/careers" ||
      pathname === "/faq" ||
      pathname === "/product";
    if (allowed) return;
    window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
    navigate("/", { replace: true });
  }, [authLoading, user, pathname, navigate]);

  // Ensure hash navigation (e.g. "/#faq") scrolls correctly in SPA routing.
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    };

    // Scroll after the next paint so the target exists.
    const raf = requestAnimationFrame(() => {
      if (tryScroll()) return;
      // Fallback: one short retry for slower mounts/lazy chunks.
      window.setTimeout(tryScroll, 80);
    });
    return () => cancelAnimationFrame(raf);
  }, [hash, pathname]);

  return (
    <div ref={layoutRef} className="layout">
      <SiteHeader ref={headerRef} />
      <main className={`site-main${isHome ? " site-main--home" : ""}`} id="main-content">
        <div
          className={`content-shell${marketplaceListRoute ? " content-shell--marketplace" : ""}${communityShellRoute ? " content-shell--community" : ""}${privacyShellRoute ? " content-shell--privacy" : ""}${docShellRoute ? " content-shell--doc" : ""}`}
        >
          {bodyPathItems ? <BreadcrumbNav items={bodyPathItems} /> : null}
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
              <Route path="/careers" element={<Careers />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/product" element={<Product />} />
              <Route path="/community/new" element={<CommunityNew />} />
              <Route path="/community/:articleId" element={<Community />} />
              <Route path="/community" element={<Community />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/u/:displayName" element={<Profile />} />
              <Route path="/sign-in" element={<Navigate to="/" replace />} />
              <Route path="/sign-up" element={<Navigate to="/" replace />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
