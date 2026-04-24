export function Bird4({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="16"
      viewBox="0 0 18 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="9" cy="8.5" rx="1.3" ry="2.6" fill="currentColor" />
      <circle cx="9" cy="5.2" r="1.1" fill="currentColor" />
      <path d="M 9 3.6 L 9.5 4.4 L 8.5 4.4 Z" fill="currentColor" />
      <path d="M 9 11 L 10.8 12.8 L 9 12 L 7.2 12.8 Z" fill="currentColor" />
      <path
        d="M 7.8 8.2 Q 5 9.5 2.5 11 Q 5.5 10 8.1 8.8 Z"
        fill="currentColor"
      />
      <path
        d="M 10.2 8.2 Q 13 9.5 15.5 11 Q 12.5 10 9.9 8.8 Z"
        fill="currentColor"
      />
    </svg>
  );
}
