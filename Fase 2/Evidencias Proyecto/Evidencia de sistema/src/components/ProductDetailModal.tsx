import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  AlertCircle,
  Loader2,
  Info,
  DollarSign,
  LineChart as LineChartIcon,
  Trophy,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import CLP, { formatCLP } from "@/components/CLP";

type Dataset = "consumidor" | "mayorista";

export type ProductSummary = {
  id: number | string;
  title: string;
  initialUnits?: Array<string | { id?: string | number; nombre?: string }>;
};

type SeriePunto = { fecha: string; valor: number };
type Serie = { id: string | number; etiqueta: string; puntos: SeriePunto[] };

type UnidadAPI = string | { id?: string | number; nombre?: string } | Record<string, unknown>;
type Region = { id: number | string; nombre: string };
type Mercado = { id: number | string; nombre: string };

const API_PREFIX = "/api";

/* -------------------- helpers -------------------- */
function urlWithParams(path: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const q = qs.toString();
  return `${API_PREFIX}${path}${q ? `?${q}` : ""}`;
}
function monthStart(ym: string) {
  return /^\d{4}-\d{2}$/.test(ym) ? `${ym}-01` : "";
}
function monthEnd(ym: string) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return "";
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}
function coerceArray<T = unknown>(json: any, key?: string): T[] {
  if (Array.isArray(json)) return json as T[];
  if (key && Array.isArray(json?.[key])) return json[key] as T[];
  if (Array.isArray(json?.results)) return json.results as T[];
  if (Array.isArray(json?.data)) return json.data as T[];
  return [];
}
function normalizeUnidadOptions(arr: UnidadAPI[]) {
  return (arr || []).map((u) => {
    if (typeof u === "string") return { key: u, label: u };
    if (typeof u === "object" && u) {
      const nombre = (u as any).nombre ?? (u as any).unidad ?? (u as any).name ?? (u as any).label ?? "";
      if (nombre) return { key: String(nombre), label: String(nombre) };
    }
    return { key: String(u), label: String((u as any)?.nombre ?? String(u)) };
  });
}
function unidadKey(u: UnidadAPI): string {
  if (typeof u === "string") return u;
  if (typeof u === "object" && u) {
    const n = (u as any).nombre ?? (u as any).unidad ?? (u as any).name ?? (u as any).label;
    if (n) return String(n);
  }
  return String(u);
}
function pickNombre(x: any, fallbackLabel = "—"): string {
  return x?.nombre ?? x?.name ?? x?.label ?? fallbackLabel;
}

// YYYY-MM utils
const toYm = (d?: string | null) => (d ? String(d).slice(0, 7) : "");
const cmpYm = (a: string, b: string) => a.localeCompare(b);
const clampYm = (v: string, minYm: string, maxYm: string) => {
  if (!v) return v;
  if (minYm && cmpYm(v, minYm) < 0) return minYm;
  if (maxYm && cmpYm(v, maxYm) > 0) return maxYm;
  return v;
};

