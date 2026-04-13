import LoadingHubMark from "./LoadingHubMark.jsx";

/**
 * Center loading mark (vector logo only; no rotating ring).
 */
export default function SegmentedRingLoader({ className = "", size = "md" }) {
  const sizeClass = size === "sm" ? "segmented-ring-loader--sm" : "";

  return (
    <span className={`segmented-ring-loader ${sizeClass} ${className}`.trim()} aria-hidden>
      <LoadingHubMark className="segmented-ring-loader__mark" />
    </span>
  );
}
