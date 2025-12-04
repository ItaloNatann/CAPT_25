import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Search,
  ArrowRight,
  AlertCircle,
  Loader2,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowUpAZ,
  ArrowDownZA,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import ProductDetailModal from "@/components/ProductDetailModal";

function capitalizeFirst(str: string): string {
  if (!str || typeof str !== 'string') return str || '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/* ---------- Tipos ---------- */
type Dataset = "consumidor" | "mayorista";
type Product = {
  id: number | string;
  nombre?: string;
  name?: string;
  unidades?: string[]; // viene del backend en el listado
};

// para pasarle info al modal:
type ModalProduct = {
  id: number | string;
  title: string;
  initialUnits?: string[];
};

/* ---------- Constantes ---------- */
const API_PREFIX = "/api";
const DEFAULT_PAGE_SIZE = 20;
const LETTERS = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N","Ñ","O","P","Q","R","S","T","U","V","W","X","Y","Z"
];

/* ---------- Helpers ---------- */
function urlWithParams(
  path: string,
  params: Record<string, string | number | undefined>
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const q = qs.toString();
  return `${API_PREFIX}${path}${q ? `?${q}` : ""}`;
}

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ---------- Paginador compacto ---------- */
function Paginator({
  page,
  totalPages,
  setPage,
  loading,
}: {
  page: number;
  totalPages: number;
  setPage: (n: number | ((p: number) => number)) => void;
  loading: boolean;
}) {
  const nums = useMemo(() => {
    const arr: number[] = [];
    const add = (n: number) => {
      if (n >= 1 && n <= totalPages && !arr.includes(n)) arr.push(n);
    };
    add(1);
    add(page - 1);
    add(page);
    add(page + 1);
    add(totalPages);
    return arr.sort((a, b) => a - b);
  }, [page, totalPages]);

  if (totalPages <= 1) return null;
  const btn = "h-8 min-w-8 px-2 rounded-lg text-xs font-medium ring-1 transition";

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {/* Ir al inicio */}
      <button
        className={`${btn} bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 disabled:opacity-50`}
        disabled={page <= 1 || loading}
        onClick={() => setPage(1)}
        aria-label="Ir a la primera página"
        title="Primera"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>

      {/* Anterior */}
      <button
        className={`${btn} bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 disabled:opacity-50`}
        disabled={page <= 1 || loading}
        onClick={() => setPage((p: number) => Math.max(1, p - 1))}
        aria-label="Página anterior"
        title="Anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Números */}
      {nums.map((n, i) => {
        const prev = nums[i - 1];
        const dots = prev && n - prev > 1;
        return (
          <div key={n} className="flex items-center">
            {dots && <span className="px-1 text-gray-400">…</span>}
            <button
              className={
                n === page
                  ? `${btn} bg-blue-600 text-white ring-blue-600`
                  : `${btn} bg-white text-gray-700 ring-gray-200 hover:bg-gray-50`
              }
              onClick={() => setPage(n)}
              disabled={loading}
              aria-current={n === page ? "page" : undefined}
              title={`Página ${n}`}
            >
              {n}
            </button>
          </div>
        );
      })}

      {/* Siguiente */}
      <button
        className={`${btn} bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 disabled:opacity-50`}
        disabled={page >= totalPages || loading}
        onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
        aria-label="Página siguiente"
        title="Siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Ir al final */}
      <button
        className={`${btn} bg-white text-gray-700 ring-gray-200 hover:bg-gray-50 disabled:opacity-50`}
        disabled={page >= totalPages || loading}
        onClick={() => setPage(totalPages)}
        aria-label="Ir a la última página"
        title="Última"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- Página ---------- */
export default function Products() {
  const [dataset, setDataset] = useState<Dataset>("consumidor");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [data, setData] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Orden global (backend)
  const [order, setOrder] = useState<"az" | "za">("az");
  const ordering = order === "az" ? "nombre" : "-nombre";

  // Filtro global por letra (backend)
  const [startsWith, setStartsWith] = useState<string>("");

  // Modal (ahora guarda también initialUnits)
  const [modalProduct, setModalProduct] = useState<ModalProduct | null>(null);

  const url = useMemo(
    () =>
      urlWithParams("/v1/productos", {
        dataset,
        q: debouncedQuery.trim() || undefined,
        starts_with: startsWith || undefined,
        ordering,
        page,
        page_size: pageSize,
      }),
    [dataset, debouncedQuery, startsWith, ordering, page, pageSize]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        const items: Product[] = Array.isArray(json) ? json : json.results ?? [];
        const count: number = typeof json?.count === "number" ? json.count : items.length;
        if (!alive) return;
        setData(items);
        setTotalCount(count);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Error al cargar productos");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [url]);

  // resets de página cuando cambian filtros/tamaño/orden/letra
  useEffect(() => {
    setPage(1);
  }, [dataset, debouncedQuery, pageSize, ordering, startsWith]);

  // Estado de “Mostrando X–Y de N”
  const totalPages = totalCount > 0 && pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;
  const fromIdx = totalCount ? (page - 1) * pageSize + 1 : 0;
  const toIdx = Math.min(page * pageSize, totalCount);

  // UI: barra alfabética
  const AlphabetBar = (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => { setStartsWith(""); setQuery(""); }}
        className={`h-8 px-2 rounded-lg text-xs font-medium ring-1 transition ${
          startsWith === ""
            ? "bg-blue-600 text-white ring-blue-600"
            : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
        }`}
        title="Todos"
      >
        Todos
      </button>
      {LETTERS.map((L) => (
        <button
          key={L}
          type="button"
          onClick={() => { setStartsWith(L.toLowerCase()); setQuery(""); }}
          className={`h-8 min-w-8 px-2 rounded-lg text-xs font-semibold ring-1 transition ${
            startsWith.toLowerCase() === L.toLowerCase()
              ? "bg-blue-600 text-white ring-blue-600"
              : "bg-white text-gray-700 ring-gray-200 hover:bg-gray-50"
          }`}
          aria-pressed={startsWith.toLowerCase() === L.toLowerCase()}
          title={`Comienza con ${L}`}
        >
          {L}
        </button>
      ))}
    </div>
  );

  return (
    <main className="bg-gray-50">
      {/* HERO (degradado) */}
      <section
        className="relative"
        style={{
          backgroundImage:
            "radial-gradient(40rem 20rem at 10% -20%, rgba(59,130,246,0.10), transparent), radial-gradient(55rem 30rem at 100% 0%, rgba(99,102,241,0.12), transparent)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Productos
                </span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Explora el catálogo por dataset, busca por nombre y abre el detalle para ver series e información.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2">
              {/* dataset */}
              <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm self-end">
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

              {/* orden + tamaño */}
              <div className="flex items-center gap-2 self-end">
                <button
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => setOrder((o) => (o === "az" ? "za" : "az"))}
                  title={order === "az" ? "Ordenar Z–A" : "Ordenar A–Z"}
                >
                  {order === "az" ? (
                    <>
                      <ArrowUpAZ className="h-4 w-4 text-blue-600" />
                      A–Z
                    </>
                  ) : (
                    <>
                      <ArrowDownZA className="h-4 w-4 text-blue-600" />
                      Z–A
                    </>
                  )}
                </button>

                <select
                  className="rounded-lg bg-white px-2.5 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[12, 20, 24, 48].map((n) => (
                    <option key={n} value={n}>
                      {n} / pág.
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* buscador + estado */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="search"
                autoComplete="off"
                placeholder={`Buscar en ${dataset} (ej: tomate, papa, manzana)`}
                className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  if (v) setStartsWith(""); // si escribe, limpiamos starts_with
                }}
              />
            </div>

            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-gray-700 ring-1 ring-gray-200">
              <Layers className="h-4 w-4 text-blue-600" />
              {loading ? "Cargando…" : totalCount ? `Mostrando ${fromIdx}-${toIdx} de ${totalCount}` : "0 resultados"}
            </span>
          </div>
        </div>

        {/* Fade suave hacia el fondo gris */}
        <div className="h-6 w-full bg-gradient-to-b from-transparent to-gray-50" />
      </section>

      {/* CONTENEDOR LISTADO (borde+sombra) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          {/* paginador superior + barra alfabética */}
          <div className="mb-4 flex flex-col gap-3">
            <Paginator page={page} totalPages={totalPages} setPage={setPage} loading={loading} />
            {AlphabetBar}
          </div>

          {/* estados */}
          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <div className="font-semibold">No se pudo cargar el listado</div>
                  <div className="mt-0.5">Detalle: {err}</div>
                </div>
              </div>
            </div>
          )}

          {!loading && !err && totalCount === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                No encontramos productos para tu búsqueda en <b>{dataset}</b>.
              </p>
            </div>
          )}

          {/* grid responsivo */}
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <div key={`sk-${i}`} className="h-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    <div className="mt-3 flex gap-2">
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
                      <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))
              : data.map((p) => {
                  const title = capitalizeFirst(p.nombre ?? p.name ?? `Producto ${p.id}`);
                  const unidades = Array.isArray(p.unidades) ? p.unidades : [];
                  return (
                    <article
                      key={p.id}
                      className="group flex h-full flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 ring-1 ring-blue-100">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          {/* Nombre clickeable que abre el modal */}
                          <button
                            type="button"
                            onClick={() =>
                              setModalProduct({
                                id: p.id,
                                title,
                                initialUnits: unidades.length ? unidades : undefined,
                              })
                            }
                            className="truncate text-left text-[15px] font-semibold text-gray-900 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded cursor-pointer"
                            title={`Ver detalle de ${title}`}
                          >
                            {title}
                          </button>
                          <p className="mt-0.5 text-[11px] text-gray-500">
                            ID: <span className="tabular-nums">{p.id}</span>
                          </p>
                        </div>
                      </div>

                      {unidades.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {unidades.slice(0, 3).map((u) => (
                            <span
                              key={u}
                              className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200"
                            >
                              {u}
                            </span>
                          ))}
                          {unidades.length > 3 && (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 ring-1 ring-gray-200">
                              +{unidades.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3">
                        {/* Botón que también abre el modal */}
                        <button
                          onClick={() =>
                            setModalProduct({
                              id: p.id,
                              title,
                              initialUnits: unidades.length ? unidades : undefined,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-px"
                        >
                          Ver detalle <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
          </div>

          {/* paginador inferior */}
          <div className="mt-5">
            <Paginator page={page} totalPages={totalPages} setPage={setPage} loading={loading} />
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando productos…
            </div>
          )}
        </div>
      </section>

      {/* Modal (condicional) */}
      {modalProduct && (
        <ProductDetailModal
          product={modalProduct}
          dataset={dataset}
          onClose={() => setModalProduct(null)}
        />
      )}
    </main>
  );
}