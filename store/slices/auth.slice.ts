import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as authService from "@/services/auth.service";
import {
  clearSession,
  getStoredUser,
  getToken,
  isTokenExpired,
  persistSession,
} from "@/lib/session";
import type { Cobrador, LoginPayload, LoginResponse } from "@/types";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  usuario: Cobrador | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  usuario: null,
  token: null,
  status: "idle",
  error: null,
};

export const login = createAsyncThunk<LoginResponse, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await authService.login(payload);
      persistSession(res.token, res.usuario);
      return res;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    }
  }
);

/** Restaura la sesión guardada y la valida contra la API; si expiró, vuelve al login */
export const restoreSession = createAsyncThunk<LoginResponse, void, { rejectValue: string }>(
  "auth/restore",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    const usuario = getStoredUser();
    if (!token || !usuario || isTokenExpired(token)) {
      clearSession();
      return rejectWithValue("Sesión expirada.");
    }
    const valido = await authService.validateToken(token);
    if (!valido) {
      clearSession();
      return rejectWithValue("Sesión inválida.");
    }
    return { token, usuario };
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      clearSession();
      state.usuario = null;
      state.token = null;
      state.status = "unauthenticated";
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.usuario = action.payload.usuario;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.error = action.payload ?? "No se pudo iniciar sesión.";
      })
      .addCase(restoreSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.usuario = action.payload.usuario;
        state.token = action.payload.token;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = "unauthenticated";
        state.usuario = null;
        state.token = null;
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
