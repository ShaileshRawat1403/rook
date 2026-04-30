import { useQuery } from "@tanstack/react-query";
import { detectProject } from "@/features/projects/lib/detectProject";

export function useProjectDetection(
  workspacePath: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ["project-detection", workspacePath],
    queryFn: () => detectProject(workspacePath ?? ""),
    enabled: enabled && Boolean(workspacePath),
    staleTime: 60_000,
  });
}
