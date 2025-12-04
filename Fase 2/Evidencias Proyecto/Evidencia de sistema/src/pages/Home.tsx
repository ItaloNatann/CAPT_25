import { useState } from "react";
import {
  Search,
  BarChart2,
  Package,
  Globe,
  LineChart as LineChartIcon,
  Shuffle,
  CheckCircle,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Send,
  X,
  Newspaper,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  Clock,
} from "lucide-react";
import MockPriceChart from "@/components/MockPriceChart";

export default function Home() {
  const [dataset, setDataset] = useState<"consumidor" | "mayorista">("consumidor");
  const [email, setEmail] = useState("");
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);

  const submitNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    setShowNewsletterModal(true); // simulado
    setEmail("");
  };

  return (
    <main className="bg-gray-50">
      {/* HERO */}
      <section
        className="relative"
        style={{
          backgroundImage:
            "radial-gradient(40rem 20rem at 20% -20%, rgba(59,130,246,0.18), transparent), radial-gradient(50rem 30rem at 100% 0%, rgba(99,102,241,0.20), transparent)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Texto */}
            <div>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Compara precios de alimentos
                </span>{" "}
                en Chile
              </h1>
              <p className="mt-3 max-w-xl text-base text-gray-600 sm:text-lg">
                Explora series históricas por <strong>producto</strong>, <strong>unidad</strong>,{" "}
                <strong>región</strong> o <strong>mercado</strong>. Visualización clara basada en datos ODEPA.
              </p>

              {/* Toggle + buscador */}
              <div className="mt-6 w-full max-w-xl space-y-3">
                <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                  <button
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      dataset === "consumidor" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setDataset("consumidor")}
                  >
                    Consumidor
                  </button>
                  <button
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      dataset === "mayorista" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}
                    onClick={() => setDataset("mayorista")}
                  >
                    Mayorista
                  </button>
                </div>

                <form
                  className="flex items-center gap-2"
                  role="search"
                  aria-label="Buscar productos"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="search"
                      placeholder={`Buscar en ${dataset} (ej: tomate, papa, manzana)`}
                      className="w-full rounded-xl border border-gray-300 bg-white/90 pl-10 pr-4 py-3 text-sm outline-none ring-0 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <button
                    type="submit"
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-px"
                  >
                    Buscar <ArrowRight size={16} />
                  </button>
                </form>
              </div>
            </div>

            {/* Ilustración/Stats */}
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="overflow-hidden rounded-xl">
                <MockPriceChart />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="flex flex-col items-center rounded-lg bg-white p-3 shadow">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <div className="text-xl font-bold">16</div>
                  <div className="text-gray-500">Regiones</div>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-white p-3 shadow">
                  <Package className="h-5 w-5 text-green-600" />
                  <div className="text-xl font-bold">200+</div>
                  <div className="text-gray-500">Productos</div>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-white p-3 shadow">
                  <BarChart2 className="h-5 w-5 text-indigo-600" />
                  <div className="text-xl font-bold">2</div>
                  <div className="text-gray-500">Datasets</div>
                </div>
              </div>
            </div>
          </div>

          {/* Franja de stats (pulida) */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Clock,       k: "Cobertura",       v: "20+ años de datos" },
              { icon: RefreshCcw,  k: "Actualizaciones", v: "Semanal / Mensual" },
              { icon: Gauge,       k: "Rendimiento",     v: "Respuesta < 300 ms" },
              { icon: ShieldCheck, k: "Precisión",       v: "Fuente oficial" },
            ].map(({ icon: Icon, k, v }) => (
              <div
                key={k}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2 ring-1 ring-blue-100 group-hover:bg-blue-100">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{k}</div>
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <LineChartIcon className="h-5 w-5 text-blue-600" /> Lo que puedes hacer
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Explorar catálogo", desc: "Busca por nombre y filtra por unidades válidas.", icon: Package, href: "/productos" },
            { title: "Series históricas",  desc: "Agrega por día, semana o mes y filtra por región/mercado.", icon: LineChartIcon, href: "/dashboard" },
            { title: "Comparar precios",   desc: "Elige 2+ productos/unidades y compara tendencias.", icon: Shuffle, href: "/comparar" },
          ].map((f) => (
            <a
              key={f.title}
              href={f.href}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <f.icon className="h-7 w-7 text-blue-600" />
              <div>
                <div className="text-base font-semibold text-gray-900">{f.title}</div>
                <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <h2 className="text-xl font-semibold">¿Cómo funciona?</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, t: "Elige dataset", d: "Selecciona Consumidor o Mayorista según tu análisis." },
            { n: 2, t: "Filtra",        d: "Producto, unidad, región/mercado, fechas y agregación." },
            { n: 3, t: "Visualiza",     d: "Gráficos y métricas para entender tendencias." },
          ].map((p) => (
            <li key={p.n} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-sm">{p.t}</span>
              </div>
              <p className="text-sm text-gray-600">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* NEWSLETTER (ficticio con modal) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-14">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Newspaper className="h-5 w-5 text-blue-600" />
                Suscríbete a novedades
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Recibe actualizaciones sobre nuevos productos y mejoras (simulado).
              </p>
            </div>
            <form className="flex w-full max-w-md items-center gap-2" onSubmit={submitNewsletter} aria-label="Formulario de suscripción">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-px"
              >
                Suscribirme <Send size={16} />
              </button>
            </form>
          </div>

          {showNewsletterModal && (
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-green-100 p-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900">Suscripción confirmada</h4>
                    <p className="mt-1 text-sm text-gray-600">¡Gracias por suscribirte a ComparaYa! (simulado, sin envío real).</p>
                  </div>
                  <button aria-label="Cerrar" className="rounded-md p-1 text-gray-500 hover:bg-gray-100" onClick={() => setShowNewsletterModal(false)}>
                    <X />
                  </button>
                </div>
                <div className="mt-4 text-right">
                  <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => setShowNewsletterModal(false)}>
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CONTÁCTANOS + MAPA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Contáctanos</h3>
            <p className="mt-1 text-sm text-gray-600">Estamos para ayudarte con consultas y sugerencias.</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <span>+56 2 1234 5678</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <span>contacto@comparaya.cl</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>Av. Apoquindo 1234, Las Condes, Región Metropolitana</span>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <iframe
              title="Mapa Santiago de Chile (ficticio)"
              className="h-72 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-70.645%2C-33.45%2C-70.55%2C-33.39&layer=mapnik&marker=-33.43%2C-70.60"
            />
          </div>
        </div>
      </section>
    </main>
  );
}