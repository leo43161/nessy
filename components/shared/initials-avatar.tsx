import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

interface InitialsAvatarProps {
  nombre: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-10 text-sm",
  md: "size-11 text-base",
  lg: "size-14 text-xl",
};

export function InitialsAvatar({ nombre, size = "sm", className }: InitialsAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        SIZES[size],
        "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
        className
      )}
    >
      {initials(nombre)}
    </div>
  );
}
