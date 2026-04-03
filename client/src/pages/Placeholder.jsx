import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";

export default function Placeholder({ title, summary, breadcrumb }) {
  return (
    <div className="placeholder-page">
      <PageHelmet breadcrumb={breadcrumb} description={summary} />
      <h1>{title}</h1>
      <p className="muted">{summary}</p>
      <p>
        <Link to="/">← Home</Link>
      </p>
    </div>
  );
}
