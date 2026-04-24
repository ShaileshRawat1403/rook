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
      <path
        d="M 3 22 L 21 22 L 21 19 L 19 19 L 19 6 L 20 6 L 20 3 L 16 3 L 16 4.5 L 14 4.5 L 14 3 L 10 3 L 10 4.5 L 8 4.5 L 8 3 L 4 3 L 4 6 L 5 6 L 5 19 L 3 19 Z"
        fill="currentColor"
      />
    </svg>
  );
}
