import { useEffect, useId, useState } from "react";
import type { ColonyMemory } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { Plus, X } from "lucide-react";

interface ColonyMemoryPanelProps {
  colonyId: string;
  memory: ColonyMemory | undefined;
  onUpdateMemory: (patch: Partial<ColonyMemory>) => void;
  onAddItem: (
    section: keyof Omit<ColonyMemory, "updatedAt">,
    text: string,
  ) => void;
  onRemoveItem: (
    section: keyof Omit<ColonyMemory, "updatedAt">,
    index: number,
  ) => void;
}

type MemoryListSection = Exclude<
  keyof ColonyMemory,
  "projectSummary" | "updatedAt"
>;

const LIST_SECTIONS: MemoryListSection[] = [
  "repoNotes",
  "decisions",
  "constraints",
  "risks",
  "openQuestions",
];

const SECTION_LABELS: Record<MemoryListSection, string> = {
  repoNotes: "Repo Notes",
  decisions: "Decisions",
  constraints: "Constraints",
  risks: "Risks",
  openQuestions: "Open Questions",
};

export function ColonyMemoryPanel({
  memory,
  onUpdateMemory,
  onAddItem,
  onRemoveItem,
}: ColonyMemoryPanelProps) {
  const inputIdPrefix = useId();
  const [newItems, setNewItems] = useState<
    Partial<Record<MemoryListSection, string>>
  >({});
  const [summaryDraft, setSummaryDraft] = useState(
    memory?.projectSummary ?? "",
  );

  const handleSaveSummary = () => {
    onUpdateMemory({ projectSummary: summaryDraft });
  };

  useEffect(() => {
    setSummaryDraft(memory?.projectSummary ?? "");
  }, [memory?.projectSummary]);

  const handleAddItem = (section: MemoryListSection) => {
    const text = newItems[section]?.trim();
    if (!text) return;
    onAddItem(section, text);
    setNewItems((prev) => ({ ...prev, [section]: "" }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    section: MemoryListSection,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddItem(section);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Colony Memory</CardTitle>
        <p className="text-xs text-muted-foreground">
          Persistent notes for this workspace. Visible, editable, and
          user-controlled.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <label
            htmlFor={`${inputIdPrefix}-summary`}
            className="text-sm font-medium"
          >
            Project Summary
          </label>
          <Textarea
            id={`${inputIdPrefix}-summary`}
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            placeholder="What is this project about?"
            className="min-h-[80px] resize-none text-sm mt-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSaveSummary}
            disabled={summaryDraft === (memory?.projectSummary ?? "")}
            className="mt-2"
          >
            Save Summary
          </Button>
        </div>

        {LIST_SECTIONS.map((section) => {
          const items = memory?.[section] ?? [];
          const itemsArray = Array.isArray(items) ? items : [];
          const inputId = `${inputIdPrefix}-${section}`;
          return (
            <div key={section}>
              <label htmlFor={inputId} className="text-sm font-medium">
                {SECTION_LABELS[section]}
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  id={inputId}
                  type="text"
                  value={newItems[section] ?? ""}
                  onChange={(e) =>
                    setNewItems((prev) => ({
                      ...prev,
                      [section]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => handleKeyDown(e, section)}
                  placeholder={`Add ${SECTION_LABELS[section].toLowerCase()}...`}
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAddItem(section)}
                  disabled={!newItems[section]?.trim()}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {itemsArray.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {itemsArray.map((item, idx) => (
                    <li
                      key={`${section}-${item}`}
                      className="flex items-center justify-between gap-2 rounded border border-border bg-muted/30 px-2 py-1 text-xs"
                    >
                      <span className="flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(section, idx)}
                        className="text-muted-foreground hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
