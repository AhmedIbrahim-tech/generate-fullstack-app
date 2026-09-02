import { create } from "zustand";

export const useAppStore = create((set) => ({
  category: {
    items: [],
    selected: null,
    status: "idle",
    error: null,
  },
  setCategoryItems: (items) =>
    set((state) => ({ category: { ...state.category, items, status: "succeeded", error: null } })),
  setCategorySelected: (selected) =>
    set((state) => ({ category: { ...state.category, selected, status: "succeeded", error: null } })),
  setCategoryError: (error) =>
    set((state) => ({ category: { ...state.category, status: "failed", error } })),
  setCategoryStatus: (status) =>
    set((state) => ({ category: { ...state.category, status } })),
}));
