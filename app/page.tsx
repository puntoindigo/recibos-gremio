// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { CODE_LABELS, CODE_KEYS } from "@/lib/code-labels";
import { sha256OfFile } from "@/lib/hash";
import { repoDexie } from '@/lib/repo-dexie';
import { db } from '@/lib/db';
import type { ConsolidatedEntity } from "@/lib/repo";
import { readOfficialXlsx, type OfficialRow } from "@/lib/import-excel";
import TablaAgregada from "@/components/TablaAgregada/TablaAgregada";
import ControlTables from "@/components/Control/ControlTables";
import { buildControlCsvSummary, type ControlOk as ControlOkRow } from "@/lib/export-control";
import type { ControlSummary } from "@/lib/control-types";
import { buildAggregatedCsv } from "@/lib/export-aggregated";
import ReceiptsFilters from "@/components/ReceiptsFilters";
import { UnifiedStatusPanel } from "@/components/UnifiedStatusPanel";
import { DebugPanel } from "@/components/DebugPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

type UploadItem = { 
  name: string; 
  status: "pending" | "ok" | "error" | "skipped";
  reason?: string;
};

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

type SavedControl = {
  summaries: ControlSummary[];
  oks: ControlOkRow[];
  missing: Array<{ key: string; legajo: string; periodo: string }>;
  stats: {
    comps: number;
    compOk: number;
    compDif: number;
    okReceipts: number;
    difReceipts: number;
  };
  filters: {
    periodo: string;
    empresa: string;
  };
  officialKeys: string[];
  officialNameByKey: Record<string, string>;
  timestamp: number;
};

/* --------------------------- page ---------------------------- */

export default function Page() {
  const [consolidated, setConsolidated] = useState<ConsolidatedEntity[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("agregado");
  const [processingFiles, setProcessingFiles] = useState<FileList | null>(null);
  const [lastProcessedIndex, setLastProcessedIndex] = useState<number>(-1);
  const [hasControlForCurrentFilters, setHasControlForCurrentFilters] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState({
    totalRows: 0,
    consolidatedCount: 0,
    controlCount: 0,
    savedControlsCount: 0,
    settingsCount: 0
  });

  // Control (agregado por Legajo/Período)
  const [controlLoading, setControlLoading] = useState(false);
  const [controlSummaries, setControlSummaries] = useState<ControlSummary[]>([]);
  const [controlOKs, setControlOKs] = useState<ControlOkRow[]>([]);
  const showOks = true;
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});
  const [controlMissing, setControlMissing] = useState<Array<{ key: string; legajo: string; periodo: string }>>([]);
  const [officialKeys, setOfficialKeys] = useState<string[]>([]);
  const TOLERANCE = 0.01;
  const [controlStats, setControlStats] = useState({
    comps: 0,
    compOk: 0,
    compDif: 0,
    okReceipts: 0,
    difReceipts: 0,
  });
// Filtros globales (usados por Tabla agregada, exportación y limpiar memoria)
const [periodoFiltro, setPeriodoFiltro] = useState<string>("");
const [empresaFiltro, setEmpresaFiltro] = useState<string>("");
const [nombreFiltro, setNombreFiltro] = useState<string>("");

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

// listas de filtros se calculan dentro de TablaAgregada

async function saveControlToDexie(
  summaries: ControlSummary[],
  oks: ControlOkRow[],
  missing: Array<{ key: string; legajo: string; periodo: string }>,
  stats: { comps: number; compOk: number; compDif: number; okReceipts: number; difReceipts: number },
  officialKeys: string[],
  officialNameByKey: Record<string, string>
): Promise<void> {
  try {
    console.log("💾 saveControlToDexie - Guardando con filtros:", { periodoFiltro, empresaFiltro, nombreFiltro });
    
    // No guardar control si hay filtro de nombre (se calcula en tiempo real)
    if (nombreFiltro) {
      console.log("⚠️ saveControlToDexie - No se guarda control con filtro de nombre");
      return;
    }
    
    await repoDexie.saveControl(periodoFiltro, empresaFiltro, summaries, oks, missing, stats, officialKeys, officialNameByKey);
    console.log("✅ saveControlToDexie - Control guardado exitosamente");
  } catch (e) {
    console.error("❌ saveControlToDexie - Error guardando control:", e);
    console.warn("No se pudo guardar el control:", e);
  }
}

