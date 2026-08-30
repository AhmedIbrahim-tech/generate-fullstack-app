export const APP_CONFIG = {
  apiUrl: "http://localhost:5000",
} as const;

export type AppConfig = typeof APP_CONFIG;
