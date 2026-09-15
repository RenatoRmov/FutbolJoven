"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api-client";
import { Category, Team } from "@/lib/types";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function FixturesHomePage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [exportCategoryIds, setExportCategoryIds] = useState<string[]>([]);
  const [exportCond, setExportCond] = useState<"ALL" | "HOME" | "AWAY">("ALL");

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

  function toggleExportCategory(id: string) {
    setExportCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function buildExportParams() {
    const params = new URLSearchParams({ startDate, endDate });
    if (exportCategoryIds.length > 0) params.set("categoryIds", exportCategoryIds.join(","));
    if (exportCond !== "ALL") params.set("isHome", exportCond === "HOME" ? "true" : "false");
    return params;
  }

  function handleExportFixturesExcel() {
    api.download(`/export/fixtures?${buildExportParams().toString()}`, `fixture-${startDate}_a_${endDate}.xlsx`);
  }

  function handleExportFixturesPdf() {
    api.download(`/reports/fixtures/pdf?${buildExportParams().toString()}`, `fixture-${startDate}_a_${endDate}.pdf`);
  }

  return (
    <div>
      <Header title="Fixture" />
      <div className="space-y-4 p-6">
        <p className="text-sm text-gris">Seleccioná una categoría y equipo para ver o cargar el fixture de la temporada.</p>

        <Card>
          <CardHeader>
            <CardTitle>Exportar fixture por rango de fechas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Fecha inicio</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Fecha término</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <Label>Condición</Label>
                <Select value={exportCond} onChange={(e) => setExportCond(e.target.value as "ALL" | "HOME" | "AWAY")} className="w-32">
                  <option value="ALL">Todas</option>
                  <option value="HOME">Local</option>
                  <option value="AWAY">Visita</option>
                </Select>
              </div>
              <Button variant="secondary" onClick={handleExportFixturesExcel}>
                Exportar Excel
              </Button>
              <Button variant="secondary" onClick={handleExportFixturesPdf}>
                Exportar PDF
              </Button>
            </div>
            <div>
              <Label>Categorías (ninguna seleccionada = todas)</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = exportCategoryIds.includes(c.id);
                  return (
                    <button type="button" key={c.id} onClick={() => toggleExportCategory(c.id)}>
                      <Badge tone={active ? "success" : "neutral"} className="cursor-pointer">
                        {c.name}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

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
              <CardHeader className="flex items-center justify-between">
                <CardTitle>{category.name}</CardTitle>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const team = byCategory.get(category.id)![0];
                    api.download(`/reports/teams/${team.id}/minutes-pdf`, `minutos-jugados-${category.name}.pdf`);
                  }}
                >
                  Exportar minutos jugados
                </Button>
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
