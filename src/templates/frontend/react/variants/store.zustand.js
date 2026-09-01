import { create } from "zustand";

export const useAppStore = create((set) => ({
  example: {
    items: [],
    selected: null,
    status: "idle",
    error: null,
  },
  setExampleItems: (items) =>
    set((state) => ({ example: { ...state.example, items, status: "succeeded", error: null } })),
  setExampleError: (error) =>
    set((state) => ({ example: { ...state.example, status: "failed", error } })),
  setExampleStatus: (status) =>
    set((state) => ({ example: { ...state.example, status } })),
}));
