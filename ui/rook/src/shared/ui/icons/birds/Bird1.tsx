export function Bird1({ className = "" }: { className?: string }) {
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
      {/* Body + head + short pointed beak. Compact corvid silhouette,
          no extended neck. Slight asymmetry along the back keeps the
          contour from feeling traced. */}
      <path
        d="M16.4 8.05 L14.6 7.95 C14.35 7.45 13.55 7.05 12.45 7.05 C11.7 7.05 11 7.15 10.45 7.25 C9.7 7.35 8.7 7.55 7.7 7.85 L4.75 8.7 L1.6 9.0 L2.2 9.65 L3.4 10.0 C4.6 10.25 6.6 10.45 8.6 10.4 C10.55 10.35 12.05 9.95 13.45 9.5 C14.0 9.3 14.3 9.1 14.4 8.85 L16.4 8.05 Z"
        fill="currentColor"
      />
      {/* Back wing raised high, three fingered primary tips at the top.
          Notches are intentionally uneven for biological feel. */}
      <path
        d="M7.5 7.85 C6.0 6.1 4.5 4.2 3.45 2.55 L4.0 2.55 L4.2 2.95 L4.6 2.5 L4.85 2.95 L5.25 2.5 L5.5 2.95 C6.25 4.4 7.05 6.15 7.75 7.85 Z"
        fill="currentColor"
      />
      {/* Front wing — smaller, partially occluded by body. Same flap
          phase but a sliver of it peeks out so the bird reads as
          two-winged not one. */}
      <path
        d="M10.85 7.65 C10.35 6.45 10.05 5.4 9.95 4.4 L10.2 4.55 L10.4 4.95 L10.65 4.7 L10.85 5.1 C11.15 6.15 11.5 7.05 11.65 7.75 Z"
        fill="currentColor"
      />
      {/* Tucked foot peeking out under the belly. Tiny but it stops
          the silhouette from looking machine-clean. */}
      <path
        d="M8.5 10.5 L8.4 11.2 L9.15 10.9 Z"
        fill="currentColor"
      />
    </svg>
  );
}
