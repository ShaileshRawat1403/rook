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

const GREETING_FALLBACKS: Record<(typeof GREETING_KEYS)[number], string> = {
  "greeting.readyToGetStarted": "Act, but observe first.",
  "greeting.whatToWorkOn": "Move fast, but leave evidence.",
  "greeting.readyToBuild": "Delegate the task, not the judgment.",
  "greeting.whatToExplore": "The rook watches before it moves.",
  "greeting.whatsOnYourMind": "A shortcut still needs footprints.",
  "greeting.whatShallWeCreate": "Turn intent into accountable action.",
  "greeting.whatProjectNeedsAttention": "Let the quiet risk make noise.",
  "greeting.whatToTackle": "Untangle before you execute.",
  "greeting.whatNeedsToBeDone": "Turn the diff into a decision.",
  "greeting.whatsThePlan": "Make the plan accountable.",
  "greeting.readyToCreateGreat": "Coordinate the colony.",
  "greeting.whatCanBeBuilt": "Build without losing the trail.",
  "greeting.whatsNextChallenge": "Surface the release risk.",
  "greeting.whatProgress": "Check the work before it ships.",
  "greeting.whatToAccomplish": "Connect the task to the trail.",
  "greeting.whatTaskAwaits": "Make the change explainable.",
  "greeting.whatsTheMission": "Bring the source of truth closer.",
  "greeting.whatCanBeAchieved": "Trace the commit back to intent.",
  "greeting.whatProjectReadyToBegin": "Give the run a reason.",
};

export function RookGreeting({
  className = "mt-1 text-4xl font-light",
  forceRefresh = false,
}: RookGreetingProps) {
  const { t } = useTranslation("home");
  const greetingKey = useState(() => {
    const randomIndex = Math.floor(Math.random() * GREETING_KEYS.length);
    return GREETING_KEYS[randomIndex];
  })[0];

  const greetingText = t(greetingKey, {
    defaultValue: GREETING_FALLBACKS[greetingKey],
  });
  const messageRef = useRookTextAnimator({ text: greetingText });

  return (
    <h1 className={className} key={forceRefresh ? Date.now() : undefined}>
      <span ref={messageRef}>{greetingText}</span>
    </h1>
  );
}
