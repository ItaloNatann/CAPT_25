import { http } from "./authClientFetch";

// ---------- Helpers ----------
const toArray = (data: any) => (Array.isArray(data) ? data : data?.results ?? []);

// ---------- Accounts ----------
export async function fetchCSRF() {
  return http.get("/accounts/csrf/");
}

export type Me = {
  id: number; username: string; email: string;
  first_name: string; last_name: string;
  phone: string; address_line: string;
  comuna: null | {
    id: number; nombre: string;
    provincia: { id: number; nombre: string };
    region: { id: number; nombre: string; codigo_romano: string };
  };
};

export async function login(payload: { username?: string; email?: string; password: string }) {
  await fetchCSRF(); // asegura csrftoken
  return http.post("/accounts/login/", payload);
}
export async function logout() {
  return http.post("/accounts/logout/");
}
export async function getMe() {
  return http.get<Me>("/accounts/me/");
}
export async function patchMe(body: Partial<{ phone: string; address_line: string; comuna: number }>) {
  return http.patch<Me>("/accounts/me/", body);
}

export async function register(payload: {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
}): Promise<{ ok: boolean; message: string; user: Me }> {
  await fetchCSRF(); // asegura csrftoken
  return http.post("/accounts/register/", payload);
}

// ---------- Geo ----------
export type Region = { id: number; nombre: string; codigo_romano: string; codigo_iso: string };
export type Provincia = { id: number; nombre: string; region: number };
export type Comuna = { id: number; nombre: string; codigo_ine: string; provincia: number };

export const getRegions = async (): Promise<Region[]> => {
  const data = await http.get<any>("/geo/regions/");
  return toArray(data);
};

export const getProvincias = async (regionId: number): Promise<Provincia[]> => {
  const data = await http.get<any>(`/geo/provincias/?region=${regionId}`);
  return toArray(data);
};

export const getComunasByProvincia = async (provinciaId: number): Promise<Comuna[]> => {
  const data = await http.get<any>(`/geo/comunas/?provincia=${provinciaId}`);
  return toArray(data);
};