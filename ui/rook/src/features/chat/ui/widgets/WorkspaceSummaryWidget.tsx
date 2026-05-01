import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconCopy, IconStack2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import type { ChangedFile, GitState } from "@/shared/types/git";
import type { ProjectDetection } from "@/features/projects/lib/detectProject";
import { buildContextPack } from "@/features/projects/lib/buildContextPack";
import { Widget } from "./Widget";

interface WorkspaceSummaryWidgetProps {
  workspacePath: string | null;
  detection: ProjectDetection | undefined;
  isLoading: boolean;
  gitState: GitState | undefined;
  changedFiles: ChangedFile[] | undefined;
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

function StackedRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-foreground-subtle">{label}</div>
      <div className="text-foreground">
        {value && value.length > 0 ? value : "—"}
      </div>
    </div>
  );
}

export function WorkspaceSummaryWidget({
  workspacePath,
  detection,
  isLoading,
  gitState,
  changedFiles,
}: WorkspaceSummaryWidgetProps) {
  const { t } = useTranslation("chat");

  const contextPack = useMemo(
    () =>
      buildContextPack({ workspacePath, detection, gitState, changedFiles }),
    [workspacePath, detection, gitState, changedFiles],
  );

  const handleCopy = useCallback(() => {
    void copyToClipboard(contextPack).then((ok) => {
      if (ok) {
        toast.success(t("contextPanel.summary.copied"));
      } else {
        toast.error(t("contextPanel.summary.copyFailed"));
      }
    });
  }, [contextPack, t]);

  if (!workspacePath) {
    return (
      <Widget
        title={t("contextPanel.widgets.summary")}
        icon={<IconStack2 className="size-3.5" />}
      >
        <p className="text-foreground-subtle">
          {t("contextPanel.empty.folderNotSet")}
        </p>
      </Widget>
    );
  }

  if (isLoading && !detection) {
    return (
      <Widget
        title={t("contextPanel.widgets.summary")}
        icon={<IconStack2 className="size-3.5" />}
      >
        <div className="space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </Widget>
    );
  }

  const frameworks = detection?.frameworks ?? [];
  const testFrameworks = detection?.testFrameworks ?? [];
  const docs = detection?.documentationFiles ?? [];
  const isEmpty =
    frameworks.length === 0 && testFrameworks.length === 0 && docs.length === 0;

  return (
    <Widget
      title={t("contextPanel.widgets.summary")}
      icon={<IconStack2 className="size-3.5" />}
      action={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          aria-label={t("contextPanel.summary.copyContextPack")}
          title={t("contextPanel.summary.copyContextPack")}
        >
          <IconCopy className="size-3" />
        </Button>
      }
    >
      {isEmpty ? (
        <p className="text-foreground-subtle">
          {t("contextPanel.summary.notDetected")}
        </p>
      ) : (
        <div className="space-y-2">
          <StackedRow
            label={t("contextPanel.summary.stack")}
            value={frameworks.join(", ")}
          />
          <StackedRow
            label={t("contextPanel.summary.tests")}
            value={testFrameworks.join(", ")}
          />
          <StackedRow
            label={t("contextPanel.summary.docs")}
            value={docs.join(", ")}
          />
          <p className="text-xxs text-foreground-subtle">
            {t("contextPanel.summary.advisoryNote")}
          </p>
        </div>
      )}
    </Widget>
  );
}
