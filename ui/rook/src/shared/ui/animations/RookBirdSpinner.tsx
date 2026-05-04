import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  cycleInterval = 120, // Slightly faster for smoother motion
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
    <div className={`relative flex items-center justify-center ${frameSizeClass} ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentFrameIndex}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.8 }}
          transition={{ duration: cycleInterval / 1000 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <CurrentFrame className={frameSizeClass} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
