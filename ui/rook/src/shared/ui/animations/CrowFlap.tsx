interface CrowFlapProps {
  className?: string;
  autoplay?: boolean;
}

export function CrowFlap({ className = "", autoplay = true }: CrowFlapProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <title>Rook</title>
      <path
        d="M6.2 16.7 2.8 18l2.1-2.5-.8-2.4 2.1 1.2"
        fill="currentColor"
        opacity="0.94"
      />
      <path
        d="M11.1 6.8c2.5 0 4.9 1.3 6.1 3.5.9.1 1.7.4 2.5.9l1.5 1.2-2 .4c-.4.1-.8.2-1.2.2a6.5 6.5 0 0 1-5.9 4H8.8c-2.6 0-4.8-1.5-5.8-3.7A2.7 2.7 0 0 1 5 11c.6 0 1.2.2 1.7.5A5.1 5.1 0 0 1 11.1 6.8Z"
        fill="currentColor"
      />
      <g>
        <path
          d="M9.3 11.7c1.5-2.4 3.8-3.7 6.3-3.9-1.1 1.8-1.4 3.4-.9 4.9.4 1.1.2 2.2-.4 3.2-2.2-.4-4-1.7-5-4.2Z"
          fill="currentColor"
          opacity="0.84"
        />
        {autoplay && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 12.4 12.2; -14 12.4 12.2; 0 12.4 12.2"
            dur="0.65s"
            repeatCount="indefinite"
          />
        )}
      </g>
      <path d="m17.4 8.2 3.8 1.2-2.9 1-2.2-.3z" fill="currentColor" />
      <circle cx="15.9" cy="9.8" r="0.7" fill="var(--background, white)" />
    </svg>
  );
}
