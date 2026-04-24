import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRookTextAnimator } from "./useRookTextAnimator";

interface RookGreetingProps {
  className?: string;
  forceRefresh?: boolean;
}

const GREETING_KEYS = [
  "greeting.readyToGetStarted",
  "greeting.whatToWorkOn",
  "greeting.readyToBuild",
  "greeting.whatToExplore",
  "greeting.whatsOnYourMind",
  "greeting.whatShallWeCreate",
  "greeting.whatProjectNeedsAttention",
  "greeting.whatToTackle",
  "greeting.whatNeedsToBeDone",
  "greeting.whatsThePlan",
  "greeting.readyToCreateGreat",
  "greeting.whatCanBeBuilt",
  "greeting.whatsNextChallenge",
  "greeting.whatProgress",
  "greeting.whatToAccomplish",
  "greeting.whatTaskAwaits",
  "greeting.whatsTheMission",
  "greeting.whatCanBeAchieved",
  "greeting.whatProjectReadyToBegin",
] as const;

export function RookGreeting({
  className = "mt-1 text-4xl font-light",
  forceRefresh = false,
}: RookGreetingProps) {
  const { t } = useTranslation("home");
  const greetingKey = useState(() => {
    const randomIndex = Math.floor(Math.random() * GREETING_KEYS.length);
    return GREETING_KEYS[randomIndex];
  })[0];

  const greetingText = t(greetingKey);
  const messageRef = useRookTextAnimator({ text: greetingText });

  return (
    <h1 className={className} key={forceRefresh ? Date.now() : undefined}>
      <span ref={messageRef}>{greetingText}</span>
    </h1>
  );
}
