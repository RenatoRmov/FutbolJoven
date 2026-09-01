"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api-client";
import { Category, Team } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { PERMISSIONS } from "@futboljoven/shared";

export default function EvaluationsHomePage() {
  const { hasPermission } = useAuth();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const canCreateAll = hasPermission(PERMISSIONS.EVALUATIONS_CREATE_ALL);

  useEffect(() => {
    Promise.all([api.get<Team[]>("/teams"), api.get<Category[]>("/categories")]).then(([t, c]) => {
      setTeams(t);
      setCategories(c);
    });
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, Team[]>();
    for (const t of teams ?? []) {
      const arr = map.get(t.categoryId) ?? [];
      arr.push(t);
      map.set(t.categoryId, arr);
    }
    return map;
  }, [teams]);

  return (
    <div>
      <Header title="Evaluaciones" />
      <div className="space-y-4 p-6">
        <p className="text-sm text-gris">
          {canCreateAll
            ? "Seleccioná una categoría y equipo para cargar evaluaciones."
            : "Estos son los equipos que tenés asignados."}
        </p>

        {!teams && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}

        {teams && teams.length === 0 && <EmptyState title="No tenés equipos asignados todavía" />}

        {categories
          .filter((c) => byCategory.get(c.id)?.length)
          .sort((a, b) => a.order - b.order)
          .map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {byCategory.get(category.id)!.map((team) => (
                  <Link key={team.id} href={`/evaluations/${team.id}`}>
                    <Badge tone="info" className="cursor-pointer px-3 py-1.5 text-sm hover:bg-sky-500/25">
                      {team.name} · {team._count?.players ?? 0} jugadores
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
