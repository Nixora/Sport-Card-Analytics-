import { useId } from "react";

/**
 * Vector loading mark: stacked cards + trend spark + Nixsora wordmark (no raster).
 */
export default function LoadingHubMark({ className = "" }) {
  const gradId = `nixsora-hub-grad-${useId().replace(/:/g, "")}`;

  return (
    <svg
      className={`loading-hub-mark ${className}`.trim()}
      viewBox="0 0 124 32"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="32" y1="8" x2="120" y2="26" gradientUnits="userSpaceOnUse">
          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from="0 76 17"
            to="360 76 17"
            dur="3.2s"
            repeatCount="indefinite"
          />
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="22%" stopColor="#FF8C42" />
          <stop offset="42%" stopColor="#FF6B35" />
          <stop offset="58%" stopColor="#4EC3FF" />
          <stop offset="78%" stopColor="#9FD4FF" />
          <stop offset="100%" stopColor="#F5FAFF" />
        </linearGradient>
      </defs>
      <g transform="translate(1,3)">
        <rect
          x="7"
          y="5"
          width="17"
          height="21"
          rx="2.2"
          fill="#0b3d5c"
          stroke="rgba(100, 180, 240, 0.35)"
          strokeWidth="0.7"
          transform="rotate(-14 15.5 15.5)"
        />
        <rect
          x="3.5"
          y="2.5"
          width="17"
          height="21"
          rx="2.2"
          fill="#0f5580"
          stroke="rgba(126, 200, 255, 0.5)"
          strokeWidth="0.75"
          transform="rotate(-5 12 13)"
        />
        <rect
          x="0"
          y="0"
          width="17"
          height="21"
          rx="2.2"
          fill="#1476a3"
          stroke="#9fd4ff"
          strokeWidth="0.85"
        />
        <path
          d="M3.5 15.5 L7.5 11.5 L10.2 12.8 L14.2 7.2"
          stroke="#FFD700"
          strokeWidth="1.65"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14.2" cy="7.2" r="2.1" fill="#FFB020" />
        <circle cx="14.2" cy="7.2" r="0.9" fill="#fff8dc" opacity="0.9" />
      </g>
      <text
        x="34"
        y="22.5"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize="18"
        fontWeight="800"
        fontStyle="italic"
        fill={`url(#${gradId})`}
        stroke="#061a2a"
        strokeWidth="0.45"
        paintOrder="stroke fill"
      >
        Nixsora
      </text>
    </svg>
  );
}
