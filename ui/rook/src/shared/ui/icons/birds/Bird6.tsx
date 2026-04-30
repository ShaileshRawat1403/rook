export function Bird6({ className = "" }: { className?: string }) {
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
      {/* Body matches frame 1's resting line — the cycle should land
          here so frame 1 follows naturally without a visible jump. */}
      <path
        d="M16.4 8.0 L14.6 7.9 C14.3 7.4 13.55 7.0 12.5 7.0 C11.7 7.0 11.0 7.1 10.45 7.2 C9.7 7.3 8.75 7.5 7.7 7.8 L4.75 8.65 L1.6 8.95 L2.2 9.6 L3.4 9.95 C4.6 10.2 6.6 10.4 8.6 10.35 C10.55 10.3 12.05 9.9 13.45 9.45 C14.0 9.25 14.3 9.05 14.4 8.8 L16.4 8.0 Z"
        fill="currentColor"
      />
      {/* Back wing climbing high again, fingered primaries angle
          upward and back. Very slight offset from frame 1 so the loop
          breathes instead of snapping. */}
      <path
        d="M7.5 7.8 C6.0 6.4 4.55 5.25 3.4 4.45 L3.85 4.65 L4.15 4.25 L4.55 4.7 L4.85 4.3 L5.25 4.85 L5.55 4.45 C6.3 5.45 7.05 6.6 7.75 7.8 Z"
        fill="currentColor"
      />
      {/* Front wing climbing. */}
      <path
        d="M10.85 7.7 C10.4 6.65 10.1 5.95 10.0 5.35 L10.25 5.45 L10.45 5.65 L10.65 5.45 L10.85 5.7 C11.15 6.3 11.5 7.0 11.65 7.75 Z"
        fill="currentColor"
      />
      {/* Drift feather above the back wing — wind catches the rising
          tip. Different position from frame 2's drift feather so the
          two are visually distinct accents, not the same artifact. */}
      <path
        d="M3.7 4.55 L3.0 4.85 L3.4 5.0 Z"
        fill="currentColor"
      />
    </svg>
  );
}
