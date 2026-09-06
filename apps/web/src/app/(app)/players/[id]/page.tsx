"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { MatchAppearancesTab } from "@/components/player/MatchAppearancesTab";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/date";
import { calculateAge, ESTATUS_LABELS, ESTATUS_TONE, GENDER_LABELS, Player, POSITION_LABELS, STATUS_LABELS, STATUS_TONE } from "@/lib/types";

interface EvolutionBucket {
  series: { dimensionKey: string; dimensionName: string; points: { date: string; value: number }[] }[];
  radar: { dimensionKey: string; dimensionName: string; value: number | null }[];
  previousRadar: { dimensionKey: string; dimensionName: string; value: number | null }[];
  teamAverageRadar: { dimensionKey: string; dimensionName: string; value: number | null }[];
  notaFinal: number | null;
  estatus: string | null;
}

interface EvolutionResponse {
  match: EvolutionBucket;
  training: EvolutionBucket;
}

interface PhysicalRecordSummary {
  id: string;
  date: string;
  metrics: Record<string, string | number>;
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

function computeImc(weight: number, height: number): number | null {
  if (!weight || !height) return null;
  const h = height / 100;
  return weight / (h * h);
}

function classifyImc(imc: number | null): string {
  if (imc === null) return "";
  if (imc < 18.5) return "Riesgo de desnutrición";
  if (imc < 25) return "Normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidad";
}

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [evolution, setEvolution] = useState<EvolutionResponse | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationListItem[] | null>(null);
  const [latestAnthro, setLatestAnthro] = useState<PhysicalRecordSummary | null>(null);
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

