import React from "react";
import { RookSkill } from "../registry/types";
import { SkillSuggestionCard } from "./SkillSuggestionCard";

interface SkillSuggestionListProps {
  suggestions: { skill: RookSkill; whySuggested: string }[];
  onApprove: (skill: RookSkill) => void;
  onSkip: (skill: RookSkill) => void;
}

export const SkillSuggestionList: React.FC<SkillSuggestionListProps> = ({
  suggestions,
  onApprove,
  onSkip,
}) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-gray-300 font-medium">
        Rook detected this request may benefit from the following skills. Please review before use.
      </div>
      {suggestions.map(({ skill, whySuggested }) => (
        <SkillSuggestionCard
          key={skill.id}
          skill={skill}
          whySuggested={whySuggested}
          onApprove={onApprove}
          onSkip={onSkip}
        />
      ))}
    </div>
  );
};