async function loadControlFromDexie(): Promise<{
  summaries: ControlSummary[];
  oks: ControlOkRow[];
  missing: Array<{ key: string; legajo: string; periodo: string }>;
  stats: { comps: number; compOk: number; compDif: number; okReceipts: number; difReceipts: number };
  officialKeys: string[];
  officialNameByKey: Record<string, string>;
} | null> {
  try {
    console.log("🔍 loadControlFromDexie - Buscando control para filtros:", { periodoFiltro, empresaFiltro, nombreFiltro });
    
    // No cargar control guardado si hay filtro de nombre
    if (nombreFiltro) {
      console.log("⚠️ loadControlFromDexie - No se carga control guardado con filtro de nombre");
      return null;
    }
    
    const saved = await repoDexie.getSavedControl(periodoFiltro, empresaFiltro);
    if (!saved) {
      console.log("❌ loadControlFromDexie - No se encontró control guardado");
      return null;
    }
    
    console.log("✅ loadControlFromDexie - Control encontrado:", {
      summaries: saved.summaries.length,
      oks: saved.oks.length,
      missing: saved.missing.length
    });
    
    return {
      summaries: saved.summaries as ControlSummary[],
      oks: saved.oks as ControlOkRow[],
      missing: saved.missing,
      stats: saved.stats,
      officialKeys: saved.officialKeys,
      officialNameByKey: saved.officialNameByKey,
    };
  } catch (e) {
    console.error("❌ loadControlFromDexie - Error cargando control:", e);
    console.warn("No se pudo cargar el control:", e);
    return null;
  }
}

useEffect(() => {
  void loadConsolidated();
  if (navigator?.storage?.persist) navigator.storage.persist().catch(() => {});
}, []);

