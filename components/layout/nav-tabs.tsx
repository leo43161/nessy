"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/cobros", label: "Cobros", icon: Wallet },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/notas", label: "Notas", icon: FileText },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
] as const;

/**
 * Navegación principal, fija al pie.
 *
 * Abajo y no en la topbar porque la app se usa en la calle, con una mano: el
 * pulgar llega al borde inferior y no al superior. `env(safe-area-inset-bottom)`
 * la levanta por encima de la barra de gestos del celular.
 */
export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgb(0_0_0/0.06)]">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icono = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icono className={cn("size-5", active && "fill-primary/10")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
