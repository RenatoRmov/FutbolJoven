"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { api } from "@/lib/api-client";
import { calculateAge, Category, Player, POSITION_LABELS, STATUS_LABELS, STATUS_TONE, Team } from "@/lib/types";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories);
    api.get<Team[]>("/teams").then(setTeams);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (status) params.set("status", status);
    const t = setTimeout(() => {
      api
        .get<Player[]>(`/players?${params.toString()}`)
        .then(setPlayers)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, categoryId, status]);

  const teamNameById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  return (
    <div>
      <Header title="Jugadores" />
      <div className="p-6">
        <Card className="mb-4">
          <CardContent className="flex flex-wrap gap-3 py-4">
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="max-w-[200px]">
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[180px]">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}

        {!loading && players && players.length === 0 && (
          <EmptyState title="No se encontraron jugadores" description="Probá ajustar los filtros de búsqueda." />
        )}

        {!loading && players && players.length > 0 && (
          <Table>
            <Thead>
              <Tr>
                <Th>Jugador</Th>
                <Th>Categoría</Th>
                <Th>Posición</Th>
                <Th>Edad</Th>
                <Th>Dorsal</Th>
                <Th>Estado</Th>
              </Tr>
            </Thead>
            <Tbody>
              {players.map((p) => {
                const team = p.currentTeamId ? teamNameById.get(p.currentTeamId) : undefined;
                return (
                  <Tr key={p.id}>
                    <Td>
                      <Link href={`/players/${p.id}`} className="font-medium text-carbon hover:text-rojo">
                        {p.firstName} {p.lastName}
                      </Link>
                    </Td>
                    <Td>{team?.category?.name ?? "—"}</Td>
                    <Td>{p.primaryPosition ? POSITION_LABELS[p.primaryPosition] ?? p.primaryPosition : "—"}</Td>
                    <Td>{calculateAge(p.birthDate)}</Td>
                    <Td>{p.jerseyNumber ?? "—"}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
