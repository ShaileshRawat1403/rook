import { useChatSessionStore } from "@/features/chat/stores/chatSessionStore";

interface ConfigOptionLike {
  category?: string | null;
  kind?: Record<string, unknown>;
}

export function applyConfigOptions(
  sessionId: string,
  options: ConfigOptionLike[],
): void {
  const modelOption = options.find((opt) => opt.category === "model");
  if (!modelOption || modelOption.kind?.type !== "select") {
    return;
  }

  const select = modelOption.kind as {
    type: "select";
    currentValue: string;
    options?:
      | { type: "ungrouped"; values: Array<{ value: string; name: string }> }
      | {
          type: "grouped";
          groups: Array<{
            options: Array<{ value: string; name: string }>;
          }>;
        };
  };
  const currentModelId = select.currentValue;
  const availableModels: Array<{ id: string; name: string }> = [];

  if (select.options?.type === "ungrouped") {
    for (const value of select.options.values) {
      availableModels.push({ id: value.value, name: value.name });
    }
  } else if (select.options?.type === "grouped") {
    for (const group of select.options.groups) {
      for (const value of group.options) {
        availableModels.push({ id: value.value, name: value.name });
      }
    }
  }

  if (availableModels.length === 0) {
    return;
  }

  const currentModelName =
    availableModels.find((model) => model.id === currentModelId)?.name ??
    currentModelId;

  const sessionStore = useChatSessionStore.getState();
  sessionStore.setSessionModels(sessionId, availableModels);
  sessionStore.updateSession(
    sessionId,
    { modelId: currentModelId, modelName: currentModelName },
    { persistOverlay: false },
  );

  const providerId = sessionStore.getSession(sessionId)?.providerId;
  if (providerId) {
    sessionStore.cacheModelsForProvider(providerId, availableModels);
  }
}
