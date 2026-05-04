import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AcpProvider } from "@/shared/api/acp";
import type { Persona } from "@/shared/types/agents";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverAnchor } from "@/shared/ui/popover";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { useMentionHandlers } from "../hooks/useMentionHandlers";
import { ChatInputToolbar } from "./ChatInputToolbar";
import { formatProviderLabel } from "@/shared/ui/icons/ProviderIcons";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { PersonaAvatar } from "./PersonaPicker";
import type { ChatAttachmentDraft } from "@/shared/types/messages";
import { useAttachmentDropTarget } from "../hooks/useAttachmentDropTarget";
import {
  normalizeDialogSelection,
  useChatInputAttachments,
} from "../hooks/useChatInputAttachments";
import type { ModelOption } from "../types";
import { ChatInputAttachments } from "./ChatInputAttachments";
import { ChatInputCommands, type SlashCommandId } from "./ChatInputCommands";
import { getCatalogEntry } from "@/features/providers/providerCatalog";
import type { ModelLoadState } from "../stores/chatSessionStore";
import { suggestSkills, type SkillSuggestion } from "@/features/skills/registry/suggestion";
import type { RookSkill } from "@/features/skills/registry/types";
import { SkillSuggestionList } from "@/features/skills/ui/SkillSuggestionList";

export interface ProjectOption {
  id: string;
  name: string;
  workingDirs: string[];
  color?: string | null;
}

