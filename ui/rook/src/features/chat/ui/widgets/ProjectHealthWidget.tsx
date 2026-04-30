import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { IconActivity } from "@tabler/icons-react";
import { toast } from "sonner";
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

function shortenWorkspacePath(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  if (segments.length <= 3) return path;
  return `…/${segments.slice(-3).join("/")}`;
}

async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function InlineRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-foreground-subtle">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">
        {value}
      </span>
    </div>
  );
}

function StackedRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-foreground-subtle">{label}</div>
      <div className="min-w-0 text-foreground">{children}</div>
    </div>
  );
}

function CopyableValue({
  display,
  copy,
  ariaLabel,
  toastMessage,
}: {
  display: React.ReactNode;
  copy: string;
  ariaLabel: string;
  toastMessage: string;
}) {
  const { t } = useTranslation("chat");
  const handleClick = useCallback(() => {
    void copyToClipboard(copy).then((ok) => {
      if (ok) {
        toast.success(toastMessage);
      } else {
        toast.error(t("contextPanel.commands.copyFailed"));
      }
    });
  }, [copy, toastMessage, t]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      title={copy}
      className="block w-full truncate rounded-sm text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {display}
    </button>
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
  const branchName = gitState?.isGitRepo
    ? (gitState.currentBranch ?? t("contextPanel.states.detached"))
    : null;
  const statusValue = gitState?.isGitRepo
    ? totals.changed === 0
      ? t("contextPanel.health.noChanges")
      : t("contextPanel.health.changesSummary", {
          count: totals.changed,
          additions: totals.additions,
          deletions: totals.deletions,
        })
    : t("contextPanel.health.notAGitRepo");

  const packageManagerValue =
    detection?.packageManager ?? t("contextPanel.health.unknown");
  const manifestsValue =
    detection?.manifests && detection.manifests.length > 0
      ? detection.manifests.join(", ")
      : t("contextPanel.health.unknown");

  const showGitSkeleton = isGitLoading && !gitState;
  const showDetectionSkeleton = isDetectionLoading && !detection;

  return (
    <Widget
      title={t("contextPanel.widgets.health")}
      icon={<IconActivity className="size-3.5" />}
    >
      <div className="space-y-2">
        <StackedRow label={t("contextPanel.health.path")}>
          <CopyableValue
            display={
              <span className="block truncate font-mono text-xxs">
                {shortenWorkspacePath(workspacePath)}
              </span>
            }
            copy={workspacePath}
            ariaLabel={t("contextPanel.health.copyPath")}
            toastMessage={t("contextPanel.health.pathCopied")}
          />
        </StackedRow>

        <StackedRow label={t("contextPanel.health.branch")}>
          {showGitSkeleton ? (
            <Skeleton className="h-3 w-24" />
          ) : branchName ? (
            <CopyableValue
              display={
                <span className="block truncate font-mono text-xxs">
                  {branchName}
                </span>
              }
              copy={branchName}
              ariaLabel={t("contextPanel.health.copyBranch")}
              toastMessage={t("contextPanel.health.branchCopied")}
            />
          ) : (
            <span className="text-foreground-subtle">
              {t("contextPanel.health.notAGitRepo")}
            </span>
          )}
        </StackedRow>

        <div className="space-y-1.5 border-t border-border pt-2">
          <InlineRow
            label={t("contextPanel.health.status")}
            value={
              showGitSkeleton ? (
                <Skeleton className="ml-auto h-3 w-20" />
              ) : (
                statusValue
              )
            }
          />
          <InlineRow
            label={t("contextPanel.health.packageManager")}
            value={
              showDetectionSkeleton ? (
                <Skeleton className="ml-auto h-3 w-12" />
              ) : (
                packageManagerValue
              )
            }
          />
          <InlineRow
            label={t("contextPanel.health.manifests")}
            value={
              showDetectionSkeleton ? (
                <Skeleton className="ml-auto h-3 w-24" />
              ) : (
                manifestsValue
              )
            }
          />
        </div>
      </div>
    </Widget>
  );
}
