import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin, ShoppingCart } from "lucide-react";

export default function Footer() {
  const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="bg-gray-900 text-gray-300 mt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Logo + descripción */}
          <div>
            <Link
              to="/"
              onClick={goTop}
              className="flex items-center gap-2 text-xl font-bold text-white"
            >
              <ShoppingCart className="h-6 w-6 text-blue-500" />
              <span>
                Compara<span className="text-blue-500">Ya</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              Plataforma para comparar precios de alimentos en Chile. Datos
              oficiales, visualización clara y fácil de entender.
            </p>
          </div>

          {/* Navegación rápida */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Navegación
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/"
                  onClick={goTop}
                  className="hover:text-white transition-colors text-sm"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/productos" className="hover:text-white transition-colors text-sm">
                  Productos
                </Link>
              </li>
              <li>
                <Link to="/comparar" className="hover:text-white transition-colors text-sm">
                  Comparar
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors text-sm">
                  Acerca
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto + redes */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Contacto
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500" />
                <span>+56 2 1234 5678</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>contacto@comparaya.cl</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>Av. Apoquindo 1234, Las Condes</span>
              </li>
            </ul>

            {/* Redes sociales */}
            <div className="mt-4 flex gap-4">
              <a href="#" className="hover:text-white">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-white">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Línea inferior */}
        <div className="mt-10 border-t border-gray-700 pt-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} ComparaYa. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}