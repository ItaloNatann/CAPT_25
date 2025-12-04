import { useState } from "react";
import { login } from "../lib/authApi";

export default function AuthLoginForm({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      // el backend acepta email O username
      await login({ email: emailOrUser, username: emailOrUser, password });
      onLoggedIn?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Error de autenticación");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-3">
      <div>
        <label className="block text-sm">Email o usuario</label>
        <input className="w-full border rounded p-2"
               value={emailOrUser} onChange={e=>setEmailOrUser(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm">Contraseña</label>
        <input className="w-full border rounded p-2" type="password"
               value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button className="bg-black text-white px-4 py-2 rounded" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
