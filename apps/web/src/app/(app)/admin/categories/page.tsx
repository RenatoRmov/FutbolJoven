"use client";

import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { api, ApiError } from "@/lib/api-client";
import { Category } from "@/lib/types";

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState(1);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<Category[]>("/categories").then(setCategories);
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/categories", {
        name,
        order,
        minAge: minAge ? Number(minAge) : null,
        maxAge: maxAge ? Number(maxAge) : null,
        isActive: true,
      });
      setName("");
      setOrder((o) => o + 1);
      setMinAge("");
      setMaxAge("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la categoría");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Category) {
    await api.patch(`/categories/${c.id}`, { isActive: !c.isActive });
    load();
  }

  return (
    <div>
      <Header title="Categorías" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Nueva categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Nombre</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sub-19" className="w-40" />
              </div>
              <div>
                <Label>Orden</Label>
                <Input required type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="w-24" />
              </div>
              <div>
                <Label>Edad mín.</Label>
                <Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} className="w-24" />
              </div>
              <div>
                <Label>Edad máx.</Label>
                <Input type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className="w-24" />
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
              <Th>Orden</Th>
              <Th>Nombre</Th>
              <Th>Rango de edad</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {categories
              .sort((a, b) => a.order - b.order)
              .map((c) => (
                <Tr key={c.id}>
                  <Td>{c.order}</Td>
                  <Td className="font-medium text-carbon">{c.name}</Td>
                  <Td>{c.minAge && c.maxAge ? `${c.minAge}-${c.maxAge} años` : "—"}</Td>
                  <Td>{c.isActive ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}</Td>
                  <Td>
                    <Button size="sm" variant="secondary" onClick={() => toggleActive(c)}>
                      {c.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </Td>
                </Tr>
              ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
