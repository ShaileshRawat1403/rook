import { useEffect } from "react";

import { AppShell } from "@/app/AppShell";
import { useScrollFade } from "@/shared/hooks/useScrollFade";
import { useZoom } from "@/shared/hooks/useZoom";
import { Toaster } from "@/shared/ui/sonner";

type DeepLinkDetail = {
  action: string;
  params: Record<string, string>;
  pathSegments: string[];
  rawUrl: string;
};

function dispatchDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    const detail: DeepLinkDetail = {
      action: parsed.hostname,
      params: Object.fromEntries(parsed.searchParams),
      pathSegments: parsed.pathname
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean),
      rawUrl: url,
    };
    window.dispatchEvent(
      new CustomEvent<DeepLinkDetail>("rook:deeplink", { detail }),
    );
  } catch (error) {
    console.error("[deep-link] Failed to parse URL:", error);
  }
}

export function App() {
  useScrollFade();
  useZoom();

  useEffect(() => {
    const preventWindowFileNavigation = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener("dragover", preventWindowFileNavigation);
    window.addEventListener("drop", preventWindowFileNavigation);

    // Dynamic import to avoid crash in non-Tauri environments (e.g., Playwright E2E)
    if (window.__TAURI_INTERNALS__) {
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        getCurrentWindow()
          .show()
          .catch(() => {});
      });
    }

    let disposed = false;
    let disposeDeepLink: (() => void) | undefined;
    let disposeShortcut: (() => void) | undefined;

    if (window.__TAURI_INTERNALS__) {
      void import("@tauri-apps/api/event")
        .then(async ({ listen }) => {
          if (disposed) {
            return;
          }

          disposeDeepLink = await listen<string>("deep-link", (event) => {
            if (
              typeof event.payload === "string" &&
              event.payload.startsWith("rook://")
            ) {
              dispatchDeepLink(event.payload);
            }
          });

          disposeShortcut = await listen<string>("shortcut", (event) => {
            if (typeof event.payload === "string" && event.payload.trim()) {
              window.dispatchEvent(
                new CustomEvent<{ shortcut: string }>("rook:shortcut", {
                  detail: { shortcut: event.payload },
                }),
              );
            }
          });
        })
        .catch((error) => {
          console.error("Failed to bind Tauri shell events:", error);
        });
    }

    return () => {
      disposed = true;
      disposeDeepLink?.();
      disposeShortcut?.();
      window.removeEventListener("dragover", preventWindowFileNavigation);
      window.removeEventListener("drop", preventWindowFileNavigation);
    };
  }, []);

  return (
    <>
      <AppShell />
      <Toaster />
    </>
  );
}
