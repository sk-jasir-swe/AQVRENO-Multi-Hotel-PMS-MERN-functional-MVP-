import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
export const loadMe = createAsyncThunk(
  "auth/me",
  async () => (await api.get("/auth/me")).data.user,
);
const slice = createSlice({
  name: "auth",
  initialState: { user: null, loading: true },
  reducers: {
    setUser: (s, a) => {
      s.user = a.payload;
    },
  },
  extraReducers: (b) =>
    b
      .addCase(loadMe.fulfilled, (s, a) => {
        s.user = a.payload;
        s.loading = false;
      })
      .addCase(loadMe.rejected, (s) => {
        s.user = null;
        s.loading = false;
      }),
});
export const { setUser } = slice.actions;
export default slice.reducer;
