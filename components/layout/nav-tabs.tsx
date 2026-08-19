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
    // Dos formas según el ancho, igual que el panel del admin:
    //
    //   teléfono    barra al pie, que es donde llega el pulgar en la calle
    //   escritorio  franja vertical a la izquierda
    //
    // Antes en escritorio quedaba la barra de abajo dentro de una columna del
    // ancho de un teléfono: se usaba con el mouse, tapaba el final del listado
    // y desperdiciaba toda la pantalla.
    <nav
      aria-label="Secciones"
      className={cn(
        "fixed z-45 border-border bg-card",
        "inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgb(0_0_0/0.06)]",
        "sm:inset-x-auto sm:top-0 sm:left-0 sm:h-dvh sm:w-18 sm:border-t-0 sm:border-r sm:pb-0 sm:shadow-none",
      )}
    >
      <div className="grid grid-cols-4 sm:flex sm:h-full sm:flex-col sm:gap-1 sm:pt-3">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icono = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[0.65rem] font-semibold transition-colors sm:mx-1.5 sm:min-h-16 sm:rounded-xl",
                active
                  ? "text-primary sm:bg-primary/10"
                  : "text-muted-foreground hover:text-foreground sm:hover:bg-secondary"
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
