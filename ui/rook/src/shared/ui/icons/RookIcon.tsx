export function RookIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <title>Rook</title>
      <ellipse cx="12" cy="12" rx="1.8" ry="3.6" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
      <path d="M 12 5.5 L 12.7 6.8 L 11.3 6.8 Z" fill="currentColor" />
      <path
        d="M 12 15.2 L 14.5 17.7 L 12 16.5 L 9.5 17.7 Z"
        fill="currentColor"
      />
      <path
        d="M 10.4 10.8 Q 5.5 10 1 11 Q 5.5 12.8 10.8 12.5 Z"
        fill="currentColor"
      />
      <path
        d="M 13.6 10.8 Q 18.5 10 23 11 Q 18.5 12.8 13.2 12.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}
