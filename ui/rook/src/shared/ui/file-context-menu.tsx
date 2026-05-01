import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import {
  openInDefaultApp,
  openInEditor,
  revealInFileManager,
} from "@/shared/api/openActions";
import { useEditorPreferenceStore } from "@/features/projects/stores/editorPreferenceStore";
import { getPlatform } from "@/shared/lib/platform";

const revealLabel = `labels.revealInFileManager_${getPlatform()}` as const;

interface FileContextMenuProps {
  /** Absolute path to the file or directory. */
  path: string;
  /** Optional workspace root. When provided, enables Open-in-Editor and a relative-path copy. */
  workspaceRoot?: string;
  /** Optional pre-computed relative path (preferred when known by the caller). */
  relativePath?: string;
  children: ReactNode;
}

function relativeFromRoot(absolute: string, root: string): string {
  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/";
  const trimmedRoot = root.endsWith(sep) ? root.slice(0, -1) : root;
  if (absolute === trimmedRoot) return "";
  if (absolute.startsWith(trimmedRoot + sep)) {
    return absolute.slice(trimmedRoot.length + sep.length);
  }
  return absolute;
}

export function FileContextMenu({
  path,
  workspaceRoot,
  relativePath,
  children,
}: FileContextMenuProps) {
  const { t } = useTranslation("common");
  const editor = useEditorPreferenceStore((s) => s.editor);
  const computedRelative =
    relativePath ??
    (workspaceRoot ? relativeFromRoot(path, workspaceRoot) : "");
  const showRelativeCopy = Boolean(workspaceRoot && computedRelative);
  const showOpenInEditor = Boolean(workspaceRoot);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => void openInDefaultApp(path)}>
          {t("labels.openFile")}
        </ContextMenuItem>
        {showOpenInEditor && workspaceRoot && (
          <ContextMenuItem
            onSelect={() => void openInEditor(workspaceRoot, path, editor)}
          >
            {t("labels.openInEditor", {
              editor: editor === "vscode" ? "VS Code" : "Cursor",
            })}
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => void revealInFileManager(path)}>
          {t(revealLabel)}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => void navigator.clipboard.writeText(path)}
        >
          {t("labels.copyPath")}
        </ContextMenuItem>
        {showRelativeCopy && (
          <ContextMenuItem
            onSelect={() =>
              void navigator.clipboard.writeText(computedRelative)
            }
          >
            {t("labels.copyRelativePath")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
