import { useEffect, useState } from "react";
import { checkAllProviderStatus } from "@/features/providers/api/credentials";

export function useConfiguredModelProviderIds(): Set<string> | null {
  const [configuredProviderIds, setConfiguredProviderIds] =
    useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    checkAllProviderStatus()
      .then((statuses) => {
        if (cancelled) return;
        setConfiguredProviderIds(
          new Set(
            statuses
              .filter((status) => status.isConfigured)
              .map((status) => status.providerId),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setConfiguredProviderIds(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return configuredProviderIds;
}
