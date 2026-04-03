import { forwardRef, useEffect, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";

const HOME_SCROLL_SOLID_PX = 40;

function IconChevronNav() {
  return (
    <svg
      className="site-header__nav-chevron"
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M2.5 4.25L6 7.75l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16 16l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BurgerIcon({ open }) {
  return (
    <svg
      className="site-header__burger-svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {open ? (
        <path
          d="M18 6L6 18M6 6l12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path d="M4 8h16M4 12h16M4 16h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

const marketplaceActive = ({ pathname }) =>
  pathname === "/marketplace-comparison" ||
  pathname.startsWith("/cards/") ||
  pathname.startsWith("/analytics/");

function navClass({ isActive }) {
  return `site-header__nav-link${isActive ? " is-active" : ""}`;
}

const SiteHeader = forwardRef(function SiteHeader(_props, ref) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerPressed, setHeaderPressed] = useState(false);
  const [homeScrolled, setHomeScrolled] = useState(false);

  const barSolid = !isHome || homeScrolled;

  useEffect(() => {
    if (!isHome) {
      setHomeScrolled(false);
      return;
    }
    const onScroll = () => {
      setHomeScrolled(window.scrollY > HOME_SCROLL_SOLID_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!headerPressed) return;
    const end = () => setHeaderPressed(false);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [headerPressed]);

  return (
    <header
      ref={ref}
      className={`site-header site-header--nix${barSolid ? " site-header--solid" : ""}${headerPressed ? " is-header-pressed" : ""}`}
      onPointerDown={(e) => {
        if (e.button === 0 || e.pointerType === "touch") setHeaderPressed(true);
      }}
    >
      <div className="site-header__nix-shell">
        <Link to="/" className="site-header__nix-brand" aria-label="Nixsor home">
          Nixsor
        </Link>

        <nav className="site-header__nix-nav" aria-label="Main">
          <NavLink
            to="/marketplace-comparison"
            className={navClass}
            isActive={marketplaceActive}
          >
            Marketplace
          </NavLink>
          <NavLink to="/alerts" className={navClass}>
            Alerts
          </NavLink>
          <NavLink to="/premium" className={navClass}>
            Premium
          </NavLink>
          <NavLink to="/community" className={navClass}>
            Community
          </NavLink>
        </nav>

        <div className="site-header__nix-util">
          <Link
            to="/marketplace-comparison"
            className="site-header__icon-btn"
            aria-label="Search marketplace"
          >
            <IconSearch />
          </Link>
          <button type="button" className="site-header__lang" aria-label="Language: English">
            EN
            <IconChevronNav />
          </button>
          <Link to="/community" className="site-header__contact-cta">
            Contact Us
          </Link>
          <button
            type="button"
            className="site-header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-header-drawer"
            aria-label={menuOpen ? "Close menu" : "Menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <BurgerIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="site-header__scrim"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div id="site-header-drawer" className="site-header__drawer" role="dialog" aria-modal="true">
            <nav className="site-header__drawer-nav" aria-label="Mobile">
              <NavLink
                to="/marketplace-comparison"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
                isActive={marketplaceActive}
              >
                Marketplace
              </NavLink>
              <NavLink
                to="/alerts"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Alerts
              </NavLink>
              <NavLink
                to="/premium"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Premium
              </NavLink>
              <NavLink
                to="/community"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Community
              </NavLink>
              <Link
                to="/community"
                className="site-header__drawer-link site-header__drawer-link--primary"
                onClick={() => setMenuOpen(false)}
              >
                Contact Us
              </Link>
            </nav>
          </div>
        </>
      )}
    </header>
  );
});

export default SiteHeader;
