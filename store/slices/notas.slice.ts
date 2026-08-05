import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as notasService from "@/services/notas.service";
import type { NotaConCliente } from "@/services/notas.service";
import type { EditarNotaPayload, NuevaNotaPayload } from "@/types";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface NotasState {
  items: NotaConCliente[];
  status: LoadStatus;
  error: string | null;
}

const initialState: NotasState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchNotas = createAsyncThunk<NotaConCliente[], number, { rejectValue: string }>(
  "notas/fetch",
  async (cobradorId, { rejectWithValue }) => {
    try {
      return await notasService.getNotas(cobradorId);
    } catch {
      return rejectWithValue("No se pudieron cargar las notas.");
    }
  }
);

export const createNota = createAsyncThunk<NotaConCliente, NuevaNotaPayload, { rejectValue: string }>(
  "notas/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await notasService.crearNota(payload);
    } catch {
      return rejectWithValue("No se pudo guardar la nota.");
    }
  }
);

export const editNota = createAsyncThunk<NotaConCliente, EditarNotaPayload, { rejectValue: string }>(
  "notas/edit",
  async (payload, { rejectWithValue }) => {
    try {
      return await notasService.editarNota(payload);
    } catch {
      return rejectWithValue("No se pudo editar la nota.");
    }
  }
);

export const deleteNota = createAsyncThunk<number, number, { rejectValue: string }>(
  "notas/delete",
  async (notaId, { rejectWithValue }) => {
    try {
      return await notasService.eliminarNota(notaId);
    } catch {
      return rejectWithValue("No se pudo eliminar la nota.");
    }
  }
);

const notasSlice = createSlice({
  name: "notas",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotas.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNotas.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchNotas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Error al cargar notas.";
      })
      .addCase(createNota.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(editNota.fulfilled, (state, action) => {
        const idx = state.items.findIndex((n) => n.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(deleteNota.fulfilled, (state, action) => {
        state.items = state.items.filter((n) => n.id !== action.payload);
      });
  },
});

export default notasSlice.reducer;
