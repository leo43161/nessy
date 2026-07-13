import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as clientesService from "@/services/clientes.service";
import type {
  ClienteResumen,
  NuevoCargoPayload,
  NuevoClientePayload,
  NuevoPagoPayload,
  Transaccion,
} from "@/types";

type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

interface ClienteDetalle {
  cliente: ClienteResumen | null;
  transacciones: Transaccion[];
  status: LoadStatus;
}

interface ClientesState {
  items: ClienteResumen[];
  status: LoadStatus;
  error: string | null;
  detalle: ClienteDetalle;
}

const initialState: ClientesState = {
  items: [],
  status: "idle",
  error: null,
  detalle: { cliente: null, transacciones: [], status: "idle" },
};

export const fetchClientes = createAsyncThunk<ClienteResumen[], number, { rejectValue: string }>(
  "clientes/fetch",
  async (cobradorId, { rejectWithValue }) => {
    try {
      return await clientesService.getClientes(cobradorId);
    } catch {
      return rejectWithValue("No se pudieron cargar los clientes.");
    }
  }
);

/** Cliente + historial de transacciones para el modal de balance */
export const fetchClienteDetalle = createAsyncThunk<
  { cliente: ClienteResumen; transacciones: Transaccion[] },
  number,
  { rejectValue: string }
>("clientes/detalle", async (clienteId, { rejectWithValue }) => {
  try {
    const [cliente, transacciones] = await Promise.all([
      clientesService.getCliente(clienteId),
      clientesService.getTransacciones(clienteId),
    ]);
    return { cliente, transacciones };
  } catch {
    return rejectWithValue("No se pudo cargar el balance del cliente.");
  }
});

export const createCliente = createAsyncThunk<ClienteResumen, NuevoClientePayload, { rejectValue: string }>(
  "clientes/create",
  async (payload, { rejectWithValue }) => {
    try {
      return await clientesService.crearCliente(payload);
    } catch {
      return rejectWithValue("No se pudo guardar el cliente.");
    }
  }
);

export const addCargo = createAsyncThunk<Transaccion, NuevoCargoPayload, { rejectValue: string }>(
  "clientes/cargo",
  async (payload, { rejectWithValue }) => {
    try {
      return await clientesService.crearCargo(payload);
    } catch {
      return rejectWithValue("No se pudo registrar el cargo.");
    }
  }
);

export const addPago = createAsyncThunk<Transaccion, NuevoPagoPayload, { rejectValue: string }>(
  "clientes/pago",
  async (payload, { rejectWithValue }) => {
    try {
      return await clientesService.crearPago(payload);
    } catch {
      return rejectWithValue("No se pudo registrar el pago.");
    }
  }
);

const clientesSlice = createSlice({
  name: "clientes",
  initialState,
  reducers: {
    clearDetalle(state) {
      state.detalle = { cliente: null, transacciones: [], status: "idle" };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchClientes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchClientes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Error al cargar clientes.";
      })
      .addCase(fetchClienteDetalle.pending, (state) => {
        state.detalle.status = "loading";
      })
      .addCase(fetchClienteDetalle.fulfilled, (state, action) => {
        state.detalle.status = "succeeded";
        state.detalle.cliente = action.payload.cliente;
        state.detalle.transacciones = action.payload.transacciones;
      })
      .addCase(fetchClienteDetalle.rejected, (state) => {
        state.detalle.status = "failed";
      })
      .addCase(createCliente.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { clearDetalle } = clientesSlice.actions;
export default clientesSlice.reducer;
