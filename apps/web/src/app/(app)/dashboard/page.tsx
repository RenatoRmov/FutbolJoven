"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { CategoryBarChart, CategoryBarPoint } from "@/components/charts/CategoryBarChart";
import { StatusBarChart, StatusBarPoint } from "@/components/charts/StatusBarChart";
import { TrendLineChart, TrendPoint } from "@/components/charts/TrendLineChart";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date";

interface PlayerDelta {
  playerId: string;
  name: string;
  delta: number;
  notaFinal: number;
}

interface GlobalSummary {
  scope: "global";
  kpis: {
    activePlayers: number;
    totalCategories: number;
    totalTeams: number;
    evaluationsLast30Days: number;
    evaluationsTotal: number;
    playersWithoutRecentEvaluation: number;
    playersImproving: number;
    playersDeclining: number;
    avgHeight: number | null;
    avgBmi: number | null;
    aptitud: { apto: number; noApto: number; enReintegro: number };
  };
  notaFinalByCategory: CategoryBarPoint[];
  estatusDistribution: StatusBarPoint[];
  notaFinalTrend: TrendPoint[];
  topImproving: PlayerDelta[];
  topDeclining: PlayerDelta[];
}

interface AssignedSummary {
  scope: "assigned";
  kpis: { myTeams: number; myPlayers: number; playersPendingEvaluation: number };
  teams: { id: string; name: string; category: { name: string } }[];
  playersPending: { id: string; firstName: string; lastName: string; currentTeamId: string }[];
  recentEvaluations: { id: string; date: string; type: string; player: { firstName: string; lastName: string } }[];
  estatusDistribution: StatusBarPoint[];
}

type Summary = GlobalSummary | AssignedSummary;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Summary>("/dashboard/summary")
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
        {loading && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {!loading && summary?.scope === "global" && <GlobalDashboard summary={summary} />}
        {!loading && summary?.scope === "assigned" && <AssignedDashboard summary={summary} />}
      </div>
    </div>
  );
}

