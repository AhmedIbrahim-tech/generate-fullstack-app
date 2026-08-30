/**
 * Server Component / Route Handler fetch helper.
 *
 * Uses API_INTERNAL_URL when the app can reach the API on an internal host
 * (container network, server-side loopback). Falls back to NEXT_PUBLIC_API_URL
 * when an internal URL is not configured.
 */
function getServerApiBaseUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  );
}

export async function serverApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, getServerApiBaseUrl());
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    cache: init?.cache ?? "no-store",
  });

  if (!response.ok) {
    throw new Error(`Server API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}
