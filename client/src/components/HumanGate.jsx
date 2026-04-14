import { useEffect, useRef, useState } from "react";
import AntdSpinDots from "./AntdSpinDots.jsx";
import LoadingHubMark from "./LoadingHubMark.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { fetchHumanStatus, verifyHumanToken } from "../api.js";

const SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();

function loadTurnstileScript() {
  if (typeof window !== "undefined" && window.turnstile) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-nix-turnstile="1"]');
    if (existing) {
      const t0 = Date.now();
      const wait = () => {
        if (window.turnstile) {
          resolve();
          return;
        }
        if (Date.now() - t0 > 15_000) {
          reject(new Error("timeout"));
          return;
        }
        setTimeout(wait, 50);
      };
      wait();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.dataset.nixTurnstile = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script"));
    document.head.appendChild(s);
  });
}

export default function HumanGate({ children }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("loading");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const widgetHostRef = useRef(null);
  const widgetIdRef = useRef(null);
  const host = typeof window !== "undefined" ? window.location.host : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchHumanStatus();
        if (cancelled) return;
        if (!status.required || status.verified) {
          setPhase("ok");
          return;
        }
        if (!SITE_KEY) {
          setError(t("humanGate.siteKeyMissing"));
          setPhase("blocked");
          return;
        }
        setPhase("challenge");
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || t("humanGate.statusError"));
        setPhase("blocked");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (phase !== "challenge" || !SITE_KEY) return;
    const host = widgetHostRef.current;
    if (!host) return;
    let cancelled = false;
    widgetIdRef.current = null;
    setVerifying(false);

    (async () => {
      try {
        await loadTurnstileScript();
        if (cancelled || !host.isConnected) return;
        const id = window.turnstile.render(host, {
          sitekey: SITE_KEY,
          callback: async (token) => {
            try {
              setVerifying(true);
              await verifyHumanToken(token);
              setError("");
              setPhase("ok");
            } catch (err) {
              setError(err?.message || t("humanGate.verificationFailed"));
              setVerifying(false);
              const wid = widgetIdRef.current;
              if (wid != null && window.turnstile) {
                try {
                  window.turnstile.reset(wid);
                } catch {
                  /* ignore */
                }
              }
            }
          },
          "error-callback": () => {
            setError(t("humanGate.verificationFailed"));
            setVerifying(false);
          },
        });
        widgetIdRef.current = id;
      } catch {
        if (!cancelled) setError(t("humanGate.loadScriptFailed"));
      }
    })();

    return () => {
      cancelled = true;
      const wid = widgetIdRef.current;
      widgetIdRef.current = null;
      if (wid != null && typeof window !== "undefined" && window.turnstile) {
        try {
          window.turnstile.remove(wid);
        } catch {
          /* ignore */
        }
      }
      host.replaceChildren();
    };
  }, [phase, t]);

  if (phase === "loading") {
    return (
      <div
        className="human-gate human-gate--loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={t("common.loading")}
      >
        <AntdSpinDots />
      </div>
    );
  }

  if (phase === "ok") {
    return children;
  }

  return (
    <div className="human-gate human-gate--blocked">
      <p className="human-gate__kicker">{host || "Sports Card Analytics"}</p>
      <h1 className="human-gate__title">
        {phase === "challenge" || verifying ? <LoadingHubMark className="human-gate__title-mark" /> : null}
        <span>Nixsora — Sports Card Analytics System</span>
      </h1>
      <p className="human-gate__hint">
        Compare sports card prices across marketplaces, track trends, set alerts, and join the community — after a quick human verification.
      </p>
      <p className="human-gate__hint">{t("humanGate.hint")}</p>
      {phase === "challenge" ? <div ref={widgetHostRef} className="human-gate__widget" /> : null}
      {error ? (
        <p className="human-gate__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
