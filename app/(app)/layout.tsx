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
    // Dos armazones según el ancho:
    //
    //   teléfono    una columna sola, con la navegación al pie
    //   escritorio  franja de navegación a la izquierda y el contenido usando
    //               el resto, con un tope de ancho para que una fila de datos
    //               no quede perdida cruzando 1920 px
    //
    // Antes en escritorio se mostraba la misma columna angosta del teléfono,
    // centrada sobre un fondo gris. Servía como maqueta, pero el cobrador y el
    // supervisor lo abren en la computadora y ahí sobraba pantalla a los dos
    // costados mientras la lista scrolleaba dentro de un canuto.
    <div className="min-h-screen bg-background sm:pl-18">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col sm:max-w-3xl">
        <Navbar />
        {/* El colchón de abajo despeja las dos cosas fijas: la barra de
            navegación y el botón de opciones que flota encima. Desde `sm` la
            navegación se va al costado y solo queda el botón. */}
        <main className="flex-1 px-3.5 pt-4 pb-36 sm:px-5 sm:pb-24">{children}</main>
      </div>
      <NavTabs />

      {/* Hueco del botón de acciones (AccionesFab se dibuja acá por portal).
          Va en el layout y no en cada pantalla porque dónde entra depende del
          armazón: en el teléfono se alinea al borde de la columna y queda
          arriba de la barra del pie; desde `sm` la barra se va al costado y el
          botón se corre para no quedar encima de la franja.
          `pointer-events-none` para que el hueco no tape los clics del listado
          que hay detrás; el botón se los devuelve. */}
      <div
        id={RANURA_ACCIONES}
        className="pointer-events-none fixed bottom-[calc(4.25rem_+_env(safe-area-inset-bottom))] left-1/2 z-45 w-full max-w-md -translate-x-1/2 pl-3.5 sm:bottom-6 sm:left-18 sm:translate-x-0 sm:pl-4"
      />
    </div>
  );
}