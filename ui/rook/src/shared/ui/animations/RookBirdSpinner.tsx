import { useState, useEffect } from "react";
import {
  Bird1,
  Bird2,
  Bird3,
  Bird4,
  Bird5,
  Bird6,
} from "@/shared/ui/icons/birds";

interface RookBirdSpinnerProps {
  className?: string;
  cycleInterval?: number;
  /** Size class for each frame. Defaults to a more legible 28px chat spinner. */
  frameSizeClass?: string;
}

const birdFrames = [Bird1, Bird2, Bird3, Bird4, Bird5, Bird6];

export function RookBirdSpinner({
  className = "",
  cycleInterval = 150,
  frameSizeClass = "w-7 h-7",
}: RookBirdSpinnerProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => (prevIndex + 1) % birdFrames.length);
    }, cycleInterval);

    return () => clearInterval(interval);
  }, [cycleInterval]);

  const CurrentFrame = birdFrames[currentFrameIndex];

  return (
    <div className={`transition-opacity duration-75 ${className}`}>
      <CurrentFrame className={frameSizeClass} />
    </div>
  );
}
