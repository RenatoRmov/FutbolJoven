"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@futboljoven.demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#101c29,_#050b12)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-accent-500 text-lg font-bold text-pitch-950">
            FJ
          </div>
          <h1 className="text-xl font-semibold text-slate-50">FutbolJoven</h1>
          <p className="mt-1 text-sm text-slate-400">Plataforma de gestión y desarrollo del fútbol formativo</p>
        </div>

        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-5 rounded-lg border border-pitch-700 bg-pitch-900/40 p-3 text-xs text-slate-400">
          <p className="mb-1.5 font-medium text-slate-300">Usuarios demo (contraseña: Demo1234!)</p>
          <ul className="space-y-0.5">
            <li>admin@futboljoven.demo — Super Admin</li>
            <li>director@futboljoven.demo — Director Deportivo</li>
            <li>coach1@futboljoven.demo — Profesor / Entrenador</li>
            <li>nutricion@futboljoven.demo — Nutricionista</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
