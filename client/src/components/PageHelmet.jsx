import { Helmet } from "react-helmet-async";

const SITE = "Nixsor";

/** Home: `title · Nixsor`. Other routes: `home / breadcrumb · Nixsor` (breadcrumb = path-style segments, e.g. `marketplace-comparison` or `marketplace-comparison / card-key`). */
export default function PageHelmet({ title, description, isHome, breadcrumb }) {
  let fullTitle = SITE;
  if (isHome) {
    fullTitle = title ? `${title} · ${SITE}` : SITE;
  } else if (breadcrumb) {
    fullTitle = `home / ${breadcrumb} · ${SITE}`;
  } else if (title) {
    fullTitle = `${title} · ${SITE}`;
  }
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description ? (
        <meta name="description" content={description} />
      ) : (
        <meta
          name="description"
          content="Nixsor — compare sports card prices across marketplaces, analytics, alerts, and community."
        />
      )}
    </Helmet>
  );
}
