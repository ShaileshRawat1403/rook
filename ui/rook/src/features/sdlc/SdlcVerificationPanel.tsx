import { Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { verifySdlcRepo } from "./api";
import { SdlcEvidenceViewer } from "./SdlcEvidenceViewer";
import type { VerificationReport } from "./types";

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Verification failed.";
}

export function SdlcVerificationPanel() {
  const [repoRoot, setRepoRoot] = useState("");
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedRepoRoot = repoRoot.trim();

  async function runVerification() {
    if (!trimmedRepoRoot || isRunning) {
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const nextReport = await verifySdlcRepo(trimmedRepoRoot);
      setReport(nextReport);
    } catch (err) {
      setReport(null);
      setError(errorMessage(err));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section
      aria-label="SDLC Verification"
      aria-busy={isRunning}
      className="flex flex-col gap-4"
    >
      <div className="rounded-lg border border-border bg-background px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <Label htmlFor="sdlc-repo-root">Repo path</Label>
            <Input
              id="sdlc-repo-root"
              value={repoRoot}
              onChange={(event) => setRepoRoot(event.target.value)}
              placeholder="/path/to/repository"
              disabled={isRunning}
              className="mt-2"
            />
          </div>
          <Button
            type="button"
            onClick={runVerification}
            disabled={!trimmedRepoRoot || isRunning}
            leftIcon={<Play />}
          >
            {isRunning ? "Running Verification" : "Run Verification"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <SdlcEvidenceViewer report={report} />
    </section>
  );
}
