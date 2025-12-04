import { API_BASE } from "./config";

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...init });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Ejemplos tipados (ajustaremos luego con tu backend real)
export type CatalogoItem = { producto: string; count: number; };
export type CatalogoResp = { items: CatalogoItem[]; total: number; };

export const api = {
  productos: {
    list: (dataset: "consumidor" | "mayorista", q?: string) =>
      fetchJSON<CatalogoResp>(`/productos?dataset=${dataset}${q ? `&q=${encodeURIComponent(q)}` : ""}`)
  },
};