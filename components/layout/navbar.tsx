"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, HandCoins, LogOut, User } from "lucide-react";
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
import { APP_NAME } from "@/lib/constants";

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
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600">
          <HandCoins className="size-4.5 text-white" />
        </div>
        <div className="mr-auto">
          <div className="text-sm leading-tight font-bold">{APP_NAME}</div>
          <div className="text-[0.65rem] leading-tight text-muted-foreground">
            Cobros · {formatFecha(workDate)}
          </div>
        </div>

        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-orange-200 bg-orange-50 font-bold text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-900 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-950"
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
