import Lottie from "lottie-react";
import animationData from "./crow-flap.json";

interface CrowFlapProps {
  className?: string;
}

export function CrowFlap({ className = "" }: CrowFlapProps) {
  return (
    <Lottie animationData={animationData} className={className} loop autoplay />
  );
}
