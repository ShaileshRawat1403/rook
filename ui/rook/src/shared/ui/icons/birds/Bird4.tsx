export function Bird4({ className = "" }: { className?: string }) {
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
      {/* Body still high — peak downstroke pushes the corvid up the
          most. Tail wedge slightly tucked. */}
      <path
        d="M16.45 7.45 L14.6 7.35 C14.3 6.85 13.55 6.45 12.5 6.45 C11.7 6.45 11.0 6.55 10.45 6.65 C9.7 6.75 8.75 6.95 7.7 7.25 L4.75 8.1 L1.7 8.4 L2.25 9.05 L3.45 9.4 C4.65 9.65 6.65 9.85 8.6 9.8 C10.55 9.75 12.05 9.35 13.45 8.9 C14.0 8.7 14.3 8.5 14.4 8.25 L16.45 7.45 Z"
        fill="currentColor"
      />
      {/* Back wing fully down — finger primaries point downward and
          slightly back, three uneven notches visible at the bottom edge
          of the wing tip. */}
      <path
        d="M7.5 7.25 C6.0 8.5 4.55 10.55 3.4 12.4 L2.95 12.1 L3.4 12.6 L3.85 12.0 L4.2 12.65 L4.65 12.05 L5.0 12.7 L5.4 12.25 C6.2 10.5 7.05 8.7 7.75 7.3 Z"
        fill="currentColor"
      />
      {/* Front wing also down, smaller fan of fingertips. */}
      <path
        d="M10.85 7.2 C10.4 8.45 10.0 9.6 9.65 11.0 L9.9 10.7 L10.2 11.2 L10.45 10.7 L10.7 11.15 C10.95 9.85 11.35 8.55 11.65 7.35 Z"
        fill="currentColor"
      />
      {/* Single drift feather behind the body — implies wind off the
          peak downstroke. No foot visible in this frame, varies the
          rhythm. */}
      <path
        d="M2.5 9.05 L1.7 9.4 L2.3 9.55 Z"
        fill="currentColor"
      />
    </svg>
  );
}
