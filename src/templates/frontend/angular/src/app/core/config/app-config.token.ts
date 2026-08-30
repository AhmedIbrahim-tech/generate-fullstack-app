import { InjectionToken } from "@angular/core";
import { APP_CONFIG, type AppConfig } from "./app-config";

export const APP_CONFIG_TOKEN = new InjectionToken<AppConfig>("APP_CONFIG", {
  providedIn: "root",
  factory: () => APP_CONFIG,
});