/* Agrupa por clave y promedia */
function groupAvg(rows: { key: string; valor: number }[]) {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const cur = acc.get(r.key) ?? { sum: 0, n: 0 };
    cur.sum += r.valor;
    cur.n += 1;
    acc.set(r.key, cur);
  }
  return [...acc.entries()]
    .map(([key, { sum, n }]) => ({ key, avg: sum / Math.max(1, n) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/* -------------------- Mini chart con tooltip + animación -------------------- */
function MiniLineChart({
  points,
  formatX = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "short" }),
  formatY = (v: number) => new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(v),
}: {
  points: { x: string; y: number }[];
  formatX?: (iso: string) => string;
  formatY?: (v: number) => string;
}) {
  if (!points.length)
    return <div className="h-56 rounded-lg bg-gray-50 ring-1 ring-inset ring-gray-200" />;

  const data = [...points].sort((a, b) => a.x.localeCompare(b.x));
  const w = 900, h = 220, pad = 28;
  const plotW = w - pad * 2, plotH = h - pad * 2;

  const yVals = data.map((d) => d.y);
  const xMax = data.length - 1;
  const yMin = Math.min(...yVals), yMax = Math.max(...yVals);

  const sx = (i: number) => pad + i * (plotW / Math.max(1, xMax));
  const sy = (v: number) => h - pad - (v - yMin) * (plotH / Math.max(1e-9, yMax - yMin));

  const pathD = data.map((d, i) => `${i ? "L" : "M"} ${sx(i)} ${sy(d.y)}`).join(" ");
  const areaD = `${pathD} L ${sx(xMax)} ${sy(yMin)} L ${sx(0)} ${sy(yMin)} Z`;

  const [hover, setHover] = useState<{ i: number; cx: number; cy: number } | null>(null);

  const onMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = (px - pad) / plotW;
    const i = Math.min(xMax, Math.max(0, Math.round(ratio * xMax)));
    setHover({ i, cx: sx(i), cy: sy(data[i].y) });
  };
  const onLeave = () => setHover(null);

  // Animación “dibujándose”
  const pathRef = useRef<SVGPathElement | null>(null);
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const total = el.getTotalLength();
    el.style.transition = "none";
    el.style.strokeDasharray = `${total}`;
    el.style.strokeDashoffset = `${total}`;
    void el.getBoundingClientRect(); // reflow
    el.style.transition = "stroke-dashoffset 900ms ease-out";
    el.style.strokeDashoffset = "0";
  }, [pathD]);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-56 w-full text-blue-600"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <rect x={pad} y={pad} width={plotW} height={plotH} fill="#f8fafc" rx="8" />
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={pad} x2={pad + plotW} y1={pad + plotH * t} y2={pad + plotH * t} stroke="#e5e7eb" strokeDasharray="2 4" />
        ))}
        <defs>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#fillGrad)" />
        <path
          ref={pathRef}
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {hover && (
          <>
            <line x1={hover.cx} x2={hover.cx} y1={pad} y2={pad + plotH} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 5" />
            <circle cx={hover.cx} cy={hover.cy} r="4.5" fill="white" stroke="currentColor" strokeWidth="2" />
          </>
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-3 rounded-lg bg-white px-3 py-2 text-xs shadow-md ring-1 ring-gray-200"
          style={{ left: `${(hover.cx / w) * 100}%`, top: 8 }}
        >
          <div className="font-medium text-gray-900">{formatX(data[hover.i].x)}</div>
          <div className="tabular-nums text-gray-600">{formatY(data[hover.i].y)}</div>
        </div>
      )}
    </div>
  );
}

