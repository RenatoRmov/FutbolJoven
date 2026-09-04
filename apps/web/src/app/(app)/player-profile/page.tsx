"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HEALTH_SYSTEM_LABELS, DOMINANT_FOOT_LABELS, PLAYER_GENDER_LABELS, PLAYER_STATUS_LABELS } from "@futboljoven/shared";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { PositionSelect } from "@/components/player/PositionSelect";
import { api, ApiError } from "@/lib/api-client";
import { Category, Player, Team } from "@/lib/types";

const emptyForm = {
  firstName: "",
  lastName: "",
  documentId: "",
  birthDate: "",
  nationality: "Chile",
  jerseyNumber: "",
  gender: "",
  address: "",
  phone: "",
  email: "",
  categoryId: "",
  teamId: "",
  primaryPosition: "" as string | null,
  dominantFoot: "",
  height: "",
  weight: "",
  status: "ACTIVE",
  joinDate: new Date().toISOString().slice(0, 10),
  notes: "",
  healthSystem: "",
  isapreName: "",
  fonasaTramo: "",
  allergies: "",
  chronicDiseases: "",
  permanentMedications: "",
  relevantPreviousInjuries: "",
  bloodType: "",
  medicalObservations: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  emergencyContactPhoneAlt: "",
  emergencyContactAddress: "",
};

type FormState = typeof emptyForm;

function playerToForm(p: Player, teams: Team[]): FormState {
  const team = teams.find((t) => t.id === p.currentTeamId);
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    documentId: p.documentId ?? "",
    birthDate: p.birthDate?.slice(0, 10) ?? "",
    nationality: p.nationality ?? "",
    jerseyNumber: p.jerseyNumber?.toString() ?? "",
    gender: p.gender ?? "",
    address: p.address ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    categoryId: team?.categoryId ?? "",
    teamId: p.currentTeamId ?? "",
    primaryPosition: p.primaryPosition,
    dominantFoot: p.dominantFoot ?? "",
    height: p.height?.toString() ?? "",
    weight: p.weight?.toString() ?? "",
    status: p.status,
    joinDate: p.joinDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    notes: p.notes ?? "",
    healthSystem: p.healthSystem ?? "",
    isapreName: p.isapreName ?? "",
    fonasaTramo: p.fonasaTramo ?? "",
    allergies: p.allergies ?? "",
    chronicDiseases: p.chronicDiseases ?? "",
    permanentMedications: p.permanentMedications ?? "",
    relevantPreviousInjuries: p.relevantPreviousInjuries ?? "",
    bloodType: p.bloodType ?? "",
    medicalObservations: p.medicalObservations ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactRelationship: p.emergencyContactRelationship ?? "",
    emergencyContactPhone: p.emergencyContactPhone ?? "",
    emergencyContactPhoneAlt: p.emergencyContactPhoneAlt ?? "",
    emergencyContactAddress: p.emergencyContactAddress ?? "",
  };
}

function PlayerProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerIdFromUrl = searchParams.get("playerId");

  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(playerIdFromUrl);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.get<Player[]>("/players").then(setPlayers);
    api.get<Category[]>("/categories").then(setCategories);
    api.get<Team[]>("/teams").then(setTeams);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setForm(emptyForm);
      return;
    }
    const player = players.find((p) => p.id === selectedId);
    if (player && teams.length > 0) setForm(playerToForm(player, teams));
  }, [selectedId, players, teams]);

  const teamsForCategory = useMemo(
    () => teams.filter((t) => t.categoryId === form.categoryId && t.season?.isActive),
    [teams, form.categoryId],
  );

  const filteredPlayers = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return players.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)).slice(0, 8);
  }, [search, players]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startNew() {
    setSelectedId(null);
    setForm(emptyForm);
    setSuccess(null);
    setError(null);
    router.replace("/player-profile");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        documentId: form.documentId || null,
        birthDate: form.birthDate,
        nationality: form.nationality || null,
        jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : null,
        gender: form.gender || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        teamId: form.teamId || null,
        primaryPosition: form.primaryPosition || null,
        dominantFoot: form.dominantFoot || null,
        height: form.height ? Number(form.height) : null,
        weight: form.weight ? Number(form.weight) : null,
        status: form.status,
        joinDate: form.joinDate,
        notes: form.notes || null,
        healthSystem: form.healthSystem || null,
        isapreName: form.isapreName || null,
        fonasaTramo: form.fonasaTramo || null,
        allergies: form.allergies || null,
        chronicDiseases: form.chronicDiseases || null,
        permanentMedications: form.permanentMedications || null,
        relevantPreviousInjuries: form.relevantPreviousInjuries || null,
        bloodType: form.bloodType || null,
        medicalObservations: form.medicalObservations || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactRelationship: form.emergencyContactRelationship || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        emergencyContactPhoneAlt: form.emergencyContactPhoneAlt || null,
        emergencyContactAddress: form.emergencyContactAddress || null,
      };

      if (selectedId) {
        const updated = await api.patch<Player>(`/players/${selectedId}`, payload);
        setPlayers((prev) => prev.map((p) => (p.id === selectedId ? updated : p)));
        setSuccess("Ficha actualizada.");
      } else {
        const created = await api.post<Player>("/players", payload);
        setPlayers((prev) => [...prev, created]);
        setSelectedId(created.id);
        router.replace(`/player-profile?playerId=${created.id}`);
        setSuccess("Jugador creado.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar la ficha");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!selectedId) return;
    if (!confirm("¿Dar de baja a este jugador? Queda marcado como \"Fuera del club\", no se borra su historial.")) return;
    setSaving(true);
    try {
      await api.delete(`/players/${selectedId}`);
      setSuccess("Jugador dado de baja.");
      const refreshed = await api.get<Player[]>("/players");
      setPlayers(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo dar de baja al jugador");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Header title="Ficha del Jugador" />
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 py-4">
            <div className="min-w-[240px] flex-1">
              <Label>Buscar jugador existente</Label>
              <Input placeholder="Nombre o apellido..." value={search} onChange={(e) => setSearch(e.target.value)} />
              {filteredPlayers.length > 0 && (
                <div className="mt-1 rounded-xl border border-borde bg-white shadow-club">
                  {filteredPlayers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gris-claro"
                      onClick={() => {
                        setSelectedId(p.id);
                        setSearch("");
                        router.replace(`/player-profile?playerId=${p.id}`);
                      }}
                    >
                      {p.firstName} {p.lastName}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="secondary" onClick={startNew}>
              + Nuevo jugador
            </Button>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Nombre</Label>
                <Input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
              </div>
              <div>
                <Label>Apellido</Label>
                <Input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
              </div>
              <div>
                <Label>RUT / Identificación</Label>
                <Input value={form.documentId} onChange={(e) => set("documentId", e.target.value)} />
              </div>
              <div>
                <Label>Fecha de nacimiento</Label>
                <Input type="date" required value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
              </div>
              <div>
                <Label>Nacionalidad</Label>
                <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
              </div>
              <div>
                <Label>Dorsal</Label>
                <Input type="number" min={0} max={99} value={form.jerseyNumber} onChange={(e) => set("jerseyNumber", e.target.value)} />
              </div>
              <div>
                <Label>Género</Label>
                <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Sin definir</option>
                  {Object.entries(PLAYER_GENDER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Club</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Categoría</Label>
                <Select
                  value={form.categoryId}
                  onChange={(e) => {
                    set("categoryId", e.target.value);
                    set("teamId", "");
                  }}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Equipo</Label>
                <Select value={form.teamId} onChange={(e) => set("teamId", e.target.value)} disabled={!form.categoryId}>
                  <option value="">Sin equipo</option>
                  {teamsForCategory.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {Object.entries(PLAYER_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <PositionSelect value={form.primaryPosition} onChange={(v) => set("primaryPosition", v)} />
              </div>
              <div>
                <Label>Pie hábil</Label>
                <Select value={form.dominantFoot} onChange={(e) => set("dominantFoot", e.target.value)}>
                  <option value="">Sin definir</option>
                  {Object.entries(DOMINANT_FOOT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input type="number" step="0.1" value={form.height} onChange={(e) => set("height", e.target.value)} />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={form.weight} onChange={(e) => set("weight", e.target.value)} />
              </div>
              <div>
                <Label>Fecha de ingreso al club</Label>
                <Input type="date" required value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Label>Notas</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información de Salud</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Sistema de salud</Label>
                <Select value={form.healthSystem} onChange={(e) => set("healthSystem", e.target.value)}>
                  <option value="">Sin definir</option>
                  {Object.entries(HEALTH_SYSTEM_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              {form.healthSystem === "ISAPRE" && (
                <div>
                  <Label>Nombre de la ISAPRE</Label>
                  <Input value={form.isapreName} onChange={(e) => set("isapreName", e.target.value)} />
                </div>
              )}
              {form.healthSystem === "FONASA" && (
                <div>
                  <Label>Tramo FONASA</Label>
                  <Input value={form.fonasaTramo} onChange={(e) => set("fonasaTramo", e.target.value)} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Antecedentes Médicos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Alergias</Label>
                <Textarea rows={2} value={form.allergies} onChange={(e) => set("allergies", e.target.value)} />
              </div>
              <div>
                <Label>Enfermedades crónicas</Label>
                <Textarea rows={2} value={form.chronicDiseases} onChange={(e) => set("chronicDiseases", e.target.value)} />
              </div>
              <div>
                <Label>Medicamentos de uso permanente</Label>
                <Textarea rows={2} value={form.permanentMedications} onChange={(e) => set("permanentMedications", e.target.value)} />
              </div>
              <div>
                <Label>Lesiones previas relevantes</Label>
                <Textarea rows={2} value={form.relevantPreviousInjuries} onChange={(e) => set("relevantPreviousInjuries", e.target.value)} />
              </div>
              <div>
                <Label>Grupo sanguíneo</Label>
                <Input value={form.bloodType} onChange={(e) => set("bloodType", e.target.value)} />
              </div>
              <div>
                <Label>Observaciones médicas</Label>
                <Textarea rows={2} value={form.medicalObservations} onChange={(e) => set("medicalObservations", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacto de Emergencia</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Nombre completo</Label>
                <Input value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
              </div>
              <div>
                <Label>Parentesco</Label>
                <Input value={form.emergencyContactRelationship} onChange={(e) => set("emergencyContactRelationship", e.target.value)} />
              </div>
              <div>
                <Label>Teléfono principal</Label>
                <Input value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} />
              </div>
              <div>
                <Label>Teléfono alternativo</Label>
                <Input value={form.emergencyContactPhoneAlt} onChange={(e) => set("emergencyContactPhoneAlt", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Dirección</Label>
                <Input value={form.emergencyContactAddress} onChange={(e) => set("emergencyContactAddress", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-rojo-oscuro">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : selectedId ? "Guardar cambios" : "Crear jugador"}
            </Button>
            {selectedId && (
              <Button type="button" variant="danger" onClick={handleDeactivate} disabled={saving}>
                Dar de baja
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlayerProfilePage() {
  return (
    <Suspense fallback={null}>
      <PlayerProfilePageInner />
    </Suspense>
  );
}
