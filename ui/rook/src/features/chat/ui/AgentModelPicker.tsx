import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { AcpProvider } from "@/shared/api/acp";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  formatProviderLabel,
  getProviderIcon,
} from "@/shared/ui/icons/ProviderIcons";
import type { ModelOption } from "../types";

interface AgentModelPickerProps {
  agents: AcpProvider[];
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  currentModelId?: string | null;
  currentModelName?: string | null;
  availableModels: ModelOption[];
  onModelChange?: (modelId: string) => void;
  loading?: boolean;
  isCompact?: boolean;
}

interface ModelGroup {
  provider: string;
  models: ModelOption[];
  hasSelectedModel: boolean;
}

const MODEL_PROVIDER_MATCHERS: Array<[string, RegExp]> = [
  ["Anthropic", /claude|anthropic/i],
  ["OpenAI", /(^|[\s-])(gpt|o1|o3|o4)([\s-]|$)|openai/i],
  ["Google", /gemini|google/i],
  ["Mistral", /mistral/i],
  ["Meta", /llama|meta/i],
  ["DeepSeek", /deepseek/i],
  ["Qwen", /qwen/i],
  ["Cohere", /cohere|command/i],
];

function getModelDisplayName(model: ModelOption) {
  return model.displayName ?? model.name;
}

function inferModelProvider(model: ModelOption) {
  if (model.provider) {
    return model.provider;
  }

  const candidate = `${model.id} ${model.name}`;
  for (const [provider, pattern] of MODEL_PROVIDER_MATCHERS) {
    if (pattern.test(candidate)) {
      return provider;
    }
  }

  return "Other";
}

function groupModels(models: ModelOption[], currentModelId: string | null) {
  const grouped = new Map<string, ModelOption[]>();

  for (const model of models) {
    const provider = inferModelProvider(model);
    const existing = grouped.get(provider) ?? [];
    existing.push(model);
    grouped.set(provider, existing);
  }

  const groups = Array.from(grouped.entries())
    .map(([provider, groupedModels]) => ({
      provider,
      models: groupedModels,
      hasSelectedModel: groupedModels.some((m) => m.id === currentModelId),
    }))
    .sort((left, right) => left.provider.localeCompare(right.provider));

  return groups;
}

