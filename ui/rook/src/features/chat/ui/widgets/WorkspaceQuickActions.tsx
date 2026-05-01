import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  IconBrandVisualStudio,
  IconChevronDown,
  IconCode,
  IconFolderOpen,
  IconTerminal2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  openInEditor,
  openInTerminal,
  revealInFileManager,
  type EditorId,
} from "@/shared/api/openActions";
import { useEditorPreferenceStore } from "@/features/projects/stores/editorPreferenceStore";

interface WorkspaceQuickActionsProps {
  workspacePath: string;
}

const EDITOR_LABELS: Record<EditorId, string> = {
  vscode: "VS Code",
  cursor: "Cursor",
};

function EditorIcon({ editor }: { editor: EditorId }) {
  if (editor === "vscode") {
    return <IconBrandVisualStudio className="size-3.5" />;
  }
  return <IconCode className="size-3.5" />;
}

export function WorkspaceQuickActions({
  workspacePath,
}: WorkspaceQuickActionsProps) {
  const { t } = useTranslation("chat");
  const editor = useEditorPreferenceStore((s) => s.editor);
  const setEditor = useEditorPreferenceStore((s) => s.setEditor);

  const handleReveal = useCallback(() => {
    void revealInFileManager(workspacePath).catch(() => {
      toast.error(t("contextPanel.openActions.revealFailed"));
    });
  }, [workspacePath, t]);

  const handleTerminal = useCallback(() => {
    void openInTerminal(workspacePath).catch((error) => {
      const message =
        error instanceof Error
          ? error.message
          : t("contextPanel.openActions.terminalFailed");
      toast.error(message);
    });
  }, [workspacePath, t]);

  const handleOpenEditor = useCallback(
    (chosen: EditorId) => {
      void openInEditor(workspacePath, workspacePath, chosen).catch(() => {
        toast.error(
          t("contextPanel.openActions.editorFailed", {
            editor: EDITOR_LABELS[chosen],
          }),
        );
      });
    },
    [workspacePath, t],
  );

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={handleReveal}
        aria-label={t("contextPanel.openActions.reveal")}
        title={t("contextPanel.openActions.reveal")}
      >
        <IconFolderOpen className="size-3.5" />
        {t("contextPanel.openActions.revealShort")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={handleTerminal}
        aria-label={t("contextPanel.openActions.terminal")}
        title={t("contextPanel.openActions.terminal")}
      >
        <IconTerminal2 className="size-3.5" />
        {t("contextPanel.openActions.terminalShort")}
      </Button>
      <div className="ml-auto flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => handleOpenEditor(editor)}
          aria-label={t("contextPanel.openActions.openInEditor", {
            editor: EDITOR_LABELS[editor],
          })}
          title={t("contextPanel.openActions.openInEditor", {
            editor: EDITOR_LABELS[editor],
          })}
          className="rounded-r-none"
        >
          <EditorIcon editor={editor} />
          {EDITOR_LABELS[editor]}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("contextPanel.openActions.editorPreference")}
              title={t("contextPanel.openActions.editorPreference")}
              className="rounded-l-none border-l border-border"
            >
              <IconChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={editor}
              onValueChange={(value) => {
                if (value === "vscode" || value === "cursor") {
                  setEditor(value);
                }
              }}
            >
              <DropdownMenuRadioItem value="vscode">
                {EDITOR_LABELS.vscode}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="cursor">
                {EDITOR_LABELS.cursor}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleOpenEditor("vscode")}>
              {t("contextPanel.openActions.openInEditor", {
                editor: EDITOR_LABELS.vscode,
              })}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleOpenEditor("cursor")}>
              {t("contextPanel.openActions.openInEditor", {
                editor: EDITOR_LABELS.cursor,
              })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
