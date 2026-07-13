"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/cobros", label: "Cobros" },
  { href: "/clientes", label: "Clientes" },
  { href: "/notas", label: "Notas" },
  { href: "/estadisticas", label: <BarChart3 className="size-4" />, title: "Estadísticas" },
] as const;

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-0.5 rounded-xl bg-muted p-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={"title" in tab ? tab.title : undefined}
            className={cn(
              "flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
