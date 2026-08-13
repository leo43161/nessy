"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { NavTabs } from "@/components/layout/nav-tabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { restoreSession } from "@/store/slices/auth.slice";
import { initWorkDate } from "@/store/slices/ui.slice";

/**
 * Shell autenticado: restaura la sesión guardada (token en localStorage)
 * y la fecha de trabajo antes de renderizar cualquier página de la app.
 * proxy.ts ya bloquea el acceso sin cookie; esto cubre expiración del token.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    dispatch(initWorkDate());
  }, [dispatch]);

  useEffect(() => {
    if (status === "idle") {
      dispatch(restoreSession());
    }
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, dispatch, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // En escritorio la app se muestra como una franja del ancho de un teléfono,
    // centrada y con el fondo apagado a los costados. No es una limitación: es
    // la misma pantalla que el cobrador usa en la calle, y estirarla a 1920px
    // dejaría una fila de datos perdida en medio del vacío.
    // El exterior va MÁS CLARO que la franja en oscuro: `--background` ya es
    // casi negro, así que un fondo más oscuro no se distinguía —medido en el
    // navegador, los dos daban el mismo color y la franja solo la separaba un
    // borde al 10%—. Con neutral-900 alrededor, la app se lee como un teléfono
    // apoyado sobre el escritorio.
    <div className="min-h-screen bg-muted/60 dark:bg-neutral-900">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background shadow-xl sm:border-x sm:border-border">
        <Navbar />
        {/* pb-28: la barra de navegación es fija y taparía el final del listado */}
        <main className="flex-1 px-3.5 pt-4 pb-28">{children}</main>
      </div>
      <NavTabs />
    </div>
  );
}
