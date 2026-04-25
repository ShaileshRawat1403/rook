import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

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

type RootErrorBoundaryState = {
  error: Error | null;
};

class RootErrorBoundary extends React.Component<
  React.PropsWithChildren,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[rook-ui] renderer crash", error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
        <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Rook UI Crash
          </div>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight">
            The renderer failed to load.
          </h1>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">
            This is a real startup error, not a blank screen. The details below
            are from the renderer crash so we can fix the exact failure.
          </p>
          <pre className="overflow-x-auto rounded-2xl bg-muted p-4 text-xs leading-5 text-foreground">
            {this.state.error.stack ?? this.state.error.message}
          </pre>
        </div>
      </div>
    );
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider defaultTheme="system">
            <App />
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
);

(
  window as Window & {
    __ROOK_HIDE_BOOT__?: () => void;
  }
).__ROOK_HIDE_BOOT__?.();
