import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as cobrosService from "@/services/cobros.service";
import type { ActualizarCobroPayload, CobroDia, ResumenDia } from "@/types";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface CobrosState {
  items: CobroDia[];
  status: LoadStatus;
  error: string | null;
  resumen: ResumenDia | null;
  resumenStatus: LoadStatus;
}

const initialState: CobrosState = {
  items: [],
  status: "idle",
  error: null,
  resumen: null,
  resumenStatus: "idle",
};

export const fetchCobros = createAsyncThunk<
  CobroDia[],
  { cobradorId: number; fecha: string },
  { rejectValue: string }
>("cobros/fetch", async ({ cobradorId, fecha }, { rejectWithValue }) => {
  try {
    return await cobrosService.getCobrosDia(cobradorId, fecha);
  } catch {
    return rejectWithValue("No se pudieron cargar los cobros.");
  }
});

export const updateCobro = createAsyncThunk<CobroDia, ActualizarCobroPayload, { rejectValue: string }>(
  "cobros/update",
  async (payload, { rejectWithValue }) => {
    try {
      return await cobrosService.actualizarCobro(payload);
    } catch {
      return rejectWithValue("No se pudo actualizar el cobro.");
    }
  }
);

export const fetchResumenDia = createAsyncThunk<
  ResumenDia,
  { cobradorId: number; fecha: string },
  { rejectValue: string }
>("cobros/resumen", async ({ cobradorId, fecha }, { rejectWithValue }) => {
  try {
    return await cobrosService.getResumenDia(cobradorId, fecha);
  } catch {
    return rejectWithValue("No se pudo cargar el resumen.");
  }
});

const cobrosSlice = createSlice({
  name: "cobros",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCobros.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCobros.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchCobros.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Error al cargar cobros.";
      })
      .addCase(updateCobro.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
        // el resumen quedó viejo; se refresca en la próxima visita a estadísticas
        state.resumenStatus = "idle";
      })
      .addCase(fetchResumenDia.pending, (state) => {
        state.resumenStatus = "loading";
      })
      .addCase(fetchResumenDia.fulfilled, (state, action) => {
        state.resumenStatus = "succeeded";
        state.resumen = action.payload;
      })
      .addCase(fetchResumenDia.rejected, (state) => {
        state.resumenStatus = "failed";
      });
  },
});

export default cobrosSlice.reducer;