  useEffect(() => {
    if (!params.id || !hasPermission(PERMISSIONS.PHYSICAL_VIEW)) return;
    api
      .get<PhysicalRecordSummary[]>(`/physical/player/${params.id}?recordType=ANTHROPOMETRIC`)
      .then((records) => setLatestAnthro(records[0] ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function toRadarData(bucket: EvolutionBucket | undefined): RadarPoint[] {
    return (
      bucket?.radar.map((r, i) => ({
        dimensionName: r.dimensionName,
        current: r.value,
        previous: bucket.previousRadar[i]?.value ?? null,
        teamAverage: bucket.teamAverageRadar[i]?.value ?? null,
      })) ?? []
    );
  }

  function toEvolutionSeries(bucket: EvolutionBucket | undefined): EvolutionSeries[] {
    return (
      bucket?.series.map((s) => ({
        dimensionName: s.dimensionName,
        points: s.points.map((p) => ({ date: p.date, value: p.value })),
      })) ?? []
    );
  }

  const radarDataMatch = toRadarData(evolution?.match);
  const radarDataTraining = toRadarData(evolution?.training);
  const evolutionSeriesMatch = toEvolutionSeries(evolution?.match);
  const evolutionSeriesTraining = toEvolutionSeries(evolution?.training);

  // Fortalezas/Áreas a desarrollar se basan en el radar de Partido (el que también define el Estatus deportivo).
  const latestByDimension = new Map(evolution?.match.radar.map((r) => [r.dimensionName, r.value]) ?? []);
  const strengths = [...latestByDimension.entries()].filter(([, v]) => (v ?? 0) >= 7).map(([k]) => k);
  const growthAreas = [...latestByDimension.entries()].filter(([, v]) => v !== null && v < 6).map(([k]) => k);

  return (
    <div>
      <Header title={`${player.firstName} ${player.lastName}`} />
      <div className="space-y-6 p-6">
        <div className="flex justify-end gap-2">
          <Link href={`/player-profile?playerId=${player.id}`}>
            <Button variant="secondary" size="sm">
              Editar ficha completa
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => api.download(`/reports/players/${player.id}/pdf`, `${player.firstName}-${player.lastName}.pdf`)}
          >
            Exportar PDF
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6 py-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gris-claro text-2xl font-semibold text-gris">
              {player.firstName[0]}
              {player.lastName[0]}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-carbon">
                  {player.firstName} {player.lastName}
                </h2>
                <Badge tone={STATUS_TONE[player.status] ?? "neutral"}>{STATUS_LABELS[player.status] ?? player.status}</Badge>
                {evolution?.match.estatus && (
                  <Badge tone={ESTATUS_TONE[evolution.match.estatus as keyof typeof ESTATUS_TONE] ?? "neutral"}>
                    {ESTATUS_LABELS[evolution.match.estatus] ?? evolution.match.estatus}
                    {evolution.match.notaFinal !== null && ` · Nota Final ${evolution.match.notaFinal}`}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gris">
                {player.currentTeam?.category?.name ?? "Sin categoría"} · {player.primaryPosition ? POSITION_LABELS[player.primaryPosition] : "Sin posición"} ·{" "}
                {calculateAge(player.birthDate)} años · Dorsal {player.jerseyNumber ?? "—"}
                {player.gender && ` · ${GENDER_LABELS[player.gender] ?? player.gender}`}
              </p>
              <p className="text-xs text-gris">
                En el club desde {formatDate(player.joinDate, "es-AR")} · {player.city ?? ""} {player.nationality ? `(${player.nationality})` : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="resumen">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="evaluaciones">Notas Técnicas</TabsTrigger>
            {hasPermission(PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED) && (
              <TabsTrigger value="minutos">Minutos y Partidos</TabsTrigger>
            )}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Radar de habilidades — Partido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {radarDataMatch.some((r) => r.current !== null) ? <PlayerRadarChart data={radarDataMatch} /> : <EmptyState title="Sin evaluaciones de partido todavía" />}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Radar de habilidades — Entrenamiento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {radarDataTraining.some((r) => r.current !== null) ? <PlayerRadarChart data={radarDataTraining} /> : <EmptyState title="Sin evaluaciones de entrenamiento todavía" />}
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Fortalezas actuales</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {strengths.length === 0 ? (
                      <p className="text-sm text-gris">Aún no hay suficientes datos.</p>
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
                      <p className="text-sm text-gris">Sin áreas críticas detectadas.</p>
                    ) : (
                      growthAreas.map((s) => (
                        <Badge key={s} tone="warning">
                          {s}
                        </Badge>
                      ))
                    )}
                  </CardContent>
                </Card>
                {hasPermission(PERMISSIONS.PHYSICAL_VIEW) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Mediciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {latestAnthro ? (
                        (() => {
                          const weight = Number(latestAnthro.metrics.weight) || 0;
                          const height = Number(latestAnthro.metrics.height) || 0;
                          const imc = computeImc(weight, height);
                          return (
                            <div className="flex flex-wrap gap-2">
                              {weight > 0 && <Badge tone="neutral">Peso: {weight} kg</Badge>}
                              {height > 0 && <Badge tone="neutral">Talla: {height} cm</Badge>}
                              {imc !== null && <Badge tone="neutral">IMC: {imc.toFixed(1)}</Badge>}
                              {imc !== null && <Badge tone="neutral">{classifyImc(imc)}</Badge>}
                              <span className="basis-full text-xs text-gris">Última medición: {formatDate(latestAnthro.date, "es-AR")}</span>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-gris">Sin mediciones antropométricas registradas.</p>
                      )}
                    </CardContent>
                  </Card>
                )}
                {player.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Observaciones</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gris">{player.notes}</CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="evaluaciones" className="pt-5">
            {hasPermission(PERMISSIONS.DATA_EXPORT) && (
              <div className="mb-3 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => api.download(`/export/evaluations?playerId=${player.id}`, `evaluaciones-${player.firstName}-${player.lastName}.xlsx`)}
                >
                  Exportar Excel
                </Button>
              </div>
            )}
            <Card>
              <CardContent className="divide-y divide-borde py-0">
                {!evaluations || evaluations.length === 0 ? (
                  <EmptyState title="Sin evaluaciones registradas" />
                ) : (
                  evaluations.map((ev) => (
                    <div key={ev.id} className="py-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-carbon">
                          {formatDate(ev.date, "es-AR")} · {ev.context ?? ev.type}
                        </span>
                        <span className="text-xs text-gris">
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
                      {ev.observation && <p className="mt-2 text-sm text-gris">{ev.observation}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {hasPermission(PERMISSIONS.FIXTURES_VIEW_ALL, PERMISSIONS.FIXTURES_VIEW_ASSIGNED) && (
            <TabsContent value="minutos" className="pt-5">
              <MatchAppearancesTab playerId={player.id} />
            </TabsContent>
          )}

          <TabsContent value="evolucion" className="space-y-4 pt-5">
            <Card>
              <CardHeader>
                <CardTitle>Evolución por dimensión — Partido</CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionSeriesMatch.some((s) => s.points.length > 0) ? (
                  <EvolutionLineChart series={evolutionSeriesMatch} />
                ) : (
                  <EmptyState title="Todavía no hay historial suficiente" description="Se necesitan al menos dos evaluaciones de partido." />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evolución por dimensión — Entrenamiento</CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionSeriesTraining.some((s) => s.points.length > 0) ? (
                  <EvolutionLineChart series={evolutionSeriesTraining} />
                ) : (
                  <EmptyState title="Todavía no hay historial suficiente" description="Se necesitan al menos dos evaluaciones de entrenamiento." />
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
                  <ol className="relative border-l border-borde pl-5">
                    {[...player.teamHistory]
                      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .map((h) => (
                        <li key={h.id} className="mb-6 last:mb-0">
                          <div className="absolute -ml-[25px] mt-1 h-3 w-3 rounded-full bg-rojo" />
                          <p className="text-sm font-medium text-carbon">{h.team.name}</p>
                          <p className="text-xs text-gris">
                            {formatDate(h.startDate, "es-AR")} —{" "}
                            {h.endDate ? formatDate(h.endDate, "es-AR") : "actualidad"}
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
