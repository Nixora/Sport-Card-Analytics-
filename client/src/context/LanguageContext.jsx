import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { bundles } from "../i18n/bundles.js";
import { HEADER_LOCALE_LIST, localeHtmlLang, localeMeta } from "../i18n/localeMeta.js";
import { getPath, interpolate } from "../i18n/resolvePath.js";

const STORAGE_KEY = "nixsora_locale_v1";

const LanguageContext = createContext(null);

function normalizeLocale(code) {
  if (!code || typeof code !== "string") return "en";
  const c = code.toLowerCase();
  return HEADER_LOCALE_LIST.includes(c) ? c : "en";
}

function pickBundle(locale) {
  return bundles[locale] || bundles.en;
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = localeHtmlLang[locale] || "en";
  }, [locale]);

  const setLocale = useCallback((code) => {
    const next = normalizeLocale(code);
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      const cur = pickBundle(locale);
      let v = getPath(cur, key);
      if (typeof v !== "string") v = getPath(bundles.en, key);
      if (typeof v !== "string") return String(key);
      return interpolate(v, vars);
    },
    [locale]
  );

  /** Non-string catalog values (arrays/objects) with English fallback per key path. */
  const tx = useCallback(
    (key) => {
      const cur = pickBundle(locale);
      let v = getPath(cur, key);
      if (v === undefined) v = getPath(bundles.en, key);
      return v;
    },
    [locale]
  );

  const localeOptions = useMemo(
    () =>
      HEADER_LOCALE_LIST.map((code) => ({
        code,
        short: localeMeta[code].short,
        label: localeMeta[code].label,
      })),
    []
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tx, localeOptions }),
    [locale, setLocale, t, tx, localeOptions]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

export { HEADER_LOCALE_LIST, localeHtmlLang, localeMeta };
