import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  requestPasswordReset,
  signIn,
  signUpRequestOtp,
  signUpVerifyOtp,
} from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AuthModal({ mode, onClose, onSwitchMode }) {
  const { t } = useLanguage();
  const titleId = useId();
  const subtitleId = useId();
  const emailRef = useRef(null);
  const displayNameRef = useRef(null);
  const otpRef = useRef(null);
  const { setUser } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [signupStep, setSignupStep] = useState("form");
  const [signupChallenge, setSignupChallenge] = useState("");
  const [emailMasked, setEmailMasked] = useState("");

  const [forgotStep, setForgotStep] = useState("email");
  const [forgotEmail, setForgotEmail] = useState("");

  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";

  useEffect(() => {
    setErr("");
    if (mode !== "signin") setNotice("");
    setDisplayName("");
    setPassword("");
    setPassword2("");
    setSignupStep("form");
    setSignupChallenge("");
    setEmailMasked("");
    setForgotStep("email");
    setForgotEmail("");
    const t = requestAnimationFrame(() => {
      if (mode === "signup") displayNameRef.current?.focus();
      else if (mode === "forgot") emailRef.current?.focus();
      else emailRef.current?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [mode]);

  useEffect(() => {
    if (isSignUp && signupStep === "otp") {
      const t = requestAnimationFrame(() => otpRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
    return undefined;
  }, [signupStep, isSignUp]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (isSignUp && password !== password2) {
      setErr(t("auth.errPasswordMismatch"));
      return;
    }
    const dn = displayName.trim();
    if (isSignUp) {
      if (dn.length < 2) {
        setErr(t("auth.errDisplayShort"));
        return;
      }
      if (dn.length > 40) {
        setErr(t("auth.errDisplayLong"));
        return;
      }
    }
    setBusy(true);
    try {
      if (isSignUp) {
        const body = await signUpRequestOtp(email, password, dn);
        setSignupChallenge(body.signup_challenge || "");
        setEmailMasked(body.email_masked || "");
        setPassword("");
        setPassword2("");
        setSignupStep("otp");
      } else {
        const body = await signIn(email, password);
        setUser(body.user || null);
        onClose();
      }
    } catch (ex) {
      setErr(ex?.message || t("auth.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifySignupOtp(e) {
    e.preventDefault();
    setErr("");
    const code = String(otpRef.current?.value || "").trim();
    if (!/^\d{6}$/.test(code)) {
      setErr(t("auth.errOtpFormat"));
      return;
    }
    setBusy(true);
    try {
      const body = await signUpVerifyOtp(signupChallenge, code);
      setUser(body.user || null);
      onClose();
    } catch (ex) {
      setErr(ex?.message || t("auth.errVerify"));
    } finally {
      setBusy(false);
    }
  }

  function backToSignupForm() {
    setErr("");
    setSignupStep("form");
    setSignupChallenge("");
    setEmailMasked("");
  }

  async function onForgotSend(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await requestPasswordReset(forgotEmail.trim());
      setForgotStep("sent");
    } catch (ex) {
      setErr(ex?.message || t("auth.errResetSend"));
    } finally {
      setBusy(false);
    }
  }

  const title = isForgot
    ? forgotStep === "sent"
      ? t("auth.titleForgotSent")
      : t("auth.titleForgot")
    : isSignUp && signupStep === "otp"
      ? t("auth.titleOtp")
      : isSignUp
        ? t("auth.titleSignup")
        : t("auth.titleSignin");
  const subtitle = isForgot
    ? forgotStep === "email"
      ? t("auth.subForgotEmail")
      : t("auth.subForgotSent")
    : isSignUp && signupStep === "otp"
      ? t("auth.subOtp", { email: emailMasked || t("auth.subOtpFallbackEmail") })
      : isSignUp
        ? t("auth.subSignup")
        : t("auth.subSignin");

  return createPortal(
    <div className="auth-modal" role="presentation">
      <div className="auth-modal__shell" role="presentation" onClick={onClose}>
        <div
          className="auth-modal__content"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={subtitleId}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="auth-modal__header">
            <div className="auth-modal__header-text">
              <h2 id={titleId} className="auth-modal__title">
                {title}
              </h2>
              <p id={subtitleId} className="auth-modal__subtitle">
                {subtitle}
              </p>
            </div>
            <button type="button" className="auth-modal__close" aria-label={t("common.close")} onClick={onClose}>
              <IconClose />
            </button>
          </div>

          {isForgot ? (
            forgotStep === "sent" ? (
              <div className="auth-modal__form">
                <div className="auth-modal__body">
                  <div className="auth-modal__notice" role="status">
                    {t("auth.resetSentNotice")}
                  </div>
                </div>
                <div className="auth-modal__footer">
                  <button type="button" className="auth-modal__link" onClick={() => onSwitchMode("signin")}>
                    {t("auth.backSignIn")}
                  </button>
                </div>
              </div>
            ) : (
              <form className="auth-modal__form" onSubmit={onForgotSend}>
                <div className="auth-modal__body">
                  {err ? (
                    <div className="auth-modal__alert" role="alert">
                      {err}
                    </div>
                  ) : null}

                  <div className="auth-modal__field">
                    <label className="sr-only" htmlFor={`${titleId}-forgot-email`}>
                      {t("auth.email")}
                    </label>
                    <input
                      id={`${titleId}-forgot-email`}
                      ref={emailRef}
                      className="auth-modal__input"
                      type="email"
                      autoComplete="email"
                      placeholder={t("auth.email")}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="auth-modal__cta" disabled={busy}>
                    {busy ? t("auth.wait") : t("auth.sendReset")}
                  </button>
                </div>

                <div className="auth-modal__footer">
                  <button type="button" className="auth-modal__link" onClick={() => onSwitchMode("signin")}>
                    {t("auth.backSignIn")}
                  </button>
                </div>
              </form>
            )
          ) : isSignUp && signupStep === "otp" ? (
            <form className="auth-modal__form" onSubmit={onVerifySignupOtp}>
              <div className="auth-modal__body">
                {err ? (
                  <div className="auth-modal__alert" role="alert">
                    {err}
                  </div>
                ) : null}
                <div className="auth-modal__field">
                  <label className="sr-only" htmlFor={`${titleId}-signup-otp`}>
                    {t("auth.verificationCode")}
                  </label>
                  <input
                    key={signupChallenge || "signup-otp"}
                    id={`${titleId}-signup-otp`}
                    ref={otpRef}
                    className="auth-modal__input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={t("auth.otpPlaceholder")}
                    maxLength={6}
                    required
                  />
                </div>
                <button type="submit" className="auth-modal__cta" disabled={busy}>
                  {busy ? t("auth.wait") : t("auth.verifyCreate")}
                </button>
                <button
                  type="button"
                  className="auth-modal__link auth-modal__link--block"
                  onClick={backToSignupForm}
                >
                  {t("auth.editSignup")}
                </button>
              </div>
            </form>
          ) : (
            <form className="auth-modal__form" onSubmit={onSubmit}>
              <div className="auth-modal__body">
                {notice ? (
                  <div className="auth-modal__notice" role="status">
                    {notice}
                  </div>
                ) : null}
                {err ? (
                  <div className="auth-modal__alert" role="alert">
                    {err}
                  </div>
                ) : null}

                {isSignUp ? (
                  <div className="auth-modal__field">
                    <label className="sr-only" htmlFor={`${titleId}-display`}>
                      {t("auth.displayName")}
                    </label>
                    <input
                      id={`${titleId}-display`}
                      ref={displayNameRef}
                      className="auth-modal__input"
                      type="text"
                      autoComplete="nickname"
                      placeholder={t("auth.displayNamePh")}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={40}
                    />
                  </div>
                ) : null}

                <div className="auth-modal__field">
                  <label className="sr-only" htmlFor={`${titleId}-email`}>
                    {t("auth.email")}
                  </label>
                  <input
                    id={`${titleId}-email`}
                    ref={emailRef}
                    className="auth-modal__input"
                    type="email"
                    autoComplete="email"
                    placeholder={t("auth.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-modal__field">
                  <label className="sr-only" htmlFor={`${titleId}-password`}>
                    {t("auth.password")}
                  </label>
                  <input
                    id={`${titleId}-password`}
                    className="auth-modal__input"
                    type="password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    placeholder={t("auth.passwordPh")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {isSignUp ? (
                  <div className="auth-modal__field">
                    <label className="sr-only" htmlFor={`${titleId}-password2`}>
                      {t("auth.confirmPassword")}
                    </label>
                    <input
                      id={`${titleId}-password2`}
                      className="auth-modal__input"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("auth.confirmPasswordPh")}
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                ) : null}

                <button type="submit" className="auth-modal__cta" disabled={busy}>
                  {busy ? t("auth.wait") : isSignUp ? t("auth.sendCode") : t("auth.continue")}
                </button>
              </div>

              <div className="auth-modal__footer">
                {isSignUp ? (
                  <>
                    {t("auth.alreadyHave")}{" "}
                    <button
                      type="button"
                      className="auth-modal__link"
                      onClick={() => onSwitchMode("signin")}
                    >
                      {t("auth.logIn")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="auth-modal__link auth-modal__link--block"
                      onClick={() => onSwitchMode("forgot")}
                    >
                      {t("auth.forgotPassword")}
                    </button>
                    {t("auth.noAccount")}{" "}
                    <button
                      type="button"
                      className="auth-modal__link"
                      onClick={() => onSwitchMode("signup")}
                    >
                      {t("auth.signUpLink")}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
