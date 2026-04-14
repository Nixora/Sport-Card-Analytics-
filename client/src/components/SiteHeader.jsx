import { forwardRef, useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { profileImageUrl } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AuthModal from "./AuthModal.jsx";

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
  pathname === "/marketplace" ||
  pathname === "/marketplace-comparison" ||
  pathname.startsWith("/cards/") ||
  pathname.startsWith("/analytics/");

function navClass({ isActive }) {
  return `site-header__nav-link${isActive ? " is-active" : ""}`;
}

function emailInitials(email) {
  const local = String(email || "?").split("@")[0] || "?";
  const clean = local.replace(/[^a-z0-9]+/gi, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function avatarInitials(user) {
  const name = user?.display_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return emailInitials(user?.email);
}

const SiteHeader = forwardRef(function SiteHeader(_props, ref) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { locale, setLocale, t, localeOptions } = useLanguage();
  const marketplaceNavActive = marketplaceActive({ pathname });
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langWrapRef = useRef(null);
  const [authModal, setAuthModal] = useState(null);
  const [headerPressed, setHeaderPressed] = useState(false);
  const [homeScrolled, setHomeScrolled] = useState(false);

  const localeChip = localeOptions.find((o) => o.code === locale) ?? localeOptions[0];

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
    const onOpenAuth = (e) => {
      const mode = e?.detail?.mode || "signin";
      setAuthModal(mode);
    };
    window.addEventListener("nix:open-auth", onOpenAuth);
    return () => window.removeEventListener("nix:open-auth", onOpenAuth);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (langOpen) {
        setLangOpen(false);
        return;
      }
      if (authModal) setAuthModal(null);
      else setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authModal, langOpen]);

  useEffect(() => {
    if (!langOpen) return;
    const onDoc = (e) => {
      if (langWrapRef.current && !langWrapRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [langOpen]);

  useEffect(() => {
    if (!authModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [authModal]);

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
        <Link to="/" className="site-header__nix-brand" aria-label={t("header.ariaHome")}>
          Nixsora
        </Link>

        <nav className="site-header__nix-nav" aria-label={t("header.ariaNavMain")}>
          <NavLink
            to="/marketplace"
            className={({ isActive }) =>
              `site-header__nav-link${isActive || marketplaceNavActive ? " is-active" : ""}`
            }
          >
            {t("header.navMarketplace")}
          </NavLink>
          <NavLink
            to="/comparison-alert"
            className={navClass}
            onClick={(e) => {
              if (user) return;
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
            }}
          >
            {t("header.navComparisonAlert")}
          </NavLink>
          <NavLink
            to="/seller-analysis"
            className={navClass}
            onClick={(e) => {
              if (user) return;
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
            }}
          >
            {t("header.navSellerAnalysis")}
          </NavLink>
          <NavLink
            to="/community"
            className={navClass}
            onClick={(e) => {
              if (user) return;
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
            }}
          >
            {t("header.navCommunity")}
          </NavLink>
          {user?.is_admin ? (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          ) : null}
          <NavLink
            to="/premium"
            className={navClass}
            onClick={(e) => {
              if (user) return;
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
            }}
          >
            {t("header.navPricing")}
          </NavLink>
        </nav>

        <div className="site-header__nix-util">
          <Link
            to="/marketplace"
            className="site-header__icon-btn"
            aria-label={t("header.ariaSearchMarketplace")}
          >
            <IconSearch />
          </Link>
          <div className="site-header__lang-wrap" ref={langWrapRef}>
            <button
              type="button"
              className={`site-header__lang${langOpen ? " is-open" : ""}`}
              aria-label={`${t("header.ariaLanguageMenu")}: ${localeChip.label}`}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              onClick={() => setLangOpen((o) => !o)}
            >
              {localeChip.short}
              <IconChevronNav />
            </button>
            {langOpen ? (
              <div className="site-header__lang-panel" role="listbox" aria-label={t("header.ariaLanguageMenu")}>
                {localeOptions.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    role="option"
                    aria-selected={locale === opt.code}
                    className={`site-header__lang-option${locale === opt.code ? " is-active" : ""}`}
                    onClick={() => {
                      setLocale(opt.code);
                      setLangOpen(false);
                    }}
                  >
                    <span className="site-header__lang-option-short">{opt.short}</span>
                    <span className="site-header__lang-option-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <NavLink
            to="/contact"
            className={({ isActive }) => `site-header__contact-cta${isActive ? " is-active" : ""}`}
          >
            {t("header.contactUs")}
          </NavLink>
          {user ? (
            <>
              <Link to="/profile" className="site-header__avatar" aria-label={t("header.profile")}>
                {user.avatar?.id ? (
                  <img src={profileImageUrl(user.avatar.id)} alt="" className="site-header__avatar-img" />
                ) : (
                  <span className="site-header__avatar-initials" aria-hidden>
                    {avatarInitials(user)}
                  </span>
                )}
              </Link>
              <button type="button" className="site-header__sign-out" onClick={() => signOut()}>
                {t("header.signOut")}
              </button>
            </>
          ) : (
            <button type="button" className="site-header__sign-link" onClick={() => setAuthModal("signin")}>
              {t("header.signIn")}
            </button>
          )}
          <button
            type="button"
            className="site-header__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-header-drawer"
            aria-label={menuOpen ? t("header.ariaCloseMenu") : t("header.ariaMenu")}
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
            aria-label={t("header.ariaCloseMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <div id="site-header-drawer" className="site-header__drawer" role="dialog" aria-modal="true">
            <nav className="site-header__drawer-nav" aria-label={t("header.ariaNavMobile")}>
              <NavLink
                to="/marketplace"
                className={({ isActive }) =>
                  `site-header__drawer-link${isActive || marketplaceNavActive ? " is-active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {t("header.navMarketplace")}
              </NavLink>
              <NavLink
                to="/comparison-alert"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
                  }
                  setMenuOpen(false);
                }}
              >
                {t("header.navComparisonAlert")}
              </NavLink>
              <NavLink
                to="/seller-analysis"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
                  }
                  setMenuOpen(false);
                }}
              >
                {t("header.navSellerAnalysis")}
              </NavLink>
              <NavLink
                to="/community"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
                  }
                  setMenuOpen(false);
                }}
              >
                {t("header.navCommunity")}
              </NavLink>
              {user?.is_admin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </NavLink>
              ) : null}
              <NavLink
                to="/premium"
                className={({ isActive }) => `site-header__drawer-link${isActive ? " is-active" : ""}`}
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent("nix:open-auth", { detail: { mode: "signin" } }));
                  }
                  setMenuOpen(false);
                }}
              >
                {t("header.navPricing")}
              </NavLink>
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  `site-header__drawer-link site-header__drawer-link--primary${isActive ? " is-active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {t("header.contactUs")}
              </NavLink>
              <p className="site-header__drawer-lang-label">{t("header.drawerLanguage")}</p>
              <div className="site-header__drawer-lang-chips" role="group" aria-label={t("header.ariaLanguageMenu")}>
                {localeOptions.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    className={`site-header__drawer-lang-chip${locale === opt.code ? " is-active" : ""}`}
                    aria-pressed={locale === opt.code}
                    onClick={() => {
                      setLocale(opt.code);
                      setMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="site-header__drawer-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("header.profile")}
                  </Link>
                  <button
                    type="button"
                    className="site-header__drawer-link"
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                    }}
                  >
                    {t("header.signOut")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="site-header__drawer-link"
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthModal("signin");
                  }}
                >
                  {t("header.signIn")}
                </button>
              )}
            </nav>
          </div>
        </>
      )}

      {authModal ? (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitchMode={setAuthModal}
        />
      ) : null}
    </header>
  );
});

export default SiteHeader;
