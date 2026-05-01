import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence } from "motion/react";
import { MessageTimeline } from "./MessageTimeline";
import { ChatInput } from "./ChatInput";
import {
  createSystemNotificationMessage,
  type ChatAttachmentDraft,
} from "@/shared/types/messages";
import { LoadingRook } from "./LoadingRook";
import { ChatLoadingSkeleton } from "./ChatLoadingSkeleton";
import { useChat } from "../hooks/useChat";
import { useMessageQueue } from "../hooks/useMessageQueue";
import { useChatStore } from "../stores/chatStore";
import { useAgentStore } from "@/features/agents/stores/agentStore";
import { useProviderSelection } from "@/features/agents/hooks/useProviderSelection";
import {
  getCatalogEntry,
  resolveAgentProviderCatalogIdStrict,
} from "@/features/providers/providerCatalog";
import { useConfiguredModelProviderIds } from "@/features/providers/hooks/useConfiguredModelProviderIds";
import { useChatSessionStore } from "../stores/chatSessionStore";
import { useProjectStore } from "@/features/projects/stores/projectStore";
import { acpPrepareSession, acpSetModel } from "@/shared/api/acp";
import {
  buildProjectSystemPrompt,
  composeSystemPrompt,
  defaultGlobalArtifactRoot,
  getProjectArtifactRoots,
  resolveProjectDefaultArtifactRoot,
} from "@/features/projects/lib/chatProjectContext";
import { resolveSessionCwd } from "@/features/projects/lib/sessionCwdSelection";
import { ArtifactPolicyProvider } from "../hooks/ArtifactPolicyContext";
import type { ModelOption } from "../types";
import { ChatContextPanel } from "./ChatContextPanel";
import { perfLog } from "@/shared/lib/perfLog";
import {
  buildContextSnapshot,
  resolveIntentRequest,
  useIntentStore,
} from "@/features/intent";
import { getWorkItem } from "@/features/work-items/api/workItems";
import { buildWorkItemSystemPrompt } from "@/features/work-items/lib/buildWorkItemSystemPrompt";
import type { WorkItem } from "@/features/work-items/types";

const EMPTY_MODELS: ModelOption[] = [];

interface ChatViewProps {
  sessionId: string;
  initialProvider?: string;
  initialPersonaId?: string;
  initialMessage?: string;
  initialAttachments?: ChatAttachmentDraft[];
  onInitialMessageConsumed?: () => void;
  onCreateProject?: (options?: {
    onCreated?: (projectId: string) => void;
  }) => void;
  onOpenSettings?: (section?: "appearance" | "providers") => void;
  onStartNewChat?: () => void;
}

