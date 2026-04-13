import { Link } from "react-router-dom";
import PageHelmet from "../components/PageHelmet.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Placeholder({ title, summary, breadcrumb }) {
  const { t } = useLanguage();
  return (
    <div className="placeholder-page">
      <PageHelmet breadcrumb={breadcrumb} description={summary} />
      <h1>{title}</h1>
      <p className="muted">{summary}</p>
      <p>
        <Link to="/">{t("placeholder.back")}</Link>
      </p>
    </div>
  );
}
