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
    <header className="flex h-16 items-center justify-between border-b border-pitch-700 bg-pitch-900/40 px-6">
      <h1 className="text-lg font-semibold text-slate-50">{title}</h1>
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium text-slate-200">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.roleKey] ?? user.roleKey}</p>
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => logout()}>
          Salir
        </Button>
      </div>
    </header>
  );
}
