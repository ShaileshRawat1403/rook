import { useState, useEffect, useCallback } from "react";
import {
  getStoredProvider,
  useAgentStore,
} from "@/features/agents/stores/agentStore";
import { useProviderSelection } from "@/features/agents/hooks/useProviderSelection";
import { ChatInput } from "@/features/chat/ui/ChatInput";
import { useChatStore } from "@/features/chat/stores/chatStore";
import type { ChatAttachmentDraft } from "@/shared/types/messages";
import { useProjectStore } from "@/features/projects/stores/projectStore";
import { useLocaleFormatting } from "@/shared/i18n";
import { RookGreeting } from "@/shared/ui/animations";
import { RookIcon } from "@/shared/ui/icons/RookIcon";

const HOME_DRAFT_KEY = "home";

function HomeClock() {
  const [time, setTime] = useState(new Date());
  const { getTimeParts } = useLocaleFormatting();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { hour, minute, dayPeriod } = getTimeParts(time, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex items-baseline gap-1 pl-4 text-muted-foreground">
      <span className="text-sm font-normal tabular-nums">
        {hour}:{minute}
      </span>
      {dayPeriod ? (
        <span className="text-xs font-normal opacity-70">{dayPeriod}</span>
      ) : null}
    </div>
  );
}

interface HomeScreenProps {
  onStartChat?: (
    initialMessage?: string,
    providerId?: string,
    personaId?: string,
    projectId?: string | null,
    attachments?: ChatAttachmentDraft[],
  ) => void;
  onCreateProject?: (options?: {
    onCreated?: (projectId: string) => void;
  }) => void;
  onOpenSettings?: (section?: "appearance" | "providers") => void;
}

export function HomeScreen({
  onStartChat,
  onCreateProject,
  onOpenSettings,
}: HomeScreenProps) {
  const personas = useAgentStore((s) => s.personas);
  const {
    providers,
    providersLoading,
    selectedProvider,
    setSelectedProvider,
    setSelectedProviderWithoutPersist,
  } = useProviderSelection();
  const projects = useProjectStore((s) => s.projects);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  const handlePersonaChange = useCallback(
    (personaId: string | null) => {
      setSelectedPersonaId(personaId);
      const persona = personaId
        ? personas.find((candidate) => candidate.id === personaId)
        : null;
      const nextProvider = persona?.provider ?? getStoredProvider(providers);

      setSelectedProviderWithoutPersist(nextProvider);
    },
    [personas, providers, setSelectedProviderWithoutPersist],
  );

  const handleCreatePersona = useCallback(() => {
    useAgentStore.getState().openPersonaEditor();
  }, []);

  const homeDraft = useChatStore(
    (s) => s.draftsBySession[HOME_DRAFT_KEY] ?? "",
  );
  const handleDraftChange = useCallback((text: string) => {
    useChatStore.getState().setDraft(HOME_DRAFT_KEY, text);
  }, []);

  const handleSend = useCallback(
    (
      message: string,
      personaId?: string,
      attachments?: ChatAttachmentDraft[],
    ) => {
      const effectivePersonaId = personaId ?? selectedPersonaId ?? undefined;

      useChatStore.getState().clearDraft(HOME_DRAFT_KEY);
      onStartChat?.(
        message,
        selectedProvider,
        effectivePersonaId,
        selectedProjectId,
        attachments,
      );
    },
    [onStartChat, selectedPersonaId, selectedProjectId, selectedProvider],
  );

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[640px] flex-col antialiased">
          {/* Hero: icon + greeting + clock anchored together */}
          <div className="flex flex-col gap-3 pl-4 mb-6">
            <RookIcon className="size-9 text-foreground" />
            <RookGreeting className="text-4xl font-light tracking-tight text-foreground" />
            <HomeClock />
          </div>

          {/* Chat input */}
          <ChatInput
            onSend={handleSend}
            initialValue={homeDraft}
            onDraftChange={handleDraftChange}
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onPersonaChange={handlePersonaChange}
            onCreatePersona={handleCreatePersona}
            providers={providers}
            providersLoading={providersLoading}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            selectedProjectId={selectedProjectId}
            availableProjects={projects.map((project) => ({
              id: project.id,
              name: project.name,
              workingDirs: project.workingDirs,
              color: project.color,
            }))}
            onProjectChange={setSelectedProjectId}
            onCreateProject={(options) =>
              onCreateProject?.({
                onCreated: (projectId) => {
                  setSelectedProjectId(projectId);
                  options?.onCreated?.(projectId);
                },
              })
            }
            onRequestOpenSettings={onOpenSettings}
          />
        </div>
      </div>
    </div>
  );
}
