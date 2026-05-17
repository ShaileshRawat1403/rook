import type React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("skills");

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 mb-4 mx-4">
      <div className="text-muted-foreground font-medium">
        {t("suggestions.intro")}
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
