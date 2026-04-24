export function RookIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <title>Rook</title>
      <path
        d="M420,180 C480,140 580,120 680,140 C720,150 780,180 820,240 C860,300 880,400 860,500 C840,600 780,720 700,800 C620,880 500,940 400,960 C300,980 180,940 100,860 C40,800 20,700 40,600 C60,500 120,420 180,380 C240,340 340,320 420,340 L420,180 Z"
        fill="currentColor"
      />
      <path
        d="M420,180 C400,160 360,140 320,140 C280,140 240,160 220,180 C200,200 190,240 200,280 C210,320 240,360 280,380 C320,400 360,400 400,380 L420,180 Z"
        fill="currentColor"
      />
      <circle cx="320" cy="250" r="25" fill="#000000" fillOpacity="0.5" />
    </svg>
  );
}
