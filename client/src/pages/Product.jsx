import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function renderInline(text) {
  const s = String(text ?? "");
  const out = [];
  let i = 0;
  while (i < s.length) {
    // bold **...**
    if (s[i] === "*" && s[i + 1] === "*") {
      const j = s.indexOf("**", i + 2);
      if (j !== -1) {
        const inner = s.slice(i + 2, j);
        out.push(<strong key={`b-${i}`}>{inner}</strong>);
        i = j + 2;
        continue;
      }
    }
    // inline code `...`
    if (s[i] === "`") {
      const j = s.indexOf("`", i + 1);
      if (j !== -1) {
        const inner = s.slice(i + 1, j);
        out.push(<code key={`c-${i}`}>{inner}</code>);
        i = j + 1;
        continue;
      }
    }
    // normal text chunk
    const next = (() => {
      const b = s.indexOf("**", i);
      const c = s.indexOf("`", i);
      const candidates = [b, c].filter((x) => x !== -1);
      return candidates.length ? Math.min(...candidates) : -1;
    })();
    const chunk = next === -1 ? s.slice(i) : s.slice(i, next);
    out.push(<span key={`t-${i}`}>{chunk}</span>);
    i += chunk.length;
  }
  return out;
}

function parseMarkdown(md) {
  const lines = String(md ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let para = [];
  let ul = null;
  let ol = null;
  let inQuote = false;
  let quoteLines = [];

  const flushPara = () => {
    if (!para.length) return;
    blocks.push({ type: "p", text: para.join(" ").trim() });
    para = [];
  };
  const flushUl = () => {
    if (!ul) return;
    blocks.push({ type: "ul", items: ul });
    ul = null;
  };
  const flushOl = () => {
    if (!ol) return;
    blocks.push({ type: "ol", items: ol });
    ol = null;
  };
  const flushQuote = () => {
    if (!inQuote) return;
    blocks.push({ type: "quote", text: quoteLines.join(" ").trim() });
    inQuote = false;
    quoteLines = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const line = raw.trim();

    if (!line) {
      flushQuote();
      flushPara();
      flushUl();
      flushOl();
      continue;
    }

    // Horizontal rule
    if (line === "---") {
      flushQuote();
      flushPara();
      flushUl();
      flushOl();
      blocks.push({ type: "hr" });
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      flushPara();
      flushUl();
      flushOl();
      inQuote = true;
      quoteLines.push(line.replace(/^>\s?/, ""));
      continue;
    }
    flushQuote();

    // Headings
    const h1 = line.match(/^#\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h1 || h2 || h3) {
      flushPara();
      flushUl();
      flushOl();
      const level = h1 ? 1 : h2 ? 2 : 3;
      blocks.push({ type: "h", level, text: (h1 || h2 || h3)[1] });
      continue;
    }

    // Unordered list
    const mUl = line.match(/^- (.*)$/);
    if (mUl) {
      flushPara();
      flushOl();
      ul = ul || [];
      ul.push(mUl[1]);
      continue;
    }

    // Ordered list
    const mOl = line.match(/^\d+\.\s+(.*)$/);
    if (mOl) {
      flushPara();
      flushUl();
      ol = ol || [];
      ol.push(mOl[1]);
      continue;
    }

    // Default paragraph line
    flushUl();
    flushOl();
    para.push(line);
  }

  flushQuote();
  flushPara();
  flushUl();
  flushOl();
  return blocks;
}

export default function Product() {
  const [md, setMd] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/user-documentation.md", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load documentation (${r.status})`);
        return r.text();
      })
      .then((text) => {
        if (!alive) return;
        setMd(text);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load documentation.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const blocks = useMemo(() => parseMarkdown(md), [md]);
  const toc = useMemo(() => {
    const sections = [];
    const seen = new Map();
    let current = null;

    for (const b of blocks) {
      if (b.type !== "h") continue;
      if (b.level !== 2 && b.level !== 3) continue;

      const base = slugify(b.text);
      if (!base) continue;
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      const id = n === 1 ? base : `${base}-${n}`;

      if (b.level === 2) {
        current = { id, text: b.text, children: [] };
        sections.push(current);
      } else {
        // If a doc starts with H3, bucket it under a synthetic section.
        if (!current) {
          current = { id: "contents", text: "Contents", children: [] };
          sections.push(current);
        }
        current.children.push({ id, text: b.text });
      }
    }

    return sections;
  }, [blocks]);

  const [openIds, setOpenIds] = useState(() => new Set());

  // Default: all sections collapsed.
  useEffect(() => {
    setOpenIds(new Set());
  }, [toc.length]);

  return (
    <div className="product-page">
      <PageHelmet breadcrumb="product" description="What Nixsora does and how to use the platform." />

      <div className="product-doc product-doc--layout">
        <aside className="product-doc__aside" aria-label="Contents">
          <div className="product-doc__aside-inner">
            <div className="product-doc__aside-title">Contents</div>
            <nav className="product-doc__toc" aria-label="Contents navigation">
              <ul className="product-doc__toc-list">
                {toc.map((sec) => {
                  const isOpen = openIds.has(sec.id);
                  const hasChildren = (sec.children || []).length > 0;
                  return (
                    <li key={`toc-${sec.id}`} className="product-doc__toc-li">
                      <div className="product-doc__toc-row">
                        {hasChildren ? (
                          <button
                            type="button"
                            className="product-doc__toc-toggle"
                            aria-expanded={isOpen}
                            aria-controls={`toc-sec-${sec.id}`}
                            onClick={() => {
                              setOpenIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(sec.id)) next.delete(sec.id);
                                else next.add(sec.id);
                                return next;
                              });
                            }}
                          >
                            <span className={`product-doc__toc-chev${isOpen ? " is-open" : ""}`} aria-hidden>
                              ▸
                            </span>
                            <span className="product-doc__toc-title">{sec.text}</span>
                          </button>
                        ) : (
                          <a className="product-doc__toc-link product-doc__toc-link--h2" href={`#${sec.id}`}>
                            {sec.text}
                          </a>
                        )}
                        {hasChildren ? (
                          <a className="product-doc__toc-jump" href={`#${sec.id}`} aria-label={`Jump to ${sec.text}`}>
                            ↗
                          </a>
                        ) : null}
                      </div>

                      {hasChildren && isOpen ? (
                        <ul id={`toc-sec-${sec.id}`} className="product-doc__toc-sub">
                          {sec.children.map((ch) => (
                            <li key={`toc-${sec.id}-${ch.id}`} className="product-doc__toc-subli">
                              <a className="product-doc__toc-link product-doc__toc-link--h3" href={`#${ch.id}`}>
                                {ch.text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        <main className="product-doc__main" aria-label="Documentation">
          <header className="product-page__head">
            <h1 className="product-page__title">
              Product documentation{" "}
              <Link className="product-page__more" to="/faq" aria-label="Open FAQ">
                FAQ →
              </Link>
            </h1>
            <p className="product-page__lede muted">
              This page displays the complete user documentation inside the app.
            </p>
          </header>

          {error ? <p className="product-doc__error">{error}</p> : null}
          {!error && !md ? <p className="product-doc__loading muted">Loading documentation…</p> : null}

          {(() => {
            const seen = new Map();
            return blocks.map((b, i) => {
              if (b.type === "hr") return <hr key={`hr-${i}`} className="product-doc__hr" />;
              if (b.type === "quote")
                return (
                  <blockquote key={`q-${i}`} className="product-doc__quote">
                    {renderInline(b.text)}
                  </blockquote>
                );
              if (b.type === "h") {
                const level = b.level;
                const key = `${level}-${i}`;
                if (level === 1) return <h1 key={key} className="product-doc__h1">{renderInline(b.text)}</h1>;
                if (level === 2 || level === 3) {
                  const base = slugify(b.text);
                  const n = (seen.get(base) || 0) + 1;
                  seen.set(base, n);
                  const id = base ? (n === 1 ? base : `${base}-${n}`) : undefined;
                  const Tag = level === 2 ? "h2" : "h3";
                  const cls = level === 2 ? "product-doc__h2" : "product-doc__h3";
                  return (
                    <Tag key={key} id={id} className={cls}>
                      {renderInline(b.text)}
                    </Tag>
                  );
                }
                return <h3 key={key} className="product-doc__h3">{renderInline(b.text)}</h3>;
              }
              if (b.type === "ul") {
                return (
                  <ul key={`ul-${i}`} className="product-doc__ul">
                    {b.items.map((it, j) => (
                      <li key={`ul-${i}-${j}`}>{renderInline(it)}</li>
                    ))}
                  </ul>
                );
              }
              if (b.type === "ol") {
                return (
                  <ol key={`ol-${i}`} className="product-doc__ol">
                    {b.items.map((it, j) => (
                      <li key={`ol-${i}-${j}`}>{renderInline(it)}</li>
                    ))}
                  </ol>
                );
              }
              return (
                <p key={`p-${i}`} className="product-doc__p">
                  {renderInline(b.text)}
                </p>
              );
            });
          })()}
        </main>
      </div>
    </div>
  );
}

