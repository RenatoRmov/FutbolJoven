"use client";

import { FormEvent, useEffect, useState } from "react";
import { PERMISSIONS } from "@futboljoven/shared";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Category } from "@/lib/types";

interface InventoryItem {
  id: string;
  name: string;
  itemType: string | null;
  quantity: number;
  neededQuantity: number | null;
  toPurchase: number | null;
  condition: string | null;
  observations: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
}

const CONDITIONS = ["Bueno", "Regular", "Malo"];

const emptyForm = { name: "", itemType: "", quantity: "1", neededQuantity: "", toPurchase: "", condition: "Bueno", categoryId: "", observations: "" };

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.INVENTORY_MANAGE);
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(filter?: string) {
    api.get<InventoryItem[]>(`/inventory${filter ? `?categoryId=${filter}` : ""}`).then(setItems);
  }

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setItems(null);
    load(categoryFilter || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      itemType: item.itemType ?? "",
      quantity: String(item.quantity),
      neededQuantity: item.neededQuantity !== null ? String(item.neededQuantity) : "",
      toPurchase: item.toPurchase !== null ? String(item.toPurchase) : "",
      condition: item.condition ?? "Bueno",
      categoryId: item.categoryId ?? "",
      observations: item.observations ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        itemType: form.itemType || null,
        quantity: Number(form.quantity),
        neededQuantity: form.neededQuantity ? Number(form.neededQuantity) : null,
        toPurchase: form.toPurchase ? Number(form.toPurchase) : null,
        condition: form.condition || null,
        categoryId: form.categoryId || null,
        observations: form.observations || null,
      };
      if (editingId) {
        await api.patch(`/inventory/${editingId}`, payload);
      } else {
        await api.post("/inventory", payload);
      }
      cancelEdit();
      load(categoryFilter || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el ítem");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este ítem del inventario?")) return;
    await api.delete(`/inventory/${id}`);
    load(categoryFilter || undefined);
  }

  return (
    <div>
      <Header title="Inventario" />
      <div className="space-y-6 p-6">
        <div className="flex items-end justify-between">
          <div>
            <Label>Categoría</Label>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-56">
              <option value="">Todas (general + categorías)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" size="sm" onClick={() => api.download("/export/inventory", "inventario.xlsx")}>
            Exportar Excel
          </Button>
        </div>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Editar ítem" : "Nuevo ítem"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label>Nombre</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Input placeholder="Balones, Indumentaria..." value={form.itemType} onChange={(e) => setForm({ ...form, itemType: e.target.value })} />
                </div>
                <div>
                  <Label>Cantidad</Label>
                  <Input type="number" min={0} required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div>
                  <Label>Cantidad necesaria</Label>
                  <Input type="number" min={0} value={form.neededQuantity} onChange={(e) => setForm({ ...form, neededQuantity: e.target.value })} />
                </div>
                <div>
                  <Label>A comprar</Label>
                  <Input type="number" min={0} value={form.toPurchase} onChange={(e) => setForm({ ...form, toPurchase: e.target.value })} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">General (todo el club)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label>Observaciones</Label>
                  <Input value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
                </div>
                <div className="flex items-end gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar ítem"}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="secondary" onClick={cancelEdit}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
              {error && <p className="mt-2 text-sm text-rojo-oscuro">{error}</p>}
            </CardContent>
          </Card>
        )}

        {!items && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}

        {items && items.length === 0 && <EmptyState title="Sin ítems de inventario registrados" />}

        {items && items.length > 0 && (
          <Table>
            <Thead>
              <Tr>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Cantidad</Th>
                <Th>Cantidad necesaria</Th>
                <Th>A comprar</Th>
                <Th>Estado</Th>
                <Th>Categoría</Th>
                <Th>Observaciones</Th>
                {canManage && <Th>Acciones</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td className="font-medium text-carbon">{item.name}</Td>
                  <Td className="text-gris">{item.itemType ?? "—"}</Td>
                  <Td>{item.quantity}</Td>
                  <Td className="text-gris">{item.neededQuantity ?? "—"}</Td>
                  <Td className={item.toPurchase ? "font-medium text-rojo-oscuro" : "text-gris"}>{item.toPurchase ?? "—"}</Td>
                  <Td>
                    {item.condition && (
                      <Badge tone={item.condition === "Bueno" ? "success" : item.condition === "Regular" ? "warning" : "danger"}>{item.condition}</Badge>
                    )}
                  </Td>
                  <Td className="text-gris">{item.category?.name ?? "General"}</Td>
                  <Td className="text-gris">{item.observations ?? "—"}</Td>
                  {canManage && (
                    <Td>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                          Editar
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleDelete(item.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
