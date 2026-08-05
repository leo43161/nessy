"use client";

import { useEffect, useState } from "react";
import { getCobradores, getLocalidades } from "@/services/cobradores.service";
import type { Cobrador, Localidad } from "@/types";

// Catálogos estables durante la sesión (cobradores y localidades)
let cobradoresCache: Cobrador[] | null = null;
let localidadesCache: Localidad[] | null = null;

export function useCobradores(): Cobrador[] {
  const [cobradores, setCobradores] = useState<Cobrador[]>(cobradoresCache ?? []);

  useEffect(() => {
    if (cobradoresCache) return;
    let activo = true;
    getCobradores().then((data) => {
      cobradoresCache = data;
      if (activo) setCobradores(data);
    });
    return () => {
      activo = false;
    };
  }, []);

  return cobradores;
}

export function useLocalidades(): Localidad[] {
  const [localidades, setLocalidades] = useState<Localidad[]>(localidadesCache ?? []);

  useEffect(() => {
    if (localidadesCache) return;
    let activo = true;
    getLocalidades().then((data) => {
      localidadesCache = data;
      if (activo) setLocalidades(data);
    });
    return () => {
      activo = false;
    };
  }, []);

  return localidades;
}
