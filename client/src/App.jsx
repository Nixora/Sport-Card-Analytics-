import { useLayoutEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import SiteHeader from "./components/SiteHeader.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Cards from "./pages/Cards.jsx";
import CardDetail from "./pages/CardDetail.jsx";
import Alerts from "./pages/Alerts.jsx";
import Community from "./pages/Community.jsx";
import Premium from "./pages/Premium.jsx";

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
    pathname === "/cards" ? "/marketplace-comparison" : pathname;
  const showBodyPath = normalizedPath !== "/";
  let bodyPathLabel = "";
  if (normalizedPath.startsWith("/cards/")) {
    const cardKey = decodeURIComponent(normalizedPath.replace("/cards/", ""));
    bodyPathLabel = `home / marketplace-comparison / ${cardKey}`;
  } else if (normalizedPath.startsWith("/analytics/")) {
    const cardKey = decodeURIComponent(normalizedPath.replace("/analytics/", ""));
    bodyPathLabel = `home / marketplace-comparison / ${cardKey}`;
  } else {
    bodyPathLabel = `home / ${normalizedPath.replace(/^\//, "")}`;
  }

  const marketplaceListRoute = normalizedPath === "/marketplace-comparison";

  return (
    <div ref={layoutRef} className="layout">
      <SiteHeader ref={headerRef} />
      <main className={`site-main${isHome ? " site-main--home" : ""}`} id="main-content">
        <div
          className={`content-shell${marketplaceListRoute ? " content-shell--marketplace" : ""}`}
        >
          {showBodyPath && <p className="body-path-label">{bodyPathLabel}</p>}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/marketplace-comparison" element={<Cards />} />
            <Route path="/cards" element={<Navigate to="/marketplace-comparison" replace />} />
            <Route path="/cards/:cardKey" element={<CardDetail />} />
            <Route path="/analytics" element={<Navigate to="/marketplace-comparison" replace />} />
            <Route path="/analytics/:cardKey" element={<RedirectAnalyticsToCard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/community" element={<Community />} />
          </Routes>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
