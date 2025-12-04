import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
} from "recharts";

// Datos ficticios
const data = [
  { mes: "Ene", precio: 1220 },
  { mes: "Feb", precio: 1350 },
  { mes: "Mar", precio: 980 },
  { mes: "Abr", precio: 1480 },
  { mes: "May", precio: 1370 },
  { mes: "Jun", precio: 1600 },
  { mes: "Jul", precio: 1550 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    const p = payload[0].value;
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
        <div className="font-semibold text-gray-900">{label}</div>
        <div className="text-blue-600">Precio: {p}</div>
      </div>
    );
  }
  return null;
}

export default function MockPriceChart() {
  return (
    <div className="h-56 w-full sm:h-72 lg:h-80">
      <ResponsiveContainer>
        <RLineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          {/* <defs> es SVG nativo, no se importa */}
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="mes" tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} />
          <YAxis tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="precio" stroke="none" fill="url(#areaFill)" />
          <Line type="monotone" dataKey="precio" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}