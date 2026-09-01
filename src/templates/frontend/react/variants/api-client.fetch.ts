import { publicEnv } from "@/lib/config/env";

export function createFetchClient(options) {
  async function send(config) {
    const url = config.url.startsWith("http")
      ? config.url
      : `${options.baseURL.replace(/\/$/, "")}/${String(config.url ?? "").replace(/^\//, "")}`;
    const fetched = await fetch(url, {
      method: config.method ?? "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: config.data !== undefined ? JSON.stringify(config.data) : undefined,
    });
    const text = await fetched.text();
    const data = text ? JSON.parse(text) : null;
    return { data, status: fetched.status, statusText: fetched.statusText, config };
  }

  return Object.assign(send, {
    interceptors: {
      request: { use() {}, eject() {} },
      response: { use() {}, eject() {} },
    },
    get: (url, config = {}) => send({ ...config, method: "GET", url }),
    post: (url, data, config = {}) => send({ ...config, method: "POST", url, data }),
    put: (url, data, config = {}) => send({ ...config, method: "PUT", url, data }),
    delete: (url, config = {}) => send({ ...config, method: "DELETE", url }),
  });
}

export const apiClient = createFetchClient({
  baseURL: publicEnv.apiUrl,
});
