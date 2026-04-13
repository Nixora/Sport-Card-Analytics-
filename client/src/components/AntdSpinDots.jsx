/**
 * App loading indicator: vector logo mark (see SegmentedRingLoader).
 * Pair with aria-live on a parent when used alone.
 */
import SegmentedRingLoader from "./SegmentedRingLoader.jsx";

export default function AntdSpinDots({ className = "", size = "md" }) {
  return <SegmentedRingLoader className={className} size={size} />;
}
