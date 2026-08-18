"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/auth.slice";
import { formatFecha } from "@/lib/format";
import { EMPRESA_NOMBRE } from "@/lib/marca";
import { Isotipo } from "@/components/shared/isotipo";

export function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cobrador = useAppSelector((s) => s.auth.cobrador);
  const workDate = useAppSelector((s) => s.ui.workDate);
  const primerNombre = cobrador?.nombreCompleto.split(" ")[0] ?? "Cobrador";

  const handleLogout = () => {
    dispatch(logout());
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      {/* El ancho lo pone la franja del layout: acá no hace falta limitarlo */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3.5 py-2">
        {/* Nombre y logo salen de lib/marca.ts. */}
        <Isotipo className="size-10 rounded-xl shadow-sm" />
        <div className="mr-auto">
          <div className="leading-tight font-bold text-primary-dark">{EMPRESA_NOMBRE}</div>
          <div className="text-sm leading-tight text-muted-foreground">
            Cobros · {formatFecha(workDate)}
          </div>
        </div>

        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-accent bg-accent font-bold text-accent-foreground hover:bg-accent/70"
            >
              <User />
              {primerNombre}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{cobrador?.nombreCompleto ?? "Cobrador"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
