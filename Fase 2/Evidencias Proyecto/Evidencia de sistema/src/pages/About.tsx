import { Link } from "react-router-dom";
import {
  ShieldCheck,
  LineChart,
  Database,
  Globe,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Mail,
  ArrowRight,
} from "lucide-react";
import MockPriceChart from "@/components/MockPriceChart"; // 👈 mismo gráfico del Home

export default function About() {
  return (
    <main className="bg-gray-50">
      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 0% -10%, rgba(59,130,246,0.12), transparent), radial-gradient(70rem 35rem at 100% 0%, rgba(99,102,241,0.14), transparent)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Sobre ComparaYa
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Transparencia y datos para{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                entender precios de alimentos
              </span>{" "}
              en Chile
            </h1>
            <p className="mt-4 text-gray-600 text-base sm:text-lg">
              ComparaYa es una plataforma que centraliza y visualiza series históricas
              de precios, para que cualquier persona o equipo pueda analizar tendencias
              por producto, unidad, región o mercado — de forma clara, rápida y confiable.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/productos"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-px"
              >
                Explorar productos <ArrowRight size={16} />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-900 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:bg-gray-50 active:translate-y-px"
              >
                Ver dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* QUIÉNES SOMOS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">¿Qué buscamos?</h2>
            <p className="mt-3 text-gray-600">
              Nuestro objetivo es democratizar el acceso a datos de precios, creando
              una herramienta moderna y usable que facilite la toma de decisiones
              para consumidores, analistas, medios y equipos públicos/privados.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-gray-700">
              {[
                "Visualizaciones claras y comparables",
                "Rendimiento rápido y filtros útiles",
                "Metodología transparente",
                "Cobertura nacional por regiones y mercados",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800 ring-1 ring-blue-100">
              <TrendingUp className="h-4 w-4" />
              Enfoque en usabilidad, consistencia y performance.
            </div>
          </div>

          {/* Tarjeta con gráfico (mismo del Home) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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
                <Database className="h-5 w-5 text-green-600" />
                <div className="text-xl font-bold">20+ años</div>
                <div className="text-gray-500">Histórico</div>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-white p-3 shadow">
                <LineChart className="h-5 w-5 text-indigo-600" />
                <div className="text-xl font-bold">2</div>
                <div className="text-gray-500">Datasets</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">¿Cómo funciona?</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Integramos datos",
                desc: "Centralizamos y normalizamos series históricas por producto/unidad.",
                icon: Database,
              },
              {
                title: "Filtras y comparas",
                desc: "Explora por período, región/mercado, unidad y agregación.",
                icon: LineChart,
              },
              {
                title: "Confías en la fuente",
                desc: "Priorizamos fuentes oficiales y mantenemos trazabilidad.",
                icon: ShieldCheck,
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <f.icon className="h-6 w-6 text-blue-600" />
                <div className="text-base font-semibold text-gray-900">{f.title}</div>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUÉ CONFIAR */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <h3 className="text-lg font-semibold text-gray-900">¿Por qué confiar en ComparaYa?</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Precisión", desc: "Procesos reproducibles y control de calidad.", icon: ShieldCheck },
            { title: "Cobertura", desc: "16 regiones y mercados mayoristas clave.", icon: Globe },
            { title: "Rendimiento", desc: "Interfaz veloz, filtros eficientes.", icon: TrendingUp },
            { title: "Claridad", desc: "Gráficos, métricas y contexto en simple.", icon: LineChart },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 ring-1 ring-blue-100">
                  <c.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{c.title}</div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FUENTES DE DATOS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Fuentes y metodología</h3>
          <p className="mt-2 text-sm text-gray-600">
            La plataforma se alimenta de fuentes oficiales y consolidadas, priorizando series
            públicas y documentación abierta. La metodología de cálculo (promedios, medianas
            y agregaciones por día/semana/mes) se explica en cada visualización para mantener
            trazabilidad y contexto.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-gray-700 ring-1 ring-gray-200">
            <Database className="h-4 w-4 text-blue-600" />
            Datos integrados y curados para su visualización.
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-semibold text-gray-900">¿Tienes sugerencias o quieres colaborar?</h4>
            <p className="mt-1 text-sm text-gray-600">
              Escríbenos y conversemos mejoras, fuentes adicionales o nuevas visualizaciones.
            </p>
          </div>
          <a
            href="mailto:contacto@comparaya.cl"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-px"
          >
            <Mail size={16} /> Contacto
          </a>
        </div>
      </section>
    </main>
  );
}