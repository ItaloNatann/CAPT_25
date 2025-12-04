import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart as RBarChart,
  Bar,
  Cell,
  ReferenceLine,
  LabelList,
  PieChart,
  Pie,
} from "recharts";
import { LineChart as LineChartIcon, TrendingUp, Globe, Package, BarChart2, Shuffle } from "lucide-react";

/* ===================== Helpers HTTP ===================== */
const API_PREFIX = "/api";
const fetchJson = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, { headers: { Accept: "application/json" }, ...init });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
function urlWithParams(path: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const q = qs.toString();
  return `${API_PREFIX}${path}${q ? `?${q}` : ""}`;
}
const pickResults = (json: any): any[] => (Array.isArray(json) ? json : json?.results ?? []);
const coerceArray = <T,>(json: any, key?: string): T[] => {
  if (Array.isArray(json)) return json as T[];
  if (key && Array.isArray(json?.[key])) return json[key] as T[];
  if (Array.isArray(json?.results)) return json.results as T[];
  if (Array.isArray(json?.data)) return json.data as T[];
  return [];
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ===================== Tipos y utils ===================== */
type Dataset = "consumidor" | "mayorista";
type ApiCat = { id: number | string; nombre: string };
type ApiProducto = { id: number; nombre: string };

type SeriePoint = { fecha: string; valor: number };
type ProductoSerie = { productId: number; productName: string; unidad: string; puntos: SeriePoint[] };

/* ---- Formateo CLP con símbolo $ ---- */
const nfCL = new Intl.NumberFormat("es-CL");
const formatCLPShort = (n: number | string) => `$${nfCL.format(Number(n))}`;       // $12.345
const formatCLPFull  = (n: number | string) => `$${nfCL.format(Number(n))} CLP`;   // $12.345 CLP

// Componente compacto para KPIs (redondeado a entero con $)
const CLP = ({ value }: { value: number | undefined | null }) => {
  const n = Math.round(Number(value || 0));
  return <span>{formatCLPShort(n)}</span>;
};

// Paleta de colores categóricos (12 tonos)
const COLORS = [
  "#2563eb", "#059669", "#7c3aed", "#f59e0b", "#ef4444", "#0ea5e9",
  "#10b981", "#a855f7", "#f97316", "#22c55e", "#3b82f6", "#e11d48",
];
const hashStringToInt = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};
const colorFor = (name: string) => COLORS[hashStringToInt(name) % COLORS.length];

const toMonth = (iso: string) => iso.slice(0, 7);
const monthStart = (ym: string) => (/^\d{4}-\d{2}$/.test(ym) ? `${ym}-01` : "");
const monthEnd = (ym: string) => {
  if (!/^\d{4}-\d{2}$/.test(ym)) return "";
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
};
function monthsBackYm(n: number) {
  const today = new Date();
  const endYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const start = new Date(today);
  start.setMonth(start.getMonth() - n + 1);
  const startYm = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  return { startYm, endYm };
}

/* ===================== Series combinadas ===================== */
type RowCombined = { month: string; [productName: string]: number | string };
function buildCombinedSeries(seriesList: ProductoSerie[], productNames: string[]): RowCombined[] {
  const byMonth = new Map<string, RowCombined>();
  for (const serie of seriesList) {
    for (const p of serie.puntos) {
      const m = toMonth(p.fecha);
      const row = byMonth.get(m) ?? { month: m };
      if (productNames.includes(serie.productName)) {
        row[serie.productName] = p.valor;
      }
      byMonth.set(m, row);
    }
  }
  return [...byMonth.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)));
}
function toIndexSeries(series: RowCombined[], productos: string[]) {
  if (!series.length) return series;
  const base = series[0];
  return series.map((row) => {
    const out: any = { month: row.month };
    productos.forEach((p) => {
      const b = Number(base[p] ?? row[p] ?? 0);
      const v = Number(row[p] ?? 0);
      out[p] = b ? (v / b) * 100 : 0;
    });
    return out;
  });
}
function calcKpisFromCombined(series: RowCombined[], productos: string[]) {
  if (!series.length || !productos.length) {
    return { promLast: 0, variacion: 0, rangoProm: 0, top: { k: "-", dv: 0 } };
  }
  const f = series[0];
  const l = series[series.length - 1];
  const denom = productos.length;
  const get = (o: any, k: string) => Number(o?.[k] ?? 0);
  const promFirst = productos.reduce((a, k) => a + get(f, k), 0) / denom;
  const promLast = productos.reduce((a, k) => a + get(l, k), 0) / denom;
  const variacion = promFirst ? (promLast - promFirst) / promFirst : 0;
  const rangoProm =
    productos.reduce((acc, k) => {
      const serie = series.map((d) => Number(d[k] ?? NaN)).filter(Number.isFinite);
      if (!serie.length) return acc;
      const min = Math.min(...serie);
      const max = Math.max(...serie);
      return acc + (max - min);
    }, 0) / Math.max(1, denom);
  const top =
    productos
      .map((k) => {
        const s0 = get(f, k), s1 = get(l, k);
        return { k, dv: s0 ? (s1 - s0) / s0 : 0 };
      })
      .sort((a, b) => b.dv - a.dv)[0] || { k: "-", dv: 0 };
  return { promLast, variacion, rangoProm, top };
}

