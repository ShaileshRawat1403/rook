import { useState, useCallback } from "react";
import { isExternalHref } from "@/features/chat/lib/artifactPathPolicy";
import { useArtifactPolicyContext } from "@/features/chat/hooks/ArtifactPolicyContext";
import { useOpenActionPolicy } from "@/features/chat/hooks/useOpenActionPolicy";

function findPolicyWorkspaceRoot(
  targetPath: string,
  roots: string[],
): string | null {
  const normalizedTarget = targetPath.replace(/\/+$/, "");
  return (
    roots.find((root) => {
      const normalizedRoot = root.replace(/\/+$/, "");
      return (
        normalizedTarget === normalizedRoot ||
        normalizedTarget.startsWith(`${normalizedRoot}/`)
      );
    }) ??
    roots[0] ??
    null
  );
}

/**
 * Delegated click handler that intercepts local link clicks within a
 * container and routes them through the artifact policy layer.
 */
export function useArtifactLinkHandler() {
  const { resolveMarkdownHref, openResolvedPath, normalizedRoots } =
    useArtifactPolicyContext();
  const { evaluatePolicy } = useOpenActionPolicy();
  const [pathNotice, setPathNotice] = useState<string | null>(null);

  const handleFilePathClick = useCallback(
    async (path: string) => {
      setPathNotice(null);
      const resolved = resolveMarkdownHref(path);
      if (!resolved) {
        setPathNotice("Invalid path format.");
        return;
      }

      const workspacePath = findPolicyWorkspaceRoot(
        resolved.resolvedPath,
        normalizedRoots,
      );
      if (!workspacePath) {
        setPathNotice("No project workspace is available for this path.");
        return;
      }

      try {
        const decision = await evaluatePolicy(
          workspacePath,
          resolved.resolvedPath,
          "editor",
        );

        if (!decision.allow) {
          if (decision.needsApproval) {
            setPathNotice(
              "Action requires explicit approval. Approval UI integration is pending.",
            );
            return;
          }
          setPathNotice(decision.blockedReason || "Access denied by policy.");
          return;
        }

        await openResolvedPath(resolved.resolvedPath);
      } catch (err) {
        setPathNotice(err instanceof Error ? err.message : String(err));
      }
    },
    [resolveMarkdownHref, openResolvedPath, evaluatePolicy, normalizedRoots],
  );

  const handleContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || isExternalHref(href)) return;

      event.preventDefault();

      if (href.startsWith("rook-file://")) {
        handleFilePathClick(href.replace("rook-file://", ""));
        return;
      }

      const resolved = resolveMarkdownHref(href);
      if (!resolved) return;

      if (!resolved.allowed) {
        setPathNotice(
          resolved.blockedReason ||
            "Path is outside allowed project/artifacts roots.",
        );
        return;
      }

      setPathNotice(null);
      void openResolvedPath(resolved.resolvedPath).catch((err) => {
        setPathNotice(err instanceof Error ? err.message : String(err));
      });
    },
    [resolveMarkdownHref, openResolvedPath, handleFilePathClick],
  );

  return { handleContentClick, handleFilePathClick, pathNotice };
}
