// Cliente fetch con cookies y CSRF
const API_BASE = import.meta.env.VITE_DJANGO_API_BASE ?? "http://127.0.0.1:8000";
const BASE = `${API_BASE}/api`;

function getCSRFToken(): string | null {
  const name = "csrftoken=";
  return (
    document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(name))
      ?.slice(name.length) ?? null
  );
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T = unknown>(
  path: string,
  { method = "GET", body, headers }: { method?: Method; body?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const isJSON = body !== undefined && !(body instanceof FormData);
  const finalHeaders: Record<string, string> = { ...(headers ?? {}) };

  if (method !== "GET") {
    const csrf = getCSRFToken();
    if (csrf) finalHeaders["X-CSRFToken"] = csrf;
  }
  if (isJSON) finalHeaders["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include", // manda cookies (sessionid, csrftoken)
    headers: finalHeaders,
    body: isJSON ? JSON.stringify(body) : body,
  });

  // Intentar parsear JSON siempre que haya cuerpo
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = (data && (data.detail || JSON.stringify(data))) || res.statusText;
    throw new Error(detail);
  }
  return data as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: any) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { API_BASE, BASE as AUTH_API_BASE };
