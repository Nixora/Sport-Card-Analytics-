import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { createCommunityArticle } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

function parseTags(text) {
  return String(text || "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, 40))
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 20);
}

export default function CommunityNew() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsDraft, setTagsDraft] = useState("");
  const [postBusy, setPostBusy] = useState(false);
  const [postErr, setPostErr] = useState("");

  if (!authLoading && !user) {
    return <Navigate to="/community" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setPostErr("");
    if (!user) return;
    setPostBusy(true);
    try {
      const tags = parseTags(tagsDraft);
      const { article: created } = await createCommunityArticle({
        title: title.trim(),
        body: body.trim(),
        tags,
      });
      navigate(`/community/${created.id}`);
    } catch (ex) {
      setPostErr(ex?.message || "Could not publish");
    } finally {
      setPostBusy(false);
    }
  }

  return (
    <div className="cards-page cards-page--light community-forum">
      <PageHelmet breadcrumb="community" description="Start a new community topic." />

      <Link to="/community" className="community-forum__back">
        ← All topics
      </Link>

      <h1 className="community-forum__page-title">New post</h1>
      <p className="community-forum__lead">
        Write a title, your post, and optional tags. Other members can reply after you publish.
      </p>

      {authLoading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="community-forum__card">
          <form onSubmit={onSubmit}>
            {postErr ? <p className="err community-forum__hint">{postErr}</p> : null}
            <label className="community-forum__field">
              <span className="community-forum__label">Title</span>
              <input
                className="community-forum__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you want to discuss?"
                minLength={3}
                maxLength={200}
                required
              />
            </label>
            <label className="community-forum__field">
              <span className="community-forum__label">Post</span>
              <textarea
                className="community-forum__textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your post…"
                maxLength={20000}
                required
              />
            </label>
            <label className="community-forum__field">
              <span className="community-forum__label">Tags</span>
              <input
                className="community-forum__input"
                value={tagsDraft}
                onChange={(e) => setTagsDraft(e.target.value)}
                placeholder="e.g. grading, vintage, baseball (comma-separated)"
              />
              <p className="community-forum__hint">Optional — up to 20 tags, separated by commas.</p>
            </label>
            <button
              type="submit"
              className="community-forum__btn-primary community-forum__submit"
              disabled={postBusy || title.trim().length < 3 || !body.trim()}
            >
              Publish
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
