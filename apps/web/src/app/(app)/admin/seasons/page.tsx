"use client";

import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { api, ApiError } from "@/lib/api-client";
import { Season } from "@/lib/types";

export default function SeasonsAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Season[]>("/seasons").then(setSeasons);
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/seasons", { name, startDate, endDate, isActive: false });
      setName("");
      setStartDate("");
      setEndDate("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la temporada");
    } finally {
      setSaving(false);
    }
  }

  async function activate(id: string) {
    await api.patch(`/seasons/${id}`, { isActive: true });
    load();
  }

  return (
    <div>
      <Header title="Temporadas" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Nueva temporada</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Nombre</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Temporada 2027" className="w-52" />
              </div>
              <div>
                <Label>Inicio</Label>
                <Input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                Crear
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </CardContent>
        </Card>

        <Table>
          <Thead>
            <Tr>
              <Th>Nombre</Th>
              <Th>Inicio</Th>
              <Th>Fin</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {seasons.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-slate-100">{s.name}</Td>
                <Td>{new Date(s.startDate).toLocaleDateString("es-AR")}</Td>
                <Td>{new Date(s.endDate).toLocaleDateString("es-AR")}</Td>
                <Td>{s.isActive ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}</Td>
                <Td>
                  {!s.isActive && (
                    <Button size="sm" variant="secondary" onClick={() => activate(s.id)}>
                      Activar
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
