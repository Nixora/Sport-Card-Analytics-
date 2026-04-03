import { Link } from "react-router-dom";

/** Opens the card detail page. */
export default function CardTitleLink({ cardKey, text, maxLen, className }) {
  const full = text || cardKey || "";
  const cap = maxLen ?? 88;
  const label = full.length > cap ? `${full.slice(0, cap)}…` : full;
  return (
    <Link
      className={className}
      to={`/cards/${encodeURIComponent(cardKey)}`}
      title="Open card detail"
    >
      {label}
    </Link>
  );
}
