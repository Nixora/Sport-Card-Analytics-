import { useLanguage } from "../context/LanguageContext.jsx";
import AntdSpinDots from "./AntdSpinDots.jsx";

/**
 * Centered loading block for async API / DB fetches (not route chunk loading).
 * @param {'default'|'section'|'compact'} [variant]
 */
export default function DataLoading({ className = "", variant = "default" }) {
  const { t } = useLanguage();
  const variantClass =
    variant === "section"
      ? "data-loading--section"
      : variant === "compact"
        ? "data-loading--compact"
        : "data-loading--default";

  return (
    <div
      className={`data-loading ${variantClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("common.loading")}
    >
      <AntdSpinDots size={variant === "compact" ? "sm" : "md"} />
    </div>
  );
}
