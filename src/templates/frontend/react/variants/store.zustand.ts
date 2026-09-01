import { create } from "zustand";

type ExampleItem = { id: string; name: string; description: string };

type AppState = {
  example: {
    items: ExampleItem[];
    selected: ExampleItem | null;
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
  };
  setExampleItems: (items: ExampleItem[]) => void;
  setExampleError: (error: string | null) => void;
  setExampleStatus: (status: AppState["example"]["status"]) => void;
};

export const useAppStore = create<AppState>((set) => ({
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
