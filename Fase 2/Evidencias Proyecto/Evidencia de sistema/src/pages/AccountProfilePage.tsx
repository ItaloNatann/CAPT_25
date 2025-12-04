import { useEffect, useState } from "react";
import {
  getMe,
  patchMe,
  getRegions,
  getProvincias,
  getComunasByProvincia,
  type Me,
  type Region,
  type Provincia,
  type Comuna,
} from "../lib/authApi";
import Notification from "@/components/Notificacion";

export default function AccountProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [regions, setRegions] = useState<Region[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);

  // Campos del formulario
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [regionId, setRegionId] = useState<number | "">("");
  const [provinciaId, setProvinciaId] = useState<number | "">("");
  const [comunaId, setComunaId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  // Estado para notificaciones
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
    isVisible: boolean;
  }>({
    type: "success",
    message: "",
    isVisible: false
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message, isVisible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  async function load() {
    try {
      const data = await getMe();
      setMe(data);
      setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? "");
      setPhone(data.phone ?? "");
      setAddress(data.address_line ?? "");

      if (data.comuna) {
        setRegionId(data.comuna.region.id);
        setProvinciaId(data.comuna.provincia.id);
        setComunaId(data.comuna.id);

        const [provs, cs] = await Promise.all([
          getProvincias(data.comuna.region.id),
          getComunasByProvincia(data.comuna.provincia.id),
        ]);
        setProvincias(provs);
        setComunas(cs);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getRegions()
      .then((arr) => setRegions(Array.isArray(arr) ? arr : []))
      .catch(() => setRegions([]));
    load();
  }, []);

  async function onRegionChange(id: number) {
    setRegionId(id);
    setProvinciaId("");
    setComunaId("");
    setComunas([]);
    try {
      const provs = await getProvincias(id);
      setProvincias(provs);
    } catch {
      setProvincias([]);
    }
  }

  async function onProvinciaChange(id: number) {
    setProvinciaId(id);
    setComunaId("");
    try {
      const cs = await getComunasByProvincia(id);
      setComunas(cs);
    } catch {
      setComunas([]);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body: any = {
      first_name: firstName,
      last_name: lastName,
      phone,
      address_line: address,
    };
    if (typeof comunaId === "number") body.comuna = comunaId;

    try {
      const updated = await patchMe(body);
      setMe(updated);
      showNotification("success", "Perfil actualizado correctamente");
    } catch (err) {
      console.error(err);
      showNotification("error", "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Cargando tu perfil...</p>
      </div>
    );

  if (!me)
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-3">
        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium">No autenticado</p>
        <p className="text-gray-500 text-sm">Inicia sesión para acceder a tu perfil</p>
      </div>
    );

  return (
    <>
      {/* Notificación */}
      <Notification
        type={notification.type}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={hideNotification}
        duration={4000}
      />

      <div className="max-w-2xl mx-auto bg-gradient-to-br from-white to-gray-50/80 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-sm p-8 mt-6">
        {/* Header con gradiente */}
        <div className="text-center mb-8 pb-6 border-b border-gray-100/60">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-2xl font-bold mb-4">
            {me.first_name?.[0]?.toUpperCase() || me.username?.[0]?.toUpperCase() || me.email?.[0]?.toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
            Mi perfil
          </h1>
          <p className="text-gray-600 mt-2">
            Sesión iniciada como{" "}
            <span className="font-semibold text-gray-800">
              {me.first_name && me.last_name 
                ? `${me.first_name.charAt(0).toUpperCase() + me.first_name.slice(1)} ${me.last_name.charAt(0).toUpperCase() + me.last_name.slice(1)}`
                : me.first_name 
                ? me.first_name.charAt(0).toUpperCase() + me.first_name.slice(1)
                : me.username || me.email
              }
            </span>
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Información personal
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nombre</label>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             placeholder:text-gray-400"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Apellido</label>
                <input
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             placeholder:text-gray-400"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Tu apellido"
                />
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Información de contacto
            </h3>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Teléfono</label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                           outline-none transition-all duration-200
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                           placeholder:text-gray-400"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+569XXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Dirección</label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                           outline-none transition-all duration-200
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                           placeholder:text-gray-400"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle y número"
              />
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ubicación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Región</label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={regionId}
                  onChange={(e) => onRegionChange(Number(e.target.value))}
                >
                  <option value="">-- Selecciona --</option>
                  {(regions ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Provincia</label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  value={provinciaId}
                  onChange={(e) => onProvinciaChange(Number(e.target.value))}
                  disabled={!regionId}
                >
                  <option value="">-- Selecciona --</option>
                  {(provincias ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Comuna</label>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  value={comunaId}
                  onChange={(e) => setComunaId(Number(e.target.value))}
                  disabled={!provinciaId}
                >
                  <option value="">-- Selecciona --</option>
                  {(comunas ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botón de guardar mejorado */}
          <div className="pt-6 border-t border-gray-100/60">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-xl px-6 py-4 text-white font-semibold
                         bg-gradient-to-r from-blue-600 to-indigo-600 
                         hover:from-blue-700 hover:to-indigo-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
                         shadow-lg hover:shadow-xl"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando cambios...
                </>
              ) : (
                "Guardar cambios"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}