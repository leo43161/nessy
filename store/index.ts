import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/auth.slice";
import uiReducer from "./slices/ui.slice";
import cobrosReducer from "./slices/cobros.slice";
import clientesReducer from "./slices/clientes.slice";
import notasReducer from "./slices/notas.slice";

export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      cobros: cobrosReducer,
      clientes: clientesReducer,
      notas: notasReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
