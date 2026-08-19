"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { NavTabs } from "@/components/layout/nav-tabs";
import { RANURA_ACCIONES } from "@/components/shared/acciones-fab";
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

      {/* Hueco del botón de acciones (AccionesFab se dibuja acá por portal).
          Va en el layout y no en cada pantalla porque dónde entra depende del
          armazón: la app vive en una franja centrada del ancho de un teléfono,
          así que el botón se alinea al borde IZQUIERDO DE LA FRANJA y no al de
          la pantalla — en escritorio, pegado al viewport, quedaría flotando
          solo en el fondo gris. Va arriba de la barra de navegación, que mide
          56 px más el margen de gestos del celular.
          `pointer-events-none` para que el hueco no tape los clics del listado
          que hay detrás; el botón se los devuelve. */}
      <div
        id={RANURA_ACCIONES}
        className="pointer-events-none fixed bottom-[calc(4.25rem_+_env(safe-area-inset-bottom))] left-1/2 z-45 w-full max-w-md -translate-x-1/2 pl-3.5"
      />
    </div>
  );
}
