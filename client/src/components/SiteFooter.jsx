import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 3h14a2 2 0 012 2v9a2 2 0 01-2 2h-5l-4 3v-3H5a2 2 0 01-2-2V5a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconApple() {
  return (
    <svg className="site-footer__store-icon" width="20" height="24" viewBox="0 0 20 24" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.77c-.04-3.48 2.84-5.18 2.96-5.26-1.62-2.37-4.13-2.69-5.02-2.73-2.12-.22-4.16 1.26-5.24 1.26-1.1 0-2.78-1.23-4.58-1.2-2.35.04-4.52 1.38-5.73 3.5-2.45 4.24-.62 10.52 1.75 13.96 1.17 1.69 2.56 3.58 4.38 3.52 1.76-.07 2.42-1.14 4.55-1.14 2.12 0 2.72 1.14 4.57 1.08 1.89-.04 3.08-1.71 4.23-3.42 1.34-1.95 1.88-3.85 1.91-3.95-.04-.02-3.66-1.4-3.7-5.58zM13.29 3.8c.97-1.18 1.62-2.8 1.45-4.44-1.4.06-3.12.94-4.13 2.12-.9 1.04-1.69 2.73-1.48 4.34 1.57.12 3.18-.8 4.16-2.02z"
      />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg className="site-footer__store-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M3.6 20.4V3.6c0-.47.25-.9.65-1.14a1.27 1.27 0 011.38.05l15.36 8.8c.4.23.65.67.65 1.14s-.25.91-.65 1.14l-15.36 8.8a1.27 1.27 0 01-1.38.05 1.3 1.3 0 01-.65-1.14z"
      />
    </svg>
  );
}

export default function SiteFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const [chatVisible, setChatVisible] = useState(true);

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__grid">
            <div className="site-footer__col">
              <h2 className="site-footer__heading">{t("footer.lookingMore")}</h2>
              <ul className="site-footer__list">
                <li>
                  <Link className="site-footer__link" to="/faq">
                    {t("footer.faq")}
                  </Link>
                </li>
                <li>
                  <Link className="site-footer__link" to="/">
                    {t("footer.about")}
                  </Link>
                </li>
                <li>
                  <a className="site-footer__link" href="#careers">
                    {t("footer.careers")}
                  </a>
                </li>
                <li>
                  <Link className="site-footer__link" to="/premium">
                    {t("footer.pricing")}
                  </Link>
                </li>
                <li>
                  <Link className="site-footer__link" to="/comparison-alert">
                    {t("footer.priceAlerts")}
                  </Link>
                </li>
                <li>
                  <Link className="site-footer__link" to="/privacy-policy">
                    {t("footer.privacyPolicy")}
                  </Link>
                </li>
                <li>
                  <Link className="site-footer__link" to="/community">
                    {t("footer.community")}
                  </Link>
                </li>
                <li>
                  <Link className="site-footer__link" to="/contact">
                    {t("footer.contactUs")}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="site-footer__col">
              <h2 className="site-footer__heading">{t("footer.contactHeading")}</h2>
              <p className="site-footer__contact-cta">
                <Link className="site-footer__contact-cta-link" to="/contact">
                  {t("footer.contactPage")}
                </Link>
              </p>
              <p className="site-footer__contact-cta">
                <a className="site-footer__contact-cta-link" href="mailto:support@example.com">
                  support@example.com
                </a>
              </p>
              <p className="site-footer__contact-label">{t("footer.location")}</p>
              <address className="site-footer__address">
                1095 E. Salter Drive
                <br />
                Phoenix, AZ 85024
              </address>
            </div>

            <div className="site-footer__col">
              <h2 className="site-footer__heading">{t("footer.brand")}</h2>
              <p className="site-footer__rights">{t("footer.rights", { year })}</p>
              <div className="site-footer__stores">
                <a
                  className="site-footer__store-badge"
                  href="#app-store"
                  aria-label={t("footer.ariaAppStore")}
                >
                  <IconApple />
                  <span className="site-footer__store-text">
                    <span className="site-footer__store-line site-footer__store-line--sm">{t("footer.appStoreLine1")}</span>
                    <span className="site-footer__store-line site-footer__store-line--lg">{t("footer.appStoreLine2")}</span>
                  </span>
                </a>
                <a
                  className="site-footer__store-badge site-footer__store-badge--play"
                  href="#google-play"
                  aria-label={t("footer.ariaPlay")}
                >
                  <IconPlay />
                  <span className="site-footer__store-text">
                    <span className="site-footer__store-line site-footer__store-line--sm site-footer__store-line--caps">
                      {t("footer.playLine1")}
                    </span>
                    <span className="site-footer__store-line site-footer__store-line--lg">{t("footer.playLine2")}</span>
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div className="site-footer__fine-print">
            <p className="site-footer__fine-print-line">{t("footer.finePrint1")}</p>
            <p className="site-footer__fine-print-line">{t("footer.finePrint2")}</p>
          </div>
        </div>
      </footer>

      {chatVisible && (
        <div className="footer-chat" role="complementary" aria-label={t("footer.chatAria")}>
          <button
            type="button"
            className="footer-chat__close"
            aria-label={t("footer.dismissChat")}
            onClick={() => setChatVisible(false)}
          >
            <span aria-hidden>×</span>
          </button>
          <div className="footer-chat__row">
            <p className="footer-chat__bubble">{t("footer.chatBubble")}</p>
            <a
              className="footer-chat__button"
              href="mailto:support@example.com"
              title={t("footer.getHelpTitle")}
              aria-label={t("footer.getHelpEmail")}
            >
              <IconChat />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
