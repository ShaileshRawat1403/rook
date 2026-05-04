import React from "react";
import { RookSkill } from "../registry/types";

interface SkillSuggestionCardProps {
  skill: RookSkill;
  whySuggested: string;
  onApprove: (skill: RookSkill) => void;
  onSkip: (skill: RookSkill) => void;
}

export const SkillSuggestionCard: React.FC<SkillSuggestionCardProps> = ({
  skill,
  whySuggested,
  onApprove,
  onSkip,
}) => {
  return (
    <div className="border border-gray-700 bg-gray-900 rounded-lg p-4 my-2 text-sm text-gray-200">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-lg text-white">Suggested Skill: {skill.name}</h4>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            skill.riskLevel === 'high' ? 'bg-red-900 text-red-200' :
            skill.riskLevel === 'medium' ? 'bg-yellow-900 text-yellow-200' :
            'bg-green-900 text-green-200'
          }`}>
            Risk: {skill.riskLevel}
          </span>
          {skill.approvalRequired && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900 text-blue-200">
              Approval Required
            </span>
          )}
        </div>
      </div>

      <p className="mb-3 text-gray-400">{skill.description}</p>

      <div className="space-y-2 mb-4">
        <div>
          <span className="font-medium text-gray-300">Why suggested:</span>
          <p className="text-gray-400">{whySuggested}</p>
        </div>
        <div>
          <span className="font-medium text-gray-300">Context used:</span>
          <ul className="list-disc list-inside ml-4 text-gray-400">
            {skill.requiredContext.map((ctx, idx) => (
              <li key={idx}>{ctx}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="font-medium text-gray-300">Output:</span>
          <p className="text-gray-400">{skill.outputContract}</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={() => onSkip(skill)}
          className="px-4 py-2 rounded text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => onApprove(skill)}
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          Approve
        </button>
      </div>
    </div>
  );
};
