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
        d="M 2 10.5
           L 6 11
           C 6 9, 10 8, 14 8
           C 16 8, 18 8.5, 19 10
           L 22 11
           L 18 12
           C 16 13, 14 13.5, 11 13.5
           C 9 13.5, 7 13.5, 6 13
           L 2 13.5
           L 4 12
           Z"
        fill="currentColor"
      />
    </svg>
  );
}
