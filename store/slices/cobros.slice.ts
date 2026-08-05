import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import * as cobrosService from "@/services/cobros.service";
import type {
  CobroDelDia,
  FiltroCobros,
  RegistrarAdvertenciaPayload,
  RegistrarPagoPayload,
} from "@/types";

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
  } catch (e) {
    // La API devuelve 409 si la cuota ya está pagada y 404 si el método de
    // pago no existe: el mensaje suyo dice más que uno genérico.
    return rejectWithValue(mensajeDeError(e, "No se pudo registrar el pago."));
  }
});

export const registrarAdvertencia = createAsyncThunk<
  void,
  RegistrarAdvertenciaPayload,
  { rejectValue: string }
>("cobros/advertencia", async (payload, { rejectWithValue }) => {
  try {
    return await cobrosService.registrarAdvertencia(payload);
  } catch (e) {
    return rejectWithValue(mensajeDeError(e, "No se pudo registrar la advertencia."));
  }
});

/** Saca el `message` que manda la API; si no hay, usa el genérico. */
function mensajeDeError(e: unknown, porDefecto: string): string {
  if (axios.isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
  }
  return porDefecto;
}

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
