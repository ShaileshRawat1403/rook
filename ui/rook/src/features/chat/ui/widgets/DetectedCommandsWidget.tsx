import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { IconCopy, IconTerminal2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import type {
  CommandRisk,
  DetectedScript,
} from "@/features/projects/lib/detectProject";
import { Widget } from "./Widget";

interface DetectedCommandsWidgetProps {
  scripts: DetectedScript[] | undefined;
  suggested: DetectedScript[] | undefined;
  isLoading: boolean;
}

const KIND_ORDER: Record<DetectedScript["kind"], number> = {
  dev: 0,
  build: 1,
  test: 2,
  lint: 3,
  format: 4,
  other: 5,
};

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

function sortByKind(items: DetectedScript[]): DetectedScript[] {
  return [...items].sort((a, b) => {
    const k = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return k !== 0 ? k : a.name.localeCompare(b.name);
  });
}

const RISK_BADGE_CLASSES: Record<CommandRisk, string> = {
  safe: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  review: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  blocked: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function RiskBadge({
  risk,
  label,
  tooltip,
}: {
  risk: CommandRisk;
  label: string;
  tooltip: string;
}) {
  return (
    <span
      title={tooltip}
      className={cn(
        "shrink-0 rounded-sm px-1 py-px text-xxs font-medium uppercase tracking-wide",
        RISK_BADGE_CLASSES[risk],
      )}
    >
      {label}
    </span>
  );
}

function ScriptRow({
  script,
  onCopyCommand,
  copyLabel,
  riskLabel,
  riskTooltip,
}: {
  script: DetectedScript;
  onCopyCommand: (script: DetectedScript) => void;
  copyLabel: string;
  riskLabel: string;
  riskTooltip: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-xs font-medium text-foreground">
            {script.name}
          </span>
          <RiskBadge
            risk={script.risk}
            label={riskLabel}
            tooltip={riskTooltip}
          />
        </div>
        <div className="truncate font-mono text-xxs text-foreground-subtle">
          {script.command}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onCopyCommand(script)}
          aria-label={copyLabel}
          title={copyLabel}
        >
          <IconCopy className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="border-b border-border bg-background-alt/60 px-3 py-1 text-xxs font-medium uppercase tracking-wide text-foreground-subtle">
      {label}
    </div>
  );
}

export function DetectedCommandsWidget({
  scripts,
  suggested,
  isLoading,
}: DetectedCommandsWidgetProps) {
  const { t } = useTranslation("chat");

  const sortedScripts = scripts ? sortByKind(scripts) : undefined;
  const sortedSuggested = suggested ? sortByKind(suggested) : undefined;
  const hasScripts = (sortedScripts?.length ?? 0) > 0;
  const hasSuggested = (sortedSuggested?.length ?? 0) > 0;

  const handleCopyCommand = useCallback(
    (script: DetectedScript) => {
      void copyToClipboard(script.command).then((ok) => {
        if (ok) {
          toast.success(
            t("contextPanel.commands.copied", { command: script.command }),
          );
        } else {
          toast.error(t("contextPanel.commands.copyFailed"));
        }
      });
    },
    [t],
  );

  const renderRow = (script: DetectedScript) => (
    <ScriptRow
      key={`${script.source}:${script.name}`}
      script={script}
      onCopyCommand={handleCopyCommand}
      copyLabel={t("contextPanel.commands.copyCommand")}
      riskLabel={t(`contextPanel.commands.risk.${script.risk}`)}
      riskTooltip={t("contextPanel.commands.riskTooltip")}
    />
  );

  const showSectionHeadings = hasScripts && hasSuggested;

  return (
    <Widget
      title={t("contextPanel.widgets.commands")}
      icon={<IconTerminal2 className="size-3.5" />}
      flush
    >
      {isLoading && !scripts && !suggested ? (
        <div className="space-y-2 px-3 py-2.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : !hasScripts && !hasSuggested ? (
        <p className="px-3 py-2.5 text-xs text-foreground-subtle">
          {t("contextPanel.empty.noCommands")}
        </p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto">
          {hasScripts && (
            <div className="divide-y divide-border">
              {showSectionHeadings && (
                <SectionHeading
                  label={t("contextPanel.commands.sectionScripts")}
                />
              )}
              {sortedScripts?.map(renderRow)}
            </div>
          )}
          {hasSuggested && (
            <div className="divide-y divide-border">
              <SectionHeading
                label={t("contextPanel.commands.sectionSuggested")}
              />
              {sortedSuggested?.map(renderRow)}
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
