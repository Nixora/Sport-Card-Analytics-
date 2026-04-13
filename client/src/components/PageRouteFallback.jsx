import AntdSpinDots from "./AntdSpinDots.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

/** Shown by React Suspense while a lazy route chunk is loading. */
export default function PageRouteFallback() {
  const { t } = useLanguage();
  return (
    <div
      className="page-route-fallback"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <AntdSpinDots />
    </div>
  );
}
