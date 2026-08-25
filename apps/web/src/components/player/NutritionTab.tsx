"use client";

import { FormEvent, useEffect, useState } from "react";
import { PERMISSIONS } from "@futboljoven/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

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
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState<NutritionRecord[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ weight: "", height: "", bodyFatPercent: "", muscleMassPercent: "", mealsPerDay: "", dailyWaterLiters: "", observations: "" });

  const canManage = hasPermission(PERMISSIONS.NUTRITION_MANAGE);

  function load() {
    api.get<NutritionRecord[]>(`/nutrition/player/${playerId}`).then(setRecords);
  }

  useEffect(load, [playerId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/nutrition", {
        playerId,
        date: new Date().toISOString().slice(0, 10),
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
        bodyFatPercent: form.bodyFatPercent ? Number(form.bodyFatPercent) : null,
        muscleMassPercent: form.muscleMassPercent ? Number(form.muscleMassPercent) : null,
        mealsPerDay: form.mealsPerDay ? Number(form.mealsPerDay) : null,
        dailyWaterLiters: form.dailyWaterLiters ? Number(form.dailyWaterLiters) : null,
        observations: form.observations || null,
      });
      setForm({ weight: "", height: "", bodyFatPercent: "", muscleMassPercent: "", mealsPerDay: "", dailyWaterLiters: "", observations: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el registro");
    } finally {
      setSaving(false);
    }
  }

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
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo registro nutricional</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
              </div>
              <div>
                <Label>% Grasa</Label>
                <Input type="number" step="0.1" value={form.bodyFatPercent} onChange={(e) => setForm({ ...form, bodyFatPercent: e.target.value })} />
              </div>
              <div>
                <Label>% Masa muscular</Label>
                <Input type="number" step="0.1" value={form.muscleMassPercent} onChange={(e) => setForm({ ...form, muscleMassPercent: e.target.value })} />
              </div>
              <div>
                <Label>Comidas / día</Label>
                <Input type="number" value={form.mealsPerDay} onChange={(e) => setForm({ ...form, mealsPerDay: e.target.value })} />
              </div>
              <div>
                <Label>Agua diaria (L)</Label>
                <Input type="number" step="0.1" value={form.dailyWaterLiters} onChange={(e) => setForm({ ...form, dailyWaterLiters: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-4">
                <Label>Observaciones</Label>
                <Textarea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
              </div>
              <div className="col-span-2 md:col-span-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar registro"}
                </Button>
              </div>
            </form>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </CardContent>
        </Card>
      )}

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
            <CardContent className="divide-y divide-pitch-700 py-0">
              {records.map((r) => {
                const imc = computeImc(r.weight, r.height);
                return (
                  <div key={r.id} className="py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{new Date(r.date).toLocaleDateString("es-AR")}</span>
                      <span className="text-xs text-slate-500">
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
                    {r.observations && <p className="mt-2 text-sm text-slate-400">{r.observations}</p>}
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
