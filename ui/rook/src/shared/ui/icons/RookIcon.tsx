import { CrowFlap } from "@/shared/ui/animations/CrowFlap";

export function RookIcon({ className = "" }: { className?: string }) {
  return <CrowFlap className={className} autoplay={false} />;
}