/* ===================== Custom Select (estilo unificado) ===================== */
function CustomSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  placeholder = "Selecciona…",
  disabled = false,
}: {
  label?: string;
  options: { label: string; value: T }[];
  value: T | "";
  onChange: (v: T) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      if (listRef.current && !listRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-1">
      {label && <label className="text-xs">{label}</label>}

      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-sm shadow-sm transition 
          ${disabled ? "cursor-not-allowed opacity-60" : "hover:bg-white"} 
          ${open ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 bg-white/90"}`}
      >
        <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.414l3.71-3.183a.75.75 0 111.14.976l-4.24 3.64a.75.75 0 01-.98 0l-4.25-3.64a.75.75 0 01-.02-1.06z"/>
        </svg>
      </button>

      {open && (
        <div ref={listRef} className="relative z-[90]">
          <div className="absolute left-0 right-0 mt-2 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-gray-50
                    ${active ? "bg-blue-50/70 text-blue-700" : "text-gray-700"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && <span className="text-[11px] font-medium">✓</span>}
                </button>
              );
            })}
            {options.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-500">Sin opciones</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Componente principal ===================== */
export default function Dashboard() {
  /* -------- Filtros -------- */
  const [dataset, setDataset] = useState<Dataset>("consumidor");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [periodo, setPeriodo] = useState<"6m" | "12m" | "24m" | "48m">("24m");
  const [modoIndice, setModoIndice] = useState<boolean>(false);

  /* -------- Catálogo (API) -------- */
  const [categoriasApi, setCategoriasApi] = useState<ApiCat[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  useEffect(() => {
    setCategoriaId("");
    setCatLoading(true);
    setCatError(null);
    const ac = new AbortController();
    const path = dataset === "consumidor" ? "/v1/grupos" : "/v1/subsectores";
    const url = urlWithParams(path, { dataset });

    fetchJson(url, { signal: ac.signal })
      .then((j) => setCategoriasApi(pickResults(j) as ApiCat[]))
      .catch((err) => {
        if ((err as any)?.name !== "AbortError") setCatError((err as Error)?.message || "Error");
        setCategoriasApi([]);
      })
      .finally(() => setCatLoading(false));

    return () => ac.abort();
  }, [dataset]);

  /* -------- Productos (API) -------- */
  const [productosApi, setProductosApi] = useState<ApiProducto[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);

  // selección de productos (por nombre – dropdown multiselección)
  const [productosSel, setProductosSel] = useState<string[]>([]);

  /* -------- Buscador + Dropdown -------- */
  const [openProd, setOpenProd] = useState(false);
  const [prodQuery, setProdQuery] = useState("");
  const productosDisponibles = productosApi.map((p) => p.nombre);
  const filteredDisponibles = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    return q ? productosDisponibles.filter((p) => p.toLowerCase().includes(q)) : productosDisponibles;
  }, [productosDisponibles, prodQuery]);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // cerrar por click afuera / Esc
    const onDocClick = (e: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target as Node)) setOpenProd(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenProd(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    // reset productos si cambia la categoría
    setProductosApi([]);
    setProductosSel([]);
    setProdError(null);

    if (!categoriaId) return;

    setProdLoading(true);
    const ac = new AbortController();

    const baseParams: Record<string, string | number | undefined> = {
      dataset,
      ordering: "nombre",
      page_size: 500,
    };
    if (dataset === "consumidor") baseParams.grupo_id = categoriaId;
    else baseParams.subsector_id = categoriaId;

    const url = urlWithParams("/v1/productos", baseParams);

    fetchJson(url, { signal: ac.signal })
      .then((j) => {
        const arr = pickResults(j) as ApiProducto[];
        setProductosApi(arr);
        setProductosSel([]);
      })
      .catch((err) => {
        if ((err as any)?.name !== "AbortError") setProdError((err as Error)?.message || "Error");
      })
      .finally(() => setProdLoading(false));

    return () => ac.abort();
  }, [dataset, categoriaId]);

  /* -------- SERIES REALES (API) -------- */
  const [seriesReal, setSeriesReal] = useState<ProductoSerie[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const monthsBack = periodo === "6m" ? 6 : periodo === "12m" ? 12 : periodo === "24m" ? 24 : 48;
  const { startYm, endYm } = useMemo(() => monthsBackYm(monthsBack), [monthsBack]);

  useEffect(() => {
    let alive = true;
    async function loadSeries() {
      setSeriesLoading(true);
      setSeriesError(null);
      setSeriesReal([]);
      try {
        const nameToId = new Map(productosApi.map((p) => [p.nombre, p.id]));
        const selected = productosSel
          .map((name) => ({ name, id: nameToId.get(name) }))
          .filter((x): x is { name: string; id: number } => typeof x.id === "number");

        const tasks = selected.map(async ({ id, name }) => {
          // 1) unidades
          const unitsJson = await fetchJson(urlWithParams(`/v1/productos/${id}/unidades`, { dataset }));
          const units = coerceArray<any>(unitsJson, "unidades");
          const unidad =
            (units[0]?.nombre ?? units[0]?.unidad ?? units[0]?.label ?? (typeof units[0] === "string" ? units[0] : "")) || "";
          if (!unidad) return { productId: id, productName: name, unidad: "", puntos: [] as SeriePoint[] };

          // 2) series
          const params = {
            dataset,
            unidad,
            agg: "month",
            valor: "promedio",
            desde: monthStart(startYm),
            hasta: monthEnd(endYm),
          };
          const seriesJson = await fetchJson(urlWithParams(`/v1/productos/${id}/series`, params));
          const pointsRaw = coerceArray<any>(seriesJson, "points");
          const puntos: SeriePoint[] = pointsRaw.map((p: any) => ({
            fecha: String(p.fecha),
            valor: Number(p.precio ?? p.valor ?? p.y ?? 0),
          }));
          return { productId: id, productName: name, unidad: String(unidad), puntos };
        });

        const results = await Promise.all(tasks);
        if (!alive) return;
        setSeriesReal(results);
      } catch (e: any) {
        if (!alive) return;
        setSeriesError(e?.message || "No se pudieron cargar las series");
      } finally {
        if (!alive) return;
        setSeriesLoading(false);
      }
    }

    if (productosSel.length) loadSeries();
    else {
      setSeriesReal([]);
      setSeriesError(null);
      setSeriesLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [productosSel, dataset, startYm, endYm, productosApi]);

  // ===== Cobertura por producto vs período seleccionado =====
  const coverageByProduct = useMemo(() => {
    const start = monthStart(startYm);
    const end = monthEnd(endYm);
    const inRange = (iso: string) => (!start || !end) ? true : (iso >= start && iso <= end);

    const cov: Record<string, number> = {};
    for (const serie of seriesReal) {
      if (!productosSel.includes(serie.productName)) continue;
      let count = 0;
      for (const pt of serie.puntos) if (inRange(pt.fecha)) count++;
      cov[serie.productName] = count; // puntos dentro del rango
    }
    return cov;
  }, [seriesReal, productosSel, startYm, endYm]);

  const outOfRange = useMemo(
    () => productosSel.filter((p) => (coverageByProduct[p] ?? 0) === 0),
    [coverageByProduct, productosSel]
  );
  const validProducts = useMemo(
    () => productosSel.filter((p) => (coverageByProduct[p] ?? 0) > 0),
    [productosSel, coverageByProduct]
  );

  const combined = useMemo(() => buildCombinedSeries(seriesReal, validProducts), [seriesReal, validProducts]);
  const seriesForCharts = useMemo(
    () => (modoIndice ? toIndexSeries(combined, validProducts) : combined),
    [combined, modoIndice, validProducts]
  );
  const { promLast, variacion, rangoProm, top } = useMemo(() => calcKpisFromCombined(combined, validProducts), [combined, validProducts]);

  const barrasVariacion = useMemo(() => {
    if (!combined.length) return [] as { producto: string; change: number }[];
    const first = combined[0];
    const last = combined[combined.length - 1];
    return validProducts
      .map((p) => {
        const a = Number(first?.[p] ?? 0);
        const b = Number(last?.[p] ?? 0);
        const change = a ? ((b - a) / a) * 100 : 0;
        return { producto: p, change: Number(change.toFixed(2)) };
      })
      .sort((x, y) => y.change - x.change);
  }, [combined, validProducts]);

  // Donut dinámico (último punto)
  const donutData = useMemo(() => {
    if (!seriesForCharts.length || !validProducts.length) return [];
    const last = seriesForCharts[seriesForCharts.length - 1] as Record<string, number>;
    return validProducts
      .map((p) => ({ name: p, value: Number(last[p] ?? 0) }))
      .filter((d) => Number.isFinite(d.value) && d.value > 0);
  }, [seriesForCharts, validProducts]);

  const donutTotal = useMemo(
    () => donutData.reduce((acc, d) => acc + (d.value || 0), 0),
    [donutData]
  );

  // Etiqueta dentro del donut (muestra % solo si el slice > 8%)
  const renderDonutLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (!percent || percent < 0.08) return null;
    const RAD = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) / 2;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    return (
      <text x={x} y={y} fill="#111827" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700 }}>
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  const toggleProducto = (p: string) => {
    setSeriesError(null);
    setProductosSel((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (prev.length >= 4) return prev; // límite 4
      return [...prev, p];
    });
  };

  return (
    <main className="bg-gray-50">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-12">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</span> de precios ODEPA
            </h1>
            <p className="mt-2 text-sm text-gray-600">Compara <strong>{dataset}</strong> por producto (series reales, mensual promedio).</p>
          </div>

          {/* Toggle dataset */}
          <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${dataset === "consumidor" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setDataset("consumidor")}
            >
              Consumidor
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${dataset === "mayorista" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
              onClick={() => setDataset("mayorista")}
            >
              Mayorista
            </button>
          </div>
        </header>

        {/* Filtros */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur overflow-visible relative z-[60]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            {/* Categoría */}
            <div className="sm:col-span-3">
              <CustomSelect
                label={`Categoría ${dataset === "consumidor" ? "(Grupos)" : "(Subsectores)"}`}
                options={categoriasApi.map(c => ({ label: c.nombre, value: String(c.id) }))}
                value={categoriaId}
                onChange={(v) => setCategoriaId(String(v))}
                placeholder="Selecciona una categoría"
                disabled={catLoading}
              />
              {catError && <p className="mt-1 text-xs text-red-600">Error cargando categorías: {catError}</p>}
            </div>

            {/* Productos (máx 4) */}
            <div className="sm:col-span-6">
              <label className="text-xs">Productos a comparar (máximo 4)</label>
              <div ref={searchRef} className="relative isolation-isolate z-[70]">
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                  <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    placeholder="Buscar producto por nombre..."
                    value={prodQuery}
                    onChange={(e) => setProdQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setOpenProd(false); }}
                    onFocus={() => setOpenProd(true)}
                  />
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{productosSel.length}/4</span>
                </div>

                {openProd && (
                  <div className="absolute left-0 right-0 z-[80] mt-2 max-h-80 overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-3 py-2 text-xs text-gray-600 backdrop-blur">
                      <span>Selecciona hasta 4 productos</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{productosSel.length}/4</span>
                    </div>

                    {filteredDisponibles.filter((o) => !productosSel.includes(o)).map((opt) => {
                      const disabled = productosSel.length >= 4;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { if (disabled) return; toggleProducto(opt); setProdQuery(""); setOpenProd(true); }}
                          className={`group flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                          disabled={disabled}
                        >
                          <span className="truncate text-gray-700 group-hover:text-gray-900">{cap(opt)}</span>
                          <span className="text-[11px] font-medium text-blue-600 opacity-80 group-hover:opacity-100">Añadir</span>
                        </button>
                      );
                    })}

                    {filteredDisponibles.filter((o) => !productosSel.includes(o)).length === 0 && (
                      <div className="px-3 py-6 text-center text-sm text-gray-500">Sin resultados</div>
                    )}
                  </div>
                )}
              </div>

              {/* Chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {productosSel.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                    style={{
                      borderColor: colorFor(s) + "33",
                      backgroundColor: colorFor(s) + "22",
                      color: colorFor(s),
                    }}
                  >
                    {cap(s)}
                    <button onClick={() => toggleProducto(s)} className="-mr-1 rounded-full px-1 text-xs hover:bg-white/50">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Periodo + índice */}
            <div className="sm:col-span-3">
              <CustomSelect
                label="Periodo"
                options={[
                  { label: "6 meses", value: "6m" },
                  { label: "12 meses", value: "12m" },
                  { label: "24 meses", value: "24m" },
                  { label: "48 meses", value: "48m" },
                ]}
                value={periodo}
                onChange={(v) => setPeriodo(v as any)}
                placeholder="Selecciona periodo"
              />

              <button
                onClick={() => setModoIndice((s) => !s)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur hover:bg-white"
              >
                <Shuffle className="h-4 w-4" /> {modoIndice ? "Ver precios CLP" : "Ver índice (base=100)"}
              </button>

              {prodError && <p className="mt-2 text-xs text-red-600">Error: {prodError}</p>}
            </div>
          </div>

          {!seriesLoading && outOfRange.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Los siguientes productos no tienen datos en el período seleccionado y <strong>no se graficarán</strong>: {outOfRange.map(cap).join(", ")}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { k: "Precio promedio actual", v: <CLP value={Number.isFinite(promLast) ? promLast : 0} />, icon: TrendingUp, color: "text-blue-600" },
            { k: `Variación ${periodo}`, v: `${(variacion * 100).toFixed(1)}%`, icon: LineChartIcon, color: "text-indigo-600" },
            { k: "Volatilidad (rango prom.)", v: <CLP value={Number.isFinite(rangoProm) ? rangoProm : 0} />, icon: LineChartIcon, color: "text-purple-600" },
            { k: "Mayor alza", v: `${cap(top.k)} ${(top.dv * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-amber-600" },
          ].map(({ k, v, icon: Icon, color }) => (
            <div key={k} className="group rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2 ring-1 ring-blue-100">
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="text-xs uppercase tracking-wide text-gray-500">{k}</div>
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">{v}</div>
            </div>
          ))}
        </div>

        {/* === GRID: fila 1 (Donut 1/3 + Tendencia 2/3, misma altura), fila 2 (Barras full) === */}
        <div className="mt-8 grid grid-cols-12 gap-4">
          {/* Donut — 1/3 */}
          <div className="col-span-12 lg:col-span-4 rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur h-full">
            <h3 className="text-base font-medium">Participación por producto (último mes)</h3>
            <div className="overflow-hidden rounded-xl">
              <div className="h-[260px] lg:h-[280px] w-full bg-white/60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {donutData.map((d, i) => {
                        const base = colorFor(d.name);
                        const id = `donutGrad-${i}`;
                        return (
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={base} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={base} stopOpacity={0.35} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="60%"
                      outerRadius="85%"
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      cornerRadius={8}
                      labelLine={false}
                      label={(p) => renderDonutLabel(p as any)}
                      isAnimationActive
                      animationDuration={500}
                    >
                      {donutData.map((d, i) => {
                        const base = colorFor(d.name);
                        return (
                          <Cell key={i} fill={`url(#donutGrad-${i})`} stroke={base} strokeOpacity={0.9} strokeWidth={1.5} />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any) => {
                        const val = Math.round(Number(v));
                        const pct = donutTotal ? ((val / donutTotal) * 100).toFixed(1) + "%" : "0%";
                        return [formatCLPShort(val), `${cap(String(n))} (${pct})`];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leyenda compacta */}
            <div className="mt-3 grid grid-cols-1 gap-2">
              {donutData.map((d, i) => {
                const pct = donutTotal ? ((d.value / donutTotal) * 100) : 0;
                const base = colorFor(d.name);
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm"
                    style={{ borderColor: base + "33" }}>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: base }} />
                      <span className="truncate text-gray-800">{cap(d.name)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-gray-700">{formatCLPShort(Math.round(d.value))}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
              {donutData.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
                  No hay datos para graficar el donut.
                </div>
              )}
            </div>
          </div>

          {/* Tendencia — 2/3 (misma altura que donut, SIN hueco) */}
          <div className="col-span-12 lg:col-span-8 rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur h-full">
            <div className="pb-2">
              <h3 className="text-base font-medium">Tendencia de precios (CLP/unidad)</h3>
              <p className="text-xs text-gray-500">Serie mensual promedio — {dataset}</p>
            </div>
            <div className="overflow-hidden rounded-xl">
              <div className="h-[260px] lg:h-[280px] w-full bg-white/60">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={seriesForCharts} margin={{ top: 10, right: 20, left: 10, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} minTickGap={28} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => formatCLPShort(Math.round(v as number))}
                    />
                    <Tooltip
                      formatter={(value, name) => [formatCLPShort(Math.round(value as number)), cap(String(name))]}
                      labelFormatter={(l) => `Mes: ${l}`}
                    />
                    {/* Leyenda fuera para evitar hueco */}
                    {validProducts.map((p) => (
                      <Line key={p} type="monotone" dataKey={p} stroke={colorFor(p)} strokeWidth={2.5} dot={false} />
                    ))}
                  </RLineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Leyenda externa */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {validProducts.map((p) => (
                <div key={p} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorFor(p) }} />
                  <span className="text-gray-700">{cap(p)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Barras — fila 2, full width */}
          <div className="col-span-12 rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <h3 className="text-base font-medium">Variación por producto en el período seleccionado</h3>
            <div className="overflow-hidden rounded-xl">
              <div className="h-[300px] lg:h-[320px] w-full bg-white/60">
                <ResponsiveContainer width="100%" height="100%">
                  <RBarChart data={barrasVariacion} margin={{ top: 18, right: 24, left: 12, bottom: 10 }} barCategoryGap={20} barGap={6}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
                    <XAxis dataKey="producto" tickMargin={8} tickLine={false} axisLine={false} tickFormatter={(v) => cap(String(v))} />
                    <YAxis tickFormatter={(v) => `${v}%`} width={48} tickLine={false} axisLine={false} />
                    <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                    <Tooltip formatter={(v: number) => `${v}%`} />

                    <defs>
                      {barrasVariacion.map((entry, index) => {
                        const base = entry.change < 0 ? "#ef4444" : colorFor(entry.producto);
                        const id = `barGrad-${index}`;
                        return (
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={base} stopOpacity={0.85} />
                            <stop offset="100%" stopColor={base} stopOpacity={0.25} />
                          </linearGradient>
                        );
                      })}
                    </defs>

                    <Bar dataKey="change" radius={[10, 10, 0, 0]} isAnimationActive animationDuration={500}>
                      {barrasVariacion.map((entry, index) => {
                        const base = entry.change < 0 ? "#ef4444" : colorFor(entry.producto);
                        return (
                          <Cell key={`cell-${index}`} fill={`url(#barGrad-${index})`} stroke={base} strokeOpacity={0.9} strokeWidth={1.5} />
                        );
                      })}
                      <LabelList
                        dataKey="change"
                        position="top"
                        offset={8}
                        formatter={(label: any) => `${Number(label).toFixed(0)}%`}
                        style={{ fill: "#374151", fontSize: 11, fontWeight: 600 }}
                      />
                    </Bar>
                  </RBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {seriesLoading && <p className="mt-3 text-xs text-gray-600">Cargando series desde el backend…</p>}
            {seriesError && <p className="mt-3 text-xs text-red-600">Error cargando series: {seriesError}</p>}
            {!seriesLoading && !seriesError && combined.length === 0 && categoriaId && (
              <p className="mt-3 text-xs text-amber-700">No hay datos para los productos/período seleccionados.</p>
            )}
          </div>
        </div>
        {/* === FIN GRID === */}
      </section>
    </main>
  );
}