function PickerItem({
  children,
  onClick,
  selected = false,
  disabled = false,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-w-0 w-full items-center gap-2 overflow-hidden rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
        "hover:bg-muted focus-visible:bg-muted focus:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        selected && "bg-muted/60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AgentModelPicker({
  agents,
  selectedAgentId,
  onAgentChange,
  currentModelId = null,
  currentModelName = null,
  availableModels,
  onModelChange,
  loading = false,
  isCompact = false,
}: AgentModelPickerProps) {
  const { t } = useTranslation("chat");
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const selectedAgentLabel =
    agents.find((agent) => agent.id === selectedAgentId)?.label ??
    formatProviderLabel(selectedAgentId);
  const groupedModels = useMemo<ModelGroup[]>(
    () => groupModels(availableModels, currentModelId),
    [availableModels, currentModelId],
  );
  const hasModelInfo = currentModelName !== null || availableModels.length > 0;
  const triggerModelLabel = hasModelInfo ? (currentModelName ?? null) : null;

  useEffect(() => {
    if (open) {
      const selected = groupedModels.find((g) => g.hasSelectedModel);
      if (selected) {
        setExpandedGroups(new Set([selected.provider]));
      }
    }
  }, [open, groupedModels]);

  const toggleGroup = (provider: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  };

  const isGroupExpanded = (group: ModelGroup) => {
    return expandedGroups.has(group.provider);
  };

  const handleAgentSelect = (agentId: string) => {
    if (agentId !== selectedAgentId) {
      onAgentChange(agentId);
    }
  };

  const handleModelSelect = (modelId: string) => {
    onModelChange?.(modelId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="toolbar"
          size="sm"
          aria-label={t("toolbar.chooseAgentModel")}
          disabled={loading}
          leftIcon={getProviderIcon(selectedAgentId, "size-3.5")}
          rightIcon={<IconChevronDown className="opacity-50" />}
          className="min-w-0"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-20 animate-pulse rounded-sm bg-muted" />
            </span>
          ) : (
            <span
              className={cn("truncate", isCompact ? "max-w-32" : "max-w-56")}
            >
              {triggerModelLabel ?? selectedAgentLabel}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="h-[min(24rem,50vh)] w-96 overflow-hidden p-1"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const col = (document.activeElement as HTMLElement)?.closest(
              "[data-col]",
            );
            if (!col) return;
            const items = Array.from(
              col.querySelectorAll<HTMLElement>("button:not(:disabled)"),
            );
            const idx = items.indexOf(document.activeElement as HTMLElement);
            const next =
              e.key === "ArrowDown"
                ? items[(idx + 1) % items.length]
                : items[(idx - 1 + items.length) % items.length];
            next?.focus();
          } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const content = e.currentTarget as HTMLElement;
            const cols = Array.from(
              content.querySelectorAll<HTMLElement>("[data-col]"),
            );
            const currentCol = (document.activeElement as HTMLElement)?.closest(
              "[data-col]",
            );
            const colIdx = cols.indexOf(currentCol as HTMLElement);
            const targetCol =
              e.key === "ArrowRight"
                ? cols[(colIdx + 1) % cols.length]
                : cols[(colIdx - 1 + cols.length) % cols.length];
            if (!targetCol) return;
            const targetItems = Array.from(
              targetCol.querySelectorAll<HTMLElement>("button:not(:disabled)"),
            );
            const currentItems = Array.from(
              currentCol?.querySelectorAll<HTMLElement>(
                "button:not(:disabled)",
              ) ?? [],
            );
            const currentIdx = currentItems.indexOf(
              document.activeElement as HTMLElement,
            );
            const target =
              targetItems[Math.min(currentIdx, targetItems.length - 1)] ??
              targetItems[0];
            target?.focus();
          }
        }}
      >
        <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1 overflow-hidden">
          <div
            data-col="agent"
            className="flex min-h-0 min-w-0 overflow-hidden p-1"
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="shrink-0 px-2 py-1.5 text-sm font-semibold">
                {t("toolbar.agent")}
              </div>
              <ScrollArea className="min-h-0 min-w-0 flex-1">
                <div className="p-1 space-y-0.5">
                  {agents.map((agent) => {
                    const isSelected = agent.id === selectedAgentId;

                    return (
                      <PickerItem
                        key={agent.id}
                        onClick={() => handleAgentSelect(agent.id)}
                        selected={isSelected}
                      >
                        <span className="shrink-0">
                          {getProviderIcon(agent.id, "size-4")}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {agent.label}
                        </span>
                        {isSelected ? (
                          <IconCheck className="size-4 shrink-0 text-muted-foreground" />
                        ) : null}
                      </PickerItem>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          <div
            data-col="model"
            className="flex min-h-0 min-w-0 overflow-hidden p-1"
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="shrink-0 px-2 py-1.5 text-sm font-semibold">
                {t("toolbar.model")}
              </div>
              {groupedModels.length > 0 ? (
                <ScrollArea className="min-h-0 min-w-0 flex-1">
                  <div className="p-1 space-y-0.5">
                    {groupedModels.map((group) => {
                      const expanded = isGroupExpanded(group);

                      return (
                        <div key={group.provider}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.provider)}
                            className={cn(
                              "flex min-w-0 w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm font-medium transition-colors",
                              "hover:bg-muted focus:bg-muted focus:outline-none",
                            )}
                          >
                            <IconChevronRight
                              className={cn(
                                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                                expanded && "rotate-90",
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {group.provider}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {group.models.length}
                            </span>
                          </button>
                          {expanded ? (
                            <div className="overflow-hidden pb-1">
                              {group.models.map((model) => {
                                const modelName = getModelDisplayName(model);

                                return (
                                  <PickerItem
                                    key={model.id}
                                    onClick={() => handleModelSelect(model.id)}
                                    selected={model.id === currentModelId}
                                    className="justify-between pl-6"
                                  >
                                    <div className="min-w-0 flex-1 truncate">
                                      {modelName}
                                    </div>
                                    {model.id === currentModelId ? (
                                      <IconCheck className="size-4 shrink-0 text-muted-foreground" />
                                    ) : null}
                                  </PickerItem>
                                );
                              })}
                            </div>
                          ) : group.hasSelectedModel ? (
                            <div className="overflow-hidden pb-1">
                              {group.models
                                .filter((m) => m.id === currentModelId)
                                .map((model) => (
                                  <PickerItem
                                    key={model.id}
                                    onClick={() => handleModelSelect(model.id)}
                                    selected
                                    className="justify-between pl-6"
                                  >
                                    <div className="min-w-0 flex-1 truncate">
                                      {getModelDisplayName(model)}
                                    </div>
                                    <IconCheck className="size-4 shrink-0 text-muted-foreground" />
                                  </PickerItem>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-1 flex-col gap-2 px-2 pt-2">
                  {currentModelName ? (
                    <div className="rounded-sm bg-muted/40 px-2 py-1.5 text-sm font-medium text-foreground">
                      {currentModelName}
                    </div>
                  ) : null}
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      className="h-6 animate-pulse rounded-sm bg-muted/30"
                      style={{
                        opacity: 1 - row * 0.25,
                        animationDelay: `${row * 0.1}s`,
                      }}
                    />
                  ))}
                  <div className="mt-1 text-xs text-muted-foreground/70">
                    {t("toolbar.loadingModels")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