export function ChatView({
  sessionId,
  initialProvider,
  initialPersonaId,
  initialMessage,
  initialAttachments,
  onInitialMessageConsumed,
  onCreateProject,
  onOpenSettings,
  onStartNewChat,
}: ChatViewProps) {
  const { t } = useTranslation("chat");
  const activeSessionId = sessionId;
  const mountStart = useRef(performance.now());
  useEffect(() => {
    const ms = (performance.now() - mountStart.current).toFixed(1);
    perfLog(`[perf:chatview] ${sessionId.slice(0, 8)} mounted in ${ms}ms`);
  }, [sessionId]);
  const isContextPanelOpen = useChatSessionStore(
    (s) => s.contextPanelOpenBySession[activeSessionId] ?? true,
  );
  const setContextPanelOpen = useChatSessionStore((s) => s.setContextPanelOpen);
  const activeWorkspace = useChatSessionStore(
    (s) => s.activeWorkspaceBySession[activeSessionId],
  );
  const activeWorkItemRef = useChatSessionStore(
    (s) => s.activeWorkItemBySession[activeSessionId],
  );
  const clearActiveWorkspace = useChatSessionStore(
    (s) => s.clearActiveWorkspace,
  );

  const {
    providers,
    providersLoading,
    selectedProvider: globalSelectedProvider,
    setSelectedProvider: setGlobalSelectedProvider,
  } = useProviderSelection();
  const configuredModelProviderIds = useConfiguredModelProviderIds();
  const personas = useAgentStore((s) => s.personas);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    initialPersonaId ?? null,
  );
  const session = useChatSessionStore((s) =>
    s.sessions.find((candidate) => candidate.id === activeSessionId),
  );
  const availableModels = useChatSessionStore(
    (s) => s.modelsBySession[activeSessionId] ?? EMPTY_MODELS,
  );
  const modelCacheByProvider = useChatSessionStore(
    (s) => s.modelCacheByProvider,
  );
  const projects = useProjectStore((s) => s.projects);
  const projectsLoading = useProjectStore((s) => s.loading);
  const storedProject = useProjectStore((s) =>
    session?.projectId
      ? s.projects.find((candidate) => candidate.id === session.projectId)
      : undefined,
  );
  const [globalArtifactRoot, setGlobalArtifactRoot] = useState<string | null>(
    null,
  );
  const project = storedProject ?? null;
  const contextPanelLabel = isContextPanelOpen
    ? t("context.closePanel")
    : t("context.openPanel");
  const availableProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        .map((projectInfo) => ({
          id: projectInfo.id,
          name: projectInfo.name,
          workingDirs: projectInfo.workingDirs,
          color: projectInfo.color,
        })),
    [projects],
  );
  const selectedProviderPreference =
    session?.providerId ??
    initialProvider ??
    project?.preferredProvider ??
    globalSelectedProvider;
  const modelProviders = useMemo(
    () =>
      providers.filter((provider) => {
        if (provider.id === "rook") return false;
        if (resolveAgentProviderCatalogIdStrict(provider.id) !== null) {
          return false;
        }
        const entry = getCatalogEntry(provider.id);
        if (entry?.category === "agent") {
          return false;
        }
        return (
          configuredModelProviderIds?.has(provider.id) ||
          provider.id === selectedProviderPreference ||
          provider.id === globalSelectedProvider ||
          (modelCacheByProvider[provider.id]?.length ?? 0) > 0
        );
      }),
    [
      globalSelectedProvider,
      configuredModelProviderIds,
      modelCacheByProvider,
      providers,
      selectedProviderPreference,
    ],
  );
  const selectedProvider =
    selectedProviderPreference === "rook"
      ? (modelProviders[0]?.id ?? selectedProviderPreference)
      : selectedProviderPreference;

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);
  const projectArtifactRoots = useMemo(
    () => getProjectArtifactRoots(project),
    [project],
  );
  const projectDefaultArtifactRoot = useMemo(
    () => resolveProjectDefaultArtifactRoot(project),
    [project],
  );
  const projectMetadataPending = Boolean(
    session?.projectId && !projectDefaultArtifactRoot && projectsLoading,
  );
  const allowedArtifactRoots = useMemo(() => {
    const roots = [
      ...projectArtifactRoots.map((path) => path.trim()).filter(Boolean),
    ];
    if (globalArtifactRoot) {
      roots.push(globalArtifactRoot);
    }
    return [...new Set(roots)];
  }, [globalArtifactRoot, projectArtifactRoots]);
  const projectSystemPrompt = useMemo(
    () => buildProjectSystemPrompt(project),
    [project],
  );
  const [activeWorkItem, setActiveWorkItem] = useState<WorkItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const workItemId = activeWorkItemRef?.workItemId;
    if (!workItemId) {
      setActiveWorkItem(null);
      return;
    }

    getWorkItem(workItemId)
      .then((workItem) => {
        if (!cancelled) setActiveWorkItem(workItem);
      })
      .catch(() => {
        if (!cancelled) setActiveWorkItem(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorkItemRef?.workItemId]);

  const workItemSystemPrompt = useMemo(
    () => buildWorkItemSystemPrompt(activeWorkItem),
    [activeWorkItem],
  );
  const workingContextPrompt = useMemo(() => {
    if (!activeWorkspace?.branch) return undefined;
    return `<active-working-context>\nActive branch: ${activeWorkspace.branch}\nWorking directory: ${activeWorkspace.path}\n</active-working-context>`;
  }, [activeWorkspace?.branch, activeWorkspace?.path]);

  const effectiveSystemPrompt = useMemo(
    () =>
      composeSystemPrompt(
        selectedPersona?.systemPrompt,
        projectSystemPrompt,
        workItemSystemPrompt,
        workingContextPrompt,
      ),
    [
      selectedPersona?.systemPrompt,
      projectSystemPrompt,
      workItemSystemPrompt,
      workingContextPrompt,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    defaultGlobalArtifactRoot()
      .then((artifactRoot) => {
        if (cancelled) return;
        setGlobalArtifactRoot(artifactRoot);
      })
      .catch(() => {
        if (cancelled) return;
        setGlobalArtifactRoot(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const prevProjectIdRef = useRef(session?.projectId);
  useEffect(() => {
    const prevProjectId = prevProjectIdRef.current;
    prevProjectIdRef.current = session?.projectId;
    if (prevProjectId !== undefined && prevProjectId !== session?.projectId) {
      clearActiveWorkspace(activeSessionId);
    }
  }, [session?.projectId, activeSessionId, clearActiveWorkspace]);

  const prevWorkspaceRef = useRef(activeWorkspace);
  useEffect(() => {
    const prev = prevWorkspaceRef.current;
    if (
      !activeWorkspace ||
      !selectedProvider ||
      session?.draft ||
      activeWorkspace === prev
    ) {
      return;
    }
    prevWorkspaceRef.current = activeWorkspace;
    if (prev && prev.path === activeWorkspace.path) return;

    async function prepareWorkspaceSession() {
      const workingDir = await resolveSessionCwd(project, activeWorkspace.path);
      if (!workingDir) {
        return;
      }
      await acpPrepareSession(activeSessionId, selectedProvider, workingDir, {
        personaId: selectedPersonaId ?? undefined,
      });
    }

    void prepareWorkspaceSession().catch((error) => {
      console.error("Failed to prepare ACP session:", error);
    });
  }, [
    activeWorkspace,
    activeSessionId,
    project,
    selectedProvider,
    selectedPersonaId,
    session?.draft,
  ]);

  useEffect(() => {
    if (selectedProvider && selectedProvider !== session?.providerId) {
      const cached = useChatSessionStore
        .getState()
        .getCachedModels(selectedProvider);
      useChatSessionStore
        .getState()
        .switchSessionProvider(activeSessionId, selectedProvider, cached);
    }
    if (
      selectedProviderPreference === "rook" &&
      selectedProvider !== selectedProviderPreference
    ) {
      setGlobalSelectedProvider(selectedProvider);
    }
  }, [
    activeSessionId,
    selectedProvider,
    selectedProviderPreference,
    session?.providerId,
    setGlobalSelectedProvider,
  ]);

  useEffect(() => {
    if (!selectedProvider || selectedProvider === "rook") {
      return;
    }

    const store = useChatSessionStore.getState();
    const cached = store.getCachedModels(selectedProvider);
    if (cached.length > 0) {
      store.setSessionModels(activeSessionId, cached);
      if (!session?.modelId) {
        store.updateSession(activeSessionId, {
          modelId: cached[0]?.id,
          modelName: cached[0]?.displayName ?? cached[0]?.name,
        });
      }
      return;
    }

    let cancelled = false;
    void store.loadModelsForProvider(selectedProvider).then((loadedModels) => {
      if (cancelled) return;
      const latest = useChatSessionStore.getState();
      const active = latest.getSession(activeSessionId);
      if (active?.providerId && active.providerId !== selectedProvider) {
        return;
      }
      const cachedModels = latest.getCachedModels(selectedProvider);
      const models = cachedModels.length > 0 ? cachedModels : loadedModels;
      latest.setSessionModels(activeSessionId, models);
      if (models.length > 0 && !active?.modelId) {
        latest.updateSession(activeSessionId, {
          providerId: selectedProvider,
          modelId: models[0]?.id,
          modelName: models[0]?.displayName ?? models[0]?.name,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, selectedProvider, session?.modelId]);

  const handleProviderChange = useCallback(
    (providerId: string) => {
      if (providerId === selectedProvider) {
        return;
      }
      const sessionStore = useChatSessionStore.getState();
      const cached = sessionStore.getCachedModels(providerId);
      sessionStore.switchSessionProvider(activeSessionId, providerId, cached);
      setGlobalSelectedProvider(providerId);
    },
    [activeSessionId, selectedProvider, setGlobalSelectedProvider],
  );

  const handleProjectChange = useCallback(
    (projectId: string | null) => {
      const nextProject =
        projectId == null
          ? null
          : (useProjectStore
              .getState()
              .projects.find((candidate) => candidate.id === projectId) ??
            null);

      useChatSessionStore
        .getState()
        .updateSession(activeSessionId, { projectId });

      if (!session?.draft && selectedProvider) {
        async function updateProjectSessionCwd() {
          const workingDir = await resolveSessionCwd(
            nextProject,
            activeWorkspace?.path,
          );
          if (!workingDir) {
            return;
          }

          await acpPrepareSession(
            activeSessionId,
            selectedProvider,
            workingDir,
            {
              personaId: selectedPersonaId ?? undefined,
            },
          );
        }

        void updateProjectSessionCwd().catch((error) => {
          console.error(
            "Failed to update ACP session working directory:",
            error,
          );
        });
      }
    },
    [
      activeSessionId,
      activeWorkspace?.path,
      selectedPersonaId,
      selectedProvider,
      session?.draft,
    ],
  );
  const handleModelChange = useCallback(
    (modelId: string) => {
      if (!activeSessionId || modelId === session?.modelId) {
        return;
      }
      const previousModelId = session?.modelId;
      const previousModelName = session?.modelName;
      const models = useChatSessionStore
        .getState()
        .getSessionModels(activeSessionId);
      const selected = models.find((m) => m.id === modelId);
      useChatSessionStore.getState().updateSession(activeSessionId, {
        modelId,
        modelName: selected?.displayName ?? selected?.name ?? modelId,
      });
      if (session?.draft) {
        return;
      }
      acpSetModel(activeSessionId, modelId).catch((error) => {
        console.error("Failed to set model:", error);
        useChatSessionStore.getState().updateSession(activeSessionId, {
          modelId: previousModelId,
          modelName: previousModelName,
        });
      });
    },
    [activeSessionId, session?.draft, session?.modelId, session?.modelName],
  );

  // When persona changes, update the provider to match persona's default
  const handlePersonaChange = useCallback(
    (personaId: string | null) => {
      setSelectedPersonaId(personaId);
      const persona = personas.find((p) => p.id === personaId);
      if (persona?.provider) {
        const matchingProvider = providers.find(
          (p) =>
            p.id === persona.provider ||
            p.label.toLowerCase().includes(persona.provider ?? ""),
        );
        if (matchingProvider) {
          handleProviderChange(matchingProvider.id);
        }
      }
      const agentStore = useAgentStore.getState();
      const matchingAgent = agentStore.agents.find(
        (a) => a.personaId === personaId,
      );
      if (matchingAgent) {
        agentStore.setActiveAgent(matchingAgent.id);
      }
      useChatSessionStore
        .getState()
        .updateSession(activeSessionId, { personaId: personaId ?? undefined });
    },
    [personas, providers, activeSessionId, handleProviderChange],
  );

  // Validate persona still exists — fall back to default if deleted
  useEffect(() => {
    if (
      selectedPersonaId !== null &&
      personas.length > 0 &&
      !personas.find((p) => p.id === selectedPersonaId)
    ) {
      // Selected persona was deleted — reset to no persona
      setSelectedPersonaId(null);
    }
  }, [personas, selectedPersonaId]);

  const personaInfo = selectedPersona
    ? { id: selectedPersona.id, name: selectedPersona.displayName }
    : undefined;
  const resolveCurrentSessionCwd = useCallback(
    () => resolveSessionCwd(project, activeWorkspace?.path),
    [project, activeWorkspace?.path],
  );
  const {
    messages,
    chatState,
    tokenState,
    sendMessage,
    compactConversation,
    stopStreaming,
    streamingMessageId,
  } = useChat(
    activeSessionId,
    selectedProvider,
    effectiveSystemPrompt,
    personaInfo,
    resolveCurrentSessionCwd,
  );
  const isLoadingHistory = useChatStore(
    (s) =>
      s.loadingSessionIds.has(activeSessionId) &&
      (s.messagesBySession[activeSessionId]?.length ?? 0) === 0,
  );

  const deferredSend = useRef<{
    text: string;
    attachments?: ChatAttachmentDraft[];
  } | null>(null);
  const queue = useMessageQueue(activeSessionId, chatState, sendMessage);
  const chatStore = useChatStore();
  const setCurrentIntent = useIntentStore((s) => s.setCurrent);

  const resolveRookRequest = useCallback(
    (text: string, attachments?: ChatAttachmentDraft[]) => {
      const context = buildContextSnapshot({
        sessionId: activeSessionId,
        project,
        activeWorkspace,
        attachments,
        activePersonaId: selectedPersonaId,
        selectedProvider,
        selectedModel: session?.modelId ?? null,
        isStreaming: chatState === "streaming" || chatState === "thinking",
      });
      return resolveIntentRequest(text, context);
    },
    [
      activeSessionId,
      activeWorkspace,
      chatState,
      project,
      selectedPersonaId,
      selectedProvider,
      session?.modelId,
    ],
  );

  const handleRookRequest = useCallback(
    (text: string, personaId?: string, attachments?: ChatAttachmentDraft[]) => {
      const { intent, resolution } = resolveRookRequest(text, attachments);
      setCurrentIntent(activeSessionId, intent);

      if (resolution.kind === "guidance") {
        chatStore.addMessage(
          activeSessionId,
          createSystemNotificationMessage(
            resolution.message,
            resolution.notificationType,
          ),
        );
        return;
      }

      if (resolution.notice) {
        chatStore.addMessage(
          activeSessionId,
          createSystemNotificationMessage(resolution.notice, "info"),
        );
      }

      if (chatState !== "idle" && !queue.queuedMessage) {
        queue.enqueue(text, personaId, attachments, resolution.promptOverride);
        return;
      }

      sendMessage(text, undefined, attachments, {
        promptOverride: resolution.promptOverride,
      });
    },
    [
      activeSessionId,
      chatState,
      chatStore,
      queue,
      resolveRookRequest,
      sendMessage,
      setCurrentIntent,
    ],
  );

  const handleSend = useCallback(
    (text: string, personaId?: string, attachments?: ChatAttachmentDraft[]) => {
      if (personaId && personaId !== selectedPersonaId) {
        const newPersona = personas.find((p) => p.id === personaId);
        if (newPersona) {
          // Inject a system notification about the persona switch
          chatStore.addMessage(activeSessionId, {
            id: crypto.randomUUID(),
            role: "system",
            created: Date.now(),
            content: [
              {
                type: "systemNotification",
                notificationType: "info",
                text: `Switched to ${newPersona.displayName}`,
              },
            ],
            metadata: { userVisible: true, agentVisible: false },
          });
        }
        handlePersonaChange(personaId);
        // Defer the send until after persona state updates
        deferredSend.current = { text, attachments };
        return;
      }
      handleRookRequest(text, personaId, attachments);
    },
    [
      selectedPersonaId,
      handlePersonaChange,
      personas,
      chatStore,
      activeSessionId,
      handleRookRequest,
    ],
  );

  useEffect(() => {
    if (deferredSend.current && selectedPersona) {
      const { text, attachments } = deferredSend.current;
      deferredSend.current = null;
      handleRookRequest(text, undefined, attachments);
    }
  }, [handleRookRequest, selectedPersona]);
  const initialMessageSent = useRef(false);
  useEffect(() => {
    if (
      (initialMessage || initialAttachments?.length) &&
      !initialMessageSent.current
    ) {
      initialMessageSent.current = true;
      handleSend(initialMessage ?? "", undefined, initialAttachments);
      onInitialMessageConsumed?.();
    }
  }, [
    initialAttachments,
    initialMessage,
    handleSend,
    onInitialMessageConsumed,
  ]);
  const isStreaming = chatState === "streaming";
  const isCompacting = chatState === "compacting";
  const showIndicator =
    chatState === "thinking" ||
    chatState === "streaming" ||
    chatState === "waiting" ||
    chatState === "compacting";
  const handleCreatePersona = useCallback(() => {
    useAgentStore.getState().openPersonaEditor();
  }, []);
  const draftValue = useChatStore(
    (s) => s.draftsBySession[activeSessionId] ?? "",
  );
  const scrollTarget = useChatStore(
    (s) => s.scrollTargetMessageBySession[activeSessionId] ?? null,
  );
  const handleDraftChange = useCallback(
    (text: string) => {
      useChatStore.getState().setDraft(activeSessionId, text);
    },
    [activeSessionId],
  );
  const handleSlashHelp = useCallback(() => {
    const lines = [
      "/help - Show available commands",
      "/new - Start a fresh conversation",
      "/settings - Open appearance settings",
      "/providers - Open provider settings",
      "/project - Create a project",
      "/compact - Compact the current conversation",
      "/stop - Stop the current response",
      "/clear - Clear messages in this chat",
    ];

    chatStore.addMessage(
      activeSessionId,
      createSystemNotificationMessage(lines.join("\n"), "info"),
    );
  }, [activeSessionId, chatStore]);
  const handleClearConversation = useCallback(() => {
    useChatStore.getState().clearMessages(activeSessionId);
  }, [activeSessionId]);
  const handleScrollTargetHandled = useCallback(() => {
    useChatStore.getState().clearScrollTargetMessage(activeSessionId);
  }, [activeSessionId]);
  return (
    <ArtifactPolicyProvider
      messages={messages}
      allowedRoots={allowedArtifactRoots}
    >
      <div className="relative flex h-full min-w-0">
        <div className="flex min-w-0 flex-1 flex-col pr-1">
          {isLoadingHistory ? (
            <ChatLoadingSkeleton />
          ) : (
            <MessageTimeline
              messages={messages}
              streamingMessageId={streamingMessageId}
              scrollTargetMessageId={scrollTarget?.messageId ?? null}
              scrollTargetQuery={scrollTarget?.query ?? null}
              onScrollTargetHandled={handleScrollTargetHandled}
            />
          )}

          <AnimatePresence initial={false}>
            {showIndicator && !isLoadingHistory ? (
              <LoadingRook
                key="loading-indicator"
                chatState={
                  chatState as
                    | "thinking"
                    | "streaming"
                    | "waiting"
                    | "compacting"
                }
              />
            ) : null}
          </AnimatePresence>

          <ChatInput
            onSend={handleSend}
            disabled={projectMetadataPending}
            queuedMessage={queue.queuedMessage}
            onDismissQueue={queue.dismiss}
            initialValue={draftValue}
            onDraftChange={handleDraftChange}
            onStop={stopStreaming}
            isStreaming={isStreaming || chatState === "thinking"}
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onPersonaChange={handlePersonaChange}
            onCreatePersona={handleCreatePersona}
            providers={providers}
            providersLoading={providersLoading}
            selectedProvider={selectedProvider}
            onProviderChange={handleProviderChange}
            currentModelId={session?.modelId ?? null}
            currentModel={session?.modelName}
            availableModels={availableModels}
            onModelChange={handleModelChange}
            modelLoadState={selectedModelLoadState}
            selectedProjectId={session?.projectId ?? null}
            availableProjects={availableProjects}
            onProjectChange={handleProjectChange}
            onCreateProject={(options) =>
              onCreateProject?.({
                onCreated: (projectId) => {
                  handleProjectChange(projectId);
                  options?.onCreated?.(projectId);
                },
              })
            }
            contextTokens={tokenState.accumulatedTotal}
            contextLimit={tokenState.contextLimit}
            onCompactContext={compactConversation}
            canCompactContext={
              chatState === "idle" &&
              tokenState.accumulatedTotal > 0 &&
              !projectMetadataPending
            }
            isCompactingContext={isCompacting}
            onRequestNewChat={onStartNewChat}
            onRequestOpenSettings={onOpenSettings}
            onRequestClearChat={handleClearConversation}
            onRequestHelp={handleSlashHelp}
          />
        </div>

        <ChatContextPanel
          activeSessionId={activeSessionId}
          isOpen={isContextPanelOpen}
          label={contextPanelLabel}
          project={project}
          setOpen={setContextPanelOpen}
        />
      </div>
    </ArtifactPolicyProvider>
  );
}
