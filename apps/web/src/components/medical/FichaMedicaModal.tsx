"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Modal, HelpButton } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

interface PhysicalRecord {
  id: string;
  date: string;
  metrics: Record<string, string | number>;
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

const emptyForm = { date: new Date().toISOString().slice(0, 10), weight: "", height: "", age: "", bodyFat: "", muscleMass: "", s6p: "", imo: "" };
const emptyDiagnosis = { description: "", bodyPart: "", severity: "MODERATE", expectedRecoveryDays: "", painLevel: "" };

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
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState(emptyDiagnosis);
  const [pendingStatus, setPendingStatus] = useState<string>("ACTIVE");

  function load() {
    api.get<PhysicalRecord[]>(`/physical/player/${playerId}`).then(setRecords);
    api.get<Injury[]>(`/injuries/player/${playerId}`).then(setInjuries);
  }

  useEffect(load, [playerId]);

  useEffect(() => {
    setForm((f) => ({ ...f, age: String(computeAge(birthDate, f.date)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthDate]);

  const latestInjury = injuries?.[0] ?? null;
  const aptitud: Aptitud = !latestInjury || latestInjury.status === "CLEARED" ? "APTO" : latestInjury.status === "RECOVERING" ? "EN_PROCESO" : "NO_APTO";

  const weightNum = Number(form.weight) || 0;
  const heightNum = Number(form.height) || 0;
  const imc = computeImc(weightNum, heightNum);
  const clasificacion = classifyImc(imc);

  async function handleDateChange(date: string) {
    setForm((f) => ({ ...f, date, age: String(computeAge(birthDate, date)) }));
  }

  async function handleSaveMeasurement(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const metrics: Record<string, number> = {};
      if (form.weight) metrics.weight = Number(form.weight);
      if (form.height) metrics.height = Number(form.height);
      if (form.age) metrics.age = Number(form.age);
      if (form.bodyFat) metrics.bodyFatPercent = Number(form.bodyFat);
      if (form.muscleMass) metrics.muscleMassPercent = Number(form.muscleMass);
      if (form.s6p) metrics.skinfoldsSum = Number(form.s6p);
      if (form.imo) metrics.imo = Number(form.imo);
      await api.post("/physical", { playerId, date: form.date, metrics });
      setForm({ ...emptyForm, date: form.date, age: form.age });
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
      return;
    }
    setPendingStatus(status);
    setDiagnosisOpen(true);
  }

  async function handleSaveDiagnosis(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/injuries", {
        playerId,
        description: diagnosisForm.description,
        bodyPart: diagnosisForm.bodyPart || null,
        date: new Date().toISOString().slice(0, 10),
        severity: diagnosisForm.severity,
        expectedRecoveryDays: diagnosisForm.expectedRecoveryDays ? Number(diagnosisForm.expectedRecoveryDays) : null,
        painLevel: diagnosisForm.painLevel ? Number(diagnosisForm.painLevel) : null,
        status: pendingStatus,
      });
      setDiagnosisForm(emptyDiagnosis);
      setDiagnosisOpen(false);
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el diagnóstico");
    } finally {
      setSaving(false);
    }
  }

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

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gris">Disponibilidad</p>
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

      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gris">Evaluación antropométrica</p>
        <HelpButton onClick={() => setGlossaryOpen(true)} />
      </div>

      <form onSubmit={handleSaveMeasurement} className="space-y-3">
        <div>
          <Label>Fecha de la medición</Label>
          <Input type="date" value={form.date} onChange={(e) => handleDateChange(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Peso (kg)</Label>
            <Input type="number" step="0.1" placeholder="Ej: 60.0" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </div>
          <div>
            <Label>Talla (cm)</Label>
            <Input type="number" step="0.1" placeholder="Ej: 171.0" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
          </div>
          <div>
            <Label>Edad</Label>
            <Input type="number" step="0.1" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
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
            <Input type="number" step="0.1" placeholder="Ej: 14.5" value={form.bodyFat} onChange={(e) => setForm({ ...form, bodyFat: e.target.value })} />
          </div>
          <div>
            <Label>T. Muscular (%)</Label>
            <Input type="number" step="0.1" placeholder="Ej: 42.0" value={form.muscleMass} onChange={(e) => setForm({ ...form, muscleMass: e.target.value })} />
          </div>
          <div>
            <Label>S6P (mm)</Label>
            <Input type="number" step="0.1" placeholder="Ej: 55.2" value={form.s6p} onChange={(e) => setForm({ ...form, s6p: e.target.value })} />
          </div>
          <div>
            <Label>IMO</Label>
            <Input type="number" step="0.1" placeholder="Ej: 2.3" value={form.imo} onChange={(e) => setForm({ ...form, imo: e.target.value })} />
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
              <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-carbon">{new Date(r.date).toLocaleDateString("es-CL")}</span>
                <span className="text-gris">
                  {w ? `${w} kg` : ""} {h ? `· ${h} cm` : ""} {rImc !== null ? `· IMC ${rImc.toFixed(1)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-2 mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gris">Historial de diagnósticos</p>
        <button
          type="button"
          onClick={() => {
            setPendingStatus("ACTIVE");
            setDiagnosisOpen(true);
          }}
          className="text-xs font-bold text-rojo hover:underline"
        >
          + Nuevo diagnóstico
        </button>
      </div>
      {!injuries ? (
        <Skeleton className="h-16" />
      ) : injuries.length === 0 ? (
        <EmptyState title="Sin diagnósticos registrados" />
      ) : (
        <div className="divide-y divide-borde">
          {injuries.map((inj) => (
            <div key={inj.id} className="py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-carbon">
                  {inj.description} {inj.bodyPart && `— ${inj.bodyPart}`}
                </span>
                <Badge tone={inj.status === "ACTIVE" ? "danger" : inj.status === "RECOVERING" ? "warning" : "success"}>
                  {inj.status === "ACTIVE" ? "No apto" : inj.status === "RECOVERING" ? "En proceso" : "De alta"}
                </Badge>
              </div>
              <p className="text-xs text-gris">{new Date(inj.date).toLocaleDateString("es-CL")}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={diagnosisOpen} onClose={() => setDiagnosisOpen(false)} widthClass="max-w-sm">
        <h3 className="mb-3 font-display text-lg tracking-wide text-carbon">Nuevo diagnóstico</h3>
        <form onSubmit={handleSaveDiagnosis} className="space-y-3">
          <div>
            <Label>Descripción</Label>
            <Input required value={diagnosisForm.description} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Zona del cuerpo</Label>
              <Input value={diagnosisForm.bodyPart} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, bodyPart: e.target.value })} />
            </div>
            <div>
              <Label>Severidad</Label>
              <Select value={diagnosisForm.severity} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, severity: e.target.value })}>
                <option value="MILD">Leve</option>
                <option value="MODERATE">Moderada</option>
                <option value="SEVERE">Severa</option>
              </Select>
            </div>
            <div>
              <Label>Recuperación estimada (días)</Label>
              <Input type="number" value={diagnosisForm.expectedRecoveryDays} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, expectedRecoveryDays: e.target.value })} />
            </div>
            <div>
              <Label>Nivel de dolor (0-10)</Label>
              <Input type="number" min={0} max={10} value={diagnosisForm.painLevel} onChange={(e) => setDiagnosisForm({ ...diagnosisForm, painLevel: e.target.value })} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Guardando..." : "Registrar diagnóstico"}
          </Button>
        </form>
      </Modal>

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