function GlobalDashboard({ summary }: { summary: GlobalSummary }) {
  const { kpis, notaFinalByCategory, estatusDistribution, notaFinalTrend, topImproving, topDeclining } = summary;
  const notaFinalPromedio = average(notaFinalByCategory.map((c) => c.avgNotaFinal).filter((v): v is number => v !== null));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Promedio Nota Final" value={notaFinalPromedio === null ? "—" : notaFinalPromedio.toFixed(1)} />
        <KpiCard label="Promedio IMC" value={kpis.avgBmi === null ? "—" : kpis.avgBmi.toFixed(1)} />
        <KpiCard label="Promedio altura" value={kpis.avgHeight === null ? "—" : `${kpis.avgHeight.toFixed(0)} cm`} />
        <KpiCard label="Jugadores activos" value={kpis.activePlayers} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Aptos" value={kpis.aptitud.apto} tone="success" />
        <KpiCard label="En reintegro" value={kpis.aptitud.enReintegro} tone="warning" />
        <KpiCard label="No aptos" value={kpis.aptitud.noApto} tone={kpis.aptitud.noApto > 0 ? "danger" : "neutral"} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Categorías" value={kpis.totalCategories} />
        <KpiCard label="Equipos" value={kpis.totalTeams} />
        <KpiCard label="Evaluaciones (30 días)" value={kpis.evaluationsLast30Days} />
        <KpiCard
          label="Sin evaluación reciente"
          value={kpis.playersWithoutRecentEvaluation}
          tone={kpis.playersWithoutRecentEvaluation > 0 ? "warning" : "success"}
        />
        <KpiCard label="Evaluaciones totales" value={kpis.evaluationsTotal} />
        <KpiCard label="Jugadores en crecimiento" value={kpis.playersImproving} tone="success" />
        <KpiCard label="Jugadores en descenso" value={kpis.playersDeclining} tone={kpis.playersDeclining > 0 ? "danger" : "neutral"} />
      </div>

      {notaFinalByCategory.length > 0 && (
        <div>
          <p className="mb-2 font-display text-base tracking-wide text-rojo-oscuro">Promedio por categoría</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {notaFinalByCategory.map((c) => (
              <div key={c.categoryName} className="shrink-0 rounded-xl border border-borde bg-white px-4 py-2.5 text-center shadow-sm">
                <p className="font-display text-xl leading-none tracking-wide text-rojo">{c.avgNotaFinal === null ? "—" : c.avgNotaFinal.toFixed(1)}</p>
                <p className="mt-1 whitespace-nowrap text-[11px] font-bold text-carbon">{c.categoryName}</p>
                <p className="text-[10px] text-gris">{c.playerCount} jug.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nota Final promedio por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {notaFinalByCategory.some((c) => c.avgNotaFinal !== null) ? (
              <CategoryBarChart data={notaFinalByCategory} />
            ) : (
              <EmptyState title="Todavía no hay evaluaciones suficientes" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Estatus del plantel</CardTitle>
          </CardHeader>
          <CardContent>
            {estatusDistribution.some((s) => s.count > 0) ? (
              <StatusBarChart data={estatusDistribution} />
            ) : (
              <EmptyState title="Todavía no hay evaluaciones suficientes" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de la Nota Final promedio del club</CardTitle>
        </CardHeader>
        <CardContent>
          {notaFinalTrend.length > 0 ? <TrendLineChart data={notaFinalTrend} /> : <EmptyState title="Sin datos suficientes para una tendencia" />}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jugadores con mayor crecimiento</CardTitle>
          </CardHeader>
          <CardContent>
            {topImproving.length === 0 ? (
              <p className="text-sm text-gris">Sin datos suficientes todavía.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topImproving.map((p) => (
                  <li key={p.playerId} className="flex items-center justify-between">
                    <Link href={`/players/${p.playerId}`} className="text-carbon hover:text-rojo">
                      {p.name}
                    </Link>
                    <Badge tone="success">+{p.delta.toFixed(1)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jugadores que requieren seguimiento</CardTitle>
          </CardHeader>
          <CardContent>
            {topDeclining.length === 0 ? (
              <p className="text-sm text-gris">Sin jugadores en descenso significativo.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topDeclining.map((p) => (
                  <li key={p.playerId} className="flex items-center justify-between">
                    <Link href={`/players/${p.playerId}`} className="text-carbon hover:text-rojo">
                      {p.name}
                    </Link>
                    <Badge tone="danger">{p.delta.toFixed(1)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link href="/players" className="text-rojo hover:underline">
            Ver jugadores →
          </Link>
          <Link href="/evaluations" className="text-rojo hover:underline">
            Cargar evaluaciones →
          </Link>
          <Link href="/audit" className="text-rojo hover:underline">
            Revisar auditoría →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function AssignedDashboard({ summary }: { summary: AssignedSummary }) {
  const { kpis, teams, playersPending, recentEvaluations, estatusDistribution } = summary;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Mis equipos" value={kpis.myTeams} />
        <KpiCard label="Mis jugadores" value={kpis.myPlayers} />
        <KpiCard
          label="Pendientes de evaluar"
          value={kpis.playersPendingEvaluation}
          tone={kpis.playersPendingEvaluation > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mis equipos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <Link key={t.id} href={`/evaluations/${t.id}`}>
                <Badge tone="info">{t.name}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Estatus de mis jugadores</CardTitle>
          </CardHeader>
          <CardContent>
            {estatusDistribution.some((s) => s.count > 0) ? (
              <StatusBarChart data={estatusDistribution} />
            ) : (
              <EmptyState title="Todavía no hay evaluaciones suficientes" />
            )}
          </CardContent>
        </Card>
      </div>

      {playersPending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jugadores pendientes de evaluación (últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {playersPending.map((p) => (
              <Link key={p.id} href={`/players/${p.id}`}>
                <Badge tone="warning">
                  {p.firstName} {p.lastName}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Últimas evaluaciones registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvaluations.length === 0 ? (
            <EmptyState title="Todavía no registraste evaluaciones" description="Andá a Evaluaciones para cargar la primera." />
          ) : (
            <ul className="space-y-2 text-sm">
              {recentEvaluations.map((e) => (
                <li key={e.id} className="flex items-center justify-between border-b border-borde pb-2 last:border-0">
                  <span className="text-carbon">
                    {e.player.firstName} {e.player.lastName}
                  </span>
                  <span className="text-xs text-gris">
                    {formatDate(e.date, "es-AR")} · {e.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
