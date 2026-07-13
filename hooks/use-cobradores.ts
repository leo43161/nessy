"use client";

import { useEffect, useState } from "react";
import { getCobradores } from "@/services/cobradores.service";
import type { Cobrador } from "@/types";

let cache: Cobrador[] | null = null;

/** Lista de cobradores, cacheada para toda la sesión */
export function useCobradores(): Cobrador[] {
  const [cobradores, setCobradores] = useState<Cobrador[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let activo = true;
    getCobradores().then((data) => {
      cache = data;
      if (activo) setCobradores(data);
    });
    return () => {
      activo = false;
    };
  }, []);

  return cobradores;
}
