"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
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
    <div className="min-h-screen bg-muted/60 dark:bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-3.5 pt-4 pb-28">{children}</main>
    </div>
  );
}
