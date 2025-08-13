// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Download, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { CODE_LABELS, CODE_KEYS } from "@/lib/code-labels";
import { sha256OfFile } from "@/lib/hash";
import { repoDexie } from "@/lib/repo-dexie";
import type { ConsolidatedRow } from "@/lib/repo";
import { readOfficialXlsx, type OfficialRow } from "@/lib/import-excel";
import TablaAgregada from "@/components/TablaAgregada/TablaAgregada";
import ControlTables from "@/components/Control/ControlTables";
import { buildControlCsvSummary, type ControlOk as ControlOkRow } from "@/lib/export-control";
import type { ControlSummary } from "@/lib/control-types";
import { buildAggregatedCsv } from "@/lib/export-aggregated";

type UploadItem = { name: string; status: "pending" | "ok" | "error" };

const LS_KEY = "recibos_v1";
const BASE_COLS = ["LEGAJO", "PERIODO", "NOMBRE", "ARCHIVO"] as const;

/* -------------------------- helpers -------------------------- */

function periodoToNum(p: string): number {
  const [mm = "00", yyyy = "0000"] = p.split("/");
  return Number(yyyy) * 100 + Number(mm);
}
function compareByKey(a: { legajo: string; periodo: string }, b: { legajo: string; periodo: string }): number {
  const la = Number(a.legajo) || 0;
  const lb = Number(b.legajo) || 0;
  if (la !== lb) return la - lb;
  return periodoToNum(a.periodo) - periodoToNum(b.periodo);
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

type UploadResponse = {
  id?: string;
  name?: string;
  link?: string;
  csv?: { updated?: boolean; key?: string };
  error?: string;
};
function parseUploadResponse(u: unknown): UploadResponse {
  if (typeof u !== "object" || u === null) return {};
  const o = u as Record<string, unknown>;
  const c = (o.csv as Record<string, unknown> | undefined) ?? undefined;
  return {
    id: typeof o.id === "string" ? o.id : undefined,
    name: typeof o.name === "string" ? o.name : undefined,
    link: typeof o.link === "string" ? o.link : undefined,
    error: typeof o.error === "string" ? o.error : undefined,
    csv: c
      ? {
          updated: typeof c.updated === "boolean" ? c.updated : undefined,
          key: typeof c.key === "string" ? c.key : undefined,
        }
      : undefined,
  };
}

type CleanupResponse = { ok?: boolean; deleted?: number; error?: string };
function parseCleanupResponse(u: unknown): CleanupResponse {
  if (typeof u !== "object" || u === null) return {};
  const o = u as Record<string, unknown>;
  return {
    ok: typeof o.ok === "boolean" ? o.ok : undefined,
    deleted: typeof o.deleted === "number" ? o.deleted : undefined,
    error: typeof o.error === "string" ? o.error : undefined,
  };
}

/* --------------------------- page ---------------------------- */

export default function Page() {
  const [consolidated, setConsolidated] = useState<ConsolidatedRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Control (agregado por Legajo/Período)
  const [controlLoading, setControlLoading] = useState(false);
  const [controlSummaries, setControlSummaries] = useState<ControlSummary[]>([]);
  const [controlOKs, setControlOKs] = useState<ControlOkRow[]>([]);
  const [showOks, setShowOks] = useState(false);
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});
  const [controlMissing, setControlMissing] = useState<Array<{ key: string; legajo: string; periodo: string }>>([]);
  const [officialKeys, setOfficialKeys] = useState<string[]>([]);
  const [tolerance, setTolerance] = useState(0.01);
  const [controlStats, setControlStats] = useState({
    comps: 0,
    compOk: 0,
    compDif: 0,
    okReceipts: 0,
    difReceipts: 0,
  });

  // nombres del Excel oficial (fallback si el PDF no lo trae)
  const [officialNameByKey, setOfficialNameByKey] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleCols = useMemo<string[]>(() => [...BASE_COLS, ...CODE_KEYS], []);

  // Mapa final de nombres para UI/CSV (consolidado > oficial)
  const nameByKey = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const r of consolidated) {
      const nm = r.nombre || r.data.NOMBRE;
      if (nm) m[r.key] = nm;
    }
    for (const [k, v] of Object.entries(officialNameByKey)) {
      if (!m[k] && v) m[k] = v;
    }
    return m;
  }, [consolidated, officialNameByKey]);

  useEffect(() => {
    void loadConsolidated();
    if (navigator?.storage?.persist) navigator.storage.persist().catch(() => {});
  }, []);

  async function loadConsolidated(): Promise<void> {
    const count = await repoDexie.countConsolidated();
    setTotalRows(count);
    const page = await repoDexie.getConsolidatedPage({ offset: 0, limit: Math.max(1, count) });
    setConsolidated(page);
  }

  /* -------------------- subir PDFs + dedupe -------------------- */

  const handleFiles = useCallback(async (files: FileList): Promise<void> => {
    const arr = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (arr.length === 0) {
      toast.info("Sin PDFs", { description: "Selecciona al menos un archivo PDF." });
      return;
    }

    setUploads(arr.map((f) => ({ name: f.name, status: "pending" as const })));

    // único import dinámico (no duplicar dentro del bucle)
    const { parsePdfReceiptToRecord } = await import("@/lib/pdf-parser");

    let ok = 0,
      skip = 0,
      fail = 0;

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const tid = toast.loading(`Procesando ${file.name} (${i + 1}/${arr.length})`);
      try {
        const hash = await sha256OfFile(file);

        // dedupe por hash
        if (await repoDexie.hasFileHash(hash)) {
          skip++;
          setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "ok" } : u)));
          toast.info(`Omitido (duplicado): ${file.name}`, { id: tid });
          continue;
        }

        // parsear PDF
        const res = await parsePdfReceiptToRecord(file);
        const parsed = (res?.data ?? {}) as Record<string, string>;
        const legajo = String(parsed.LEGAJO ?? "").trim();
        const periodo = String(parsed.PERIODO ?? "").trim();
        if (!legajo || !periodo) throw new Error("No se pudo detectar LEGAJO o PERIODO");

        // nombre: PDF o Excel oficial (fallback)
        const key = `${legajo}||${periodo}`;
        let nombre = (parsed.NOMBRE ?? "").trim();
        if (!nombre && officialNameByKey[key]) nombre = officialNameByKey[key];

        // subir archivo a /public/recibos
        let uploadedName = file.name;
        try {
          const fd = new FormData();
          fd.append("file", file, file.name);
          fd.append("key", key);
          const r = await fetch("/api/upload", { method: "POST", body: fd });
          const raw: unknown = await r.json();
          const j = parseUploadResponse(raw);
          if (!r.ok) throw new Error(j.error || "Upload error");
          uploadedName = j.name || uploadedName;
        } catch (e: unknown) {
          console.warn("upload falló:", errorMessage(e));
          toast.warning("No se pudo guardar el PDF en el servidor", {
            description: errorMessage(e),
            id: tid,
          });
        }

        const data: Record<string, string> = {
          ARCHIVO: uploadedName,
          LEGAJO: legajo,
          PERIODO: periodo,
          NOMBRE: nombre,
          CUIL: parsed.CUIL ?? "",
          ...parsed,
        };

        await repoDexie.addReceipt({
          legajo,
          periodo,
          nombre,
          cuil: data.CUIL,
          data,
          filename: uploadedName,
          fileHash: hash,
        });

        ok++;
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "ok" } : u)));
        toast.success(`Listo: ${file.name}`, { id: tid });
      } catch (err: unknown) {
        fail++;
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "error" } : u)));
        toast.error(`Error en ${file.name}`, { description: errorMessage(err), id: tid });
      }
      // ceder control al event loop
      await new Promise((r) => setTimeout(r, 0));
    }

    toast.info(`Completado: ${ok} ok · ${skip} omitidos · ${fail} error`, { duration: 4000 });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setUploads([]), 2000);
    await loadConsolidated();
  }, [officialNameByKey]);

  /* --------------------- utilitarios UI --------------------- */

  async function handleRefresh(): Promise<void> {
    try {
      await loadConsolidated();
      toast.success("Tabla refrescada");
    } catch (e: unknown) {
      toast.error("No se pudo refrescar", { description: errorMessage(e) });
    }
  }

  async function handleWipeAll(): Promise<void> {
    try {
      await repoDexie.wipe();
      localStorage.removeItem(LS_KEY);
      setConsolidated([]);
      setTotalRows(0);
      setControlSummaries([]);
      setControlOKs([]);
      setControlMissing([]);
      setOfficialKeys([]);
      setOpenDetail({});
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      setOfficialNameByKey({});

      const resp = await fetch("/api/cleanup", { method: "POST" });
      const raw: unknown = await resp.json();
      const json = parseCleanupResponse(raw);
      if (resp.ok && json.ok) {
        toast.success(`Memoria borrada · ${json.deleted ?? 0} PDF(s) eliminados`);
      } else {
        toast.warning("Memoria borrada. No se pudo limpiar /recibos", {
          description: json.error || "Revisá permisos del FS",
        });
      }
    } catch (e: unknown) {
      toast.error("No se pudo limpiar todo", { description: errorMessage(e) });
    }
  }

  /* ------------------ Excel oficial + Control ------------------ */

  async function handleOfficialExcel(file: File): Promise<void> {
    try {
      setControlLoading(true);
      const rows: OfficialRow[] = await readOfficialXlsx(file);
      await repoDexie.upsertControl(rows.map((r) => ({ key: r.key, valores: r.valores })));
      setOfficialKeys(rows.map((r) => r.key));
      setOfficialNameByKey(Object.fromEntries(rows.map((r) => [r.key, r.nombre || ""])));
      await computeControl(rows.map((r) => r.key));
      toast.success(`Oficial cargado (${rows.length} filas)`);
    } catch (e: unknown) {
      toast.error("Error importando oficial", { description: errorMessage(e) });
    } finally {
      setControlLoading(false);
    }
  }

  async function computeControl(keysFromExcel?: string[]): Promise<void> {
    const rows = consolidated;
    if (!rows.length) {
      setControlSummaries([]);
      setControlOKs([]);
      setControlMissing([]);
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      return;
    }

    const pairs = await Promise.all(
      rows.map(async (r: ConsolidatedRow) => {
        const ctl = await repoDexie.getControl(r.key);
        return { r, ctl };
      }),
    );

    const summaries: ControlSummary[] = [];
    const oks: ControlOkRow[] = [];
    let comps = 0,
      compOk = 0,
      compDif = 0;

    for (const { r, ctl } of pairs) {
      if (!ctl) continue;
      const difs: ControlSummary["difs"] = [];

      for (const [code, label] of CODE_LABELS) {
        const calc = Number(r.data[code] ?? 0);
        const off = Number(ctl.valores[code] ?? 0);
        const delta = off - calc;
        const dentro = Math.abs(delta) <= tolerance;
        comps += 1;
        if (dentro) {
          compOk += 1;
          continue;
        }
        compDif += 1;
        difs.push({
          codigo: code,
          label,
          oficial: off.toFixed(2),
          calculado: calc.toFixed(2),
          delta: delta.toFixed(2),
          dir: delta > 0 ? "a favor" : "en contra",
        });
      }
      if (difs.length > 0) summaries.push({ key: r.key, legajo: r.legajo, periodo: r.periodo, difs });
      else oks.push({ key: r.key, legajo: r.legajo, periodo: r.periodo });
    }

    summaries.sort(compareByKey);
    oks.sort(compareByKey);

    setControlSummaries(summaries);
    setControlOKs(oks);

    const official = new Set<string>(keysFromExcel ?? officialKeys);
    const consKeys = new Set(rows.map((r) => r.key));
    const missing: Array<{ key: string; legajo: string; periodo: string }> = [];
    if (official.size > 0) {
      for (const k of official) {
        if (!consKeys.has(k)) {
          const [legajo = "", periodo = ""] = k.split("||");
          missing.push({ key: k, legajo, periodo });
        }
      }
    }
    setControlMissing(missing);
    setControlStats({ comps, compOk, compDif, okReceipts: oks.length, difReceipts: summaries.length });
  }

  async function handleRecalc(): Promise<void> {
    try {
      setControlLoading(true);
      await computeControl();
      toast.success("Control recalculado");
    } catch (e: unknown) {
      toast.error("No se pudo recalcular", { description: errorMessage(e) });
    } finally {
      setControlLoading(false);
    }
  }

  /* -------------------- export CSVs -------------------- */

  function downloadCsvAggregated(): void {
    const csv = buildAggregatedCsv(consolidated, visibleCols);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recibos_agregado.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadControlCsv(): void {
    const csv = buildControlCsvSummary(controlSummaries, controlOKs, showOks, nameByKey);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "control_por_clave.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ----------------------------- UI ---------------------------- */

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Gestor de Recibos <span className="ml-2 text-sm text-muted-foreground">({totalRows})</span>
        </h1>
        <p className="text-muted-foreground">
          Sube PDFs, consolida por LEGAJO+PERIODO y exporta a CSV. También podés comparar con un Excel “oficial”.
        </p>
      </header>

      {/* Progreso de subidas */}
      {uploads.length > 0 && (
        <div className="mb-4 rounded-lg border p-3 bg-muted/30">
          <div className="mb-2 text-sm font-medium">
            Procesando {uploads.filter((u) => u.status === "pending").length} pendiente(s) ·{" "}
            {uploads.filter((u) => u.status === "ok").length} ok · {uploads.filter((u) => u.status === "error").length} error
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((u, i) => (
              <div key={`${u.name}-${i}`} className="flex items-center gap-2 rounded border bg-white px-3 py-2">
                {u.status === "pending" && <Loader2 className="h-4 w-4 animate-spin" />}
                {u.status === "ok" && <CheckCircle2 className="h-4 w-4" />}
                {u.status === "error" && <XCircle className="h-4 w-4" />}
                <span className="truncate text-sm">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Refrescar
        </Button>
        <Button variant="outline" size="sm" onClick={handleWipeAll}>
          Limpiar memoria
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showDebug} onChange={(e: ChangeEvent<HTMLInputElement>) => setShowDebug(e.target.checked)} />
          Mostrar debug
        </label>
      </div>

      {/* Debug liviano */}
      {showDebug && consolidated[0] && (
        <div className="mb-6 rounded-lg border p-4 bg-amber-50/40">
          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm text-muted-foreground">Filas consolidadas: {totalRows}</div>
            <Separator className="my-3" />
            <pre className="text-xs overflow-auto">{JSON.stringify(consolidated[0], null, 2)}</pre>
          </div>
        </div>
      )}

      <Tabs defaultValue="agregado" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agregado">Tabla agregada</TabsTrigger>
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="export">Exportación</TabsTrigger>
        </TabsList>

        {/* TABLA AGREGADA */}
        <TabsContent value="agregado" className="mt-4">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Tabla agregada</CardTitle>
                <CardDescription>Vista unificada (solo columnas etiquetadas). Incluye NOMBRE.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={consolidated.length === 0} onClick={downloadCsvAggregated}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar CSV agregado
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {consolidated.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay datos.</p>
              ) : (
                <TablaAgregada rows={consolidated} visibleCols={visibleCols} nameByKey={nameByKey} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTROL */}
        <TabsContent value="control" className="mt-4">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-center">
              <div className="md:col-span-2 min-w-0">
                <CardTitle>Control</CardTitle>
                <CardDescription>Compara valores oficiales vs calculados.</CardDescription>
                <div className="mt-2 text-xs text-muted-foreground">
                  Comparaciones: {controlStats.comps} · OK: {controlStats.compOk} · DIF: {controlStats.compDif}
                </div>
                <div className="text-xs text-muted-foreground">
                  Recibos — OK: {controlStats.okReceipts} · Con diferencias: {controlStats.difReceipts}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <label className="text-sm flex items-center gap-2">
                  Tolerancia
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={tolerance}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTolerance(Number(e.target.value || 0))}
                  />
                </label>
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={showOks} onChange={(e: ChangeEvent<HTMLInputElement>) => setShowOks(e.target.checked)} />
                  Mostrar OKs (por Legajo/Período)
                </label>
                <Input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) void handleOfficialExcel(e.target.files[0]);
                  }}
                />
                <Button variant="outline" onClick={handleRecalc} disabled={controlLoading}>
                  {controlLoading ? "..." : "Recalcular"}
                </Button>
                <Button variant="secondary" onClick={downloadControlCsv} disabled={controlSummaries.length === 0 && !showOks}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar CSV (claves con diferencias{showOks ? " + OK" : ""})
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <ControlTables
                summaries={controlSummaries}
                oks={showOks ? controlOKs : []}
                missing={controlMissing}
                openDetail={openDetail}
                onToggleDetail={(k) => setOpenDetail((prev) => ({ ...prev, [k]: !prev[k] }))}
                nameByKey={nameByKey}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPORT */}
        <TabsContent value="export" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportación</CardTitle>
              <CardDescription>Descarga del CSV agregado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium">recibos_agregado.csv</span> <span className="text-muted-foreground">(BOM + sep=,)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled={consolidated.length === 0} onClick={downloadCsvAggregated}>
                      <Download className="mr-2 h-4 w-4" /> Descargar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* input oculto para usar handleFiles */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf"
        multiple
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) void handleFiles(e.target.files);
        }}
      />
      {/* botón visible para abrir el selector */}
      <Button className="fixed bottom-6 right-6 shadow-lg" onClick={() => fileInputRef.current?.click()}>
        <FileUp className="mr-2 h-4 w-4" /> Subir PDFs
      </Button>
    </main>
  );
}
