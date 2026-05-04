import type React from "react";
import type { RookSkill } from "../registry/types";
import { SkillSuggestionCard } from "./SkillSuggestionCard";

interface SkillSuggestionListProps {
  suggestions: { skill: RookSkill; whySuggested: string }[];
  skillStatuses: Record<string, "approved" | "skipped">;
  onApprove: (skill: RookSkill) => void;
  onSkip: (skill: RookSkill) => void;
}

export const SkillSuggestionList: React.FC<SkillSuggestionListProps> = ({
  suggestions,
  skillStatuses,
  onApprove,
  onSkip,
}) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 mb-4 mx-4">
      <div className="text-muted-foreground font-medium">
        Rook can suggest skills for this request. Nothing runs until you approve.
      </div>
      {suggestions.map(({ skill, whySuggested }) => (
        <SkillSuggestionCard
          key={skill.id}
          skill={skill}
          whySuggested={whySuggested}
          status={skillStatuses[skill.id]}
          onApprove={onApprove}
          onSkip={onSkip}
        />
      ))}
    </div>
  );
};
