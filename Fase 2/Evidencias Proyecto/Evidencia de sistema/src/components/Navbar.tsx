// src/components/Navbar.tsx
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal"; // 👈 Importar el nuevo modal
import { getMe, logout, type Me } from "../lib/authApi";

const base = "block px-3 py-2 rounded-lg text-sm font-medium";
const idle = "text-gray-700 hover:text-blue-600 hover:bg-blue-50";
const active = `
  text-blue-700
  bg-blue-50 sm:bg-transparent
  relative
  sm:after:absolute sm:after:-bottom-1 sm:after:left-0 sm:after:h-[2px] sm:after:w-full
  sm:after:rounded-full sm:after:bg-gradient-to-r sm:after:from-blue-600 sm:after:to-indigo-600 sm:after:content-['']
`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false); // 👈 Nuevo estado para registro
  const [me, setMe] = useState<Me | null>(null);
  const [userMenu, setUserMenu] = useState(false);
  const nav = useNavigate();

  // Función para capitalizar nombres
  const capitalizeName = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Función para obtener el nombre de visualización
  const getDisplayName = (user: Me) => {
    if (user.first_name) {
      return capitalizeName(user.first_name);
    }
    return user.username || user.email;
  };

  const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const NavItem = ({ to, label, end = false }: { to: string; label: string; end?: boolean }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      onClick={() => {
        goTop();
        setOpen(false);
      }}
    >
      {label}
    </NavLink>
  );

  // Intento de cargar sesión al montar
  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function handleLogout() {
    await logout();
    setMe(null);
    setUserMenu(false);
    nav("/");
  }

  // Función para cambiar de registro a login
  const handleSwitchToLogin = () => {
    setRegisterOpen(false);
    setLoginOpen(true);
  };

  // Función para cambiar de login a registro
  const handleSwitchToRegister = () => {
    setLoginOpen(false);
    setRegisterOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/70 shadow-sm backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Logo con carrito */}
          <Link
            to="/"
            onClick={goTop}
            className="flex items-center gap-2 text-xl sm:text-2xl font-bold"
          >
            <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            <span>
              Compara<span className="text-blue-600">Ya</span>
            </span>
          </Link>

          {/* Menú desktop */}
          <div className="hidden sm:flex sm:items-center sm:gap-1">
            <NavItem to="/" label="Home" end />
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/productos" label="Productos" />
            <NavItem to="/comparar" label="Comparar" />
            <NavItem to="/about" label="Acerca" />

            {/* Separador */}
            <span className="mx-2 h-5 w-px bg-gray-200" />

            {/* Autenticación en desktop - VERSIÓN MEJORADA */}
            {!me ? (
              <div className="flex items-center gap-2">
                {/* Botón Ingresar - Más elegante */}
                <button
                  onClick={() => setLoginOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold
                             text-gray-700 hover:text-gray-900 hover:bg-gray-100/80
                             border border-gray-300/60 hover:border-gray-400
                             transition-all duration-200 backdrop-blur-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  Ingresar
                </button>

                {/* Botón Registrarse - Con gradiente elegante */}
                <button
                  onClick={() => setRegisterOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold
                             bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                             hover:from-blue-700 hover:to-indigo-700
                             shadow-sm hover:shadow-md
                             transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Registrarse
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-gray-800 
                             hover:bg-white hover:shadow-md border border-gray-200/60
                             backdrop-blur-sm transition-all duration-200
                             hover:border-gray-300"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full 
                                 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold
                                 shadow-sm">
                    {me.first_name?.[0]?.toUpperCase() || me.username?.[0]?.toUpperCase() || me.email?.[0]?.toUpperCase() || "U"}
                  </span>
                  <span className="hidden md:inline font-medium">{getDisplayName(me)}</span>
                  <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"/>
                  </svg>
                </button>

                {userMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200/80 bg-white/95 backdrop-blur-sm p-2 shadow-xl"
                    onMouseLeave={() => setUserMenu(false)}
                  >
                    <button
                      onClick={() => { setUserMenu(false); nav("/account/profile"); }}
                      className="w-full text-left rounded-lg px-3 py-2.5 text-sm text-gray-700 
                                 hover:bg-gray-50/80 transition-colors duration-150
                                 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi perfil
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left rounded-lg px-3 py-2.5 text-sm text-red-600 
                                 hover:bg-red-50/80 transition-colors duration-150
                                 flex items-center gap-2 mt-1"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botón hamburguesa (mobile) */}
          <button
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:hidden"
            aria-label="Abrir menú"
            aria-controls="primary-menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              {open ? (
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {/* Menú mobile (colapsable) - VERSIÓN MEJORADA */}
        <div
          id="primary-menu"
          className={`sm:hidden overflow-hidden transition-[max-height] duration-300 ${
            open ? "max-h-80" : "max-h-0"
          }`}
        >
          <div className="pb-3">
            <NavItem to="/" label="Home" end />
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/productos" label="Productos" />
            <NavItem to="/comparar" label="Comparar" />
            <NavItem to="/about" label="Acerca" />

            <div className="mt-2 border-t border-gray-200 pt-3">
              {!me ? (
                <div className="space-y-2">
                  <button
                    onClick={() => { setLoginOpen(true); setOpen(false); }}
                    className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold
                               text-gray-700 hover:text-gray-900 hover:bg-gray-50
                               border border-gray-300/60 hover:border-gray-400
                               transition-all duration-200"
                  >
                    Ingresar
                  </button>
                  <button
                    onClick={() => { setRegisterOpen(true); setOpen(false); }}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold
                               bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                               hover:from-blue-700 hover:to-indigo-700
                               transition-all duration-200"
                  >
                    Registrarse
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-gray-50/80 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full 
                                   bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold
                                   shadow-sm">
                      {me.first_name?.[0]?.toUpperCase() || me.username?.[0]?.toUpperCase() || me.email?.[0]?.toUpperCase() || "U"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{getDisplayName(me)}</p>
                      <p className="text-xs text-gray-500">Mi cuenta</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Salir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Modal de login */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={async () => {
          const d = await getMe();
          setMe(d);
        }}
        onSwitchToRegister={handleSwitchToRegister} // 👈 Nueva prop
      />

      {/* Modal de registro */}
      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSuccess={async () => {
          const d = await getMe();
          setMe(d);
        }}
        onSwitchToLogin={handleSwitchToLogin} // 👈 Nueva prop
      />
    </header>
  );
}