"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#EDE7E4] to-[#E4DCD8] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Image src="/escudo-club.png" alt="Club Deportes Limache" width={64} height={64} className="mx-auto mb-3 shadow-club" />
          <h1 className="font-display text-2xl tracking-wide text-rojo">Deportes Limache</h1>
          <p className="mt-1 text-sm text-gris">Plataforma de gestión y desarrollo del fútbol formativo</p>
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
              {error && <p className="text-xs font-medium text-rojo-oscuro">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-5 rounded-lg border border-borde bg-white p-3 text-xs text-gris">
          <p className="mb-1.5 font-medium text-gris">Usuarios demo (contraseña: Demo1234!)</p>
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
