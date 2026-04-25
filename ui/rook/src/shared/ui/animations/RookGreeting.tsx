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
  "greeting.readyToGetStarted": "Ready to get started?",
  "greeting.whatToWorkOn": "What would you like to work on?",
  "greeting.readyToBuild": "Ready to build something amazing?",
  "greeting.whatToExplore": "What would you like to explore?",
  "greeting.whatsOnYourMind": "What's on your mind?",
  "greeting.whatShallWeCreate": "What shall we create today?",
  "greeting.whatProjectNeedsAttention": "What project needs attention?",
  "greeting.whatToTackle": "What would you like to tackle?",
  "greeting.whatNeedsToBeDone": "What needs to be done?",
  "greeting.whatsThePlan": "What's the plan for today?",
  "greeting.readyToCreateGreat": "Ready to create something great?",
  "greeting.whatCanBeBuilt": "What can be built today?",
  "greeting.whatsNextChallenge": "What's the next challenge?",
  "greeting.whatProgress": "What progress can be made?",
  "greeting.whatToAccomplish": "What would you like to accomplish?",
  "greeting.whatTaskAwaits": "What task awaits?",
  "greeting.whatsTheMission": "What's the mission today?",
  "greeting.whatCanBeAchieved": "What can be achieved?",
  "greeting.whatProjectReadyToBegin": "What project is ready to begin?",
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
