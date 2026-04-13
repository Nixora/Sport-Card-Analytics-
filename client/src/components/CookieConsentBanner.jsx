import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

const STORAGE_KEY = "nixsora_cookie_consent_v1";
/** Wait before the slide-in / fade-in starts (ms). */
const SHOW_DELAY_MS = 1200;
/** Fallback unmount if transitionend does not fire (ms); keep above CSS transition length. */
const HIDE_FALLBACK_MS = 4000;

function hasStoredChoice() {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "1" || v === "accept" || v === "reject";
  } catch {
    return false;
  }
}

export default function CookieConsentBanner() {
  const { t } = useLanguage();
  const [inDom, setInDom] = useState(false);
  const [open, setOpen] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (hasStoredChoice()) return;
    setInDom(true);
  }, []);

  useEffect(() => {
    if (!inDom) return;
    const delayId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpen(true));
      });
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(delayId);
  }, [inDom]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  function persistAndHide(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setOpen(false);
    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setInDom(false), HIDE_FALLBACK_MS);
  }

  function accept() {
    persistAndHide("accept");
  }

  function reject() {
    persistAndHide("reject");
  }

  function onTransitionEnd(e) {
    if (open || e.target !== e.currentTarget) return;
    const p = e.propertyName;
    if (p !== "transform" && p !== "opacity") return;
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setInDom(false);
  }

  if (!inDom) return null;

  return (
    <div
      className={`cookie-consent${open ? " cookie-consent--open" : ""}`}
      role="dialog"
      aria-label={t("cookie.ariaNotice")}
      aria-live="polite"
      onTransitionEnd={onTransitionEnd}
    >
      <div className="cookie-consent__inner">
        <p className="cookie-consent__text">
          {t("cookie.bodyBeforeLink")}
          <Link to="/privacy-policy" className="cookie-consent__link">
            {t("cookie.privacyLink")}
          </Link>
          {t("cookie.bodyAfterLink")}
        </p>
        <div className="cookie-consent__actions">
          <button type="button" className="cookie-consent__btn cookie-consent__btn--secondary" onClick={reject}>
            {t("cookie.reject")}
          </button>
          <button type="button" className="cookie-consent__btn" onClick={accept}>
            {t("cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
