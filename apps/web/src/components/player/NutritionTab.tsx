"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/date";

interface NutritionRecord {
  id: string;
  date: string;
  weight: number | null;
  height: number | null;
  bodyFatPercent: number | null;
  muscleMassPercent: number | null;
  mealsPerDay: number | null;
  dailyWaterLiters: number | null;
  junkFoodFrequency: string | null;
  hydrationColorimetry: string | null;
  status: string | null;
  observations: string | null;
  recordedBy: { firstName: string; lastName: string };
}

function computeImc(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null;
  const meters = height / 100;
  return Number((weight / (meters * meters)).toFixed(1));
}

export function NutritionTab({ playerId }: { playerId: string }) {
  const [records, setRecords] = useState<NutritionRecord[] | null>(null);

  useEffect(() => {
    api.get<NutritionRecord[]>(`/nutrition/player/${playerId}`).then(setRecords);
  }, [playerId]);

  if (!records) return <Skeleton className="h-48" />;

  const weightSeries = records
    .filter((r) => r.weight !== null)
    .map((r) => ({ date: r.date, value: r.weight as number }))
    .reverse();
  const imcSeries = records
    .map((r) => ({ date: r.date, value: computeImc(r.weight, r.height) }))
    .filter((p): p is { date: string; value: number } => p.value !== null)
    .reverse();

  return (
    <div className="space-y-4">
      {records.length === 0 ? (
        <EmptyState title="Sin registros nutricionales" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolución de peso</CardTitle>
              </CardHeader>
              <CardContent>
                {weightSeries.length > 0 ? <MetricLineChart data={weightSeries} unit=" kg" /> : <EmptyState title="Sin datos de peso" />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evolución de IMC</CardTitle>
              </CardHeader>
              <CardContent>
                {imcSeries.length > 0 ? <MetricLineChart data={imcSeries} color="#38bdf8" /> : <EmptyState title="Sin datos suficientes" />}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="divide-y divide-borde py-0">
              {records.map((r) => {
                const imc = computeImc(r.weight, r.height);
                return (
                  <div key={r.id} className="py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-carbon">{formatDate(r.date, "es-AR")}</span>
                      <span className="text-xs text-gris">
                        {r.recordedBy.firstName} {r.recordedBy.lastName}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {r.weight !== null && <Badge tone="neutral">Peso: {r.weight} kg</Badge>}
                      {imc !== null && <Badge tone="neutral">IMC: {imc}</Badge>}
                      {r.bodyFatPercent !== null && <Badge tone="neutral">% Grasa: {r.bodyFatPercent}</Badge>}
                      {r.muscleMassPercent !== null && <Badge tone="neutral">% Masa muscular: {r.muscleMassPercent}</Badge>}
                      {r.mealsPerDay !== null && <Badge tone="neutral">{r.mealsPerDay} comidas/día</Badge>}
                      {r.dailyWaterLiters !== null && <Badge tone="neutral">{r.dailyWaterLiters} L agua/día</Badge>}
                      {r.status && <Badge tone="info">{r.status}</Badge>}
                    </div>
                    {r.observations && <p className="mt-2 text-sm text-gris">{r.observations}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
