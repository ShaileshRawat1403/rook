import { cn } from "@/shared/lib/cn";

export function RookIcon({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-6 bg-current", className)}
      style={{
        mask: "url('/rook-favicon.png') center / contain no-repeat",
        WebkitMask: "url('/rook-favicon.png') center / contain no-repeat",
      }}
    />
  );
}
