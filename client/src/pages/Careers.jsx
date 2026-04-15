import PageHelmet from "../components/PageHelmet.jsx";

export default function Careers() {
  return (
    <div className="placeholder-page">
      <PageHelmet breadcrumb="careers" description="Join NIXSORA — careers and opportunities." />
      <h1>Careers</h1>
      <p className="muted">
        We’re building smarter analytics for the sports card community. If you want to work with us, we’d love to hear
        from you.
      </p>
      <p className="muted" style={{ marginTop: "1rem" }}>
        Email:{" "}
        <a className="contact-page__inline-link" href="mailto:hr@nixsora.com">
          hr@nixsora.com
        </a>
      </p>
    </div>
  );
}

