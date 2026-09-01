"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api-client";
import { Category, Team } from "@/lib/types";

export default function FixturesHomePage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

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
      <Header title="Fixture" />
      <div className="space-y-4 p-6">
        <p className="text-sm text-gris">Seleccioná una categoría y equipo para ver o cargar el fixture de la temporada.</p>

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
                  <Link key={team.id} href={`/fixtures/${team.id}`}>
                    <Badge tone="info" className="cursor-pointer px-3 py-1.5 text-sm">
                      {team.name}
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
