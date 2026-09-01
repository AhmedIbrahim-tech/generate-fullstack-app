import axios from "axios";
import { publicEnv } from "@/lib/config/env";

export const apiClient = axios.create({
  baseURL: publicEnv.apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
