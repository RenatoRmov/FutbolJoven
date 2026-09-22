"use client";

import { Fragment, FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { api, ApiError } from "@/lib/api-client";
import { Team } from "@/lib/types";

interface RoleOption {
  id: string;
  key: string;
  name: string;
}

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: { id: string; name: string };
  teamAssignments: { team: { id: string; name: string } }[];
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "", roleId: "" });
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", password: "", firstName: "", lastName: "", roleId: "" });
  const [editTeams, setEditTeams] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function load() {
    api.get<UserRow[]>("/users").then(setUsers);
  }

  useEffect(() => {
    load();
    api.get<{ id: string; key: string; name: string }[]>("/roles").then(setRoles);
    api.get<Team[]>("/teams").then(setTeams);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/users", { ...form, teamIds: selectedTeams });
      setForm({ email: "", password: "", firstName: "", lastName: "", roleId: "" });
      setSelectedTeams([]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
    load();
  }

  function startEdit(u: UserRow) {
    setEditingUserId(u.id);
    setEditError(null);
    setEditForm({ email: u.email, password: "", firstName: u.firstName, lastName: u.lastName, roleId: u.role.id });
    setEditTeams(u.teamAssignments.map((a) => a.team.id));
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditError(null);
  }

  async function handleSaveEdit(e: FormEvent, userId: string) {
    e.preventDefault();
    setEditError(null);
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        roleId: editForm.roleId,
        teamIds: editTeams,
      };
      if (editForm.password) body.password = editForm.password;
      await api.patch(`/users/${userId}`, body);
      setEditingUserId(null);
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "No se pudo guardar los cambios");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(u: UserRow) {
    if (!confirm(`¿Eliminar permanentemente a ${u.firstName} ${u.lastName}? Esta acción no se puede deshacer.`)) return;
    setError(null);
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar el usuario");
    }
  }

  return (
    <div>
      <Header title="Usuarios" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Nuevo usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div>
                  <Label>Nombre</Label>
                  <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-40" />
                </div>
                <div>
                  <Label>Apellido</Label>
                  <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-40" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-56" />
                </div>
                <div>
                  <Label>Contraseña</Label>
                  <Input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-40" />
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-52">
                    <option value="">Seleccionar</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Equipos asignados (para roles con acceso restringido)</Label>
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => {
                    const active = selectedTeams.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() =>
                          setSelectedTeams((prev) => (active ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                        }
                      >
                        <Badge tone={active ? "success" : "neutral"} className="cursor-pointer">
                          {t.name}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                Crear usuario
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-rojo-oscuro">{error}</p>}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-rojo-oscuro">{error}</p>}

        <Table>
          <Thead>
            <Tr>
              <Th>Usuario</Th>
              <Th>Email</Th>
              <Th>Rol</Th>
              <Th>Equipos</Th>
              <Th>Estado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((u) => (
              <Fragment key={u.id}>
                <Tr>
                  <Td className="font-medium text-carbon">
                    {u.firstName} {u.lastName}
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>{u.role.name}</Td>
                  <Td>{u.teamAssignments.map((a) => a.team.name).join(", ") || "—"}</Td>
                  <Td>{u.isActive ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}</Td>
                  <Td className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => (editingUserId === u.id ? cancelEdit() : startEdit(u))}>
                      {editingUserId === u.id ? "Cancelar" : "Editar"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleActive(u)}>
                      {u.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(u)}>
                      Eliminar
                    </Button>
                  </Td>
                </Tr>
                {editingUserId === u.id && (
                  <Tr key={`${u.id}-edit`}>
                    <Td colSpan={6}>
                      <form onSubmit={(e) => handleSaveEdit(e, u.id)} className="space-y-3 rounded-xl border border-borde bg-gris-claro/40 p-3">
                        <div className="flex flex-wrap gap-3">
                          <div>
                            <Label>Nombre</Label>
                            <Input required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-40" />
                          </div>
                          <div>
                            <Label>Apellido</Label>
                            <Input required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-40" />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input required type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-56" />
                          </div>
                          <div>
                            <Label>Nueva contraseña (opcional)</Label>
                            <Input
                              type="password"
                              minLength={8}
                              placeholder="Dejar vacío para no cambiarla"
                              value={editForm.password}
                              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                              className="w-56"
                            />
                          </div>
                          <div>
                            <Label>Rol</Label>
                            <Select required value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} className="w-52">
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Equipos asignados (para roles con acceso restringido)</Label>
                          <div className="flex flex-wrap gap-2">
                            {teams.map((t) => {
                              const active = editTeams.includes(t.id);
                              return (
                                <button
                                  type="button"
                                  key={t.id}
                                  onClick={() => setEditTeams((prev) => (active ? prev.filter((id) => id !== t.id) : [...prev, t.id]))}
                                >
                                  <Badge tone={active ? "success" : "neutral"} className="cursor-pointer">
                                    {t.name}
                                  </Badge>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {editError && <p className="text-sm text-rojo-oscuro">{editError}</p>}
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={editSaving}>
                            {editSaving ? "Guardando..." : "Guardar cambios"}
                          </Button>
                          <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    </Td>
                  </Tr>
                )}
              </Fragment>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