interface ChatInputProps {
  onSend: (
    text: string,
    personaId?: string,
    attachments?: ChatAttachmentDraft[],
  ) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  queuedMessage?: { text: string } | null;
  onDismissQueue?: () => void;
  initialValue?: string;
  onDraftChange?: (text: string) => void;
  className?: string;
  personas?: Persona[];
  selectedPersonaId?: string | null;
  onPersonaChange?: (personaId: string | null) => void;
  onCreatePersona?: () => void;
  providers?: AcpProvider[];
  providersLoading?: boolean;
  selectedProvider?: string;
  onProviderChange?: (providerId: string) => void;
  currentModelId?: string | null;
  currentModel?: string;
  availableModels?: ModelOption[];
  onModelChange?: (modelId: string) => void;
  modelLoadState?: ModelLoadState;
  selectedProjectId?: string | null;
  availableProjects?: ProjectOption[];
  onProjectChange?: (projectId: string | null) => void;
  onCreateProject?: (options?: {
    onCreated?: (projectId: string) => void;
  }) => void;
  contextTokens?: number;
  contextLimit?: number;
  onCompactContext?: () => void | Promise<void>;
  canCompactContext?: boolean;
  isCompactingContext?: boolean;
  onRequestNewChat?: () => void;
  onRequestOpenSettings?: (section?: "appearance" | "providers") => void;
  onRequestClearChat?: () => void;
  onRequestHelp?: () => void;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  queuedMessage = null,
  onDismissQueue,
  initialValue = "",
  onDraftChange,
  className,
  personas = [],
  selectedPersonaId = null,
  onPersonaChange,
  onCreatePersona,
  providers = [],
  providersLoading = false,
  selectedProvider = "rook",
  onProviderChange,
  currentModelId = null,
  currentModel,
  availableModels = [],
  onModelChange,
  modelLoadState,
  selectedProjectId = null,
  availableProjects = [],
  onProjectChange,
  onCreateProject,
  contextTokens = 0,
  contextLimit = 0,
  onCompactContext,
  canCompactContext = false,
  isCompactingContext = false,
  onRequestNewChat,
  onRequestOpenSettings,
  onRequestClearChat,
  onRequestHelp,
}: ChatInputProps) {
  const { t } = useTranslation("chat");
  const [text, setTextRaw] = useState(initialValue);
  const [suggestedSkills, setSuggestedSkills] = useState<SkillSuggestion[]>([]);
  const [skillStatuses, setSkillStatuses] = useState<Record<string, "approved" | "skipped">>({});
  
  const setText = useCallback(
    (value: string) => {
      setTextRaw(value);
      onDraftChange?.(value);
      setSuggestedSkills(suggestSkills(value));
    },
    [onDraftChange],
  );
  const [isCompact, setIsCompact] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    attachments,
    addBrowserFiles,
    addPathAttachments,
    removeAttachment,
    clearAttachments,
  } = useChatInputAttachments();

  const activePersona = useMemo(
    () => personas.find((persona) => persona.id === selectedPersonaId) ?? null,
    [personas, selectedPersonaId],
  );
  const selectedProject = useMemo(
    () =>
      availableProjects.find((project) => project.id === selectedProjectId) ??
      null,
    [availableProjects, selectedProjectId],
  );
  const stickyPersona = activePersona;
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  const selectedProviderEntry = getCatalogEntry(selectedProvider);
  const requiresModelSelection =
    selectedProvider === "rook" || selectedProviderEntry?.category === "model";
  const hasResolvedModel =
    availableModels.length > 0 || Boolean(currentModelId || currentModel);
  const modelSelectionBlocked =
    providers.length > 0 &&
    requiresModelSelection &&
    !providersLoading &&
    !hasResolvedModel &&
    modelLoadState?.status !== "loading";
  const hasQueuedMessage = queuedMessage !== null;
  const canSend =
    (text.trim().length > 0 || attachments.length > 0) &&
    !hasQueuedMessage &&
    !disabled &&
    !modelSelectionBlocked;

  const {
    mentionOpen,
    mentionSelectedIndex,
    filteredPersonas,
    filteredFiles,
    detectMention,
    closeMention,
    navigateMention,
    confirmMention,
    handlePersonaMentionSelect,
    handleFileMentionSelect,
    handleMentionConfirm,
  } = useMentionHandlers({
    personas,
    projectWorkingDirs: selectedProject?.workingDirs,
    text,
    setText,
    textareaRef,
    onPersonaChange,
  });

  const handleApproveSkill = useCallback((skill: RookSkill) => {
    setSkillStatuses((prev) => ({ ...prev, [skill.id]: "approved" }));
  }, []);

  const handleSkipSkill = useCallback((skill: RookSkill) => {
    setSkillStatuses((prev) => ({ ...prev, [skill.id]: "skipped" }));
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < 580);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => textareaRef.current?.focus(), []);

  const slashQuery = useMemo(() => {
    const trimmed = text.trimStart();
    if (!trimmed.startsWith("/")) {
      return null;
    }

    const line = trimmed.split("\n")[0];
    if (line.includes(" ")) {
      return null;
    }

    return line.slice(1).toLowerCase();
  }, [text]);

  const slashCommands = useMemo(() => {
    const all = [
      {
        id: "help",
        label: t("commands.items.help.label"),
        description: t("commands.items.help.description"),
        disabled: !onRequestHelp,
      },
      {
        id: "new",
        label: t("commands.items.new.label"),
        description: t("commands.items.new.description"),
        disabled: !onRequestNewChat,
      },
      {
        id: "settings",
        label: t("commands.items.settings.label"),
        description: t("commands.items.settings.description"),
        disabled: !onRequestOpenSettings,
      },
      {
        id: "providers",
        label: t("commands.items.providers.label"),
        description: t("commands.items.providers.description"),
        disabled: !onRequestOpenSettings,
      },
      {
        id: "project",
        label: t("commands.items.project.label"),
        description: t("commands.items.project.description"),
        disabled: !onCreateProject,
      },
      {
        id: "compact",
        label: t("commands.items.compact.label"),
        description: t("commands.items.compact.description"),
        disabled:
          !onCompactContext || !canCompactContext || isCompactingContext,
      },
      {
        id: "stop",
        label: t("commands.items.stop.label"),
        description: t("commands.items.stop.description"),
        disabled: !onStop || !isStreaming,
      },
      {
        id: "clear",
        label: t("commands.items.clear.label"),
        description: t("commands.items.clear.description"),
        disabled: !onRequestClearChat,
      },
    ] satisfies Array<{
      id: SlashCommandId;
      label: string;
      description: string;
      disabled: boolean;
    }>;

    if (slashQuery === null) {
      return [];
    }

    const normalized = slashQuery.trim();
    return all.filter((command) => {
      if (command.disabled) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return command.label.toLowerCase().includes(normalized);
    });
  }, [
    canCompactContext,
    isCompactingContext,
    isStreaming,
    onCompactContext,
    onCreateProject,
    onRequestClearChat,
    onRequestHelp,
    onRequestNewChat,
    onRequestOpenSettings,
    onStop,
    slashQuery,
    t,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset selection when the slash query changes
  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [slashQuery]);

  const executeSlashCommand = useCallback(
    (commandId: SlashCommandId) => {
      switch (commandId) {
        case "help":
          onRequestHelp?.();
          break;
        case "new":
          onRequestNewChat?.();
          break;
        case "settings":
          onRequestOpenSettings?.("appearance");
          break;
        case "providers":
          onRequestOpenSettings?.("providers");
          break;
        case "project":
          onCreateProject?.();
          break;
        case "compact":
          if (onCompactContext) {
            void onCompactContext();
          }
          break;
        case "stop":
          onStop?.();
          break;
        case "clear":
          onRequestClearChat?.();
          break;
      }

      setText("");
      closeMention();
      textareaRef.current?.focus();
    },
    [
      closeMention,
      onCompactContext,
      onCreateProject,
      onRequestClearChat,
      onRequestHelp,
      onRequestNewChat,
      onRequestOpenSettings,
      onStop,
      setText,
    ],
  );

  const handleSend = useCallback(() => {
    if (!canSend) {
      return;
    }

    onSend(
      text.trim(),
      selectedPersonaId ?? undefined,
      attachments.length > 0 ? attachments : undefined,
    );
    setText("");
    setSuggestedSkills([]);
    setSkillStatuses({});
    clearAttachments();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [
    attachments,
    canSend,
    clearAttachments,
    onSend,
    selectedPersonaId,
    setText,
    text,
  ]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (slashQuery !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        setText("");
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (slashCommands.length > 0) {
          setSelectedSlashIndex((current) => {
            const delta = event.key === "ArrowDown" ? 1 : -1;
            return (
              (current + delta + slashCommands.length) % slashCommands.length
            );
          });
        }
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        if (slashCommands.length > 0) {
          event.preventDefault();
          executeSlashCommand(slashCommands[selectedSlashIndex].id);
        }
        return;
      }
    }

    if (mentionOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMention();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        navigateMention(event.key === "ArrowDown" ? "down" : "up");
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const item = confirmMention();
        if (item) {
          event.preventDefault();
          handleMentionConfirm(item);
          return;
        }
      }
    }
    if (event.key === "Enter" && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setText(value);
    const cursorPosition = event.target.selectionStart ?? value.length;
    detectMention(value, cursorPosition);
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(event.clipboardData.items)
        .filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      void addBrowserFiles(files);
    },
    [addBrowserFiles],
  );

  const {
    isAttachmentDragOver,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useAttachmentDropTarget({
    disabled,
    isStreaming,
    targetRef: containerRef,
    onDropFiles: (files) => {
      void addBrowserFiles(files);
    },
    onDropPaths: (paths) => {
      void addPathAttachments(paths);
    },
  });

  const handleAttachFiles = useCallback(async () => {
    if (disabled) {
      return;
    }

    try {
      const selected = await open({
        title: t("attachments.chooseFilesDialogTitle"),
        multiple: true,
      });
      await addPathAttachments(normalizeDialogSelection(selected));
    } catch {
      // Dialog plugin may be unavailable in some environments.
    }
  }, [addPathAttachments, disabled, t]);

  const handleAttachFolders = useCallback(async () => {
    if (disabled) {
      return;
    }

    try {
      const selected = await open({
        directory: true,
        title: t("attachments.chooseFoldersDialogTitle"),
        multiple: true,
      });
      await addPathAttachments(normalizeDialogSelection(selected));
    } catch {
      // Dialog plugin may be unavailable in some environments.
    }
  }, [addPathAttachments, disabled, t]);

  const providerDisplayName =
    providers.find((provider) => provider.id === selectedProvider)?.label ??
    formatProviderLabel(selectedProvider);
  const agentDisplayName = activePersona?.displayName ?? providerDisplayName;
  const resolvedCurrentModel =
    currentModel ?? availableModels[0]?.displayName ?? availableModels[0]?.name;
  const effectivePlaceholder = t("input.placeholder", {
    agent: agentDisplayName,
  });

  const handleClearStickyPersona = useCallback(() => {
    onPersonaChange?.(null);
  }, [onPersonaChange]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("px-4 pb-6 pt-2", className)}>
        <div className="mx-auto max-w-3xl">
          <Popover open={mentionOpen}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone for file attachments */}
            <div
              ref={containerRef}
              className={cn(
                "relative rounded-2xl border border-border bg-background px-4 pb-3 pt-4 transition-colors",
                isAttachmentDragOver && "bg-muted/20",
              )}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isAttachmentDragOver && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-dashed border-border bg-background/70">
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 text-sm shadow-sm"
                  >
                    {t("attachments.dropToAttach")}
                  </Badge>
                </div>
              )}

              {slashQuery !== null && (
                <ChatInputCommands
                  commands={slashCommands}
                  selectedIndex={Math.min(
                    selectedSlashIndex,
                    Math.max(slashCommands.length - 1, 0),
                  )}
                  onSelect={executeSlashCommand}
                  emptyLabel={t("commands.empty")}
                  title={t("commands.title")}
                  hint={t("commands.hint")}
                />
              )}

              <MentionAutocomplete
                filteredPersonas={filteredPersonas}
                filteredFiles={filteredFiles}
                isOpen={mentionOpen}
                onSelectPersona={handlePersonaMentionSelect}
                onSelectFile={handleFileMentionSelect}
                onClose={closeMention}
                selectedIndex={mentionSelectedIndex}
              />

              <SkillSuggestionList
                suggestions={suggestedSkills}
                skillStatuses={skillStatuses}
                onApprove={handleApproveSkill}
                onSkip={handleSkipSkill}
              />

              <ChatInputAttachments
                attachments={attachments}
                onRemove={removeAttachment}
              />

              {stickyPersona && (
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
                    <PersonaAvatar persona={stickyPersona} size="sm" />
                    <span>@{stickyPersona.displayName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="ml-0.5 size-auto p-0 opacity-60 hover:bg-transparent hover:opacity-100"
                      onClick={handleClearStickyPersona}
                      aria-label={t("persona.clearActive")}
                    >
                      <X className="size-3" />
                    </Button>
                  </span>
                </div>
              )}

              {queuedMessage && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {t("queue.label", { text: queuedMessage.text })}
                  </span>
                  <button
                    type="button"
                    onClick={onDismissQueue}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={t("queue.dismiss")}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              <PopoverAnchor asChild>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={effectivePlaceholder}
                  disabled={disabled}
                  rows={1}
                  className="mb-3 min-h-[36px] max-h-[200px] w-full resize-none bg-transparent px-1 text-[14px] leading-relaxed text-foreground placeholder:font-light placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-60"
                  aria-label={t("input.ariaLabel")}
                />
              </PopoverAnchor>

              <ChatInputToolbar
                personas={personas}
                selectedPersonaId={selectedPersonaId}
                onPersonaChange={onPersonaChange}
                onCreatePersona={onCreatePersona}
                providers={providers}
                providersLoading={providersLoading}
                selectedProvider={selectedProvider}
                onProviderChange={(id) => onProviderChange?.(id)}
                currentModelId={currentModelId}
                currentModel={resolvedCurrentModel}
                availableModels={availableModels}
                onModelChange={onModelChange}
                modelLoadState={modelLoadState}
                selectedProjectId={selectedProjectId}
                availableProjects={availableProjects}
                onProjectChange={onProjectChange}
                onCreateProject={onCreateProject}
                contextTokens={contextTokens}
                contextLimit={contextLimit}
                onCompactContext={onCompactContext}
                canCompactContext={canCompactContext}
                isCompactingContext={isCompactingContext}
                canSend={canSend}
                isStreaming={isStreaming}
                hasQueuedMessage={hasQueuedMessage}
                onAttachFiles={handleAttachFiles}
                onAttachFolders={handleAttachFolders}
                disabled={disabled}
                onSend={handleSend}
                onStop={onStop}
                isCompact={isCompact}
              />
            </div>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  );
}
