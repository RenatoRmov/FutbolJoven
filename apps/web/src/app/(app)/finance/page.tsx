"use client";

import { FormEvent, useEffect, useState } from "react";
import { FINANCIAL_CATEGORY_SUGGESTIONS, FINANCIAL_ENTRY_TYPE_LABELS, PERMISSIONS } from "@futboljoven/shared";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, EmptyState } from "@/components/ui/Skeleton";
import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface FinancialEntry {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  description: string | null;
  recordedBy: { firstName: string; lastName: string };
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byMonth: { month: string; income: number; expense: number; balance: number }[];
}

const emptyForm = { date: new Date().toISOString().slice(0, 10), type: "EXPENSE", category: FINANCIAL_CATEGORY_SUGGESTIONS[0], amount: "", description: "" };

function formatCLP(value: number) {
  return value.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

export default function FinancePage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.FINANCE_MANAGE);
  const [entries, setEntries] = useState<FinancialEntry[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<FinancialEntry[]>("/finance").then(setEntries);
    api.get<Summary>("/finance/summary").then(setSummary);
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post("/finance", { ...form, amount: Number(form.amount) });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el movimiento");
    } finally {
      setSaving(false);
    }
  }

  const balanceChartData = (summary?.byMonth ?? []).map((m) => ({ categoryName: m.month, avgNotaFinal: m.balance, playerCount: 0 }));

  return (
    <div>
      <Header title="Financiero" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Ingresos totales" value={summary ? formatCLP(summary.totalIncome) : "—"} tone="success" />
          <KpiCard label="Gastos totales" value={summary ? formatCLP(summary.totalExpense) : "—"} tone="danger" />
          <KpiCard label="Balance" value={summary ? formatCLP(summary.balance) : "—"} tone={summary && summary.balance < 0 ? "danger" : "neutral"} />
        </div>

        {balanceChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Balance mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBarChart data={balanceChartData} />
            </CardContent>
          </Card>
        )}

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Nuevo movimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-5">
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {Object.entries(FINANCIAL_ENTRY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input list="finance-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <datalist id="finance-categories">
                    {FINANCIAL_CATEGORY_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label>Monto (CLP)</Label>
                  <Input type="number" min={1} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="md:col-span-5">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Registrar movimiento"}
                  </Button>
                </div>
              </form>
              {error && <p className="mt-2 text-sm text-rojo-oscuro">{error}</p>}
            </CardContent>
          </Card>
        )}

        {!entries && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}

        {entries && entries.length === 0 && <EmptyState title="Sin movimientos registrados" />}

        {entries && entries.length > 0 && (
          <Table>
            <Thead>
              <Tr>
                <Th>Fecha</Th>
                <Th>Tipo</Th>
                <Th>Categoría</Th>
                <Th>Monto</Th>
                <Th>Descripción</Th>
                <Th>Registrado por</Th>
              </Tr>
            </Thead>
            <Tbody>
              {entries.map((e) => (
                <Tr key={e.id}>
                  <Td>{new Date(e.date).toLocaleDateString("es-CL")}</Td>
                  <Td>
                    <Badge tone={e.type === "INCOME" ? "success" : "danger"}>{FINANCIAL_ENTRY_TYPE_LABELS[e.type]}</Badge>
                  </Td>
                  <Td>{e.category}</Td>
                  <Td className="font-semibold">{formatCLP(e.amount)}</Td>
                  <Td className="text-gris">{e.description ?? "—"}</Td>
                  <Td className="text-gris">
                    {e.recordedBy.firstName} {e.recordedBy.lastName}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
