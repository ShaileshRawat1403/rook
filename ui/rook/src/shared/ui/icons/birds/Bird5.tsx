export function Bird5({ className = "" }: { className?: string }) {
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
      {/* Body settling back down as the upstroke pulls wings up. */}
      <path
        d="M16.4 7.75 L14.6 7.65 C14.3 7.15 13.55 6.75 12.5 6.75 C11.7 6.75 11.0 6.85 10.45 6.95 C9.7 7.05 8.75 7.25 7.7 7.55 L4.75 8.4 L1.6 8.7 L2.2 9.35 L3.4 9.7 C4.6 9.95 6.6 10.15 8.6 10.1 C10.55 10.05 12.05 9.65 13.45 9.2 C14.0 9.0 14.3 8.8 14.4 8.55 L16.4 7.75 Z"
        fill="currentColor"
      />
      {/* Back wing rising — fingered tips angled mid-back, a touch lower
          than horizontal. Asymmetric notch spacing keeps it organic. */}
      <path
        d="M7.5 7.55 C6.0 8.15 4.55 8.7 3.4 9.15 L3.7 8.85 L4.0 9.4 L4.4 8.85 L4.7 9.4 L5.05 8.85 L5.35 9.4 L5.65 8.95 C6.3 8.5 7.0 8.0 7.75 7.55 Z"
        fill="currentColor"
      />
      {/* Front wing rising. */}
      <path
        d="M10.85 7.5 C10.4 7.9 10.0 8.3 9.65 8.7 L9.85 8.4 L10.1 8.7 L10.35 8.4 L10.55 8.7 C10.95 8.3 11.3 7.9 11.65 7.55 Z"
        fill="currentColor"
      />
      {/* Foot peek again — keeps the bottom edge from being a clean
          curve. */}
      <path
        d="M8.55 10.2 L8.4 10.9 L9.15 10.6 Z"
        fill="currentColor"
      />
    </svg>
  );
}
