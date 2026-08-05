import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as cobrosService from "@/services/cobros.service";
import type { CobroDelDia, FiltroCobros, RegistrarPagoPayload } from "@/types";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface CobrosState {
  items: CobroDelDia[];
  status: LoadStatus;
  error: string | null;
}

const initialState: CobrosState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchCobros = createAsyncThunk<CobroDelDia[], FiltroCobros, { rejectValue: string }>(
  "cobros/fetch",
  async (filtro, { rejectWithValue }) => {
    try {
      return await cobrosService.getCobrosDia(filtro);
    } catch {
      return rejectWithValue("No se pudieron cargar los cobros.");
    }
  }
);

export const registrarPago = createAsyncThunk<
  CobroDelDia,
  RegistrarPagoPayload,
  { rejectValue: string }
>("cobros/registrar", async (payload, { rejectWithValue }) => {
  try {
    return await cobrosService.registrarPago(payload);
  } catch {
    return rejectWithValue("No se pudo registrar el pago.");
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
      .addCase(registrarPago.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      });
  },
});

export default cobrosSlice.reducer;
