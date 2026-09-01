"use client";

import { FormEvent, useEffect, useState } from "react";
import { PERMISSIONS } from "@futboljoven/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface PhysicalRecord {
  id: string;
  date: string;
  metrics: Record<string, string | number>;
  observations: string | null;
  recordedBy: { firstName: string; lastName: string };
}

interface Injury {
  id: string;
  description: string;
  bodyPart: string | null;
  date: string;
  severity: string | null;
  status: string;
  expectedRecoveryDays: number | null;
  painLevel: number | null;
  mobilityNotes: string | null;
}

const INJURY_STATUS_TONE: Record<string, "danger" | "warning" | "success"> = {
  ACTIVE: "danger",
  RECOVERING: "warning",
  CLEARED: "success",
};
const INJURY_STATUS_LABELS: Record<string, string> = { ACTIVE: "Activa", RECOVERING: "En recuperación", CLEARED: "De alta" };

export function PhysicalHealthTab({ playerId }: { playerId: string }) {
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState<PhysicalRecord[] | null>(null);
  const [injuries, setInjuries] = useState<Injury[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [batteryForm, setBatteryForm] = useState({ resistencia: "", velocidad: "", fuerza: "", agilidad: "", potencia: "" });
  const [injuryForm, setInjuryForm] = useState({ description: "", bodyPart: "", severity: "MODERATE", expectedRecoveryDays: "", painLevel: "" });

  const canManage = hasPermission(PERMISSIONS.PHYSICAL_MANAGE);

  function load() {
    api.get<PhysicalRecord[]>(`/physical/player/${playerId}`).then(setRecords);
    api.get<Injury[]>(`/injuries/player/${playerId}`).then(setInjuries);
  }

  useEffect(load, [playerId]);

  async function handleBatterySubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const metrics: Record<string, number> = {};
      for (const [key, value] of Object.entries(batteryForm)) {
        if (value) metrics[key] = Number(value);
      }
      await api.post("/physical", { playerId, date: new Date().toISOString().slice(0, 10), metrics });
      setBatteryForm({ resistencia: "", velocidad: "", fuerza: "", agilidad: "", potencia: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la batería física");
    } finally {
      setSaving(false);
    }
  }

  async function handleInjurySubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/injuries", {
        playerId,
        description: injuryForm.description,
        bodyPart: injuryForm.bodyPart || null,
        date: new Date().toISOString().slice(0, 10),
        severity: injuryForm.severity,
        expectedRecoveryDays: injuryForm.expectedRecoveryDays ? Number(injuryForm.expectedRecoveryDays) : null,
        painLevel: injuryForm.painLevel ? Number(injuryForm.painLevel) : null,
        status: "ACTIVE",
      });
      setInjuryForm({ description: "", bodyPart: "", severity: "MODERATE", expectedRecoveryDays: "", painLevel: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la lesión");
    } finally {
      setSaving(false);
    }
  }

  if (!records || !injuries) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Nueva batería física</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBatterySubmit} className="grid grid-cols-2 gap-3">
                {(["resistencia", "velocidad", "fuerza", "agilidad", "potencia"] as const).map((key) => (
                  <div key={key}>
                    <Label className="capitalize">{key}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={batteryForm[key]}
                      onChange={(e) => setBatteryForm({ ...batteryForm, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <Button type="submit" disabled={saving}>
                    Guardar batería
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registrar lesión</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInjurySubmit} className="space-y-3">
                <div>
                  <Label>Descripción</Label>
                  <Input required value={injuryForm.description} onChange={(e) => setInjuryForm({ ...injuryForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Zona del cuerpo</Label>
                    <Input value={injuryForm.bodyPart} onChange={(e) => setInjuryForm({ ...injuryForm, bodyPart: e.target.value })} />
                  </div>
                  <div>
                    <Label>Severidad</Label>
                    <Select value={injuryForm.severity} onChange={(e) => setInjuryForm({ ...injuryForm, severity: e.target.value })}>
                      <option value="MILD">Leve</option>
                      <option value="MODERATE">Moderada</option>
                      <option value="SEVERE">Severa</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Recuperación estimada (días)</Label>
                    <Input type="number" value={injuryForm.expectedRecoveryDays} onChange={(e) => setInjuryForm({ ...injuryForm, expectedRecoveryDays: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nivel de dolor (0-10)</Label>
                    <Input type="number" min={0} max={10} value={injuryForm.painLevel} onChange={(e) => setInjuryForm({ ...injuryForm, painLevel: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  Registrar lesión
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      {error && <p className="text-sm text-rojo-oscuro">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Historial de lesiones</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-borde py-0">
          {injuries.length === 0 ? (
            <EmptyState title="Sin lesiones registradas" />
          ) : (
            injuries.map((inj) => (
              <div key={inj.id} className="py-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-carbon">
                    {inj.description} {inj.bodyPart && `— ${inj.bodyPart}`}
                  </span>
                  <Badge tone={INJURY_STATUS_TONE[inj.status] ?? "neutral"}>{INJURY_STATUS_LABELS[inj.status] ?? inj.status}</Badge>
                </div>
                <p className="text-xs text-gris">
                  {new Date(inj.date).toLocaleDateString("es-AR")}
                  {inj.expectedRecoveryDays !== null && ` · Recuperación estimada: ${inj.expectedRecoveryDays} días`}
                  {inj.painLevel !== null && ` · Dolor: ${inj.painLevel}/10`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Baterías físicas</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-borde py-0">
          {records.length === 0 ? (
            <EmptyState title="Sin baterías físicas registradas" />
          ) : (
            records.map((r) => (
              <div key={r.id} className="py-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-carbon">{new Date(r.date).toLocaleDateString("es-AR")}</span>
                  <span className="text-xs text-gris">
                    {r.recordedBy.firstName} {r.recordedBy.lastName}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(r.metrics).map(([k, v]) => (
                    <Badge key={k} tone="neutral" className="capitalize">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