// Efecto para cargar control guardado cuando cambian los filtros
useEffect(() => {
  async function loadControl() {
    console.log("🔄 useEffect - Cambio de filtros detectado:", { periodoFiltro, empresaFiltro, nombreFiltro });
    
    // Si hay filtro de nombre, no cargar control guardado (se calcula en tiempo real)
    if (nombreFiltro) {
      console.log("🔍 useEffect - Filtro de nombre detectado, calculando control en tiempo real");
      setControlSummaries([]);
      setControlOKs([]);
      setControlMissing([]);
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      setHasControlForCurrentFilters(false);
      return;
    }
    
    if (periodoFiltro || empresaFiltro) {
      const saved = await loadControlFromDexie();
      if (saved) {
        console.log("✅ useEffect - Control cargado desde Dexie");
        setControlSummaries(saved.summaries);
        setControlOKs(saved.oks);
        setControlMissing(saved.missing);
        setControlStats(saved.stats);
        setOfficialKeys(saved.officialKeys);
        setOfficialNameByKey(saved.officialNameByKey);
        setHasControlForCurrentFilters(true);
      } else {
        console.log("⚠️ useEffect - No hay control guardado para estos filtros");
        // Si no hay control guardado para estos filtros, limpiar resultados
        setControlSummaries([]);
        setControlOKs([]);
        setControlMissing([]);
        setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
        setHasControlForCurrentFilters(false);
      }
    } else {
      console.log("⚠️ useEffect - No hay filtros seleccionados");
      // Si no hay filtros, limpiar resultados
      setControlSummaries([]);
      setControlOKs([]);
      setControlMissing([]);
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      setHasControlForCurrentFilters(false);
    }
  }
  
  void loadControl();
}, [periodoFiltro, empresaFiltro, nombreFiltro]);

  async function loadConsolidated(): Promise<void> {
    const count = await repoDexie.countConsolidated();
    setTotalRows(count);
    const page = await repoDexie.getConsolidatedPage({ offset: 0, limit: Math.max(1, count) });
    setConsolidated(page);
    
    // Actualizar información de debug
    try {
      const [consolidatedCount, controlCount, savedControlsCount, settingsCount] = await Promise.all([
        repoDexie.countConsolidated(),
        db.control.count(),
        db.savedControls.count(),
        db.settings.count(),
      ]);
      
      setDebugInfo({
        totalRows: count,
        consolidatedCount,
        controlCount,
        savedControlsCount,
        settingsCount
      });
    } catch (error) {
      console.warn('Error cargando información de debug:', error);
    }
  }

  /* -------------------- subir PDFs + dedupe -------------------- */

  const handleFiles = useCallback(async (files: FileList, startIndex: number = 0): Promise<void> => {
    // Guardar los archivos para poder continuar después
    setProcessingFiles(files);
    setLastProcessedIndex(startIndex);
    const arr = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (arr.length === 0) {
      toast.info("Sin PDFs", { description: "Selecciona al menos un archivo PDF." });
      return;
    }

    // Si es una continuación, mantener los uploads existentes
    if (startIndex === 0) {
      setUploads(arr.map((f) => ({ name: f.name, status: "pending" as const })));
    }

    console.log(`🚀 Iniciando procesamiento desde índice ${startIndex} de ${arr.length} archivos`);

    // único import dinámico (no duplicar dentro del bucle)
    const { parsePdfReceiptToRecord } = await import("@/lib/pdf-parser");

    let ok = 0,
      skip = 0,
      fail = 0;

    for (let i = startIndex; i < arr.length; i++) {
      const file = arr[i];
      console.log(`🔄 Procesando archivo ${i + 1}/${arr.length}: ${file.name}`);
      const tid = toast.loading(`Procesando ${file.name} (${i + 1}/${arr.length})`);
      try {
        const hash = await sha256OfFile(file);

        // dedupe por hash
        if (await repoDexie.hasFileHash(hash)) {
          skip++;
          setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "skipped", reason: "duplicado" } : u)));
          toast.dismiss(tid);
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
        console.log(`✅ Archivo ${i + 1}/${arr.length} procesado exitosamente: ${file.name}`);
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "ok" } : u)));
        setLastProcessedIndex(i);
        toast.dismiss(tid);
      } catch (err: unknown) {
        fail++;
        console.error(`❌ Error en archivo ${i + 1}/${arr.length}: ${file.name}`, err);
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, status: "error" } : u)));
        toast.dismiss(tid);
      }
      // ceder control al event loop cada 10 archivos para evitar timeout
      if ((i + 1) % 10 === 0) {
        console.log(`⏸️ Pausa cada 10 archivos - Procesados: ${i + 1}/${arr.length}`);
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    console.log(`🎉 Procesamiento completado: ${ok} ok, ${skip} omitidos, ${fail} errores`);
    
    // Limpiar estado de procesamiento
    setProcessingFiles(null);
    setLastProcessedIndex(-1);
    
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

  async function handleDeleteVisible(): Promise<void> {
    const empresaOf = (r: ConsolidatedEntity) => String(r.data?.EMPRESA ?? "LIMPAR");
    const filtered = consolidated
      .filter((r) => (periodoFiltro ? r.periodo === periodoFiltro : true))
      .filter((r) => (empresaFiltro ? empresaOf(r) === empresaFiltro : true))
      .filter((r) => {
        if (!nombreFiltro) return true;
        const nombre = r.nombre || r.data.NOMBRE || "";
        return nombre.toLowerCase().includes(nombreFiltro.toLowerCase());
      });

    if (filtered.length === 0) {
      toast.info("No hay registros para eliminar con los filtros seleccionados");
      return;
    }

    const confirm = window.confirm(
      `¿Eliminar ${filtered.length} registros para ${periodoFiltro || "todos los períodos"} / ${empresaFiltro || "todas las empresas"}${nombreFiltro ? ` / nombre: "${nombreFiltro}"` : ""}?`
    );
    if (!confirm) return;

    try {
      // Eliminar cada registro individualmente
      for (const r of filtered) {
        await repoDexie.deleteByKey(r.key);
      }
      
      // También eliminar el control asociado a estos filtros si existe
      if (periodoFiltro || empresaFiltro) {
        await repoDexie.deleteSavedControl(periodoFiltro, empresaFiltro);
        setHasControlForCurrentFilters(false);
      }
      
      // Recargar datos consolidados
      await loadConsolidated();
      
      toast.success(`${filtered.length} registros eliminados`);
    } catch (e: unknown) {
      toast.error("Error eliminando registros", { description: errorMessage(e) });
    }
  }

  async function handleDeleteControl(): Promise<void> {
    if (!periodoFiltro && !empresaFiltro) {
      toast.error("Debe seleccionar al menos un filtro");
      return;
    }

    const confirm = window.confirm(
      `¿Eliminar control para ${periodoFiltro || "todos los períodos"} / ${empresaFiltro || "todas las empresas"}${nombreFiltro ? ` / nombre: "${nombreFiltro}"` : ""}?`
    );
    if (!confirm) return;

    try {
      await repoDexie.deleteSavedControl(periodoFiltro, empresaFiltro);
      setControlSummaries([]);
      setControlOKs([]);
      setControlMissing([]);
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      setHasControlForCurrentFilters(false);
      toast.success("Control eliminado");
    } catch (e: unknown) {
      toast.error("Error eliminando control", { description: errorMessage(e) });
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
      setHasControlForCurrentFilters(false);

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
      console.log("🔄 Iniciando handleOfficialExcel con filtros:", { periodoFiltro, empresaFiltro });
      setControlLoading(true);
      const rows: OfficialRow[] = await readOfficialXlsx(file);
      console.log("📊 Excel leído:", rows.length, "filas");
      
      await repoDexie.upsertControl(rows.map((r) => ({ key: r.key, valores: r.valores })));
      console.log("💾 Control upserted en Dexie");
      
      setOfficialKeys(rows.map((r) => r.key));
      setOfficialNameByKey(Object.fromEntries(rows.map((r) => [r.key, r.meta?.nombre || ""])));
      console.log("🔑 Official keys y nombres actualizados");
      
      await computeControl(rows.map((r) => r.key));
      console.log("✅ Control computado exitosamente");
      
      toast.success(`Oficial cargado (${rows.length} filas)`);
    } catch (e: unknown) {
      console.error("❌ Error en handleOfficialExcel:", e);
      toast.error("Error importando oficial", { description: errorMessage(e) });
    } finally {
      setControlLoading(false);
      console.log("🏁 handleOfficialExcel completado");
    }
  }

  async function computeControl(keysFromExcel?: string[]): Promise<void> {
    console.log("🔄 Iniciando computeControl con filtros:", { periodoFiltro, empresaFiltro, nombreFiltro });
    const empresaOf = (r: ConsolidatedEntity) => String(r.data?.EMPRESA ?? "LIMPAR");
    const filtered = consolidated
      .filter((r) => (periodoFiltro ? r.periodo === periodoFiltro : true))
      .filter((r) => (empresaFiltro ? empresaOf(r) === empresaFiltro : true))
      .filter((r) => {
        if (!nombreFiltro) return true;
        const nombre = r.nombre || r.data.NOMBRE || "";
        return nombre.toLowerCase().includes(nombreFiltro.toLowerCase());
      });
    const rows = filtered;
    console.log("📊 Filas filtradas:", rows.length, "de", consolidated.length, "total");
    
    if (!rows.length) {
      console.log("⚠️ No hay filas para procesar, limpiando control");
      setControlSummaries([]);
      setControlOKs([]);
      setControlMissing([]);
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      return;
    }

    console.log("🔍 Procesando", rows.length, "filas para control");
    const pairs = await Promise.all(
      rows.map(async (r: ConsolidatedEntity) => {
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
        const dentro = Math.abs(delta) <= TOLERANCE;
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

    console.log("📈 Resultados del control:", {
      summaries: summaries.length,
      oks: oks.length,
      comps,
      compOk,
      compDif
    });

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
    
    // Guardar el control con los filtros actuales
    console.log("💾 Guardando control en Dexie...");
    await saveControlToDexie(summaries, oks, missing, { comps, compOk, compDif, okReceipts: oks.length, difReceipts: summaries.length }, keysFromExcel ?? officialKeys, officialNameByKey);
    console.log("✅ Control guardado exitosamente");
    
    // Actualizar el estado para habilitar el botón de eliminar control
    setHasControlForCurrentFilters(true);
    console.log("🔘 Botón 'Eliminar Control' habilitado");
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
    const empresaOf = (r: ConsolidatedEntity) => String(r.data?.EMPRESA ?? "LIMPAR");
    const filtered = consolidated
      .filter((r) => (periodoFiltro ? r.periodo === periodoFiltro : true))
      .filter((r) => (empresaFiltro ? empresaOf(r) === empresaFiltro : true))
      .filter((r) => {
        if (!nombreFiltro) return true;
        const nombre = r.nombre || r.data.NOMBRE || "";
        return nombre.toLowerCase().includes(nombreFiltro.toLowerCase());
      });
    const csv = buildAggregatedCsv(filtered, visibleCols);
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
    const csv = buildControlCsvSummary(controlSummaries, controlOKs, true, nameByKey);
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
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Gestor de Recibos <span className="ml-2 text-sm text-muted-foreground">({totalRows})</span>
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Ocultar Debug' : 'Mostrar Debug'}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <Tabs defaultValue="agregado" className="w-full" onValueChange={setActiveTab}>
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
              <div className="flex flex-col gap-3 sm:items-end">
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={consolidated.length === 0} onClick={downloadCsvAggregated}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {consolidated.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay datos.</p>
              ) : (
                <>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <ReceiptsFilters
                      periodos={Array.from(new Set(consolidated.map((r) => r.periodo))).sort()}
                      empresas={Array.from(new Set(consolidated.map((r) => String(r.data?.EMPRESA ?? "LIMPAR").trim()))).sort()}
                      valuePeriodo={periodoFiltro || null}
                      onPeriodo={(v: string | null) => setPeriodoFiltro(v ?? "")}
                      valueEmpresa={empresaFiltro || null}
                      onEmpresa={(v: string | null) => setEmpresaFiltro(v ?? "")}
                      valueNombre={nombreFiltro}
                      onNombre={setNombreFiltro}
                    />
                  </div>
                  <TablaAgregada
                    rows={consolidated}
                    visibleCols={visibleCols}
                    nameByKey={nameByKey}
                    periodoFiltro={periodoFiltro}
                    onPeriodoFiltroChange={setPeriodoFiltro}
                    empresaFiltro={empresaFiltro}
                    onEmpresaFiltroChange={setEmpresaFiltro}
                    nombreFiltro={nombreFiltro}
                  />
                </>

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
                <Input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="w-full md:w-1/2"
                  disabled={!periodoFiltro && !empresaFiltro && !nombreFiltro}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) void handleOfficialExcel(e.target.files[0]);
                  }}
                />
                <Button variant="secondary" onClick={downloadControlCsv} disabled={controlSummaries.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <ReceiptsFilters
                  periodos={Array.from(new Set(consolidated.map((r) => r.periodo))).sort()}
                  empresas={Array.from(new Set(consolidated.map((r) => String(r.data?.EMPRESA ?? "LIMPAR").trim()))).sort()}
                  valuePeriodo={periodoFiltro || null}
                  onPeriodo={(v: string | null) => setPeriodoFiltro(v ?? "")}
                  valueEmpresa={empresaFiltro || null}
                  onEmpresa={(v: string | null) => setEmpresaFiltro(v ?? "")}
                  valueNombre={nombreFiltro}
                  onNombre={setNombreFiltro}
                />
              </div>
              <ControlTables
                summaries={controlSummaries}
                oks={controlOKs}
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
        
        {/* Botón para continuar procesamiento */}
        {processingFiles && lastProcessedIndex >= 0 && (
          <Button 
            className="fixed bottom-6 right-32 shadow-lg bg-orange-600 hover:bg-orange-700" 
            onClick={() => handleFiles(processingFiles, lastProcessedIndex + 1)}
          >
            <FileUp className="mr-2 h-4 w-4" /> Continuar ({lastProcessedIndex + 1})
          </Button>
        )}
      
              {/* Panel unificado de estado */}
        <UnifiedStatusPanel uploads={uploads} />
        
        {/* Panel de debug */}
        {showDebug && (
          <DebugPanel
            debugInfo={debugInfo}
            onDeleteVisible={handleDeleteVisible}
            onDeleteControl={handleDeleteControl}
            onWipeAll={handleWipeAll}
            activeTab={activeTab}
            periodoFiltro={periodoFiltro}
            empresaFiltro={empresaFiltro}
            nombreFiltro={nombreFiltro}
            hasControlForCurrentFilters={hasControlForCurrentFilters}
          />
        )}
      </main>
    );
}
