import { useParams } from "react-router-dom";

export default function ProductDetail() {
  const { id } = useParams();
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="text-2xl font-semibold">Producto #{id}</h2>
      <p className="mt-2 text-gray-600">Detalle, unidades disponibles y series.</p>
    </section>
  );
}