/* =================== MODAL =================== */
export default function ProductDetailModal({
  product,
  dataset,
  onClose,
}: {
  product: ProductSummary;
  dataset: Dataset;
  onClose: () => void;
}) {
  // cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* -------- filtros -------- */
  const [unidad, setUnidad] = useState<string>("");
  const [regionId, setRegionId] = useState<string>("");
  const [mercadoId, setMercadoId] = useState<string>("");

  const valor: "promedio" = "promedio";

  const [desdeYm, setDesdeYm] = useState<string>("");
  const [hastaYm, setHastaYm] = useState<string>("");

  const [tab, setTab] = useState<"resumen" | "series" | "tabla">("resumen");
  const [chartGranularity, setChartGranularity] = useState<"month" | "year">("month");
  const [showHelp, setShowHelp] = useState(false);

  // Evitar “flash” inicial mostrando loader hasta primera carga
  const [booting, setBooting] = useState(true);
  const firstLoadMarked = useRef(false);

  /* -------- opciones -------- */
  const [unidades, setUnidades] = useState<UnidadAPI[]>(product.initialUnits ?? []);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [mercados, setMercados] = useState<Mercado[]>([]);

  /* -------- datos -------- */
  const [series, setSeries] = useState<Serie[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unitsErr, setUnitsErr] = useState<string | null>(null);

  // bounds del backend (NO se actualizan con /series)
  const [apiDesde, setApiDesde] = useState<string | null>(null);
  const [apiHasta, setApiHasta] = useState<string | null>(null);

  /* Reset por cambio de dataset / producto */
  useEffect(() => {
    setUnidad("");
    setRegionId("");
    setMercadoId("");
    setRegiones([]);
    setMercados([]);
    setDesdeYm("");
    setHastaYm("");
    setApiDesde(null);
    setApiHasta(null);
    setBooting(true);
    firstLoadMarked.current = false;
  }, [dataset, product.id]);

  /* Cargar unidades */
  useEffect(() => {
    let alive = true;
    setUnitsErr(null);

    (async () => {
      try {
        const r = await fetch(urlWithParams(`/v1/productos/${product.id}/unidades`, { dataset }));
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();

        if (!alive) return;
        if (j?.desde) setApiDesde(j.desde);
        if (j?.hasta) setApiHasta(j.hasta);

        const list = coerceArray<UnidadAPI>(j, "unidades");
        const arr = list.length ? list : (product.initialUnits ?? []);
        setUnidades(arr);

        if (arr.length && !unidad) setUnidad(unidadKey(arr[0]));

        // ========== NUEVA LÓGICA: Último año completo por defecto ==========
        if (j?.desde && j?.hasta) {
          const hastaBackend = new Date(j.hasta);
          const añoHasta = hastaBackend.getFullYear();
          const mesHasta = hastaBackend.getMonth() + 1; // 1-12
          const diaHasta = hastaBackend.getDate();
          
          // Determinar el último año completo disponible
          let añoInicio, mesInicio, añoFin, mesFin;
          
          if (mesHasta === 1 && diaHasta <= 15) {
            // Si estamos a principios de enero, mostramos el año anterior completo
            añoInicio = añoHasta - 1;
            mesInicio = 1;
            añoFin = añoHasta - 1;
            mesFin = 12;
          } else {
            // Para otros casos, mostramos desde enero hasta el mes anterior del año actual
            añoInicio = añoHasta;
            mesInicio = 1;
            añoFin = añoHasta;
            mesFin = mesHasta > 1 ? mesHasta - 1 : 12;
            
            // Si retrocedimos a diciembre del año anterior
            if (mesFin === 12 && mesHasta === 1) {
              añoInicio = añoHasta - 1;
              añoFin = añoHasta - 1;
            }
          }

          const desdePropuesto = `${añoInicio}-${String(mesInicio).padStart(2, '0')}`;
          const hastaPropuesto = `${añoFin}-${String(mesFin).padStart(2, '0')}`;
          
          // Verificar que las fechas propuestas estén dentro del rango disponible
          const minYm = toYm(j.desde);
          const maxYm = toYm(j.hasta);
          
          if (minYm && maxYm) {
            const desdeFinal = clampYm(desdePropuesto, minYm, maxYm);
            const hastaFinal = clampYm(hastaPropuesto, minYm, maxYm);
            
            // Solo establecer si no tenemos valores previos
            if (!desdeYm && !hastaYm) {
              setDesdeYm(desdeFinal);
              setHastaYm(hastaFinal);
            }
          }
        } else if (j?.desde && j?.hasta && !desdeYm && !hastaYm) {
          // Fallback: rango completo (como estaba antes)
          setDesdeYm(String(j.desde).slice(0, 7));
          setHastaYm(String(j.hasta).slice(0, 7));
        }

        // si no hay unidades, salimos del boot de inmediato para mostrar el estado vacío
        if (arr.length === 0) setBooting(false);
      } catch (e: any) {
        if (!alive) return;
        const arr = product.initialUnits ?? [];
        setUnidades(arr);
        if (arr.length && !unidad) setUnidad(unidadKey(arr[0]));
        setUnitsErr(e?.message || "No se pudieron cargar las unidades");
        if (arr.length === 0) setBooting(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, dataset, product.initialUnits]);

  /* Cargar regiones o mercados cuando hay unidad */
  useEffect(() => {
    let alive = true;
    setRegionId("");
    setMercadoId("");
    setRegiones([]);
    setMercados([]);

    if (!unidad) return;

    (async () => {
      try {
        if (dataset === "consumidor") {
          const r = await fetch(urlWithParams(`/v1/productos/${product.id}/regiones`, { dataset, unidad }));
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = await r.json();
          if (!alive) return;

          if (j?.desde) setApiDesde(j.desde);
          if (j?.hasta) setApiHasta(j.hasta);

          const raw = coerceArray<any>(j, "regiones");
          const list: Region[] = raw.map((x) => ({ id: x.id, nombre: pickNombre(x, `Región ${x.id}`) }));
          setRegiones(list);
        } else {
          const r = await fetch(urlWithParams(`/v1/productos/${product.id}/mercados`, { dataset, unidad }));
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = await r.json();
          if (!alive) return;

          if (j?.desde) setApiDesde(j.desde);
          if (j?.hasta) setApiHasta(j.hasta);

          const raw = coerceArray<any>(j, "mercados");
          const list: Mercado[] = raw.map((x) => ({ id: x.id, nombre: pickNombre(x, `Mercado ${x.id}`) }));
          setMercados(list);
        }
      } catch {
        // silencioso
      }
    })();

    return () => {
      alive = false;
    };
  }, [unidad, dataset, product.id]);

  /* Ajustar month pickers según bounds */
  useEffect(() => {
    const minYm = toYm(apiDesde);
    const maxYm = toYm(apiHasta);
    if (!minYm || !maxYm) return;

    setDesdeYm((cur) => (cur ? clampYm(cur, minYm, maxYm) : minYm));
    setHastaYm((cur) => (cur ? clampYm(cur, minYm, maxYm) : maxYm));
  }, [apiDesde, apiHasta]);

  /* === Restricción: rango incompatible (desde > hasta) === */
  const invalidRange = !!(desdeYm && hastaYm && cmpYm(desdeYm, hastaYm) > 0);

  /* Cargar series (mensuales, promedio) */
  useEffect(() => {
    let alive = true;

    if (!unidad) {
      setSeries([]);
      setErr(null);
      setLoading(false);
      return;
    }
    if (invalidRange) {
      setSeries([]);
      setErr(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    const minYm = toYm(apiDesde);
    const maxYm = toYm(apiHasta);
    const desdeClamped = desdeYm ? clampYm(desdeYm, minYm, maxYm) : undefined;
    const hastaClamped = hastaYm ? clampYm(hastaYm, minYm, maxYm) : undefined;

    const params: Record<string, string | number | undefined> = {
      dataset,
      unidad,
      agg: "month",
      valor,
      ...(dataset === "consumidor" ? { region_id: regionId || undefined } : { mercado_id: mercadoId || undefined }),
      desde: desdeClamped ? monthStart(desdeClamped) : undefined,
      hasta: hastaClamped ? monthEnd(hastaClamped) : undefined,
    };

    (async () => {
      try {
        const url = urlWithParams(`/v1/productos/${product.id}/series`, params);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!alive) return;

        const points = coerceArray<any>(json, "points");
        points.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
        const serie: Serie = {
          id: "s1",
          etiqueta: `${pickNombre({ nombre: unidad })} · promedio · mensual`,
          puntos: points.map((p: any) => ({
            fecha: p.fecha,
            valor: Number(p.precio ?? p.valor ?? p.y ?? 0),
          })),
        };
        setSeries(serie.puntos.length ? [serie] : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "No se pudieron cargar las series");
        setSeries([]);
      } finally {
        if (!alive) return;
        setLoading(false);
        if (!firstLoadMarked.current) {
          firstLoadMarked.current = true;
          setBooting(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [product.id, dataset, unidad, regionId, mercadoId, desdeYm, hastaYm, apiDesde, apiHasta, invalidRange]);

  // --- Resumen (numérico)
  const firstSerie = series[0];
  const valores = useMemo(() => (firstSerie ? firstSerie.puntos.map((p) => p.valor) : []), [firstSerie]);

  const resumen = useMemo(() => {
    if (!valores.length) {
      return { actual: null as number | null, promedio: null as number | null, maximo: null as number | null, variacion: null as number | null };
    }
    const actual = valores[valores.length - 1];
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const maximo = Math.max(...valores);
    const variacion = valores.length > 1 ? ((actual - valores[0]) / Math.max(1e-9, valores[0])) * 100 : 0;
    return { actual, promedio, maximo, variacion };
  }, [valores]);

  // Puntos para el gráfico (Mes o Año)
  const chartPoints = useMemo(() => {
    const pts = firstSerie?.puntos ?? [];
    if (!pts.length) return [];
    if (chartGranularity === "month") {
      const monthly = groupAvg(pts.map((p) => ({ key: String(p.fecha).slice(0, 7), valor: p.valor })));
      return monthly.map((m) => ({ x: `${m.key}-01`, y: m.avg }));
    } else {
      const annual = groupAvg(pts.map((p) => ({ key: String(p.fecha).slice(0, 4), valor: p.valor })));
      return annual.map((a) => ({ x: `${a.key}-01-01`, y: a.avg }));
    }
  }, [firstSerie, chartGranularity]);

  const unidadOptions = normalizeUnidadOptions(unidades);
  const rangoDisp = apiDesde && apiHasta ? `${apiDesde}–${apiHasta}` : undefined;

  // componente para variación
  const Variation = ({ value }: { value: number | null }) => {
    if (value === null) return <span>—</span>;
    const up = value > 0;
    const down = value < 0;
    const cls = up ? "text-rose-600" : down ? "text-emerald-600" : "text-gray-700";
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold ${cls}`}>
        {up && <TrendingUp className="h-4 w-4" />}
        {down && <TrendingDown className="h-4 w-4" />}
        {!up && !down && <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />}
        {value.toFixed(1)}%
      </span>
    );
  };

  // límites dinámicos en inputs
  const minBound = toYm(apiDesde) || undefined;
  const maxBound = toYm(apiHasta) || undefined;
  const desdeMax = (hastaYm && (!maxBound || cmpYm(hastaYm, maxBound) < 0)) ? hastaYm : maxBound;
  const hastaMin = (desdeYm && (!minBound || cmpYm(desdeYm, minBound) > 0)) ? desdeYm : minBound;

  return (
    // Wrapper con scroll propio (mobile-safe)
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        {/* Panel modal flex y con altura máxima controlada */}
        <div className="relative z-[61] w-full max-w-5xl rounded-none sm:rounded-2xl border border-gray-200 bg-white shadow-2xl
                        flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
          {/* header (no se encoge) */}
          <div className="shrink-0 flex items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-5">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-gray-900">{product.title}</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                ID: <span className="tabular-nums">{product.id}</span> · Dataset:{" "}
                <span className="font-medium capitalize">{dataset}</span>
              </p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* filtros (no se encoge) */}
          <div className="shrink-0 border-b border-gray-200 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Unidad */}
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">Unidad</div>
                {(() => {
                  const opts = unidadOptions;
                  if (opts.length <= 1) {
                    const only = opts[0];
                    if (only && !unidad) setUnidad(only.key);
                    return (
                      <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        {only ? only.label : "Sin unidades"}
                      </div>
                    );
                  }
                  return (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={unidad}
                      onChange={(e) => setUnidad(e.target.value)}
                    >
                      {opts.map((u) => (
                        <option key={u.key} value={u.key}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* Región / Mercado */}
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">{dataset === "consumidor" ? "Región" : "Mercado"}</div>
                {dataset === "consumidor" ? (
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={regionId}
                    onChange={(e) => setRegionId(e.target.value)}
                    disabled={!unidad || regiones.length === 0}
                  >
                    <option value="">{unidad ? "Todas las regiones" : "Seleccione unidad primero"}</option>
                    {regiones.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={mercadoId}
                    onChange={(e) => setMercadoId(e.target.value)}
                    disabled={!unidad || mercados.length === 0}
                  >
                    <option value="">{unidad ? "Todos los mercados" : "Seleccione unidad primero"}</option>
                    {mercados.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Fechas */}
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">Desde</div>
                <input
                  type="month"
                  className={`w-full rounded-lg border ${invalidRange ? "border-rose-300 ring-rose-200" : "border-gray-300"} bg-white px-3 py-2 text-sm`}
                  value={desdeYm}
                  onChange={(e) => setDesdeYm(e.target.value)}
                  min={minBound}
                  max={desdeMax || undefined}
                  placeholder="Desde"
                  aria-invalid={invalidRange}
                />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">Hasta</div>
                <input
                  type="month"
                  className={`w-full rounded-lg border ${invalidRange ? "border-rose-300 ring-rose-200" : "border-gray-300"} bg-white px-3 py-2 text-sm`}
                  value={hastaYm}
                  onChange={(e) => setHastaYm(e.target.value)}
                  min={hastaMin || undefined}
                  max={maxBound}
                  placeholder="Hasta"
                  aria-invalid={invalidRange}
                />
              </div>
            </div>

            {/* Granularidad + ayuda */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-xl ring-1 ring-gray-300">
                <button
                  type="button"
                  aria-pressed={chartGranularity === "month"}
                  className={`px-3.5 py-2 text-sm font-medium ${chartGranularity === "month" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  onClick={() => setChartGranularity("month")}
                >
                  Mes
                </button>
                <button
                  type="button"
                  aria-pressed={chartGranularity === "year"}
                  className={`px-3.5 py-2 text-sm font-medium ${chartGranularity === "year" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                  onClick={() => setChartGranularity("year")}
                >
                  Año
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                aria-expanded={showHelp}
                aria-controls="help-panel"
              >
                <Info className="h-4 w-4" />
                ¿Qué significan estos números?
              </button>
            </div>

            {unitsErr && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                {unitsErr}. Intentando mostrar unidades del listado si están disponibles.
              </div>
            )}

            {invalidRange && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                El rango de fechas es inválido: <b>Desde</b> no puede ser posterior a <b>Hasta</b>.
              </div>
            )}
          </div>

          {/* body (crece y hace scroll) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
            {/* Loader inicial para evitar el flash */}
            {booting ? (
              <div className="flex h-40 items-center justify-center text-sm text-gray-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparando datos…
              </div>
            ) : (
              <>
                {!unidad && (
                  <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    Selecciona una <b>unidad</b> para cargar las series{rangoDisp ? ` (rango disponible ${rangoDisp})` : ""}.
                  </div>
                )}

                {err && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5" />
                      <div>{err}</div>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando datos…
                  </div>
                )}

                {!loading && !err && unidad && (
                  <>
                    {series.length === 0 && rangoDisp && !invalidRange && (
                      <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                        No hay datos para el período seleccionado. Rango disponible: <b>{rangoDisp}</b>.
                      </div>
                    )}

                    {/* Ayuda con transición */}
                    <div
                      id="help-panel"
                      className={`mb-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50 transition-all duration-300 ${
                        showHelp ? "max-h-[240px] opacity-100 translate-y-0 p-3" : "max-h-0 opacity-0 -translate-y-1 p-0"
                      }`}
                    >
                      <div className="text-sm text-blue-900">
                        <p className="mb-2 font-medium">Cómo leer estos valores</p>
                        <ul className="list-disc space-y-1 pl-5">
                          <li><b>Precio actual:</b> el último valor disponible de la serie.</li>
                          <li><b>Promedio:</b> promedio de todos los valores mostrados en el período elegido.</li>
                          <li><b>Máximo:</b> el precio más alto observado en el período.</li>
                          <li><b>Variación:</b> cambio porcentual desde el primer valor del período hasta el último.</li>
                        </ul>
                      </div>
                    </div>

                    {tab === "resumen" && (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {/* Precio actual */}
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              Precio actual
                            </div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">
                              <CLP value={resumen.actual ?? undefined} />
                            </div>
                          </div>

                          {/* Promedio */}
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                              <LineChartIcon className="h-4 w-4 text-gray-400" />
                              Promedio
                            </div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">
                              <CLP value={resumen.promedio ?? undefined} />
                            </div>
                          </div>

                          {/* Máximo */}
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                              <Trophy className="h-4 w-4 text-gray-400" />
                              Máximo
                            </div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">
                              <CLP value={resumen.maximo ?? undefined} />
                            </div>
                          </div>

                          {/* Variación */}
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                              Variación
                            </div>
                            <div className="mt-1 text-lg">
                              <Variation value={resumen.variacion} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                          <MiniLineChart
                            points={chartPoints}
                            formatX={(iso) =>
                              chartGranularity === "year"
                                ? new Date(iso).toLocaleDateString("es-CL", { year: "numeric" })
                                : new Date(iso).toLocaleDateString("es-CL", { year: "numeric", month: "short" })
                            }
                            formatY={(v) => formatCLP(v)}
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            {rangoDisp ? `Rango disponible: ${rangoDisp}` : "Aquí irá el gráfico de la serie temporal."}
                          </p>
                        </div>
                      </>
                    )}

                    {tab === "series" && (
                      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                        {series.length === 0 ? (
                          <p className="text-gray-600">No hay datos para los filtros seleccionados.</p>
                        ) : (
                          <ul className="list-disc pl-5 space-y-1">
                            {series.map((s) => (
                              <li key={s.id} className="text-gray-700">
                                <span className="font-medium">{s.etiqueta}</span> · {s.puntos.length} puntos
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {tab === "tabla" && (
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="h-64 overflow-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="sticky top-0 bg-gray-50 text-gray-600">
                              <tr>
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">Serie</th>
                                <th className="px-3 py-2">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {series.flatMap((s) =>
                                s.puntos.map((p, i) => (
                                  <tr key={`${s.id}-${i}`} className="border-t">
                                    <td className="px-3 py-2 tabular-nums">{p.fecha}</td>
                                    <td className="px-3 py-2">{s.etiqueta}</td>
                                    <td className="px-3 py-2 tabular-nums">{p.valor}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3">
                          <button
                            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                            onClick={() => {
                              const rows: (string | number)[][] = [["fecha", "serie", "valor"]];
                              series.forEach((s) =>
                                s.puntos.forEach((p) => rows.push([p.fecha, s.etiqueta, String(p.valor)]))
                              );
                              const csv = rows
                                .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                                .join("\n");
                              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `producto_${product.id}_series.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Exportar CSV
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tabs */}
                    <div className="mt-4 flex gap-2">
                      {(["resumen", "series", "tabla"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition ${
                            tab === t ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {t === "resumen" ? "Resumen" : t === "series" ? "Series" : "Tabla"}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* footer (no se encoge) */}
          <div
            className="shrink-0 flex justify-end gap-2 border-t border-gray-200 p-4 sm:p-5"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          >
            <button
              onClick={onClose}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}