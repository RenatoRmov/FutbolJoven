"use client";

import { useRef, useState } from "react";
import { PERMISSIONS } from "@futboljoven/shared";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface ImportRowResult {
  row: number;
  data: Record<string, unknown>;
  outcome: "valid" | "duplicate_in_file" | "error";
  action?: "create" | "update";
  errors?: string[];
}

interface ImportPreviewResponse {
  rows: ImportRowResult[];
  summary: { toCreate: number; toUpdate: number; duplicates: number; errors: number; total: number };
}

interface ImportConfirmResponse {
  imported: number;
  updated: number;
  skipped: number;
}

const OUTCOME_TONE: Record<string, "success" | "warning" | "danger"> = {
  valid: "success",
  duplicate_in_file: "warning",
  error: "danger",
};
const OUTCOME_LABEL: Record<string, string> = {
  valid: "OK",
  duplicate_in_file: "Duplicado en archivo",
  error: "Error",
};

export default function ImportExportPage() {
  const { hasPermission } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [result, setResult] = useState<ImportConfirmResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canImport = hasPermission(PERMISSIONS.DATA_IMPORT);
  const canExport = hasPermission(PERMISSIONS.DATA_EXPORT);

  async function handleDownloadTemplate() {
    await api.download("/import/players/template", "plantilla_jugadores.xlsx");
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setPreview(null);
    setLoading(true);
    try {
      const res = await api.postFile<ImportPreviewResponse>("/import/players/preview", file);
      setPreview(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo leer el archivo");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ImportConfirmResponse>("/import/players/confirm", { rows: preview.rows });
      setResult(res);
      setPreview(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar la importación");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    await api.download("/export/players", "jugadores.xlsx");
  }

  return (
    <div>
      <Header title="Importar / Exportar" />
      <div className="space-y-6 p-6">
        {canImport && (
          <Card>
            <CardHeader>
              <CardTitle>Importar jugadores desde Excel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Descargá la plantilla, completá los datos y subí el archivo. Vas a poder revisar una vista previa antes de confirmar —
                nunca se importa nada automáticamente.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={handleDownloadTemplate}>
                  Descargar plantilla
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
                  {loading ? "Procesando..." : "Subir archivo (.xlsx)"}
                </Button>
                <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileSelected} />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              {result && (
                <div className="rounded-lg border border-pitch-700 bg-pitch-900/40 p-4 text-sm">
                  <p className="mb-2 font-medium text-slate-200">Importación completada</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="success">Importados: {result.imported}</Badge>
                    <Badge tone="info">Actualizados: {result.updated}</Badge>
                    {result.skipped > 0 && <Badge tone="warning">Omitidos: {result.skipped}</Badge>}
                  </div>
                </div>
              )}

              {preview && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="success">A crear: {preview.summary.toCreate}</Badge>
                    <Badge tone="info">A actualizar: {preview.summary.toUpdate}</Badge>
                    <Badge tone="warning">Duplicados: {preview.summary.duplicates}</Badge>
                    <Badge tone="danger">Errores: {preview.summary.errors}</Badge>
                    <Badge tone="neutral">Total filas: {preview.summary.total}</Badge>
                  </div>

                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Fila</Th>
                        <Th>Nombre</Th>
                        <Th>Categoría</Th>
                        <Th>Estado</Th>
                        <Th>Detalle</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {preview.rows.map((r) => (
                        <Tr key={r.row}>
                          <Td>{r.row}</Td>
                          <Td>
                            {String(r.data.firstName ?? "")} {String(r.data.lastName ?? "")}
                          </Td>
                          <Td>{String(r.data.category ?? "")}</Td>
                          <Td>
                            <Badge tone={OUTCOME_TONE[r.outcome]}>
                              {r.outcome === "valid" ? (r.action === "update" ? "Actualizar" : "Crear") : OUTCOME_LABEL[r.outcome]}
                            </Badge>
                          </Td>
                          <Td className="max-w-xs text-xs text-slate-400">{r.errors?.join("; ")}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>

                  <Button onClick={handleConfirm} disabled={loading || preview.summary.toCreate + preview.summary.toUpdate === 0}>
                    Confirmar importación ({preview.summary.toCreate + preview.summary.toUpdate} jugadores)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canExport && (
          <Card>
            <CardHeader>
              <CardTitle>Exportar jugadores a Excel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-slate-400">Descarga un Excel con los jugadores que podés ver, según tu rol y equipos asignados.</p>
              <Button variant="secondary" onClick={handleExport}>
                Exportar jugadores
              </Button>
            </CardContent>
          </Card>
        )}

        {!canImport && !canExport && <EmptyState title="No tenés permisos para importar ni exportar información" />}
      </div>
    </div>
  );
}
