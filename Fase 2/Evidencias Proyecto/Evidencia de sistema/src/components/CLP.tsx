// ✅ Componente ultra simple + helper para formatear CLP

export type CLPOptions = {
  fractionDigits?: number;   // Por defecto 0 para CLP
  compact?: boolean;         // Notación compacta ($12,3 K, $1,2 M)
};

// Helper reutilizable
export function formatCLP(value: number, opts: CLPOptions = {}) {
  const { fractionDigits = 0, compact = false } = opts;
  const n = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    ...(compact ? { notation: "compact", compactDisplay: "short" } : {}),
  }).format(n);
}

// Componente visual (SIEMPRE <span>)
export default function CLP(props: {
  value: number | null | undefined;
  fractionDigits?: number;
  compact?: boolean;
  className?: string;
  title?: string;
}) {
  const { value, fractionDigits, compact, className, title } = props;

  const hasNumber = typeof value === "number" && Number.isFinite(value);
  const formatted = hasNumber ? formatCLP(value, { fractionDigits, compact }) : "—";
  const titleAttr = title ?? (hasNumber ? formatCLP(value, { fractionDigits }) : undefined);

  return (
    <span className={className} title={titleAttr} aria-label={title ?? formatted}>
      {formatted}
    </span>
  );
}