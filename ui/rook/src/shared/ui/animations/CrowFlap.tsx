import Lottie from "lottie-react";
import animationData from "./crow-flap.json";

interface CrowFlapProps {
  className?: string;
  autoplay?: boolean;
}

const hasLottie =
  Array.isArray(animationData.layers) && animationData.layers.length > 0;

export function CrowFlap({ className = "", autoplay = true }: CrowFlapProps) {
  if (hasLottie) {
    return (
      <Lottie
        animationData={animationData}
        className={className}
        loop={autoplay}
        autoplay={autoplay}
      />
    );
  }

  return <StaticCrow className={className} />;
}

function StaticCrow({ className = "" }: { className?: string }) {
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
        d="M 3 11
           L 8 10
           C 12 9, 14 10, 16 12
           L 20 14
           L 22 18
           L 20 16
           L 21 19
           L 19 17
           L 20 20
           L 18 17.5
           C 14 17, 10 16, 8 14
           C 6 13, 4 12, 3 11
           Z"
        fill="currentColor"
      />
    </svg>
  );
}
