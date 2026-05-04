import type React from "react";
import type { RookSkill } from "../registry/types";

interface SkillSuggestionCardProps {
  skill: RookSkill;
  whySuggested: string;
  status?: "approved" | "skipped";
  onApprove: (skill: RookSkill) => void;
  onSkip: (skill: RookSkill) => void;
}

export const SkillSuggestionCard: React.FC<SkillSuggestionCardProps> = ({
  skill,
  whySuggested,
  status,
  onApprove,
  onSkip,
}) => {
  return (
    <div className="border border-border bg-card rounded-lg p-4 my-2 text-sm text-card-foreground">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-lg text-card-foreground">Suggested Skill: {skill.name}</h4>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            skill.riskLevel === 'high' ? 'bg-destructive/20 text-destructive' :
            skill.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
            'bg-green-500/20 text-green-600 dark:text-green-400'
          }`}>
            Risk: {skill.riskLevel}
          </span>
          {skill.approvalRequired && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
              Approval Required
            </span>
          )}
        </div>
      </div>

      <p className="mb-3 text-muted-foreground">{skill.description}</p>

      <div className="space-y-2 mb-4">
        <div>
          <span className="font-medium text-foreground">Why suggested:</span>
          <p className="text-muted-foreground">{whySuggested}</p>
        </div>
        <div>
          <span className="font-medium text-foreground">Context used:</span>
          <ul className="list-disc list-inside ml-4 text-muted-foreground">
            {skill.requiredContext.map((ctx) => (
              <li key={ctx}>{ctx}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="font-medium text-foreground">Output:</span>
          <p className="text-muted-foreground">{skill.outputContract}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        {!status ? (
          <>
            <button
              type="button"
              onClick={() => onSkip(skill)}
              className="px-4 py-2 rounded text-muted-foreground hover:bg-muted transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => onApprove(skill)}
              className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Approve
            </button>
          </>
        ) : status === "approved" ? (
          <span className="text-green-600 dark:text-green-400 font-medium py-2">
            Approved for this message.
          </span>
        ) : (
          <span className="text-muted-foreground font-medium py-2">
            Skipped.
          </span>
        )}
      </div>
    </div>
  );
};
