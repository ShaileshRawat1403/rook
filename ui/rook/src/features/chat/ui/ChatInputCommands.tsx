import { useEffect, useRef } from "react";
import {
  BookOpen,
  BrushCleaning,
  FolderKanban,
  RefreshCcw,
  Settings2,
  Square,
  Wrench,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type SlashCommandId =
  | "help"
  | "new"
  | "settings"
  | "providers"
  | "project"
  | "compact"
  | "stop"
  | "clear";

export interface SlashCommandItem {
  id: SlashCommandId;
  label: string;
  description: string;
  disabled?: boolean;
}

interface ChatInputCommandsProps {
  commands: SlashCommandItem[];
  selectedIndex: number;
  onSelect: (command: SlashCommandId) => void;
  emptyLabel: string;
  title: string;
  hint: string;
}

function getIcon(commandId: SlashCommandId) {
  switch (commandId) {
    case "help":
      return BookOpen;
    case "new":
      return RefreshCcw;
    case "settings":
      return Settings2;
    case "providers":
      return Wrench;
    case "project":
      return FolderKanban;
    case "compact":
      return BrushCleaning;
    case "stop":
      return Square;
    case "clear":
      return BrushCleaning;
  }
}

export function ChatInputCommands({
  commands,
  selectedIndex,
  onSelect,
  emptyLabel,
  title,
  hint,
}: ChatInputCommandsProps) {
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const element = itemRefs.current.get(selectedIndex);
    if (element) {
      element.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div className="mb-2 border-b border-border/60 pb-2">
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground/50">{hint}</span>
      </div>
      {commands.length === 0 ? (
        <div className="px-1 py-1 text-sm text-muted-foreground/80">
          {emptyLabel}
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {commands.map((command, index) => {
            const Icon = getIcon(command.id);
            const isSelected = index === selectedIndex;
            return (
              <button
                key={command.id}
                ref={(element) => {
                  if (element) itemRefs.current.set(index, element);
                  else itemRefs.current.delete(index);
                }}
                type="button"
                disabled={command.disabled}
                onClick={() => onSelect(command.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                  isSelected
                    ? "bg-accent text-foreground"
                    : "text-foreground hover:bg-accent/50",
                  command.disabled && "cursor-not-allowed opacity-45",
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                />
                <span className="text-[13px] font-medium tabular-nums">
                  /{command.label}
                </span>
                <span className="ml-1 truncate text-xs text-muted-foreground">
                  {command.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
