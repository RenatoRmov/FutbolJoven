"use client";

import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { api, ApiError } from "@/lib/api-client";
import { Category, Season, Team } from "@/lib/types";

export default function TeamsAdminPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Team[]>("/teams").then(setTeams);
  }

  useEffect(() => {
    load();
    api.get<Category[]>("/categories").then(setCategories);
    api.get<Season[]>("/seasons").then(setSeasons);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/teams", { name, categoryId, seasonId });
      setName("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el equipo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Header title="Equipos" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Nombre</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sub-15 2027" className="w-48" />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-44">
                  <option value="">Seleccionar</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Temporada</Label>
                <Select required value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="w-44">
                  <option value="">Seleccionar</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={saving}>
                Crear
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-rojo-oscuro">{error}</p>}
          </CardContent>
        </Card>

        <Table>
          <Thead>
            <Tr>
              <Th>Equipo</Th>
              <Th>Categoría</Th>
              <Th>Temporada</Th>
              <Th>Jugadores</Th>
            </Tr>
          </Thead>
          <Tbody>
            {teams.map((t) => (
              <Tr key={t.id}>
                <Td className="font-medium text-carbon">{t.name}</Td>
                <Td>{t.category?.name}</Td>
                <Td>{t.season?.name}</Td>
                <Td>{t._count?.players ?? 0}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
