import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Sección principal con gradiente */}
      <section className="flex-grow bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
          <div className="max-w-lg mx-auto text-center">
            {/* Icono o ilustración */}
            <div className="mb-8">
              <div className="text-9xl font-bold text-blue-600 opacity-20">404</div>
              <div className="relative -top-20">
                <svg className="w-32 h-32 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Página no encontrada</h1>
            <p className="text-lg text-gray-600 mb-8">
              Lo sentimos, no pudimos encontrar la página que estás buscando.
            </p>
            
            <Link 
              to="/" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>

        {/* Zona de transición gradual */}
        <div className="h-32 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Sección "¿Necesitas ayuda?" que coincide con el fondo global */}
      <section className="bg-gray-50 py-16 px-6 -mt-32 relative z-10">
        <div className="max-w-lg mx-auto text-center">
          {/* Links adicionales de ayuda */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-lg font-medium text-gray-700 mb-6">¿Necesitas ayuda?</p>
            <div className="flex justify-center space-x-8">
              <Link to="/contacto" className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                Contacto
              </Link>
              <Link to="/soporte" className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                Soporte
              </Link>
              <Link to="/faq" className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                Preguntas frecuentes
              </Link>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 text-sm text-gray-600">
            <p>¿No encuentras lo que buscas? Estamos aquí para ayudarte.</p>
          </div>
        </div>
      </section>
    </div>
  );
}