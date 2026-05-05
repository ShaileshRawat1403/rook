import { useState } from "react";
import type {
  ColonyArtifact,
  ColonyArtifactKind,
} from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Plus, X, FileText, FolderOpen, CheckCircle, BookOpen, Gavel, AlertTriangle, File } from "lucide-react";

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
  seats: { id: string; label: string }[];
  onCreate: (artifact: Omit<ColonyArtifact, "id" | "createdAt" | "updatedAt">) => void;
  onDelete: (artifactId: string) => void;
  onUpdate: (artifactId: string, patch: Partial<Omit<ColonyArtifact, "id" | "createdAt" | "updatedAt">>) => void;
}

export function ColonyArtifactPanel({
  artifacts,
  tasks,
  seats,
  onCreate,
  onDelete,
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

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Artifacts</h2>
          <p className="text-sm text-muted-foreground">
            Manual artifact capture. No automatic creation.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} type="button" size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add Artifact
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">New Artifact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Artifact title"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Kind</label>
              <select
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
              <label className="text-sm font-medium">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Artifact content..."
                rows={4}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium">Source Task</label>
                <select
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
                <label className="text-xs font-medium">Source Handoff</label>
                <select
                  value={sourceHandoffId}
                  onChange={(e) => setSourceHandoffId(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="">None</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Source Seat</label>
                <select
                  value={sourceSeatId}
                  onChange={(e) => setSourceSeatId(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="">None</option>
                  {seats.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
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
        <p className="text-sm text-muted-foreground">No artifacts yet. Create one manually.</p>
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
                      <p className="text-sm font-medium truncate">{artifact.title}</p>
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