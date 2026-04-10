import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signIn, signUp } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AuthModal({ mode, onClose, onSwitchMode }) {
  const titleId = useId();
  const subtitleId = useId();
  const emailRef = useRef(null);
  const displayNameRef = useRef(null);
  const { setUser } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "signup";

  useEffect(() => {
    setErr("");
    setDisplayName("");
    setPassword("");
    setPassword2("");
    const t = requestAnimationFrame(() => {
      if (mode === "signup") displayNameRef.current?.focus();
      else emailRef.current?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [mode]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (isSignUp && password !== password2) {
      setErr("Passwords do not match");
      return;
    }
    const dn = displayName.trim();
    if (isSignUp) {
      if (dn.length < 2) {
        setErr("Display name must be at least 2 characters");
        return;
      }
      if (dn.length > 40) {
        setErr("Display name must be at most 40 characters");
        return;
      }
    }
    setBusy(true);
    try {
      const body = isSignUp
        ? await signUp(email, password, dn)
        : await signIn(email, password);
      setUser(body.user || null);
      onClose();
    } catch (ex) {
      setErr(ex?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="auth-modal" role="presentation">
      {/* One layer for dimming + backdrop click — avoids a clear “wrap” sitting above the mask
          (that stacking caused uneven compositing: page visible in one hover region but not another). */}
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
                {isSignUp ? "Sign up" : "Sign in"}
              </h2>
              <p id={subtitleId} className="auth-modal__subtitle">
                {isSignUp
                  ? "Create an account to save alerts and explore the marketplace."
                  : "Welcome back. Sign in to continue."}
              </p>
            </div>
            <button type="button" className="auth-modal__close" aria-label="Close" onClick={onClose}>
              <IconClose />
            </button>
          </div>

          <form className="auth-modal__form" onSubmit={onSubmit}>
            <div className="auth-modal__body">
              {err ? (
                <div className="auth-modal__alert" role="alert">
                  {err}
                </div>
              ) : null}

              {isSignUp ? (
                <div className="auth-modal__field">
                  <label className="sr-only" htmlFor={`${titleId}-display`}>
                    Display name
                  </label>
                  <input
                    id={`${titleId}-display`}
                    ref={displayNameRef}
                    className="auth-modal__input"
                    type="text"
                    autoComplete="nickname"
                    placeholder="Display name (unique)"
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
                  Email address
                </label>
                <input
                  id={`${titleId}-email`}
                  ref={emailRef}
                  className="auth-modal__input"
                  type="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-modal__field">
                <label className="sr-only" htmlFor={`${titleId}-password`}>
                  Password
                </label>
                <input
                  id={`${titleId}-password`}
                  className="auth-modal__input"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="Password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {isSignUp ? (
                <div className="auth-modal__field">
                  <label className="sr-only" htmlFor={`${titleId}-password2`}>
                    Confirm password
                  </label>
                  <input
                    id={`${titleId}-password2`}
                    className="auth-modal__input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              ) : null}

              <button type="submit" className="auth-modal__cta" disabled={busy}>
                {busy ? "Please wait…" : isSignUp ? "Agree and continue" : "Continue"}
              </button>
            </div>

            <div className="auth-modal__footer">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="auth-modal__link"
                    onClick={() => onSwitchMode("signin")}
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="auth-modal__link"
                    onClick={() => onSwitchMode("signup")}
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
