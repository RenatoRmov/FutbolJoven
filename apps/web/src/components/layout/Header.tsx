"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  DIRECTOR: "Director Deportivo",
  COORDINATOR: "Coordinador",
  COACH: "Profesor / Entrenador",
  NUTRITIONIST: "Nutricionista",
  PHYSICAL_TRAINER: "Preparador Físico",
  SCOUT: "Scout / Analista",
};

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b-[3px] border-rojo bg-white px-6 shadow-sm">
      <h1 className="font-display text-xl tracking-wide text-carbon">{title}</h1>
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-semibold text-carbon">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gris">{ROLE_LABELS[user.roleKey] ?? user.roleKey}</p>
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => logout()}>
          Salir
        </Button>
      </div>
    </header>
  );
}
