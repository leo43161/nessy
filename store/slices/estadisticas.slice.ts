import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as estadisticasService from "@/services/estadisticas.service";
import type { EstadisticasCobrador } from "@/types";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface EstadisticasState {
  data: EstadisticasCobrador | null;
  status: LoadStatus;
  error: string | null;
}

const initialState: EstadisticasState = {
  data: null,
  status: "idle",
  error: null,
};

export const fetchEstadisticas = createAsyncThunk<
  EstadisticasCobrador,
  { cobradorId: number; fecha: string },
  { rejectValue: string }
>("estadisticas/fetch", async ({ cobradorId, fecha }, { rejectWithValue }) => {
  try {
    return await estadisticasService.getEstadisticas(cobradorId, fecha);
  } catch {
    return rejectWithValue("No se pudieron cargar las estadísticas.");
  }
});

const estadisticasSlice = createSlice({
  name: "estadisticas",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEstadisticas.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchEstadisticas.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
      })
      .addCase(fetchEstadisticas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Error al cargar estadísticas.";
      });
  },
});

export default estadisticasSlice.reducer;
