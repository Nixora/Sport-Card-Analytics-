import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import {
  fetchPublicProfile,
  profileImageUrl,
  publicProfileAvatarUrl,
  publicProfilePath,
  updateProfile,
  uploadProfileAvatar,
} from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const TAG_MAX_LEN = 120;
const TAG_MAX_COUNT = 200;

function TagListField({ label, hint, value, onChange, disabled, placeholder }) {
  const [draft, setDraft] = useState("");

  function addFromDraft() {
    const raw = draft.trim();
    if (!raw || disabled) return;
    const parts = raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.slice(0, TAG_MAX_LEN));
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) {
      if (next.length >= TAG_MAX_COUNT) break;
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  function removeAt(index) {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="profile-page__field">
      <span className="profile-page__label">{label}</span>
      {hint ? <span className="muted profile-page__hint">{hint}</span> : null}
      <div className="profile-page__tag-row">
        <input
          className="profile-page__input profile-page__tag-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFromDraft();
            }
          }}
          placeholder={placeholder}
          maxLength={TAG_MAX_LEN}
          disabled={disabled}
        />
        <button
          type="button"
          className="profile-page__tag-add"
          onClick={addFromDraft}
          disabled={disabled || !draft.trim() || value.length >= TAG_MAX_COUNT}
        >
          Add
        </button>
      </div>
      {value.length >= TAG_MAX_COUNT ? (
        <p className="muted profile-page__hint">Maximum {TAG_MAX_COUNT} entries.</p>
      ) : null}
      <ul className="profile-ant-tag-list" aria-label={label}>
        {value.map((tag, i) => (
          <li key={`${tag}-${i}`} className="profile-ant-tag">
            <span className="profile-ant-tag__text">{tag}</span>
            <button
              type="button"
              className="profile-ant-tag__close"
              aria-label={`Remove ${tag}`}
              onClick={() => removeAt(i)}
              disabled={disabled}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChipList({ items }) {
  if (!items?.length) return <p className="muted profile-page__view-empty">—</p>;
  return (
    <ul className="profile-ant-tag-list">
      {items.map((x, i) => (
        <li key={`${x}-${i}`} className="profile-ant-tag profile-ant-tag--readonly">
          <span className="profile-ant-tag__text">{x}</span>
        </li>
      ))}
    </ul>
  );
}

function ProfileBackBar({ onBack }) {
  return (
    <div className="profile-page__toolbar">
      <button type="button" className="profile-page__back profile-page__back--btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

function PublicProfilePage() {
  const { displayName: rawSlug } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const slugKey = useMemo(
    () => decodeURIComponent(String(rawSlug || "")).trim().toLowerCase(),
    [rawSlug]
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slugKey) {
        setErr("Profile not found");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");
      try {
        const body = await fetchPublicProfile(slugKey);
        if (!cancelled) setProfile(body.profile || null);
      } catch {
        if (!cancelled) {
          setErr("Profile not found");
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugKey]);

  const onBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const isSelf = me?.display_name_lc && profile?.display_name_lc === me.display_name_lc;
  const avatarSrc =
    profile?.has_avatar && slugKey ? publicProfileAvatarUrl(slugKey) : null;

  return (
    <div className="cards-page cards-page--light profile-page profile-page--public">
      <PageHelmet
        breadcrumb="profile"
        description={profile?.display_name ? `${profile.display_name} on Nixsora` : "Member profile"}
      />

      <ProfileBackBar onBack={onBack} />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : err || !profile ? (
        <div className="panel profile-page__panel">
          <p className="err">{err || "Profile not found"}</p>
        </div>
      ) : (
        <div className="panel profile-page__panel">
          <div className="profile-page__view-head">
            <div className="profile-page__view-avatar-wrap">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="profile-page__view-avatar" />
              ) : (
                <div className="profile-page__avatar-placeholder muted profile-page__view-avatar-ph">
                  No photo
                </div>
              )}
            </div>
            <div className="profile-page__view-head-text">
              <h1 className="profile-page__title">{profile.display_name || "Member"}</h1>
              {isSelf ? (
                <p className="muted profile-page__hint">
                  This is how others see your profile.{" "}
                  <Link to="/profile" className="profile-page__inline-link">
                    Edit in account settings
                  </Link>
                </p>
              ) : null}
            </div>
          </div>

          <div className="profile-page__view-section">
            <h2 className="profile-page__view-h">Country</h2>
            <p className="profile-page__view-p">{profile.country?.trim() || "—"}</p>
          </div>

          <div className="profile-page__view-section">
            <h2 className="profile-page__view-h">eBay seller</h2>
            <p className="profile-page__view-p">
              {profile.is_ebay_seller
                ? profile.ebay_seller_username || "Yes"
                : "No"}
            </p>
          </div>

          <div className="profile-page__view-section">
            <h2 className="profile-page__view-h">Favorite sports figures</h2>
            <ChipList items={profile.favorite_athletes} />
          </div>

          <div className="profile-page__view-section">
            <h2 className="profile-page__view-h">Favorite or interested sports</h2>
            <ChipList items={profile.favorite_sports} />
          </div>
        </div>
      )}
    </div>
  );
}

function MyProfilePage() {
  const navigate = useNavigate();
  const { user, loading, setUser, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [country, setCountry] = useState("");
  const [isEbay, setIsEbay] = useState("no");
  const [ebayUsername, setEbayUsername] = useState("");
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [selectedSports, setSelectedSports] = useState([]);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef(null);

  const syncFromUser = useCallback((u) => {
    if (!u) return;
    setDraftDisplayName(u.display_name || "");
    setCountry(u.country || "");
    setIsEbay(u.is_ebay_seller ? "yes" : "no");
    setEbayUsername(u.ebay_seller_username || "");
    setSelectedAthletes([...(u.favorite_athletes || [])]);
    setSelectedSports([...(u.favorite_sports || [])]);
  }, []);

  const needsDisplayName = !String(user?.display_name_lc || "").trim();

  useEffect(() => {
    if (!user) return;
    if (!editing) syncFromUser(user);
  }, [user, editing, syncFromUser]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const avatarSrc = useMemo(() => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar?.id) return profileImageUrl(user.avatar.id);
    return null;
  }, [avatarPreview, user?.avatar?.id]);

  const onBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  function startEdit() {
    if (user) syncFromUser(user);
    setAvatarFile(null);
    setEditing(true);
    setErr("");
    setOk("");
  }

  function cancelEdit() {
    if (user) syncFromUser(user);
    setAvatarFile(null);
    setEditing(false);
    setErr("");
    setOk("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (needsDisplayName) {
      const dn = draftDisplayName.trim();
      if (dn.length < 2) {
        setErr("Display name must be at least 2 characters.");
        return;
      }
      if (dn.length > 40) {
        setErr("Display name must be at most 40 characters.");
        return;
      }
    }
    if (isEbay === "yes" && !ebayUsername.trim()) {
      setErr("Enter your eBay seller username.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        country: country.trim() || null,
        is_ebay_seller: isEbay === "yes",
        ebay_seller_username: isEbay === "yes" ? ebayUsername.trim() : null,
        favorite_athletes: selectedAthletes,
        favorite_sports: selectedSports,
      };
      if (needsDisplayName) {
        payload.display_name = draftDisplayName.trim();
      }
      const body = await updateProfile(payload);
      let nextUser = body.user;
      if (avatarFile) {
        const up = await uploadProfileAvatar(avatarFile);
        nextUser = up.user;
        setAvatarFile(null);
      }
      setUser(nextUser);
      setOk("Profile saved.");
      setEditing(false);
      await refresh();
    } catch (ex) {
      setErr(ex?.message || "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="cards-page cards-page--light profile-page">
      <PageHelmet breadcrumb="profile" description="Your Nixsora profile and preferences." />

      {!user && loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <ProfileBackBar onBack={onBack} />

          <div className="panel profile-page__panel">
            {!editing && ok ? <p className="profile-page__ok profile-page__msg">{ok}</p> : null}
            {!editing ? (
              <>
                <div className="profile-page__view-actions">
                  <button type="button" className="hero-btn hero-btn--solid profile-page__edit" onClick={startEdit}>
                    <span className="hero-btn__label">Edit profile</span>
                  </button>
                </div>

                <div className="profile-page__view-head">
                  <div className="profile-page__view-avatar-wrap">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" className="profile-page__view-avatar" />
                    ) : (
                      <div className="profile-page__avatar-placeholder muted profile-page__view-avatar-ph">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="profile-page__view-head-text">
                    <h1 className="profile-page__title">
                      {user?.display_name?.trim() ? user.display_name.trim() : "Your profile"}
                    </h1>
                    <p className="muted profile-page__email">{user?.email}</p>
                    <p className="muted profile-page__hint profile-page__display-readonly-hint">
                      {needsDisplayName
                        ? "Add a unique display name when you edit (one time). It will show on your public profile."
                        : "Display name can’t be changed after it’s set."}
                    </p>
                    {user?.display_name_lc ? (
                      <p className="muted profile-page__hint">
                        <Link to={publicProfilePath(user.display_name_lc)} className="profile-page__inline-link">
                          View public profile
                        </Link>{" "}
                        (others don&apos;t see your email)
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="profile-page__view-section">
                  <h2 className="profile-page__view-h">Display name</h2>
                  <p className="profile-page__view-p">
                    {user?.display_name?.trim() ? user.display_name.trim() : "—"}
                  </p>
                </div>

                <div className="profile-page__view-section">
                  <h2 className="profile-page__view-h">Country</h2>
                  <p className="profile-page__view-p">{user?.country?.trim() || "—"}</p>
                </div>

                <div className="profile-page__view-section">
                  <h2 className="profile-page__view-h">eBay seller</h2>
                  <p className="profile-page__view-p">
                    {user?.is_ebay_seller ? user?.ebay_seller_username || "Yes" : "No"}
                  </p>
                </div>

                <div className="profile-page__view-section">
                  <h2 className="profile-page__view-h">Favorite sports figures</h2>
                  <ChipList items={user?.favorite_athletes} />
                </div>

                <div className="profile-page__view-section">
                  <h2 className="profile-page__view-h">Favorite or interested sports</h2>
                  <ChipList items={user?.favorite_sports} />
                </div>
              </>
            ) : (
              <form
                id="profile-edit-form"
                className="profile-page__form profile-page__form--edit"
                onSubmit={onSubmit}
              >
                <div className="profile-page__edit-actions-top">
                  <button type="button" className="profile-page__cancel" onClick={cancelEdit} disabled={busy}>
                    Cancel
                  </button>
                </div>

                {err ? <p className="err profile-page__msg">{err}</p> : null}
                {ok ? <p className="profile-page__ok profile-page__msg">{ok}</p> : null}

                <div className="profile-page__field profile-page__field--photo">
                  <span className="profile-page__label">Photo</span>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    className="profile-page__photo-trigger profile-page__photo-trigger--bare"
                    disabled={busy}
                    onClick={() => photoInputRef.current?.click()}
                    aria-label="Choose profile photo"
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" className="profile-page__avatar-preview" />
                    ) : (
                      <div className="profile-page__avatar-placeholder profile-page__avatar-placeholder--bare">
                        <span className="profile-page__photo-trigger__cta">+</span>
                      </div>
                    )}
                  </button>
                </div>

                {needsDisplayName ? (
                  <label className="profile-page__field">
                    <span className="profile-page__label">Display name</span>
                    <span className="muted profile-page__hint">
                      Unique, 2–40 characters. Letters, numbers, spaces, and . _ &apos; -
                    </span>
                    <input
                      className="profile-page__input"
                      type="text"
                      value={draftDisplayName}
                      onChange={(e) => setDraftDisplayName(e.target.value)}
                      autoComplete="nickname"
                      placeholder="Your public name"
                      minLength={2}
                      maxLength={40}
                      required
                    />
                  </label>
                ) : (
                  <div className="profile-page__field profile-page__display-readonly">
                    <span className="profile-page__label">Display name</span>
                    <p className="profile-page__display-value">
                      {user?.display_name?.trim() ? user.display_name.trim() : "—"}
                    </p>
                  </div>
                )}

                <label className="profile-page__field">
                  <span className="profile-page__label">Country</span>
                  <input
                    className="profile-page__input"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States"
                    maxLength={120}
                  />
                </label>

                <fieldset className="profile-page__fieldset">
                  <legend className="profile-page__legend">Are you a seller on eBay?</legend>
                  <label className="profile-page__radio">
                    <input type="radio" name="ebay" checked={isEbay === "no"} onChange={() => setIsEbay("no")} />
                    <span>No</span>
                  </label>
                  <label className="profile-page__radio">
                    <input type="radio" name="ebay" checked={isEbay === "yes"} onChange={() => setIsEbay("yes")} />
                    <span>Yes</span>
                  </label>
                </fieldset>

                {isEbay === "yes" ? (
                  <label className="profile-page__field">
                    <span className="profile-page__label">eBay seller username</span>
                    <input
                      className="profile-page__input"
                      type="text"
                      value={ebayUsername}
                      onChange={(e) => setEbayUsername(e.target.value)}
                      placeholder="Your public seller name"
                    />
                  </label>
                ) : null}

                <TagListField
                  label="Favorite sports figures"
                  hint="Type a name, then Add or press Enter. You can separate several names with commas in one go. Saved when you click Save profile."
                  value={selectedAthletes}
                  onChange={setSelectedAthletes}
                  disabled={busy}
                  placeholder="e.g. Ken Griffey Jr."
                />

                <TagListField
                  label="Favorite or interested sports"
                  hint="Type a sport, then Add or press Enter. Comma-separated works too. Saved when you click Save profile."
                  value={selectedSports}
                  onChange={setSelectedSports}
                  disabled={busy}
                  placeholder="e.g. Baseball"
                />

                <button type="submit" className="hero-btn hero-btn--solid profile-page__save" disabled={busy}>
                  <span className="hero-btn__label">{busy ? "Saving…" : "Save profile"}</span>
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Profile() {
  const { displayName } = useParams();
  if (displayName != null && String(displayName).length > 0) {
    return <PublicProfilePage />;
  }
  return <MyProfilePage />;
}
