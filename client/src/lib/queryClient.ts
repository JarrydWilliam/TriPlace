import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

import { Capacitor } from "@capacitor/core";
import { auth } from "./firebase";

export const getApiUrl = (url: string) => {
  const isNative = Capacitor.isNativePlatform();
  if (isNative && url.startsWith('/')) {
    const baseUrl = import.meta.env.VITE_API_URL || "https://samevibe-sandy.vercel.app";
    return `${baseUrl}${url}`;
  }
  return url;
};

async function getAuthToken(): Promise<string | null> {
  try {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch (err) {
    console.warn("[AuthToken] Error getting idToken:", err);
    return null;
  }
}

const APP_HASH_SECRET = "samevibe_secure_app_signature_secret_2026";

export async function generateClientSignature(path: string, timestamp: number): Promise<string> {
  try {
    const normalizedPath = path.split('?')[0];
    const payload = `${timestamp}:${normalizedPath}:${APP_HASH_SECRET}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return "";
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = await getAuthToken();
  const timestamp = Date.now();
  const signature = await generateClientSignature(url, timestamp);

  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  headers["x-app-timestamp"] = String(timestamp);
  headers["x-app-hash"] = signature;

  const res = await fetch(getApiUrl(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = await getAuthToken();
    const url = queryKey[0] as string;
    const timestamp = Date.now();
    const signature = await generateClientSignature(url, timestamp);

    const headers: Record<string, string> = {
      "x-app-timestamp": String(timestamp),
      "x-app-hash": signature,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(getApiUrl(url), { headers });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
