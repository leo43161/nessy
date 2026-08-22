import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import * as authService from "@/services/auth.service";
import {
  clearSession,
  getStoredSession,
  getToken,
  isTokenExpired,
  persistSession,
} from "@/lib/session";
import type { Cobrador, Cuenta, LoginPayload, LoginResponse } from "@/types";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  cobrador: Cobrador | null;
  cuenta: Cuenta | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  cobrador: null,
  cuenta: null,
  token: null,
  status: "idle",
  error: null,
};

export const login = createAsyncThunk<LoginResponse, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await authService.login(payload);
      persistSession(res);
      return res;
    } catch (err) {
      // La API explica el problema mucho mejor que axios: distingue
      // credenciales incorrectas (401) de una cuenta sin rol asignado (403).
      // Sin esto el usuario ve "Request failed with status code 403", que no
      // dice nada y manda a buscar el problema en el lugar equivocado.
      return rejectWithValue(mensajeDeError(err, "No se pudo iniciar sesión."));
    }
  }
);

/** Saca el `message` que manda la API; si no hay, usa el genérico. */
function mensajeDeError(e: unknown, porDefecto: string): string {
  if (axios.isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
  }
  return e instanceof Error ? e.message : porDefecto;
}

/** Restaura la sesión guardada y la valida contra la API; si expiró, vuelve al login */
export const restoreSession = createAsyncThunk<LoginResponse, void, { rejectValue: string }>(
  "auth/restore",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    const session = getStoredSession();
    if (!token || !session || isTokenExpired(token)) {
      clearSession();
      return rejectWithValue("Pasó mucho rato sin usar la app. Entrá de nuevo.");
    }
    const valido = await authService.validateToken();
    if (!valido) {
      clearSession();
      return rejectWithValue("Hay que volver a entrar.");
    }
    return { token, cuenta: session.cuenta, cobrador: session.cobrador };
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      clearSession();
      state.cobrador = null;
      state.cuenta = null;
      state.token = null;
      state.status = "unauthenticated";
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const authenticated = (state: AuthState, payload: LoginResponse) => {
      state.status = "authenticated";
      state.cobrador = payload.cobrador;
      state.cuenta = payload.cuenta;
      state.token = payload.token;
    };
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => authenticated(state, action.payload))
      .addCase(login.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.error = action.payload ?? "No se pudo iniciar sesión.";
      })
      .addCase(restoreSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(restoreSession.fulfilled, (state, action) => authenticated(state, action.payload))
      .addCase(restoreSession.rejected, (state) => {
        state.status = "unauthenticated";
        state.cobrador = null;
        state.cuenta = null;
        state.token = null;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
