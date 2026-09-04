"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Modal, HelpButton } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { RecoveryBarChart } from "@/components/charts/RecoveryBarChart";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

interface PhysicalRecord {
  id: string;
  date: string;
  metrics: Record<string, string | number>;
  recordedBy: { firstName: string; lastName: string };
}

interface Injury {
  id: string;
  description: string;
  injuryType: string | null;
  bodyPart: string | null;
  date: string;
  severity: string | null;
  responsibleProfessional: string | null;
  treatment: string | null;
  status: string;
  expectedRecoveryDays: number | null;
  actualReturnDate: string | null;
  painLevel: number | null;
  mobilityNotes: string | null;
}

type Aptitud = "APTO" | "EN_PROCESO" | "NO_APTO";

const GLOSSARY: { label: string; text: string }[] = [
  { label: "Peso (kg)", text: "Masa corporal medida en kilogramos." },
  { label: "Talla (cm)", text: "Estatura del jugador en centímetros." },
  { label: "IMC", text: "Índice de Masa Corporal: relación peso/talla². Es una guía general, no un diagnóstico." },
  { label: "Clasificación", text: "Categoría según el IMC calculado (Riesgo de desnutrición, Normal, Sobrepeso, Obesidad)." },
  { label: "T. Adiposo (%)", text: "Porcentaje estimado de grasa corporal." },
  { label: "T. Muscular (%)", text: "Porcentaje estimado de masa muscular." },
  { label: "S6P (mm)", text: "Sumatoria de 6 pliegues cutáneos: medida de grasa subcutánea." },
  { label: "IMO", text: "Índice Músculo-Óseo: proporción entre masa muscular y masa ósea." },
];

function computeAge(birthDate: string, atDate: string): number {
  const b = new Date(birthDate);
  const a = new Date(atDate);
  let age = a.getFullYear() - b.getFullYear();
  const m = a.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) age--;
  return age;
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

function recoveryDays(injury: Injury): number | null {
  if (!injury.actualReturnDate) return null;
  return Math.round((new Date(injury.actualReturnDate).getTime() - new Date(injury.date).getTime()) / 86_400_000);
}

const emptyMeasurementForm = { date: new Date().toISOString().slice(0, 10), weight: "", height: "", age: "", bodyFat: "", muscleMass: "", s6p: "", imo: "" };
const emptyDiagnosisForm = {
  date: new Date().toISOString().slice(0, 10),
  injuryType: "",
  bodyPart: "",
  severity: "MODERATE",
  responsibleProfessional: "",
  treatment: "",
  expectedRecoveryDays: "",
  actualReturnDate: "",
  mobilityNotes: "",
};

