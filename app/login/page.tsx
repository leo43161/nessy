"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login } from "@/store/slices/auth.slice";
import { APP_NAME } from "@/lib/constants";
import { USE_MOCK } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const cargando = status === "loading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !password) return;
    const result = await dispatch(login({ usuario, password }));
    if (login.fulfilled.match(result)) {
      router.replace("/cobros");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-[#1c1a14] px-5 py-6">
      <div className="mb-4 flex size-18 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_8px_32px_rgba(249,115,22,0.4)]">
        <HandCoins className="size-9 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
      <p className="mb-9 text-sm text-gray-400">Control de Clientes y Cobros</p>

      <form onSubmit={handleSubmit} className="w-full max-w-85 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="usuario" className="text-gray-300">
            Usuario
          </Label>
          <Input
            id="usuario"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Tu usuario"
            autoComplete="username"
            autoFocus
            className="h-11 border-white/15 bg-white/5 text-white placeholder:text-gray-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-300">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="h-11 border-white/15 bg-white/5 text-white placeholder:text-gray-500"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={cargando || !usuario.trim() || !password}
          className="h-11 w-full bg-gradient-to-br from-orange-500 to-orange-600 text-base font-bold text-white shadow-[0_6px_20px_rgba(249,115,22,0.4)] hover:opacity-90"
        >
          {cargando && <Loader2 className="animate-spin" />}
          Ingresar
        </Button>
      </form>

      {USE_MOCK && (
        <p className="mt-8 text-center text-xs text-gray-500">
          Demo — usuarios: <span className="font-mono text-gray-400">marcos · luis · diego</span>
          <br />
          (cualquier contraseña)
        </p>
      )}
    </div>
  );
}
