"use client";

import { FormEvent, useEffect, useState } from "react";
import { PERMISSIONS } from "@futboljoven/shared";
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

const P = PERMISSIONS;

/**
 * "Ver" maps to one club-wide view permission per module (never the
 * team-scoped _ASSIGNED variant — that's what the seeded COACH role
 * already covers). "Gestionar" is every edit/create/delete permission for
 * that module, toggled together: a role either can touch that screen's
 * data or it can't, which is exactly the "solo ver, sin poder editar"
 * distinction admins actually need day to day. Team-scoped (_ASSIGNED)
 * combinations stay reachable in "Permisos avanzados" below.
 */
const MODULES: { label: string; view?: string; manage: string[] }[] = [
  { label: "Dashboard", view: P.DASHBOARD_VIEW_GLOBAL, manage: [] },
  { label: "Jugadores", view: P.PLAYERS_VIEW_ALL, manage: [P.PLAYERS_CREATE, P.PLAYERS_EDIT_ALL, P.PLAYERS_DELETE] },
  { label: "Evaluaciones", view: P.EVALUATIONS_VIEW_ALL, manage: [P.EVALUATIONS_CREATE_ALL, P.EVALUATIONS_CONFIG_MANAGE] },
  { label: "Fixture", view: P.FIXTURES_VIEW_ALL, manage: [P.FIXTURES_MANAGE_ALL] },
  { label: "Médica y Rendimiento Físico", view: P.PHYSICAL_VIEW, manage: [P.PHYSICAL_MANAGE] },
  { label: "Nutrición", view: P.NUTRITION_VIEW, manage: [P.NUTRITION_MANAGE] },
  { label: "Documentación", view: P.PLAYERS_DOCUMENTS_VIEW, manage: [P.PLAYERS_DOCUMENTS_MANAGE] },
  { label: "Financiero", view: P.FINANCE_VIEW, manage: [P.FINANCE_MANAGE] },
  { label: "Inventario", view: P.INVENTORY_VIEW, manage: [P.INVENTORY_MANAGE] },
  { label: "Auditoría", view: P.AUDIT_VIEW, manage: [] },
  { label: "Reportes y exportación", manage: [P.REPORTS_GENERATE, P.DATA_EXPORT, P.DATA_IMPORT] },
  { label: "Administración del sistema", manage: [P.SYSTEM_CONFIGURE, P.USERS_MANAGE, P.ROLES_MANAGE, P.SEASONS_MANAGE, P.CATEGORIES_MANAGE, P.TEAMS_MANAGE] },
];

export default function RolesAdminPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [advancedRoleId, setAdvancedRoleId] = useState<string | null>(null);

  function load() {
    api.get<RoleWithPermissions[]>("/roles").then(setRoles);
  }

  useEffect(() => {
    load();
    api.get<Permission[]>("/roles/permissions").then(setPermissions);
  }, []);

  function idsForKeys(keys: string[]): string[] {
    return permissions.filter((p) => keys.includes(p.key)).map((p) => p.id);
  }

  async function togglePermission(role: RoleWithPermissions, permissionId: string) {
    const current = role.rolePermissions.map((rp) => rp.permission.id);
    const next = current.includes(permissionId) ? current.filter((id) => id !== permissionId) : [...current, permissionId];
    await api.put(`/roles/${role.id}/permissions`, { permissionIds: next });
    load();
  }

  async function toggleGroup(role: RoleWithPermissions, keys: string[]) {
    const groupIds = idsForKeys(keys);
    if (groupIds.length === 0) return;
    const current = new Set(role.rolePermissions.map((rp) => rp.permission.id));
    const allGranted = groupIds.every((id) => current.has(id));
    const next = allGranted ? [...current].filter((id) => !groupIds.includes(id)) : [...new Set([...current, ...groupIds])];
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
                <Input required value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Directorio (solo lectura)" className="w-64" />
              </div>
              <div>
                <Label>Clave interna</Label>
                <Input required value={newRoleKey} onChange={(e) => setNewRoleKey(e.target.value)} placeholder="DIRECTORIO_LECTURA" className="w-56" />
              </div>
              <Button type="submit">Crear rol</Button>
            </form>
            {error && <p className="mt-2 text-sm text-rojo-oscuro">{error}</p>}
            <p className="mt-2 text-xs text-gris">
              Un rol nuevo empieza sin ningún permiso. Marcá "Ver" en las pantallas que necesite — sin tocar "Gestionar" — y va a poder entrar a mirar esas pantallas sin poder crear, editar ni eliminar nada.
            </p>
          </CardContent>
        </Card>

        {roles.map((role) => {
          const grantedIds = new Set(role.rolePermissions.map((rp) => rp.permission.id));
          const isAdvanced = advancedRoleId === role.id;
          return (
            <Card key={role.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>
                  {role.name} <span className="ml-2 text-xs font-normal text-gris">{role._count.users} usuarios</span>
                </CardTitle>
                {role.isSystem && <Badge tone="info">Rol del sistema</Badge>}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gris">
                        <th className="py-1.5 pr-2">Pantalla</th>
                        <th className="w-24 px-2 text-center">Ver</th>
                        <th className="w-28 px-2 text-center">Gestionar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod) => {
                        const viewId = mod.view ? idsForKeys([mod.view])[0] : undefined;
                        const viewGranted = viewId ? grantedIds.has(viewId) : false;
                        const manageIds = idsForKeys(mod.manage);
                        const manageGranted = manageIds.length > 0 && manageIds.every((id) => grantedIds.has(id));
                        return (
                          <tr key={mod.label} className="border-t border-borde">
                            <td className="py-1.5 pr-2 font-medium text-carbon">{mod.label}</td>
                            <td className="px-2 text-center">
                              {viewId && (
                                <input
                                  type="checkbox"
                                  checked={viewGranted}
                                  onChange={() => togglePermission(role, viewId)}
                                  aria-label={`Ver ${mod.label}`}
                                />
                              )}
                            </td>
                            <td className="px-2 text-center">
                              {manageIds.length > 0 && (
                                <input
                                  type="checkbox"
                                  checked={manageGranted}
                                  onChange={() => toggleGroup(role, mod.manage)}
                                  aria-label={`Gestionar ${mod.label}`}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  className="mt-3 text-xs text-rojo hover:underline"
                  onClick={() => setAdvancedRoleId(isAdvanced ? null : role.id)}
                >
                  {isAdvanced ? "Ocultar permisos avanzados" : "Ver permisos avanzados (incluye accesos por equipo asignado)"}
                </button>

                {isAdvanced && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-borde pt-3">
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
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
