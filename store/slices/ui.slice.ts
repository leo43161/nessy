import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { WORKDATE_KEY } from "@/lib/constants";
import { todayISO } from "@/lib/format";

interface UiState {
  /** Día de trabajo seleccionado (YYYY-MM-DD) */
  workDate: string | null;
}

const initialState: UiState = {
  workDate: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    /** Restaura la fecha de trabajo guardada, o usa hoy */
    initWorkDate(state) {
      if (state.workDate) return;
      const stored = typeof window !== "undefined" ? localStorage.getItem(WORKDATE_KEY) : null;
      state.workDate = stored ?? todayISO();
    },
    setWorkDate(state, action: PayloadAction<string>) {
      state.workDate = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem(WORKDATE_KEY, action.payload);
      }
    },
  },
});

export const { initWorkDate, setWorkDate } = uiSlice.actions;
export default uiSlice.reducer;