export function FichaMedicaModal({
  playerId,
  playerName,
  categoryName,
  birthDate,
  onClose,
  onChanged,
}: {
  playerId: string;
  playerName: string;
  categoryName: string;
  birthDate: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [records, setRecords] = useState<PhysicalRecord[] | null>(null);
  const [injuries, setInjuries] = useState<Injury[] | null>(null);
  const [measurementForm, setMeasurementForm] = useState(emptyMeasurementForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [hasInjury, setHasInjury] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState(emptyDiagnosisForm);

  function load() {
    api.get<PhysicalRecord[]>(`/physical/player/${playerId}?recordType=ANTHROPOMETRIC`).then(setRecords);
    api.get<Injury[]>(`/injuries/player/${playerId}`).then(setInjuries);
  }

  useEffect(load, [playerId]);

  useEffect(() => {
    setMeasurementForm((f) => ({ ...f, age: String(computeAge(birthDate, f.date)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate]);

  const latestInjury = injuries?.[0] ?? null;
  const aptitud: Aptitud = !latestInjury || latestInjury.status === "CLEARED" ? "APTO" : latestInjury.status === "RECOVERING" ? "EN_PROCESO" : "NO_APTO";

  const weightNum = Number(measurementForm.weight) || 0;
  const heightNum = Number(measurementForm.height) || 0;
  const imc = computeImc(weightNum, heightNum);
  const clasificacion = classifyImc(imc);

  function handleDateChange(date: string) {
    setMeasurementForm((f) => ({ ...f, date, age: String(computeAge(birthDate, date)) }));
  }

  async function handleSaveMeasurement(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const metrics: Record<string, number> = {};
      if (measurementForm.weight) metrics.weight = Number(measurementForm.weight);
      if (measurementForm.height) metrics.height = Number(measurementForm.height);
      if (measurementForm.age) metrics.age = Number(measurementForm.age);
      if (measurementForm.bodyFat) metrics.bodyFatPercent = Number(measurementForm.bodyFat);
      if (measurementForm.muscleMass) metrics.muscleMassPercent = Number(measurementForm.muscleMass);
      if (measurementForm.s6p) metrics.skinfoldsSum = Number(measurementForm.s6p);
      if (measurementForm.imo) metrics.imo = Number(measurementForm.imo);
      await api.post("/physical", { playerId, date: measurementForm.date, recordType: "ANTHROPOMETRIC", metrics });
      setMeasurementForm({ ...emptyMeasurementForm, date: measurementForm.date, age: measurementForm.age });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la medición");
    } finally {
      setSaving(false);
    }
  }

  async function setDisponibilidad(next: Aptitud) {
    setError(null);
    if (next === "APTO") {
      if (latestInjury && latestInjury.status !== "CLEARED") {
        await api.patch(`/injuries/${latestInjury.id}`, { status: "CLEARED" });
        load();
        onChanged();
      }
      return;
    }
    const status = next === "EN_PROCESO" ? "RECOVERING" : "ACTIVE";
    if (latestInjury && latestInjury.status !== "CLEARED") {
      await api.patch(`/injuries/${latestInjury.id}`, { status });
      load();
      onChanged();
    }
  }

  async function handleSaveDiagnosis(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/injuries", {
        playerId,
        description: diagnosisForm.injuryType || "Lesión",
        injuryType: diagnosisForm.injuryType || null,
        bodyPart: diagnosisForm.bodyPart || null,
        date: diagnosisForm.date,
        severity: diagnosisForm.severity,
        responsibleProfessional: diagnosisForm.responsibleProfessional || null,
        treatment: diagnosisForm.treatment || null,
        expectedRecoveryDays: diagnosisForm.expectedRecoveryDays ? Number(diagnosisForm.expectedRecoveryDays) : null,
        actualReturnDate: diagnosisForm.actualReturnDate || null,
        mobilityNotes: diagnosisForm.mobilityNotes || null,
        status: diagnosisForm.actualReturnDate ? "CLEARED" : "ACTIVE",
      });
      setDiagnosisForm(emptyDiagnosisForm);
      setHasInjury(false);
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el diagnóstico");
    } finally {
      setSaving(false);
    }
  }

  const injuriesWithRecovery = (injuries ?? [])
    .map((i) => ({ injury: i, days: recoveryDays(i) }))
    .filter((x): x is { injury: Injury; days: number } => x.days !== null);

  return (
    <Modal open onClose={onClose} widthClass="max-w-lg">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl tracking-wide text-carbon">Ficha Médica</h2>
          <p className="text-xs text-gris">
            {playerName} · {categoryName}
          </p>
        </div>
        <Link href={`/players/${playerId}`} className="text-xs text-rojo hover:underline">
          Ver perfil →
        </Link>
      </div>

      <Tabs defaultValue="area-medica" className="mt-4">
        <TabsList>
          <TabsTrigger value="area-medica">Área Médica</TabsTrigger>
          <TabsTrigger value="registro-medico">Registro Médico</TabsTrigger>
        </TabsList>

        <TabsContent value="area-medica" className="pt-4">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gris">Evaluación antropométrica</p>
            <HelpButton onClick={() => setGlossaryOpen(true)} />
          </div>

          <form onSubmit={handleSaveMeasurement} className="space-y-3">
            <div>
              <Label>Fecha de la medición</Label>
              <Input type="date" value={measurementForm.date} onChange={(e) => handleDateChange(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" placeholder="Ej: 60.0" value={measurementForm.weight} onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })} />
              </div>
              <div>
                <Label>Talla (cm)</Label>
                <Input type="number" step="0.1" placeholder="Ej: 171.0" value={measurementForm.height} onChange={(e) => setMeasurementForm({ ...measurementForm, height: e.target.value })} />
              </div>
              <div>
                <Label>Edad</Label>
                <Input type="number" step="0.1" value={measurementForm.age} onChange={(e) => setMeasurementForm({ ...measurementForm, age: e.target.value })} />
              </div>
              <div>
                <Label>IMC</Label>
                <Input disabled value={imc !== null ? imc.toFixed(1) : ""} />
              </div>
              <div className="col-span-2">
                <Label>Clasificación</Label>
                <Input disabled value={clasificacion} />
              </div>
              <div>
                <Label>T. Adiposo (%)</Label>
                <Input type="number" step="0.1" placeholder="Ej: 14.5" value={measurementForm.bodyFat} onChange={(e) => setMeasurementForm({ ...measurementForm, bodyFat: e.target.value })} />
              </div>
              <div>
                <Label>T. Muscular (%)</Label>
                <Input type="number" step="0.1" placeholder="Ej: 42.0" value={measurementForm.muscleMass} onChange={(e) => setMeasurementForm({ ...measurementForm, muscleMass: e.target.value })} />
              </div>
              <div>
                <Label>S6P (mm)</Label>
                <Input type="number" step="0.1" placeholder="Ej: 55.2" value={measurementForm.s6p} onChange={(e) => setMeasurementForm({ ...measurementForm, s6p: e.target.value })} />
              </div>
              <div>
                <Label>IMO</Label>
                <Input type="number" step="0.1" placeholder="Ej: 2.3" value={measurementForm.imo} onChange={(e) => setMeasurementForm({ ...measurementForm, imo: e.target.value })} />
              </div>
            </div>
            {error && <p className="text-sm text-rojo-oscuro">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Guardando..." : "Guardar nueva medición"}
            </Button>
          </form>

          <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-gris">Historial de mediciones</p>
          {!records ? (
            <Skeleton className="h-16" />
          ) : records.length === 0 ? (
            <p className="py-2 text-sm text-gris">Aún no hay mediciones registradas.</p>
          ) : (
            <div className="divide-y divide-borde">
              {records.map((r) => {
                const w = typeof r.metrics.weight === "number" ? r.metrics.weight : Number(r.metrics.weight) || 0;
                const h = typeof r.metrics.height === "number" ? r.metrics.height : Number(r.metrics.height) || 0;
                const rImc = computeImc(w, h);
                return (
                  <div key={r.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-carbon">{new Date(r.date).toLocaleDateString("es-CL")}</span>
                      <span className="text-gris">
                        {w ? `${w} kg` : ""} {h ? `· ${h} cm` : ""} {rImc !== null ? `· IMC ${rImc.toFixed(1)}` : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-gris">
                      Evaluó: {r.recordedBy.firstName} {r.recordedBy.lastName}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="registro-medico" className="pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gris">Disponibilidad</p>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {(
              [
                ["APTO", "Apto", "success"],
                ["EN_PROCESO", "En proceso", "warning"],
                ["NO_APTO", "No apto", "danger"],
              ] as const
            ).map(([value, label, tone]) => (
              <button
                key={value}
                onClick={() => setDisponibilidad(value)}
                className={cn(
                  "rounded-xl border-2 py-2.5 text-center text-sm font-bold transition-colors",
                  aptitud === value
                    ? tone === "success"
                      ? "border-[#1E7A3E] bg-[#E4F5E9] text-[#1E7A3E]"
                      : tone === "warning"
                        ? "border-[#C68A00] bg-[#FFF4DA] text-[#9A6B00]"
                        : "border-rojo-oscuro bg-[#FBE1E4] text-rojo-oscuro"
                    : "border-borde text-gris hover:bg-gris-claro",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gris">¿Presenta lesión?</p>
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setHasInjury(true)}
              className={cn("flex-1 rounded-xl border-2 py-2 text-sm font-bold", hasInjury ? "border-rojo-oscuro bg-[#FBE1E4] text-rojo-oscuro" : "border-borde text-gris")}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => setHasInjury(false)}
              className={cn("flex-1 rounded-xl border-2 py-2 text-sm font-bold", !hasInjury ? "border-[#1E7A3E] bg-[#E4F5E9] text-[#1E7A3E]" : "border-borde text-gris")}
            >
              No
            </button>
          </div>

          {hasInjury && (
            <form onSubmit={handleSaveDiagnosis} className="mb-5 space-y-3 rounded-xl border border-borde p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha de la lesión</Label>
                  <Input type="date" required value={diagnosisForm.date} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, date: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo de lesión</Label>
                  <Input required value={diagnosisForm.injuryType} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, injuryType: e.target.value })} />
                </div>
                <div>
                  <Label>Zona afectada</Label>
                  <Input value={diagnosisForm.bodyPart} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, bodyPart: e.target.value })} />
                </div>
                <div>
                  <Label>Gravedad</Label>
                  <Select value={diagnosisForm.severity} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, severity: e.target.value })}>
                    <option value="MILD">Leve</option>
                    <option value="MODERATE">Moderada</option>
                    <option value="SEVERE">Grave</option>
                  </Select>
                </div>
                <div>
                  <Label>Profesional Responsable</Label>
                  <Input value={diagnosisForm.responsibleProfessional} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, responsibleProfessional: e.target.value })} />
                </div>
                <div>
                  <Label>Tiempo estimado de recuperación (días)</Label>
                  <Input type="number" value={diagnosisForm.expectedRecoveryDays} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, expectedRecoveryDays: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Tratamiento</Label>
                  <Input value={diagnosisForm.treatment} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, treatment: e.target.value })} />
                </div>
                <div>
                  <Label>Fecha de alta médica (si ya la tiene)</Label>
                  <Input type="date" value={diagnosisForm.actualReturnDate} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, actualReturnDate: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Observaciones</Label>
                  <Input value={diagnosisForm.mobilityNotes} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, mobilityNotes: e.target.value })} />
                </div>
              </div>
              {error && <p className="text-sm text-rojo-oscuro">{error}</p>}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Guardando..." : "Registrar diagnóstico"}
              </Button>
            </form>
          )}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gris">Historial de Diagnósticos</p>
          {!injuries ? (
            <Skeleton className="h-16" />
          ) : injuries.length === 0 ? (
            <EmptyState title="Sin diagnósticos registrados" />
          ) : (
            <div className="mb-5 divide-y divide-borde">
              {injuries.map((inj) => (
                <div key={inj.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-carbon">
                      {inj.injuryType ?? inj.description} {inj.bodyPart && `— ${inj.bodyPart}`}
                    </span>
                    <Badge tone={inj.status === "ACTIVE" ? "danger" : inj.status === "RECOVERING" ? "warning" : "success"}>
                      {inj.status === "ACTIVE" ? "No apto" : inj.status === "RECOVERING" ? "En proceso" : "De alta"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gris">
                    {new Date(inj.date).toLocaleDateString("es-CL")}
                    {inj.treatment && ` · ${inj.treatment}`}
                    {inj.responsibleProfessional && ` · ${inj.responsibleProfessional}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {injuriesWithRecovery.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Lesiones — tiempos de recuperación</CardTitle>
              </CardHeader>
              <CardContent>
                <RecoveryBarChart
                  data={injuriesWithRecovery.map(({ injury, days }) => ({
                    label: `${new Date(injury.date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })} ${injury.injuryType ?? injury.description}`,
                    days,
                  }))}
                />
                <div className="mt-3 divide-y divide-borde">
                  {injuriesWithRecovery.map(({ injury, days }) => (
                    <div key={injury.id} className="py-2 text-xs text-gris">
                      <span className="font-medium text-carbon">{injury.injuryType ?? injury.description}</span> · {injury.bodyPart ?? "—"} ·{" "}
                      {days} días · {injury.mobilityNotes || "Sin observaciones"}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Modal open={glossaryOpen} onClose={() => setGlossaryOpen(false)} widthClass="max-w-sm">
        <h3 className="mb-3 font-display text-lg tracking-wide text-carbon">¿Qué significa cada dato?</h3>
        <div className="space-y-3">
          {GLOSSARY.map((g) => (
            <div key={g.label}>
              <p className="text-sm font-bold text-carbon">{g.label}</p>
              <p className="text-xs text-gris">{g.text}</p>
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={() => setGlossaryOpen(false)}>
          Entendido
        </Button>
      </Modal>
    </Modal>
  );
}
