"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PERMISSIONS } from "@futboljoven/shared";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { PlayerRadarChart, RadarPoint } from "@/components/charts/PlayerRadarChart";
import { EvolutionLineChart, EvolutionSeries } from "@/components/charts/EvolutionLineChart";
import { NutritionTab } from "@/components/player/NutritionTab";
import { PhysicalHealthTab } from "@/components/player/PhysicalHealthTab";
import { DocumentsTab } from "@/components/player/DocumentsTab";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { calculateAge, ESTATUS_LABELS, ESTATUS_TONE, GENDER_LABELS, Player, POSITION_LABELS, STATUS_LABELS, STATUS_TONE } from "@/lib/types";

interface EvolutionResponse {
  series: { dimensionKey: string; dimensionName: string; points: { date: string; value: number }[] }[];
  radar: { dimensionKey: string; dimensionName: string; value: number | null }[];
  previousRadar: { dimensionKey: string; dimensionName: string; value: number | null }[];
  teamAverageRadar: { dimensionKey: string; dimensionName: string; value: number | null }[];
  notaFinal: number | null;
  estatus: string | null;
}

interface EvaluationListItem {
  id: string;
  date: string;
  type: string;
  context: string | null;
  observation: string | null;
  evaluator: { firstName: string; lastName: string };
  scores: { value: number; dimension: { name: string } }[];
}

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [evolution, setEvolution] = useState<EvolutionResponse | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationListItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    Promise.all([
      api.get<Player>(`/players/${params.id}`),
      api.get<EvolutionResponse>(`/evaluations/player/${params.id}/evolution`),
      api.get<EvaluationListItem[]>(`/evaluations/player/${params.id}`),
    ])
      .then(([p, e, ev]) => {
        setPlayer(p);
        setEvolution(e);
        setEvaluations(ev);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div>
        <Header title="Jugador" />
        <div className="space-y-4 p-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div>
        <Header title="Jugador" />
        <div className="p-6">
          <EmptyState title="Jugador no encontrado" />
        </div>
      </div>
    );
  }

  const radarData: RadarPoint[] =
    evolution?.radar.map((r, i) => ({
      dimensionName: r.dimensionName,
      current: r.value,
      previous: evolution.previousRadar[i]?.value ?? null,
      teamAverage: evolution.teamAverageRadar[i]?.value ?? null,
    })) ?? [];

  const evolutionSeries: EvolutionSeries[] =
    evolution?.series.map((s) => ({
      dimensionName: s.dimensionName,
      points: s.points.map((p) => ({ date: p.date, value: p.value })),
    })) ?? [];

  const latestByDimension = new Map(evolution?.radar.map((r) => [r.dimensionName, r.value]) ?? []);
  const strengths = [...latestByDimension.entries()].filter(([, v]) => (v ?? 0) >= 7).map(([k]) => k);
  const growthAreas = [...latestByDimension.entries()].filter(([, v]) => v !== null && v < 6).map(([k]) => k);

  return (
    <div>
      <Header title={`${player.firstName} ${player.lastName}`} />
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6 py-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pitch-700 text-2xl font-semibold text-slate-300">
              {player.firstName[0]}
              {player.lastName[0]}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-50">
                  {player.firstName} {player.lastName}
                </h2>
                <Badge tone={STATUS_TONE[player.status] ?? "neutral"}>{STATUS_LABELS[player.status] ?? player.status}</Badge>
                {evolution?.estatus && (
                  <Badge tone={ESTATUS_TONE[evolution.estatus as keyof typeof ESTATUS_TONE] ?? "neutral"}>
                    {ESTATUS_LABELS[evolution.estatus] ?? evolution.estatus}
                    {evolution.notaFinal !== null && ` · Nota Final ${evolution.notaFinal}`}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400">
                {player.currentTeam?.category?.name ?? "Sin categoría"} · {player.primaryPosition ? POSITION_LABELS[player.primaryPosition] : "Sin posición"} ·{" "}
                {calculateAge(player.birthDate)} años · Dorsal {player.jerseyNumber ?? "—"}
                {player.gender && ` · ${GENDER_LABELS[player.gender] ?? player.gender}`}
              </p>
              <p className="text-xs text-slate-500">
                En el club desde {new Date(player.joinDate).toLocaleDateString("es-AR")} · {player.city ?? ""} {player.nationality ? `(${player.nationality})` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="resumen">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
            <TabsTrigger value="evolucion">Evolución</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            {hasPermission(PERMISSIONS.NUTRITION_VIEW) && <TabsTrigger value="nutricion">Nutrición</TabsTrigger>}
            {hasPermission(PERMISSIONS.PHYSICAL_VIEW) && <TabsTrigger value="fisico">Físico y Salud</TabsTrigger>}
            {hasPermission(PERMISSIONS.PLAYERS_DOCUMENTS_VIEW, PERMISSIONS.PLAYERS_DOCUMENTS_MANAGE) && (
              <TabsTrigger value="documentacion">Documentación</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="resumen" className="pt-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Radar de habilidades</CardTitle>
                </CardHeader>
                <CardContent>
                  {radarData.length > 0 ? <PlayerRadarChart data={radarData} /> : <EmptyState title="Sin evaluaciones todavía" />}
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Fortalezas actuales</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {strengths.length === 0 ? (
                      <p className="text-sm text-slate-500">Aún no hay suficientes datos.</p>
                    ) : (
                      strengths.map((s) => (
                        <Badge key={s} tone="success">
                          {s}
                        </Badge>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Áreas a desarrollar</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {growthAreas.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin áreas críticas detectadas.</p>
                    ) : (
                      growthAreas.map((s) => (
                        <Badge key={s} tone="warning">
                          {s}
                        </Badge>
                      ))
                    )}
                  </CardContent>
                </Card>
                {player.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-300">{player.notes}</CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="evaluaciones" className="pt-5">
            <Card>
              <CardContent className="divide-y divide-pitch-700 py-0">
                {!evaluations || evaluations.length === 0 ? (
                  <EmptyState title="Sin evaluaciones registradas" />
                ) : (
                  evaluations.map((ev) => (
                    <div key={ev.id} className="py-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-200">
                          {new Date(ev.date).toLocaleDateString("es-AR")} · {ev.context ?? ev.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {ev.evaluator.firstName} {ev.evaluator.lastName}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ev.scores.map((s, i) => (
                          <Badge key={i} tone="neutral">
                            {s.dimension.name}: {s.value}
                          </Badge>
                        ))}
                      </div>
                      {ev.observation && <p className="mt-2 text-sm text-slate-400">{ev.observation}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evolucion" className="pt-5">
            <Card>
              <CardHeader>
                <CardTitle>Evolución por dimensión</CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionSeries.some((s) => s.points.length > 0) ? (
                  <EvolutionLineChart series={evolutionSeries} />
                ) : (
                  <EmptyState title="Todavía no hay historial suficiente" description="Se necesitan al menos dos evaluaciones." />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial" className="pt-5">
            <Card>
              <CardContent className="py-4">
                {!player.teamHistory || player.teamHistory.length === 0 ? (
                  <EmptyState title="Sin historial de categorías" />
                ) : (
                  <ol className="relative border-l border-pitch-700 pl-5">
                    {[...player.teamHistory]
                      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .map((h) => (
                        <li key={h.id} className="mb-6 last:mb-0">
                          <div className="absolute -ml-[25px] mt-1 h-3 w-3 rounded-full bg-accent-500" />
                          <p className="text-sm font-medium text-slate-100">{h.team.name}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(h.startDate).toLocaleDateString("es-AR")} —{" "}
                            {h.endDate ? new Date(h.endDate).toLocaleDateString("es-AR") : "actualidad"}
                          </p>
                        </li>
                      ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {hasPermission(PERMISSIONS.NUTRITION_VIEW) && (
            <TabsContent value="nutricion" className="pt-5">
              <NutritionTab playerId={player.id} />
            </TabsContent>
          )}

          {hasPermission(PERMISSIONS.PHYSICAL_VIEW) && (
            <TabsContent value="fisico" className="pt-5">
              <PhysicalHealthTab playerId={player.id} />
            </TabsContent>
          )}

          {hasPermission(PERMISSIONS.PLAYERS_DOCUMENTS_VIEW, PERMISSIONS.PLAYERS_DOCUMENTS_MANAGE) && (
            <TabsContent value="documentacion" className="pt-5">
              <DocumentsTab playerId={player.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
