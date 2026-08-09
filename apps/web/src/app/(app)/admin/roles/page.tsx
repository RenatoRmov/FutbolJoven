"use client";

import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { api, ApiError } from "@/lib/api-client";

interface Permission {
  id: string;
  key: string;
  description: string;
}

interface RoleWithPermissions {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  rolePermissions: { permission: Permission }[];
  _count: { users: number };
}

export default function RolesAdminPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<RoleWithPermissions[]>("/roles").then(setRoles);
  }

  useEffect(() => {
    load();
    api.get<Permission[]>("/roles/permissions").then(setPermissions);
  }, []);

  async function togglePermission(role: RoleWithPermissions, permissionId: string) {
    const current = role.rolePermissions.map((rp) => rp.permission.id);
    const next = current.includes(permissionId) ? current.filter((id) => id !== permissionId) : [...current, permissionId];
    await api.put(`/roles/${role.id}/permissions`, { permissionIds: next });
    load();
  }

  async function handleCreateRole(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/roles", { key: newRoleKey.toUpperCase().replace(/\s+/g, "_"), name: newRoleName, permissionIds: [] });
      setNewRoleKey("");
      setNewRoleName("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el rol");
    }
  }

  return (
    <div>
      <Header title="Roles y permisos" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Crear rol personalizado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRole} className="flex flex-wrap items-end gap-3">
              <div>
                <Label>Nombre visible</Label>
                <Input required value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Analista de Video" className="w-56" />
              </div>
              <div>
                <Label>Clave interna</Label>
                <Input required value={newRoleKey} onChange={(e) => setNewRoleKey(e.target.value)} placeholder="VIDEO_ANALYST" className="w-56" />
              </div>
              <Button type="submit">Crear rol</Button>
            </form>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </CardContent>
        </Card>

        {roles.map((role) => {
          const grantedIds = new Set(role.rolePermissions.map((rp) => rp.permission.id));
          return (
            <Card key={role.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>
                  {role.name} <span className="ml-2 text-xs font-normal text-slate-500">{role._count.users} usuarios</span>
                </CardTitle>
                {role.isSystem && <Badge tone="info">Rol del sistema</Badge>}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {permissions.map((p) => {
                  const granted = grantedIds.has(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePermission(role, p.id)} title={p.description}>
                      <Badge tone={granted ? "success" : "neutral"} className="cursor-pointer">
                        {p.key}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
