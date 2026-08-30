import axios from "axios";
import { publicEnv } from "@/lib/config/env";

export const apiClient = axios.create({
  baseURL: publicEnv.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const locale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1];

    if (locale) {
      config.headers["Accept-Language"] = locale;
    }
  }

  return config;
});
