import { api, USE_MOCK } from "@/services/api";
import { COBRADORES, delay } from "@/services/mock/db";
import type { Cobrador } from "@/types";

/** Lista de cobradores (para "cobrado por otro cobrador" en casos especiales) */
export async function getCobradores(): Promise<Cobrador[]> {
  if (USE_MOCK) {
    return delay(COBRADORES, 100);
  }
  const { data } = await api.get<Cobrador[]>("/cobradores");
  return data;
}
