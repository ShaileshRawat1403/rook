import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULT_LIMIT = 500;

// Add narrowly scoped exceptions here with justification
const EXCEPTIONS = {
  "src/features/sidebar/ui/SidebarProjectsSection.tsx": {
    limit: 570,
    justification:
      "Drag-and-drop handlers for session-to-project moves and project reorder, plus activeProjectId highlight.",
  },
  "src/features/chat/ui/ChatView.tsx": {
    limit: 910,
    justification:
      "ACP prewarm guards, project/work-item aware prompt assembly, working context sync, chat bootstrapping, intent approval handoff, context-ring compaction wiring, slash-help/clear handlers, and context panel composition still live in the main chat surface.",
  },
  "src/features/chat/ui/MessageBubble.tsx": {
    limit: 520,
    justification:
      "Message rendering still combines text, images, tool chains, system notices, and lightweight intent approval actions in one chat bubble surface.",
  },
  "src/features/chat/hooks/useChat.ts": {
    limit: 530,
    justification:
      "Session preparation, provider/model handoff, persona-aware sends, cancellation, and compaction replay still live in one chat lifecycle hook.",
  },
  "src/shared/api/acpNotificationHandler.ts": {
    limit: 550,
    justification:
      "ACP replay/live update handling, pending session buffering, model/config propagation, and streaming perf tracking still share one notification entrypoint.",
  },
  "src/features/chat/ui/__tests__/ContextPanel.test.tsx": {
    limit: 550,
    justification:
      "Workspace widget integration tests cover branch switching, worktree creation, dirty-state dialogs, and picker interactions.",
  },
  "src/features/sidebar/ui/Sidebar.tsx": {
    limit: 580,
    justification:
      "Search-as-you-type filtering and draft-aware sidebar highlight logic.",
  },
  "src/app/AppShell.tsx": {
    limit: 850,
    justification:
      "Shell coordinates ACP session loading, replay-buffer cleanup, project reassignment, app-level chat routing, deep-link routing, and the global keyboard shortcut command bus. Includes gated [perf:load]/[perf:newtab] logging via perfLog (dev-only by default).",
  },
  "src/features/chat/stores/__tests__/chatSessionStore.test.ts": {
    limit: 610,
    justification:
      "ACP session overlay, provider/model metadata, work-item attachment, and draft migration regressions currently need one broad integration-style store suite.",
  },
  "src/features/chat/stores/chatSessionStore.ts": {
    limit: 880,
    justification:
      "ACP-backed session overlay persistence, provider/model metadata, draft migration, work-item attachment, and sidebar-facing session merge logic live together for now.",
  },
  "src-tauri/src/commands/projects.rs": {
    limit: 520,
    justification:
      "Project CRUD plus reorder_projects command for sidebar drag-and-drop ordering.",
  },
  "src-tauri/src/commands/system.rs": {
    limit: 640,
    justification:
      "Desktop system commands still centralize file mentions, attachment inspection, platform-aware path dedupe, guarded image loading, and export helpers in one Tauri command surface.",
  },
  "src/features/providers/providerCatalog.ts": {
    limit: 550,
    justification:
      "Complete provider catalog with all model providers including Gemini OAuth/CLI and agent providers.",
  },
  "src/features/chat/ui/ChatInput.tsx": {
    limit: 730,
    justification:
      "Composer hosts mention autocomplete, slash command surface, attachment drop targets, queue UI, sticky persona chip, and toolbar wiring all in one keyboard-driven control surface.",
  },
  "src/features/colony/ColonyView.tsx": {
    limit: 1100,
    justification:
      "Colony still composes the six-tab governed workspace, close-warning flow, seat/task/handoff actions, and adoption bridge UI in one transitional surface.",
  },
  "src/features/colony/colonyStore.ts": {
    limit: 1520,
    justification:
      "Colony state, lifecycle actions, audit events, persistence, and workflow-outcome integration remain centralized until the store is split by domain.",
  },
  "src/features/colony/colonyStore.test.ts": {
    limit: 650,
    justification:
      "Colony lifecycle, persistence, readiness, review, and closed-state regressions currently live in one broad store suite.",
  },
  "src/features/colony/swarm/recipes.ts": {
    limit: 1400,
    justification:
      "Versioned swarm module definitions are intentionally colocated while the recipe catalog remains hand-authored data rather than split resources.",
  },
  "src-tauri/src/commands/work_items.rs": {
    limit: 560,
    justification:
      "Work Item Core local storage commands, validation, and regression tests are intentionally isolated until the work-item UI lands.",
  },
};

// Directories excluded from size checks (imported library code)
const EXCLUDED_DIRS = [
  "src/shared/ui",
  "src/components/ai-elements",
  "src/hooks",
];

const DIRS_TO_CHECK = [
  { dir: "src/app", glob: /\.[jt]sx?$/ },
  { dir: "src/features", glob: /\.[jt]sx?$/ },
  { dir: "src/shared", glob: /\.[jt]sx?$/ },
  { dir: "src/components", glob: /\.[jt]sx?$/ },
  { dir: "src/hooks", glob: /\.[jt]sx?$/ },
  { dir: "src-tauri/src", glob: /\.rs$/ },
];

function countLines(filePath) {
  const content = readFileSync(filePath, "utf8");
  return content.split("\n").length;
}

function isExcluded(filePath) {
  const rel = relative(".", filePath);
  return EXCLUDED_DIRS.some((dir) => rel.startsWith(dir));
}

function walkDir(dir, pattern) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const violations = [];

for (const { dir, glob } of DIRS_TO_CHECK) {
  const files = walkDir(dir, glob);
  for (const file of files) {
    if (isExcluded(file)) continue;
    const rel = relative(".", file);
    const limit = EXCEPTIONS[rel]?.limit ?? DEFAULT_LIMIT;
    const lines = countLines(file);
    if (lines > limit) {
      violations.push({ file: rel, lines, limit });
    }
  }
}

if (violations.length > 0) {
  console.error("Desktop file size check failed:");
  for (const v of violations) {
    console.error(`  - ${v.file}: ${v.lines} lines (limit ${v.limit})`);
  }
  console.error(
    "\nSplit the file or add a narrowly scoped exception in `scripts/check-file-sizes.mjs`.",
  );
  process.exit(1);
} else {
  console.log("File size check passed.");
}
