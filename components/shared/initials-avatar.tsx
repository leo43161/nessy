import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

interface InitialsAvatarProps {
  nombre: string;
  /** true → tono rojo (cliente moroso) */
  moroso?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-10 text-sm",
  md: "size-11 text-base",
  lg: "size-14 text-xl",
};

export function InitialsAvatar({ nombre, moroso, size = "sm", className }: InitialsAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        SIZES[size],
        moroso
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
          : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
        className
      )}
    >
      {initials(nombre)}
    </div>
  );
}
