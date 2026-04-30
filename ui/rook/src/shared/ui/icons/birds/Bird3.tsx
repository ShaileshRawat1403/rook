export function Bird3({ className = "" }: { className?: string }) {
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
      {/* Body at peak height — wings driving downward push the corvid up.
          Beak slightly tilted, the way a real flapping bird angles its
          head into the dive. */}
      <path
        d="M16.45 7.5 L14.6 7.45 C14.3 6.95 13.55 6.55 12.5 6.55 C11.7 6.55 11.0 6.65 10.45 6.75 C9.7 6.85 8.75 7.05 7.7 7.35 L4.75 8.2 L1.6 8.5 L2.2 9.15 L3.4 9.5 C4.6 9.75 6.6 9.95 8.6 9.9 C10.55 9.85 12.05 9.45 13.45 9.0 C14.0 8.8 14.3 8.6 14.4 8.35 L16.45 7.5 Z"
        fill="currentColor"
      />
      {/* Back wing nearly horizontal — fingered primaries fan out behind
          the body. The 3 finger notches are most visible in this frame
          and they read as the corvid signature. */}
      <path
        d="M7.5 7.35 C5.95 7.05 4.4 6.85 3.0 6.75 L3.4 6.4 L3.7 6.95 L4.15 6.5 L4.5 7.05 L4.95 6.55 L5.3 7.15 L5.7 6.75 C6.3 6.95 7.0 7.15 7.7 7.35 Z"
        fill="currentColor"
      />
      {/* Front wing — also horizontal, smaller fingertip set since
          partly hidden by body. */}
      <path
        d="M10.85 7.3 C10.4 7.05 10.0 6.85 9.65 6.75 L9.85 6.55 L10.1 6.85 L10.4 6.6 L10.6 6.9 C10.95 7.05 11.3 7.2 11.65 7.3 Z"
        fill="currentColor"
      />
      {/* Foot — tucked under, peeks out as a tiny anchor. */}
      <path
        d="M8.55 9.95 L8.4 10.65 L9.15 10.4 Z"
        fill="currentColor"
      />
    </svg>
  );
}
