import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { resetPasswordWithToken } from "../api.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const tokenOk = /^[a-f0-9]{64}$/i.test(token);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (password !== password2) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await resetPasswordWithToken(token, password);
      setOk(true);
      setPassword("");
      setPassword2("");
    } catch (ex) {
      setErr(ex?.message || "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cards-page cards-page--light profile-page">
      <PageHelmet breadcrumb="reset password" description="Set a new password for your Nixsora account." />

      <div className="profile-page__toolbar">
        <Link to="/" className="profile-page__back profile-page__back--btn">
          ← Home
        </Link>
      </div>

      <div className="panel profile-page__panel">
        <h1 className="profile-page__title">Reset password</h1>

        {!tokenOk ? (
          <p className="err profile-page__msg">
            This link is missing a valid token. Open the link from your reset email, or request a new reset from the
            sign-in screen.
          </p>
        ) : ok ? (
          <>
            <p className="profile-page__ok profile-page__msg">Your password has been updated.</p>
            <p className="muted profile-page__hint">
              <Link to="/" className="profile-page__inline-link">
                Sign in from the home page
              </Link>
            </p>
          </>
        ) : (
          <form className="profile-page__form profile-page__form--password" onSubmit={onSubmit}>
            <p className="muted profile-page__hint">Choose a new password for your account.</p>
            {err ? <p className="err profile-page__msg">{err}</p> : null}
            <label className="profile-page__field">
              <span className="profile-page__label">New password</span>
              <input
                className="profile-page__input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label className="profile-page__field">
              <span className="profile-page__label">Confirm new password</span>
              <input
                className="profile-page__input"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <button type="submit" className="hero-btn hero-btn--solid profile-page__save" disabled={busy}>
              <span className="hero-btn__label">{busy ? "Saving…" : "Update password"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
