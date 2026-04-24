import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { listen } from "@tauri-apps/api/event";

import { App } from "@/app/App";
import { I18nProvider } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import "@/shared/styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

listen<string[]>("deep-link", (event) => {
  const args = event.payload;
  if (args.length > 0) {
    const url = args.find((arg) => arg.startsWith("rook://"));
    if (url) {
      handleDeepLink(url);
    }
  }
});

function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    const action = parsed.hostname;
    const params = Object.fromEntries(parsed.searchParams);
    window.dispatchEvent(
      new CustomEvent("rook:deeplink", { detail: { action, params } }),
    );
  } catch (e) {
    console.error("[deep-link] Failed to parse URL:", e);
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider defaultTheme="system">
          <App />
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
