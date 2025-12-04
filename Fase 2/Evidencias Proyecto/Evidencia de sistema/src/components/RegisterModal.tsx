// src/components/RegisterModal.tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { register } from "../lib/authApi";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void; // Para cambiar a login
};

export default function RegisterModal({ open, onClose, onSuccess, onSwitchToLogin }: Props) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 👇 seguir montado mientras animamos salida
  const [render, setRender] = useState(open);
  useEffect(() => {
    if (open) setRender(true);
  }, [open]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const mouseDownTarget = useRef<EventTarget | null>(null);

  function resetForm() {
    setFormData({
      email: "",
      password: "",
      password2: "",
      first_name: "",
      last_name: ""
    });
    setError(null);
    setBusy(false);
  }

  // Reset + focus al abrir
  useEffect(() => {
    if (!open) return;
    resetForm();
    const t = setTimeout(() => firstFieldRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // ESC para cerrar (mientras esté montado)
  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [render]);

  // Bloquear scroll mientras esté montado
  useEffect(() => {
    if (!render) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [render]);

  function handleMouseDown(e: React.MouseEvent) {
    mouseDownTarget.current = e.target;
  }
  
  function handleMouseUp(e: React.MouseEvent) {
    if (
      mouseDownTarget.current === e.target &&
      panelRef.current &&
      !panelRef.current.contains(e.target as Node)
    ) {
      handleClose();
    }
  }

  function handleClose() {
    onClose();
  }

  function handleSwitchToLogin() {
    handleClose();
    onSwitchToLogin?.();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // Función para generar username automáticamente desde el email
  function generateUsernameFromEmail(email: string): string {
    // Tomar la parte antes del @ y limpiar caracteres especiales
    const username = email.split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '_'); // Reemplazar espacios con _
    
    return username || 'user'; // Fallback si está vacío
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Validación básica de frontend
    if (formData.password !== formData.password2) {
      setError("Las contraseñas no coinciden");
      setBusy(false);
      return;
    }

    try {
      // Generar username automáticamente desde el email
      const username = generateUsernameFromEmail(formData.email);
      
      // Preparar datos para el registro
      const registrationData = {
        ...formData,
        username: username
      };

      await register(registrationData);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Error en el registro");
    } finally {
      setBusy(false);
    }
  }

  // No mostrar nada una vez termina la salida
  if (!render) return null;

  // Clases de animación
  const backdropState = open ? "opacity-100" : "opacity-0";
  const panelState = open
    ? "opacity-100 translate-y-0 scale-100"
    : "opacity-0 translate-y-4 scale-95";

  return createPortal(
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="register-modal-title"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-[1000] grid place-items-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-gray-900/60 via-blue-900/30 to-purple-900/20 backdrop-blur-md
                    transition-all duration-300 ease-out ${backdropState}`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onTransitionEnd={(e) => {
          if (e.target === panelRef.current && !open) setRender(false);
        }}
        className={`
          relative w-full max-w-md
          rounded-3xl bg-gradient-to-br from-white to-gray-50/80 shadow-2xl 
          border border-white/20 backdrop-blur-sm
          max-h-[min(90vh,680px)] overflow-y-auto
          transition-all duration-300 ease-out
          will-change-transform will-change-opacity
          ${panelState}
        `}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100/60">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="register-modal-title" className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                Crear cuenta
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Únete a nuestra plataforma
              </p>
            </div>
            
            {/* Botón X */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar"
              className="inline-flex h-8 w-8 items-center justify-center
                         rounded-full bg-white/80 text-gray-500 shadow-sm ring-1 ring-gray-200/80
                         hover:bg-white hover:text-gray-700 hover:shadow-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         transition-all duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nombre</label>
                <input
                  type="text"
                  name="first_name"
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             placeholder:text-gray-400"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Apellido</label>
                <input
                  type="text"
                  name="last_name"
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             placeholder:text-gray-400"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            {/* Email - Ahora es el campo principal */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                ref={firstFieldRef}
                required
                className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                           outline-none transition-all duration-200
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                           placeholder:text-gray-400"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@correo.cl"
              />
            </div>

            {/* Contraseñas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Contraseña *</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             placeholder:text-gray-400"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Confirmar *</label>
                <input
                  type="password"
                  name="password2"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white/80 px-4 py-3 
                             outline-none transition-all duration-200
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             placeholder:text-gray-400"
                  value={formData.password2}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="rounded-xl bg-red-50/80 px-4 py-3 text-sm text-red-700 
                            border border-red-200/60 backdrop-blur-sm
                            flex items-center gap-3">
                <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Botón de submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-white font-semibold
                           bg-gradient-to-r from-blue-600 to-indigo-600 
                           hover:from-blue-700 hover:to-indigo-700
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           disabled:opacity-60 disabled:cursor-not-allowed
                           transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
                           shadow-lg hover:shadow-xl"
              >
                {busy ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creando cuenta...
                  </>
                ) : (
                  "Crear mi cuenta"
                )}
              </button>
            </div>

            {/* Footer con login */}
            <div className="pt-4 border-t border-gray-100/60">
              <p className="text-center text-sm text-gray-600">
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  className="font-semibold text-gray-800 hover:text-blue-600 hover:underline
                             transition-colors duration-200"
                  onClick={handleSwitchToLogin}
                >
                  Iniciar sesión
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}