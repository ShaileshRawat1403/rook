import { useState } from "react";
import type { ColonyArtifact, ColonyArtifactKind } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  Plus,
  X,
  FileText,
  FolderOpen,
  CheckCircle,
  BookOpen,
  Gavel,
  AlertTriangle,
  File,
} from "lucide-react";

const ARTIFACT_KINDS: { value: ColonyArtifactKind; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "handoff_packet", label: "Handoff Packet" },
  { value: "review", label: "Review" },
  { value: "repo_summary", label: "Repo Summary" },
  { value: "decision", label: "Decision" },
  { value: "risk", label: "Risk" },
  { value: "doc", label: "Doc" },
];

const KIND_ICONS: Record<ColonyArtifactKind, typeof FileText> = {
  note: FileText,
  handoff_packet: FolderOpen,
  review: CheckCircle,
  repo_summary: BookOpen,
  decision: Gavel,
  risk: AlertTriangle,
  doc: File,
};

interface ColonyArtifactPanelProps {
  colonyId: string;
  artifacts: ColonyArtifact[];
  tasks: { id: string; title: string }[];
  handoffs: { id: string; summary: string }[];
  seats: { id: string; label: string }[];
  onCreate: (
    artifact: Omit<ColonyArtifact, "id" | "createdAt" | "updatedAt">,
  ) => void;
  onDelete: (artifactId: string) => void;
  onUpdate: (
    artifactId: string,
    patch: Partial<Omit<ColonyArtifact, "id" | "createdAt" | "updatedAt">>,
  ) => void;
  onExtractFromSeat?: (seatId: string) => string | null;
}

export function ColonyArtifactPanel({
  artifacts,
  tasks,
  handoffs,
  seats,
  onCreate,
  onDelete,
  onExtractFromSeat,
}: ColonyArtifactPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ColonyArtifactKind>("note");
  const [content, setContent] = useState("");
  const [sourceTaskId, setSourceTaskId] = useState<string>("");
  const [sourceHandoffId, setSourceHandoffId] = useState<string>("");
  const [sourceSeatId, setSourceSeatId] = useState<string>("");

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    onCreate({
      title: title.trim(),
      kind,
      content: content.trim(),
      sourceTaskId: sourceTaskId || undefined,
      sourceHandoffId: sourceHandoffId || undefined,
      sourceSeatId: sourceSeatId || undefined,
    });
    setTitle("");
    setKind("note");
    setContent("");
    setSourceTaskId("");
    setSourceHandoffId("");
    setSourceSeatId("");
    setShowForm(false);
  };

  const handleFillFromSeat = () => {
    if (!sourceSeatId) {
      alert("Please select a Source Seat to extract from.");
      return;
    }
    if (onExtractFromSeat) {
      const extractedContent = onExtractFromSeat(sourceSeatId);
      if (extractedContent) {
        setContent(extractedContent);
        if (!title) {
          setTitle(
            `Extracted from ${seats.find((s) => s.id === sourceSeatId)?.label}`,
          );
        }
      } else {
        alert("No recent assistant message found for this seat.");
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Saved Outputs</h2>
          <p className="text-sm text-muted-foreground">
            Create artifacts manually or fill content from a linked seat output.
          </p>
        </div>

        <Button onClick={() => setShowForm(!showForm)} type="button" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Saved Output
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New Saved Output</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="colony-artifact-title"
                className="text-sm font-medium"
              >
                Title
              </label>
              <input
                id="colony-artifact-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Saved output title"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="colony-artifact-kind"
                className="text-sm font-medium"
              >
                Kind
              </label>
              <select
                id="colony-artifact-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as ColonyArtifactKind)}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
              >
                {ARTIFACT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="colony-artifact-content"
                className="text-sm font-medium"
              >
                Content
              </label>
              <textarea
                id="colony-artifact-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Saved output content..."
                rows={4}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="colony-artifact-source-task"
                  className="text-xs font-medium"
                >
                  Source Task
                </label>
                <select
                  id="colony-artifact-source-task"
                  value={sourceTaskId}
                  onChange={(e) => setSourceTaskId(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="">None</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="colony-artifact-source-handoff"
                  className="text-xs font-medium"
                >
                  Source Handoff
                </label>
                <select
                  id="colony-artifact-source-handoff"
                  value={sourceHandoffId}
                  onChange={(e) => setSourceHandoffId(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="">None</option>
                  {handoffs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.summary.slice(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="colony-artifact-source-seat"
                  className="text-xs font-medium"
                >
                  Source Seat
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    id="colony-artifact-source-seat"
                    value={sourceSeatId}
                    onChange={(e) => setSourceSeatId(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs flex-1"
                  >
                    <option value="">None</option>
                    {seats.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {onExtractFromSeat && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFillFromSeat}
                      className="text-[10px] h-6 px-2 whitespace-nowrap"
                    >
                      Fill from Seat Output
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                type="button"
                disabled={!title.trim() || !content.trim()}
                size="sm"
              >
                Create
              </Button>
              <Button
                onClick={() => setShowForm(false)}
                type="button"
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {artifacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved outputs yet. Create one manually.
        </p>
      ) : (
        <div className="space-y-2">
          {artifacts.map((artifact) => {
            const Icon = KIND_ICONS[artifact.kind] || FileText;
            return (
              <Card key={artifact.id}>
                <CardContent className="flex items-start justify-between gap-2 p-3">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {artifact.title}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {artifact.kind.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {artifact.content}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(artifact.id)}
                    className="shrink-0 text-muted-foreground hover:text-danger"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
