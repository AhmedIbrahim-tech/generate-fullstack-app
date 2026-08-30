import { configureStore } from "@reduxjs/toolkit";
import { generatedReducers } from "./generated-reducers";

export const makeStore = () =>
  configureStore({
    reducer: {
      ...generatedReducers,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
