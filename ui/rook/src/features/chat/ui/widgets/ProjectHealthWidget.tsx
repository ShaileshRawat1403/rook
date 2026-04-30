import { useTranslation } from "react-i18next";
import { IconActivity } from "@tabler/icons-react";
import type { ChangedFile, GitState } from "@/shared/types/git";
import { Skeleton } from "@/shared/ui/skeleton";
import type { ProjectDetection } from "@/features/projects/lib/detectProject";
import { Widget } from "./Widget";

interface ProjectHealthWidgetProps {
  workspacePath: string | null;
  gitState: GitState | undefined;
  isGitLoading: boolean;
  changedFiles: ChangedFile[] | undefined;
  detection: ProjectDetection | undefined;
  isDetectionLoading: boolean;
}

function shortenWorkspacePath(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  if (segments.length <= 2) return path;
  return `…/${segments.slice(-2).join("/")}`;
}

function totalsFromFiles(files: ChangedFile[] | undefined) {
  if (!files?.length) return { changed: 0, additions: 0, deletions: 0 };
  return files.reduce(
    (acc, f) => ({
      changed: acc.changed + 1,
      additions: acc.additions + f.additions,
      deletions: acc.deletions + f.deletions,
    }),
    { changed: 0, additions: 0, deletions: 0 },
  );
}

interface RowProps {
  label: string;
  value: React.ReactNode;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-foreground-subtle">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">
        {value}
      </span>
    </div>
  );
}

export function ProjectHealthWidget({
  workspacePath,
  gitState,
  isGitLoading,
  changedFiles,
  detection,
  isDetectionLoading,
}: ProjectHealthWidgetProps) {
  const { t } = useTranslation("chat");

  if (!workspacePath) {
    return (
      <Widget
        title={t("contextPanel.widgets.health")}
        icon={<IconActivity className="size-3.5" />}
      >
        <p className="text-foreground-subtle">
          {t("contextPanel.empty.folderNotSet")}
        </p>
      </Widget>
    );
  }

  const totals = totalsFromFiles(changedFiles);
  const branchValue = gitState?.isGitRepo
    ? (gitState.currentBranch ?? t("contextPanel.states.detached"))
    : t("contextPanel.health.notAGitRepo");

  const changesValue = gitState?.isGitRepo
    ? totals.changed === 0
      ? t("contextPanel.health.noChanges")
      : t("contextPanel.health.changesSummary", {
          count: totals.changed,
          additions: totals.additions,
          deletions: totals.deletions,
        })
    : "—";

  const packageManagerValue =
    detection?.packageManager ?? t("contextPanel.health.unknown");

  const manifestsValue =
    detection?.manifests && detection.manifests.length > 0
      ? detection.manifests.join(", ")
      : t("contextPanel.health.unknown");

  return (
    <Widget
      title={t("contextPanel.widgets.health")}
      icon={<IconActivity className="size-3.5" />}
    >
      <div className="space-y-1.5">
        <Row
          label={t("contextPanel.health.path")}
          value={
            <span title={workspacePath}>
              {shortenWorkspacePath(workspacePath)}
            </span>
          }
        />
        <Row
          label={t("contextPanel.health.branch")}
          value={
            isGitLoading && !gitState ? (
              <Skeleton className="ml-auto h-3 w-16" />
            ) : (
              branchValue
            )
          }
        />
        <Row
          label={t("contextPanel.health.changes")}
          value={
            isGitLoading && !gitState ? (
              <Skeleton className="ml-auto h-3 w-20" />
            ) : (
              changesValue
            )
          }
        />
        <Row
          label={t("contextPanel.health.packageManager")}
          value={
            isDetectionLoading && !detection ? (
              <Skeleton className="ml-auto h-3 w-12" />
            ) : (
              packageManagerValue
            )
          }
        />
        <Row
          label={t("contextPanel.health.manifests")}
          value={
            isDetectionLoading && !detection ? (
              <Skeleton className="ml-auto h-3 w-24" />
            ) : (
              manifestsValue
            )
          }
        />
      </div>
    </Widget>
  );
}
