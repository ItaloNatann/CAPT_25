import { useMemo, useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/lib/config";
import {
  Search,
  BarChart2,
  Package,
  ShoppingCart,
  TrendingUp,
  Store,
  CheckCircle,
  X,
  Plus,
  Minus,
  RefreshCw,
  AlertCircle,
  Zap,
  Crown,
  Award,
} from "lucide-react";

// ===== Tipado e interfaces =====
export type StoreId = string;
export type Mode = "basket" | "compare" | "single";
export interface Supermarket { 
  id: StoreId; 
  name: string;
}
export interface ProductCatalogItem { 
  id: string; 
  name: string;
  category?: string;
}
export type Pricebook = Record<string, Partial<Record<StoreId, number>>>;

interface ComparadorResponse {
  nombre_original: string;
  etiqueta_producto: string;
  url: string;
  supermercado: string;
  precio_normal: number;
  precio_oferta: number;
  precio_final: number;
  promo: string | null;
  badge: string | null;
}

// ===== Hook REAL =====
function usePrecioCanasta() {
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [pricebook, setPricebook] = useState<Pricebook>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [supermarkets, setSupermarkets] = useState<Supermarket[]>([]);
  const [loadingSupermarkets, setLoadingSupermarkets] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

// Función helper para construir URLs correctas
function apiUrl(path: string): string {
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

  // Cargar supermercados
  useEffect(() => {
    async function loadSupermarkets() {
      try {
        setLoadingSupermarkets(true);
        console.log("🛒 Cargando supermercados...");
        const res = await fetch(apiUrl("v1/z_cadenas/"));
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        const cadenas = data.results || [];
        
        if (!Array.isArray(cadenas)) {
          throw new Error("Formato de datos inválido");
        }
        
        const convertedSupermarkets: Supermarket[] = cadenas.map((cadena: any) => ({
          id: cadena.nombre.toLowerCase().replace(/\s+/g, '_'),
          name: cadena.nombre,
        }));
        
        console.log("✅ Supermercados cargados:", convertedSupermarkets);
        setSupermarkets(convertedSupermarkets);
        
      } catch (error) {
        console.error("❌ Error cargando supermercados:", error);
        setSupermarkets([]);
        setError("Error cargando supermercados");
      } finally {
        setLoadingSupermarkets(false);
      }
    }
    
    loadSupermarkets();
  }, []);

  // Cargar productos
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoadingProducts(true);
        console.log("📦 Cargando productos...");
        const res = await fetch(apiUrl("v1/z_etiqueta/"));
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const productNames: string[] = await res.json();
        
        if (!Array.isArray(productNames)) {
          throw new Error("Formato de productos inválido");
        }

        const convertedProducts: ProductCatalogItem[] = productNames.map((productName, index) => ({
          id: `prod_${index}`,
          name: capitalizeProductName(productName),
          category: productName.split(' ')[0]
        }));

        console.log("✅ Productos cargados:", convertedProducts.length);
        setCatalog(convertedProducts);
        
        const initialPricebook: Pricebook = {};
        convertedProducts.forEach(product => {
          initialPricebook[product.id] = {};
        });
        setPricebook(initialPricebook);
        
        setUpdatedAt(new Date());
        
      } catch (error) {
        console.error("❌ Error cargando productos:", error);
        setCatalog([]);
        setPricebook({});
        setError("Error cargando productos");
      } finally {
        setLoadingProducts(false);
      }
    }

    if (!loadingSupermarkets) {
      loadProducts();
    }
  }, [loadingSupermarkets]);

  // Función para buscar precios de productos - CORREGIDA
  const fetchPrices = useCallback(async (productos: string[], supermercados: string[]): Promise<void> => {
    if (productos.length === 0 || supermercados.length === 0) {
      console.log("⚠️ No hay productos o supermercados para buscar");
      return;
    }

    try {
      setLoading(true);
      console.log("🔍 Buscando precios para:", { productos, supermercados });
      
     const response = await fetch(apiUrl("v1/z_comparador/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productos: productos,
          supermercados: supermercados,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ComparadorResponse[] = await response.json();
      console.log("💰 Precios obtenidos:", data);
      
      setPricebook(prevPricebook => {
        const newPricebook = { ...prevPricebook };
        
        // Primero inicializamos todos los precios en 0 para los productos y supermercados solicitados
        productos.forEach(productName => {
          const product = catalog.find(p => p.name === productName);
          if (product) {
            if (!newPricebook[product.id]) {
              newPricebook[product.id] = {};
            }
            supermercados.forEach(smName => {
              const supermarketId = smName.toLowerCase().replace(/\s+/g, '_');
              // Solo inicializar si no existe ya un precio
              if (newPricebook[product.id][supermarketId] === undefined) {
                newPricebook[product.id][supermarketId] = 0;
              }
            });
          }
        });
        
        // Luego actualizamos con los precios reales de la respuesta
        data.forEach(item => {
          // Buscar el producto en el catálogo - CORREGIDO
          const product = catalog.find(p => 
            p.name === item.etiqueta_producto || 
            p.name === capitalizeProductName(item.etiqueta_producto) ||
            p.name.toLowerCase() === item.etiqueta_producto.toLowerCase()
          );
          
          if (product) {
            const supermarketId = item.supermercado.toLowerCase().replace(/\s+/g, '_');
            if (!newPricebook[product.id]) {
              newPricebook[product.id] = {};
            }
            // Usar precio_final como solicitaste
            newPricebook[product.id][supermarketId] = item.precio_final;
            console.log(`📊 Precio actualizado: ${product.name} en ${supermarketId}: $${item.precio_final}`);
          } else {
            console.warn(`⚠️ Producto no encontrado en catálogo: ${item.etiqueta_producto}`);
            // Debug: mostrar catálogo disponible
            console.log("📋 Catálogo disponible:", catalog.map(p => p.name));
          }
        });
        
        return newPricebook;
      });
      
      setUpdatedAt(new Date());
      setError(null);
      console.log("✅ Precios actualizados correctamente");
      
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("❌ Error fetching prices:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [catalog, supermarkets]);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Refrescando datos...");
      
      const res = await fetch(apiUrl("v1/z_etiqueta/"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const productNames: string[] = await res.json();
      const convertedProducts: ProductCatalogItem[] = productNames.map((productName, index) => ({
        id: `prod_${index}`,
        name: capitalizeProductName(productName),
        category: productName.split(' ')[0]
      }));

      setCatalog(convertedProducts);
      
      setPricebook(prev => {
        const newPricebook: Pricebook = {};
        convertedProducts.forEach(product => {
          newPricebook[product.id] = prev[product.id] || {};
        });
        return newPricebook;
      });
      
      setUpdatedAt(new Date());
      console.log("✅ Datos refrescados correctamente");
      
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("❌ Error refrescando:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return { 
    catalog, 
    pricebook, 
    updatedAt, 
    loading: loading || loadingProducts,
    error, 
    refresh,
    supermarkets,
    loadingSupermarkets,
    fetchPrices
  };
}

// ===== Utilidades =====
function currency(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function capitalizeProductName(name: string): string {
  return name
    .split(' ')
    .map(word => {
      // Mantener números y unidades como 1kg, 500g, etc. en minúsculas
      if (/^\d+[a-zA-Z]*$/.test(word)) {
        return word.toLowerCase();
      }
      // Capitalizar otras palabras
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function trafficColor(total: number, bestVal?: number | null, worstVal?: number | null) {
  if (bestVal == null || worstVal == null) return "gray" as const;
  if (worstVal === bestVal) return "green" as const;
  const ratio = (total - bestVal) / (worstVal - bestVal);
  if (ratio <= 0.2) return "green" as const;
  if (ratio <= 0.6) return "yellow" as const;
  return "red" as const;
}

function colorClasses(scale: ReturnType<typeof trafficColor>) {
  switch (scale) {
    case "green":
      return { 
        chip: "bg-emerald-100 text-emerald-700 border-emerald-200", 
        bar: "bg-emerald-500", 
        ring: "ring-1 ring-emerald-200", 
        soft: "bg-emerald-50", 
        textStrong: "text-emerald-800",
        gradient: "from-emerald-500 to-green-500"
      };
    case "yellow":
      return { 
        chip: "bg-amber-100 text-amber-700 border-amber-200", 
        bar: "bg-amber-500", 
        ring: "ring-1 ring-amber-200", 
        soft: "bg-amber-50", 
        textStrong: "text-amber-800",
        gradient: "from-amber-500 to-yellow-500"
      };
    case "red":
      return { 
        chip: "bg-rose-100 text-rose-700 border-rose-200", 
        bar: "bg-rose-500", 
        ring: "ring-1 ring-rose-200", 
        soft: "bg-rose-50", 
        textStrong: "text-rose-800",
        gradient: "from-rose-500 to-red-500"
      };
    default:
      return { 
        chip: "bg-gray-100 text-gray-700 border-gray-200", 
        bar: "bg-gray-400", 
        ring: "ring-1 ring-gray-200", 
        soft: "bg-gray-50", 
        textStrong: "text-gray-800",
        gradient: "from-gray-500 to-gray-600"
      };
  }
}

// Función auxiliar para calcular min/max de precios por producto
function productMinMax(prices: Pricebook[string], enabledStores: Record<StoreId, boolean>) {
  const validPrices = Object.entries(prices || {})
    .filter(([storeId]) => enabledStores[storeId])
    .map(([storeId, price]) => [storeId, price] as [StoreId, number])
    .filter(([, price]) => price !== undefined && price !== null && price > 0);

  if (validPrices.length === 0) return { min: null, max: null };
  
  const [head, ...rest] = validPrices;
  const min = rest.reduce<[StoreId, number]>((a, c) => (c[1] < a[1] ? c : a), head);
  const max = rest.reduce<[StoreId, number]>((a, c) => (c[1] > a[1] ? c : a), head);
  
  return { min, max };
}

export default function ComparadorCanasta() {
  // —— Capa de datos ——
  const { 
    catalog, 
    pricebook, 
    updatedAt, 
    loading, 
    error, 
    refresh,
    supermarkets,
    loadingSupermarkets,
    fetchPrices
  } = usePrecioCanasta();

  // —— Estados base ——
  const [enabledMarkets, setEnabledMarkets] = useState<Record<StoreId, boolean>>({});
  const [query, setQuery] = useState("");
  const [showDiff, setShowDiff] = useState(true);
  const [sortAsc, setSortAsc] = useState(true);
  const [items, setItems] = useState<{ id: string; name: string; qty: number }[]>([]);

  // —— Estados responsive ——
  const [isMobile, setIsMobile] = useState(false);

  // —— Modos de vista ——
  const [mode, setMode] = useState<Mode>("basket");
  const [multi, setMulti] = useState(true);
  const [singleStore, setSingleStore] = useState<StoreId>("");

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Inicializar enabledMarkets y singleStore cuando tengamos supermercados
  useEffect(() => {
    if (supermarkets.length > 0) {
      const initialEnabled: Record<StoreId, boolean> = {};
      supermarkets.slice(0, 3).forEach(sm => {
        initialEnabled[sm.id] = true;
      });
      setEnabledMarkets(initialEnabled);
      
      if (!singleStore && supermarkets.length > 0) {
        setSingleStore(supermarkets[0].id);
      }
    }
  }, [supermarkets, singleStore]);

  const effectiveEnabled: Record<StoreId, boolean> = useMemo(() => {
    const result = multi ? enabledMarkets : Object.fromEntries(
      supermarkets.map(sm => [sm.id, sm.id === singleStore])
    );
    return result;
  }, [multi, enabledMarkets, singleStore, supermarkets]);

  // Buscar precios cuando cambien los items o los supermercados habilitados
  useEffect(() => {
    if (items.length > 0 && supermarkets.length > 0) {
      const productos = items.map(item => item.name);
      const supermercadosActivos = supermarkets
        .filter(sm => effectiveEnabled[sm.id])
        .map(sm => sm.name);
      
      if (productos.length > 0 && supermercadosActivos.length > 0) {
        console.log("🔄 Actualizando precios...", { productos, supermercadosActivos });
        const timer = setTimeout(() => {
          fetchPrices(productos, supermercadosActivos);
        }, 800);
        
        return () => clearTimeout(timer);
      }
    }
  }, [items, effectiveEnabled, supermarkets, fetchPrices]);

  const [activeIdx, setActiveIdx] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  const canAddMore = items.length < 10;

  const results = useMemo(() => {
    const base = catalog.filter((p) => !items.some((it) => it.id === p.id));
    if (!query.trim()) return base.slice(0, isMobile ? 4 : 8);
    const q = query.toLowerCase();
    return base.filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q)).slice(0, isMobile ? 4 : 8);
  }, [query, items, catalog, isMobile]);

  const totals: Record<StoreId, number> = useMemo(() => {
    const base: Record<StoreId, number> = {};
    supermarkets.forEach(sm => {
      base[sm.id] = 0;
    });
    
    items.forEach((it) => {
      const prices = pricebook[it.id] || {};
      supermarkets.forEach((sm) => {
        const p = prices[sm.id] ?? 0;
        base[sm.id] += p * it.qty;
      });
    });
    
    return base;
  }, [items, pricebook, supermarkets]);

  const visibleMarkets: Supermarket[] = supermarkets.filter((m) => effectiveEnabled[m.id]);
  const activeTotals = (Object.entries(totals) as [StoreId, number][]).filter(([m]) => effectiveEnabled[m]);
  const best: [StoreId, number] | null = activeTotals.length ? activeTotals.reduce((acc, cur) => (cur[1] < acc[1] ? cur : acc)) : null;
  const worst: [StoreId, number] | null = activeTotals.length ? activeTotals.reduce((acc, cur) => (cur[1] > acc[1] ? cur : acc)) : null;
  const saving = worst && best ? worst[1] - best[1] : 0;

  const sortedMarkets: Supermarket[] = useMemo(() => {
    const list = supermarkets.filter((m) => effectiveEnabled[m.id]).slice();
    return list.sort((a, b) => (sortAsc ? totals[a.id] - totals[b.id] : totals[b.id] - totals[a.id]));
  }, [effectiveEnabled, totals, sortAsc, supermarkets]);

  function addProduct(prod: { id: string; name: string }) {
    if (!canAddMore) return;
    console.log("➕ Agregando producto:", prod.name);
    setItems((prev) => [...prev, { id: prod.id, name: prod.name, qty: 1 }]);
    setQuery("");
    setActiveIdx(-1);
    setRecent((r) => [prod.id, ...r.filter((x) => x !== prod.id)].slice(0, 6));
    if (isMobile) {
      setIsFocused(false);
    }
  }

  function removeProduct(id: string) {
    console.log("➖ Removiendo producto:", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function setQty(id: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(999, qty || 1)) } : i)));
  }

  function clearAll() {
    console.log("🗑️ Limpiando canasta");
    setItems([]);
    setQuery("");
    setActiveIdx(-1);
  }

  // Función auxiliar para calcular min/max de precios
  const calculatePriceRange = useCallback((prices: Pricebook[string], enabledStores: Record<StoreId, boolean>): string => {
    const validPrices = Object.entries(prices || {})
      .filter(([storeId]) => enabledStores[storeId])
      .map(([, price]) => price)
      .filter((price): price is number => price !== undefined && price !== null && price > 0);

    if (validPrices.length === 0) return "Cargando...";
    
    let minPrice = validPrices[0];
    let maxPrice = validPrices[0];
    
    for (let i = 1; i < validPrices.length; i++) {
      if (validPrices[i] < minPrice) minPrice = validPrices[i];
      if (validPrices[i] > maxPrice) maxPrice = validPrices[i];
    }
    
    return minPrice === maxPrice 
      ? currency(minPrice) 
      : `${currency(minPrice)} - ${currency(maxPrice)}`;
  }, []);

  const Tabs = () => {
    const tabs: { k: Mode; label: string; icon: any }[] = [
      { k: "basket", label: "Mi Canasta", icon: ShoppingCart },
      { k: "compare", label: "Comparar", icon: BarChart2 },
      { k: "single", label: "Un Super", icon: Store },
    ];
    
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Tabs principales */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.k}
                onClick={() => setMode(t.k)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all flex-1 sm:flex-none min-w-0 ${
                  mode === t.k 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/25" 
                    : "bg-white/80 text-gray-800 border-gray-200 hover:bg-white hover:shadow-md"
                }`}
              >
                <t.icon size={16} className="flex-shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Controles de comparación */}
          <div className="flex items-center gap-2 text-sm sm:ml-auto">
            <span className="text-gray-600 hidden sm:block text-nowrap">Comparar:</span>
            <div className="flex items-center gap-2 bg-white/80 rounded-xl border border-gray-200 p-1">
              <button
                onClick={() => {
                  const next = !multi;
                  setMulti(next);
                  if (!next) setMode("single");
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  multi 
                    ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-green-500/25" 
                    : "bg-transparent text-gray-700"
                }`}
              >
                <TrendingUp size={12} />
                <span>{multi ? "Múltiples" : "Solo 1"}</span>
              </button>
              
              {!multi && supermarkets.length > 0 && (
                <select 
                  className="rounded-lg border-0 bg-transparent text-xs focus:ring-0 py-1"
                  value={singleStore} 
                  onChange={(e) => setSingleStore(e.target.value as StoreId)}
                >
                  {supermarkets.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const BasketCard = ({ m, idx }: { m: Supermarket; idx: number }) => {
    const total = totals[m.id] || 0;
    const scale = trafficColor(total, best?.[1] ?? null, worst?.[1] ?? null);
    const c = colorClasses(scale);
    const isBest = !!best && m.id === best[0];
    const isWorst = !!worst && m.id === worst[0];
    
    return (
      <div className={`rounded-2xl border border-gray-200 p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:shadow-lg ${c.ring}`}>
        {isBest && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 opacity-60" />
        )}
        
        <div className="relative">
          <span className={`absolute right-0 top-0 text-[10px] px-2 py-1 rounded-full border font-semibold ${c.chip}`}>
            {isBest ? (
              <span className="flex items-center gap-1">
                <Crown size={10} />
                <span className="hidden xs:inline">Mejor</span>
              </span>
            ) : isWorst ? (
              <span className="flex items-center gap-1">
                <AlertCircle size={10} />
                <span className="hidden xs:inline">Más caro</span>
              </span>
            ) : (
              `#${idx + 1}`
            )}
          </span>
          
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r ${c.gradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
              {m.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">{m.name}</div>
              <div className={`text-xl sm:text-2xl font-bold ${c.textStrong}`}>{currency(total)}</div>
            </div>
          </div>
          
          {/* Lista de productos con precios - Más compacta */}
          <div className="space-y-2">
            {items.map((item) => {
              const unitPrice = pricebook[item.id]?.[m.id] ?? 0;
              const totalPrice = unitPrice * item.qty;
              const hasPrice = unitPrice > 0;
              
              return (
                <div key={`${m.id}-${item.id}`} className="flex justify-between items-center text-xs p-2 rounded-lg bg-white/50 backdrop-blur">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-medium text-gray-900 truncate text-xs">{item.name}</div>
                    <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                      <Package size={10} className="flex-shrink-0" />
                      <span className="text-[10px]">{item.qty} un</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-semibold ${hasPrice ? "text-gray-900" : "text-gray-400"} text-xs`}>
                      {hasPrice ? currency(totalPrice) : "—"}
                    </div>
                    {hasPrice && unitPrice > 0 && (
                      <div className="text-gray-500 text-[9px]">
                        {currency(unitPrice)} c/u
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de progreso */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${c.bar}`} 
                style={{ 
                  width: `${worst && worst[1] > 0 ? Math.max(8, Math.round((total / worst[1]) * 100)) : 8}%` 
                }} 
              />
            </div>
            {showDiff && best && total !== best[1] && (
              <div className="text-xs text-gray-500 whitespace-nowrap hidden sm:block">
                +{currency(total - best[1])}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Vista de Comparar (Tabla)
  const CompareView = () => (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Comparación Detallada</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            <RefreshCw size={12} />
            Actualizar
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Cantidad</th>
              {visibleMarkets.map((m) => (
                <th key={m.id} className="px-4 py-3 text-right font-medium text-gray-600">{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((it, idx) => {
                const { min, max } = productMinMax(pricebook[it.id], effectiveEnabled);
                return (
                  <tr key={it.id} className={idx % 2 ? "bg-white" : "bg-gray-50/40"}>
                    <td className="px-4 py-3 text-gray-800 font-medium">{it.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{it.qty}</td>
                    {visibleMarkets.map((m) => {
                      const unitPrice = pricebook[it.id]?.[m.id] ?? 0;
                      const totalPrice = unitPrice * it.qty;
                      const hasPrice = unitPrice > 0;
                      const isMin = !!min && m.id === min[0];
                      const isMax = !!max && m.id === max[0];
                      
                      return (
                        <td key={m.id} className="px-4 py-3 text-right">
                          <div className={`tabular-nums font-medium ${
                            isMin ? "text-emerald-700" : 
                            isMax ? "text-rose-700" : 
                            "text-gray-800"
                          }`}>
                            {hasPrice ? currency(totalPrice) : "—"}
                          </div>
                          {hasPrice && (
                            <div className={`text-xs mt-1 ${
                              isMin ? "text-emerald-600" : 
                              isMax ? "text-rose-600" : 
                              "text-gray-500"
                            }`}>
                              {currency(unitPrice)} c/u
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-gray-500" colSpan={visibleMarkets.length + 2}>
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div>Agrega productos a tu canasta para ver la comparación detallada</div>
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td className="px-4 py-3 font-semibold">Total</td>
                <td className="px-4 py-3"></td>
                {visibleMarkets.map((m) => (
                  <td key={m.id} className="px-4 py-3 text-right font-semibold text-gray-900">
                    {currency(totals[m.id])}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  // Vista de Un Super (Detalle individual)
  const SingleStoreView = () => {
    const currentStore = supermarkets.find(s => s.id === singleStore);
    
    return (
      <div className="space-y-6">
        {/* Card del supermercado seleccionado */}
        {currentStore && (
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl">
                {currentStore.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{currentStore.name}</h3>
                <p className="text-sm text-gray-600">Detalle completo de tu canasta</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-900">{currency(totals[singleStore] || 0)}</div>
                <div className="text-xs text-emerald-700 font-medium mt-1">Total Canasta</div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{items.length}</div>
                <div className="text-xs text-blue-700 font-medium mt-1">Productos</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de detalle */}
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Productos</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Cantidad</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Precio Unitario</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((it, idx) => {
                    const unitPrice = pricebook[it.id]?.[singleStore] ?? 0;
                    const subtotal = unitPrice * it.qty;
                    const hasPrice = unitPrice > 0;
                    
                    return (
                      <tr key={it.id} className={idx % 2 ? "bg-white" : "bg-gray-50/40"}>
                        <td className="px-4 py-3 text-gray-800 font-medium">{it.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{it.qty}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {hasPrice ? currency(unitPrice) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                          {hasPrice ? currency(subtotal) : "—"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={4}>
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <div>Agrega productos a tu canasta para ver el detalle</div>
                    </td>
                  </tr>
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td className="px-4 py-3 font-semibold" colSpan={3}>Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {currency(totals[singleStore])}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="bg-gradient-to-br from-gray-50 to-blue-50/30 min-h-screen">
      {/* Hero Section con gradiente igual que Home */}
      <section
        className="relative bg-white"
        style={{
          backgroundImage:
            "radial-gradient(40rem 20rem at 20% -20%, rgba(59,130,246,0.18), transparent), radial-gradient(50rem 30rem at 100% 0%, rgba(99,102,241,0.20), transparent)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-6">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Comparador de Canasta Familiar
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-2xl mx-auto">
              Arma tu canasta y compara precios entre supermercados en tiempo real
            </p>
          </div>
        </div>
      </section>

      <Tabs />

      {/* Main Content */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo - Productos y Canasta */}
          <div className="lg:col-span-2 space-y-6">
            {/* Buscador */}
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <label className="block text-sm font-semibold text-gray-900">
                  Busca productos para tu canasta
                </label>
                <div className="flex items-center gap-2 text-xs">
                  {loading && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Actualizando...</span>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-1 text-rose-600">
                      <AlertCircle size={12} />
                      <span>Error</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 120)}
                  onKeyDown={(e) => {
                    if (!results.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % results.length); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + results.length) % results.length); }
                    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); addProduct(results[activeIdx]); }
                    if (e.key === "Escape") { setIsFocused(false); }
                  }}
                  placeholder="Buscar productos (arroz, leche, pan)..."
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                
                {(isFocused && (results.length > 0 || !query)) && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-lg backdrop-blur overflow-hidden max-h-48 sm:max-h-72 overflow-y-auto">
                    {query ? (
                      results.map((p, idx) => (
                        <button 
                          key={p.id} 
                          onClick={() => addProduct(p)} 
                          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                            idx === activeIdx ? "bg-blue-50" : "hover:bg-gray-50"
                          }`}
                          disabled={!canAddMore}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate text-sm">{p.name}</div>
                            {p.category && (
                              <div className="text-xs text-gray-500 mt-0.5 truncate">{p.category}</div>
                            )}
                          </div>
                          <span className="text-xs text-blue-600 font-medium flex-shrink-0 ml-2">Agregar</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3">
                        <div className="px-2 py-1 text-xs text-gray-500 mb-2">Sugerencias rápidas</div>
                        <div className="flex flex-wrap gap-2">
                          {recent.map((id) => catalog.find((x) => x.id === id)).filter(Boolean).map((p) => (
                            <button 
                              key={(p as ProductCatalogItem).id} 
                              onClick={() => addProduct(p as ProductCatalogItem)} 
                              className="px-3 py-2 text-xs rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors truncate"
                            >
                              {(p as ProductCatalogItem).name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {query && results.length === 0 && (
                      <div className="px-4 py-4 text-sm text-gray-500 text-center">
                        No se encontraron productos para "{query}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Productos en canasta */}
              {items.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <span className="text-sm font-semibold text-gray-900">Tu canasta</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowDiff((s) => !s)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        {showDiff ? "Ocultar" : "Mostrar"} diferencias
                      </button>
                      <button 
                        onClick={clearAll}
                        className="px-3 py-1.5 text-xs rounded-lg border border-rose-200 text-rose-600 bg-white hover:bg-rose-50"
                      >
                        Limpiar todo
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-medium text-gray-900 text-sm truncate">{it.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Precio: {calculatePriceRange(pricebook[it.id] || {}, effectiveEnabled)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                            <button 
                              className="w-8 h-8 grid place-items-center rounded-md hover:bg-gray-200 transition-colors"
                              onClick={() => setQty(it.id, it.qty - 1)}
                            >
                              <Minus size={14} />
                            </button>
                            <input 
                              className="w-12 text-center bg-transparent text-sm font-medium"
                              type="number" 
                              min={1} 
                              value={it.qty} 
                              onChange={(e) => setQty(it.id, parseInt(e.target.value || "1", 10))}
                            />
                            <button 
                              className="w-8 h-8 grid place-items-center rounded-md hover:bg-gray-200 transition-colors"
                              onClick={() => setQty(it.id, it.qty + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeProduct(it.id)}
                            className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vistas según el modo seleccionado */}
            {mode === "basket" && supermarkets.length > 0 && items.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Comparación de precios</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSortAsc((s) => !s)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      Ordenar {sortAsc ? "↓ Más barato" : "↑ Más caro"}
                    </button>
                    <button 
                      onClick={refresh}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <RefreshCw size={12} />
                      Actualizar
                    </button>
                  </div>
                </div>
                
                {/* Grid mejorado para desktop - más compacto */}
                <div className={`grid gap-4 ${sortedMarkets.length <= 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                  {sortedMarkets.map((m, idx) => (
                    <BasketCard key={m.id} m={m} idx={idx} />
                  ))}
                </div>
              </div>
            )}

            {mode === "compare" && <CompareView />}
            {mode === "single" && <SingleStoreView />}
          </div>

          {/* Panel derecho - Supermercados y Resumen */}
          <div className="space-y-6">
            {/* Selector de supermercados */}
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Supermercados</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <Store className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900">Modo de comparación</div>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => { const next = !multi; setMulti(next); if (!next) setMode("single"); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          multi 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" 
                            : "bg-white text-gray-700 border border-gray-300"
                        }`}
                      >
                        {multi ? "Múltiples" : "Solo 1"}
                      </button>
                      {!multi && supermarkets.length > 0 && (
                        <select 
                          className="rounded-lg border-gray-300 text-xs bg-white"
                          value={singleStore} 
                          onChange={(e) => setSingleStore(e.target.value as StoreId)}
                        >
                          {supermarkets.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {loadingSupermarkets ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Cargando supermercados...
                  </div>
                ) : supermarkets.length === 0 ? (
                  <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded-xl">
                    No se pudieron cargar los supermercados
                  </div>
                ) : multi ? (
                  <div className="grid grid-cols-2 gap-2">
                    {supermarkets.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setEnabledMarkets((s) => ({ ...s, [m.id]: !s[m.id] }))}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                          effectiveEnabled[m.id] 
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/25" 
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                    Comparando solo: <strong>{supermarkets.find((s) => s.id === singleStore)?.name}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen de ahorros */}
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Resumen de ahorros</h3>
              
              {activeTotals.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <Award className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                      <div className="text-xs text-emerald-700 font-medium">Mejor precio</div>
                      <div className="text-lg font-bold text-emerald-900 mt-1">
                        {best ? currency(best[1]) : "—"}
                      </div>
                      <div className="text-xs text-emerald-600 mt-1 truncate">
                        {best ? supermarkets.find((s) => s.id === best[0])?.name : "—"}
                      </div>
                    </div>
                    
                    <div className="text-center p-4 rounded-xl bg-rose-50 border border-rose-200">
                      <Zap className="h-6 w-6 text-rose-600 mx-auto mb-2" />
                      <div className="text-xs text-rose-700 font-medium">Ahorro</div>
                      <div className="text-lg font-bold text-rose-900 mt-1">
                        {currency(saving)}
                      </div>
                      <div className="text-xs text-rose-600 mt-1">
                        {worst && best && worst[1] > 0 ? Math.round((saving / worst[1]) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-xs text-blue-700 font-medium mb-1">Recomendación</div>
                    <div className="text-sm font-semibold text-blue-900">
                      {best && `Compra en ${supermarkets.find((s) => s.id === best[0])?.name} y ahorra ${currency(saving)}`}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-sm text-gray-500">
                    {items.length === 0 
                      ? "Agrega productos a tu canasta para ver comparaciones" 
                      : "Activa al menos un supermercado para comparar"
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}