export function Bird2({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="19"
      height="16"
      viewBox="0 0 19 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Body sits slightly higher in the early downstroke. Same compact
          head + beak but a touch lifted; tail wedge same length. */}
      <path
        d="M16.4 7.65 L14.6 7.55 C14.3 7.05 13.55 6.65 12.5 6.65 C11.7 6.65 11.0 6.75 10.45 6.85 C9.7 6.95 8.75 7.15 7.7 7.45 L4.75 8.3 L1.6 8.6 L2.2 9.25 L3.4 9.6 C4.6 9.85 6.6 10.05 8.6 10.0 C10.55 9.95 12.05 9.55 13.45 9.1 C14.0 8.9 14.3 8.7 14.4 8.45 L16.4 7.65 Z"
        fill="currentColor"
      />
      {/* Back wing midway down — leading edge curves down-back, fingered
          primary tips angled outward and back. */}
      <path
        d="M7.5 7.45 C6.0 6.15 4.55 5.0 3.4 4.2 L3.85 4.4 L4.15 4.0 L4.55 4.5 L4.85 4.05 L5.25 4.65 L5.55 4.25 C6.3 5.4 7.05 6.5 7.75 7.45 Z"
        fill="currentColor"
      />
      {/* Front wing — small, also descending. */}
      <path
        d="M10.85 7.4 C10.4 6.4 10.1 5.6 10.0 4.95 L10.25 5.1 L10.45 5.35 L10.65 5.1 L10.85 5.45 C11.15 6.05 11.5 6.85 11.65 7.55 Z"
        fill="currentColor"
      />
      {/* Trailing primary feather floating just behind the back wing tip
          — a tiny motion-blur accent. Adds biological noise. */}
      <path
        d="M3.55 4.25 L2.85 4.5 L3.25 4.7 Z"
        fill="currentColor"
      />
    </svg>
  );
}
