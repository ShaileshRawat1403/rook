import { RookIcon } from "@/shared/ui/icons/RookIcon";
import { cn } from "@/shared/lib/cn";

interface RookLogoProps {
  className?: string;
  size?: "default" | "small";
}

export function RookLogo({ className = "", size = "default" }: RookLogoProps) {
  const sizes = {
    default: "w-16 h-16",
    small: "w-8 h-8",
  } as const;

  return (
    <div className={cn(className, sizes[size], "relative")}>
      <RookIcon className={cn(sizes[size], "absolute left-0 bottom-0")} />
    </div>
  );
}
