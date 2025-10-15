// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { CODE_LABELS, CODE_KEYS, getPrincipalLabels } from "@/lib/code-labels";
import { sha256OfFile } from "@/lib/hash";
import { repoDexie } from '@/lib/repo-dexie';
import { db } from '@/lib/db';
import type { ConsolidatedEntity } from "@/lib/repo";
import type { SavedControlDB, ControlRow } from "@/lib/db";
import { readOfficialXlsxUnified, type OfficialRow } from "@/lib/import-excel-unified";
import TablaAgregada from "@/components/TablaAgregada/TablaAgregada";

import SavedControlsList from "@/components/Control/SavedControlsList";
import ControlDetailsPanel from "@/components/Control/ControlDetailsPanel";
import { type ControlOk as ControlOkRow } from "@/lib/export-control";
import type { ControlSummary } from "@/lib/control-types";
import { buildAggregatedCsv } from "@/lib/export-aggregated";
import ReceiptsFilters from "@/components/ReceiptsFilters";
import { UnifiedStatusPanel } from "@/components/UnifiedStatusPanel";
import { DebugPanel } from "@/components/DebugPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DescuentosPanel } from "@/components/DescuentosPanel";
// import { PdfSplitDialog } from "@/components/PdfSplitDialog"; // Eliminado - split desactivado

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
  
  // Hooks para elementos arrastrables
  const getUploadButtonPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return {
      x: window.innerWidth - 120,
      y: window.innerHeight - 80
    };
  }, []);
  
  const uploadButtonDrag = useDraggable(getUploadButtonPosition);
  
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
  const TOLERANCE = 0.10;
  const [controlStats, setControlStats] = useState({
    comps: 0,
    compOk: 0,
    compDif: 0,
    okReceipts: 0,
    difReceipts: 0,
  });
  const [controlsRefreshKey, setControlsRefreshKey] = useState(0); // Para forzar actualización de controles guardados
  const [selectedControl, setSelectedControl] = useState<SavedControlDB | null>(null); // Control seleccionado para ver detalles
  const [controlesPorEmpresa, setControlesPorEmpresa] = useState<Record<string, number>>({});
  
  // Estado para el diálogo de split de PDF
  // Split desactivado - estado eliminado
  
  // Función para cargar detalles de un control guardado
  const handleViewDetails = (control: SavedControlDB) => {
    try {
      // Cargar el control seleccionado
      setSelectedControl(control);
      
      // Actualizar los filtros para mostrar el control
      setPeriodoFiltro(control.periodo);
      setEmpresaFiltro(control.empresa);
      setNombreFiltro(""); // Limpiar filtro de nombre
      
      // Cargar los datos del control en las tablas
      setControlSummaries(control.summaries as ControlSummary[]);
      setControlOKs(control.oks);
      setControlMissing(control.missing);
      setControlStats(control.stats);
      setOfficialKeys(control.officialKeys);
      setOfficialNameByKey(control.officialNameByKey);
      // Usar nameByKey del control guardado para los nombres de los recibos
      const savedNameByKey = control.nameByKey || {};
      setHasControlForCurrentFilters(true);
    } catch (error) {
      console.error("Error cargando detalles del control:", error);
      toast.error("Error al cargar los detalles del control");
    }
  };
    // Filtros globales (usados por Recibos, exportación y limpiar memoria)
const [periodoFiltro, setPeriodoFiltro] = useState<string>("");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("Todas");
const [nombreFiltro, setNombreFiltro] = useState<string>("");

// nombres del Excel oficial (fallback si el PDF no lo trae)
const [officialNameByKey, setOfficialNameByKey] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlFileInputRef = useRef<HTMLInputElement>(null);
const visibleCols = useMemo<string[]>(() => {
  const baseColsWithoutArchivo = BASE_COLS.filter(col => col !== 'ARCHIVO');
  return [...baseColsWithoutArchivo, ...CODE_KEYS, 'ARCHIVO'];
}, []);

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
  officialNameByKey: Record<string, string>,
  nameByKey: Record<string, string>
): Promise<void> {
  if (showDebug) {
    console.log("💾 saveControlToDexie - INICIO - Llamada a función con:", {
      periodoFiltro,
      empresaFiltro,
      nombreFiltro,
      totalSummaries: summaries.length,
      totalOks: oks.length,
      totalMissing: missing.length,
      timestamp: new Date().toLocaleString()
    });
  }
  
  try {
    if (showDebug) {
      console.log("💾 saveControlToDexie - Guardando con filtros:", { periodoFiltro, empresaFiltro, nombreFiltro });
    }
    
    // No guardar control si hay filtro de nombre (se calcula en tiempo real)
    if (nombreFiltro) {
        console.log("⚠️ saveControlToDexie - No se guarda control con filtro de nombre");
      return;
    }
    
    if (showDebug) {
      console.log("💾 saveControlToDexie - Guardando control con filtros:", { 
        periodoFiltro, 
        empresaFiltro, 
        totalSummaries: summaries.length,
        totalOks: oks.length,
        totalMissing: missing.length
      });
    }
    
    if (showDebug) {
      console.log("💾 saveControlToDexie - ANTES de llamar a repoDexie.saveControl con:", {
        periodo: periodoFiltro,
        empresa: empresaFiltro,
        summariesCount: summaries.length,
        oksCount: oks.length,
        missingCount: missing.length
      });
    }
    
    await repoDexie.saveControl(periodoFiltro, empresaFiltro, summaries, oks, missing, stats, officialKeys, officialNameByKey, nameByKey, showDebug);
    
    if (showDebug) {
      console.log("✅ saveControlToDexie - Control guardado exitosamente");
    }
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
  nameByKey: Record<string, string>;
} | null> {
  try {
    if (showDebug) {
      console.log("🔍 loadControlFromDexie - Buscando control para filtros:", { periodoFiltro, empresaFiltro, nombreFiltro });
    }
    
    // No cargar control guardado si hay filtro de nombre
    if (nombreFiltro) {
      if (showDebug) {
        console.log("⚠️ loadControlFromDexie - No se carga control guardado con filtro de nombre");
      }
      return null;
    }
    
    // Primero intentar buscar en savedControls (controles procesados)
    let saved = await repoDexie.getSavedControl(periodoFiltro, empresaFiltro);
    
    // Si no hay control procesado, verificar si hay datos del Excel en la tabla control
    if (!saved) {
      if (showDebug) {
        console.log("🔍 loadControlFromDexie - No hay control procesado, verificando datos del Excel...");
      }
      
      // Buscar en la tabla control para ver si hay datos del Excel
      const controlData = await repoDexie.getAllControlData();
      const hasExcelData = controlData.some((row: { key: string; valores: Record<string, string>; meta?: Record<string, any> }) => {
        const parts = row.key.split('||');
        if (parts.length >= 2) {
          const legajo = parts[0];
          const periodo = parts[1];
          // Verificar si coincide con los filtros
          return periodo === periodoFiltro && 
                 (empresaFiltro === 'LIMPAR' || empresaFiltro === 'LIME' || empresaFiltro === 'TYSA' || empresaFiltro === 'SUMAR');
        }
        return false;
      });
      
      if (hasExcelData) {
        if (showDebug) {
          console.log("✅ loadControlFromDexie - Hay datos del Excel, pero no hay control procesado. Ejecutando computeControl...");
        }
        // Hay datos del Excel pero no hay control procesado, ejecutar computeControl
        return null; // Retornar null para que se ejecute computeControl
      }
      
      if (showDebug) {
        console.log("❌ loadControlFromDexie - No se encontró control guardado ni datos del Excel");
      }
      return null;
    }
    
    if (showDebug) {
      console.log("✅ loadControlFromDexie - Control encontrado:", {
        summaries: saved.summaries.length,
        oks: saved.oks.length,
        missing: saved.missing.length
      });
    }
    
    return {
      summaries: saved.summaries as ControlSummary[],
      oks: saved.oks as ControlOkRow[],
      missing: saved.missing,
      stats: saved.stats,
      officialKeys: saved.officialKeys,
      officialNameByKey: saved.officialNameByKey,
      nameByKey: saved.nameByKey || {},
    };
  } catch (e) {
    console.error("❌ loadControlFromDexie - Error cargando control:", e);
    console.warn("No se pudo cargar el control:", e);
    return null;
  }
}

useEffect(() => {
  void loadConsolidated();
  void loadControlesPorEmpresa();
  if (navigator?.storage?.persist) navigator.storage.persist().catch(() => {});
}, []);

// Efecto para cargar control guardado cuando cambian los filtros
useEffect(() => {
  async function loadControl() {
    if (showDebug) {
      console.log("🔄 useEffect - Cambio de filtros detectado:", { periodoFiltro, empresaFiltro, nombreFiltro });
    }
    
    // Si hay filtro de nombre, no cargar control guardado (se calcula en tiempo real)
    if (nombreFiltro) {
      if (showDebug) {
        console.log("🔍 useEffect - Filtro de nombre detectado, calculando control en tiempo real");
      }
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
        if (showDebug) {
          console.log("✅ useEffect - Control cargado desde Dexie");
        }
        setControlSummaries(saved.summaries);
        setControlOKs(saved.oks);
        setControlMissing(saved.missing);
        setControlStats(saved.stats);
        setOfficialKeys(saved.officialKeys);
        setOfficialNameByKey(saved.officialNameByKey);
        setHasControlForCurrentFilters(true);
      } else {
        if (showDebug) {
          console.log("⚠️ useEffect - No hay control guardado para estos filtros");
        }
        // Si no hay control guardado para estos filtros, limpiar resultados
        setControlSummaries([]);
        setControlOKs([]);
        setControlMissing([]);
        setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
        setHasControlForCurrentFilters(false);
      }
    } else {
      if (showDebug) {
        console.log("⚠️ useEffect - No hay filtros seleccionados");
      }
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

  async function loadControlesPorEmpresa(): Promise<void> {
    try {
      const allControls = await repoDexie.getAllSavedControls();
      const controlesMap: Record<string, number> = {};
      
      // Contar controles por empresa (total de cualquier periodo)
      allControls.forEach(control => {
        const empresa = control.empresa;
        controlesMap[empresa] = (controlesMap[empresa] || 0) + 1;
      });
      
      setControlesPorEmpresa(controlesMap);
      
      if (showDebug) {
        console.log("🔍 loadControlesPorEmpresa - Controles por empresa:", controlesMap);
      }
    } catch (error) {
      console.warn('Error cargando controles por empresa:', error);
    }
  }

  async function getControlesPorEmpresaPeriodo(empresa: string, periodo: string): Promise<number> {
    try {
      const allControls = await repoDexie.getAllSavedControls();
      const controlesFiltrados = allControls.filter(control => 
        control.empresa === empresa && control.periodo === periodo
      );
      
      if (showDebug) {
        console.log(`🔍 getControlesPorEmpresaPeriodo - Empresa: ${empresa}, Periodo: ${periodo}, Controles: ${controlesFiltrados.length}`);
      }
      
      return controlesFiltrados.length;
    } catch (error) {
      console.warn('Error obteniendo controles por empresa/periodo:', error);
      return 0;
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

    // Procesar archivos en lotes con concurrencia controlada
    const BATCH_SIZE = 200; // Procesar máximo 200 archivos por lote para evitar timeout
    const TOTAL_FILES = arr.length;
    
    for (let batchStart = startIndex; batchStart < TOTAL_FILES; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_FILES);
      const batch = arr.slice(batchStart, batchEnd);
      
      console.log(`🔄 Procesando lote ${Math.floor(batchStart / BATCH_SIZE) + 1}: archivos ${batchStart + 1}-${batchEnd} de ${TOTAL_FILES}`);
      
      // Procesar lote en paralelo
      const batchPromises = batch.map(async (file, batchIndex) => {
        const globalIndex = batchStart + batchIndex;
        const tid = toast.loading(`Procesando ${file.name} (${globalIndex + 1}/${TOTAL_FILES})`);
        
      try {
        const hash = await sha256OfFile(file);

        // dedupe por hash (solo para archivos no divididos)
        // PROTECCIÓN: No sobrescribir datos ya guardados en producción
        if (!file.name.includes('_pagina') && await repoDexie.hasFileHash(hash)) {
          if (showDebug) {
            console.log(`⚠️ Archivo ${file.name} omitido por duplicado (hash ya existe) - DATOS PROTEGIDOS`);
          }
          skip++;
            setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "skipped", reason: "duplicado (datos protegidos)" } : u)));
          toast.dismiss(tid);
            return { status: "skipped", reason: "duplicado (datos protegidos)" };
        }

            // Split automático desactivado - procesar como archivo único
            console.log(`📄 Procesando ${file.name} como archivo único (split desactivado)`);

        // parsear PDF
          const res = await parsePdfReceiptToRecord(file, showDebug);
        const parsed = (res?.data ?? {}) as Record<string, string>;
          
          // Debug: mostrar información del archivo procesado
          if (showDebug) {
            console.log(`🔍 Archivo ${file.name} procesado:`, {
              GUARDAR: parsed.GUARDAR,
              LEGAJO: parsed.LEGAJO,
              PERIODO: parsed.PERIODO,
              EMPRESA: parsed.EMPRESA
            });
          }
          
          // Verificar si el PDF debe guardarse
          if (parsed.GUARDAR === "false") {
            if (showDebug) {
              console.log(`⚠️ Archivo ${file.name} marcado como NO GUARDAR:`, parsed);
            }
            skip++;
            setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "skipped", reason: "no guardar" } : u)));
            toast.dismiss(tid);
            return { status: "skipped", reason: "no guardar" };
          }
          
        const legajo = String(parsed.LEGAJO ?? "").trim();
        const periodo = String(parsed.PERIODO ?? "").trim();
        if (!legajo || !periodo) throw new Error("No se pudo detectar LEGAJO o PERIODO");

        // nombre: PDF o Excel oficial (fallback)
        const key = `${legajo}||${periodo}`;
        let nombre = (parsed.NOMBRE ?? "").trim();
        if (!nombre && officialNameByKey[key]) nombre = officialNameByKey[key];
        
        // Para páginas divididas, usar el nombre del archivo como identificador único
        const isDividedPage = file.name.includes('_pagina');
        const uniqueKey = isDividedPage ? `${legajo}||${periodo}||${file.name}` : key;

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
          uniqueKey: isDividedPage ? uniqueKey : undefined, // Pasar clave única para páginas divididas
        });

        ok++;
          console.log(`✅ Archivo ${globalIndex + 1}/${TOTAL_FILES} procesado exitosamente: ${file.name}`);
          setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "ok" } : u)));
          setLastProcessedIndex(globalIndex);
          
          // Guardar último archivo procesado en localStorage (siempre, no solo en debug mode)
          localStorage.setItem('lastProcessedFile', file.name);
          
        toast.dismiss(tid);
          return { status: "ok" };
      } catch (err: unknown) {
        fail++;
          console.error(`❌ Error en archivo ${globalIndex + 1}/${TOTAL_FILES}: ${file.name}`, err);
          setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "error" } : u)));
        toast.dismiss(tid);
          return { status: "error", error: err };
        }
      });
      
      // Esperar a que se complete el lote antes de continuar
      let batchResults;
      try {
        batchResults = await Promise.all(batchPromises);
      } catch (error) {
        console.error(`❌ Error en lote ${Math.floor(batchStart / BATCH_SIZE) + 1}:`, error);
        
        // Si hay un error 500 o timeout, detener el procesamiento y mostrar botón de continuar
        if (error instanceof Error && (error.message.includes('500') || error.message.includes('timeout'))) {
          console.log(`🛑 Error 500/timeout detectado. Deteniendo procesamiento en archivo ${batchStart + 1}`);
          setLastProcessedIndex(batchStart - 1); // Marcar el último archivo procesado exitosamente
          toast.error(`Error de servidor en archivo ${batchStart + 1}. Usa el botón "Continuar" para reanudar.`);
          return; // Salir sin limpiar processingFiles para permitir continuar
        }
        
        // Reintentar el lote con procesamiento secuencial como fallback
        console.log(`🔄 Reintentando lote ${Math.floor(batchStart / BATCH_SIZE) + 1} en modo secuencial...`);
        
        const fallbackResults = [];
        for (let i = 0; i < batch.length; i++) {
          const file = batch[i];
          const globalIndex = batchStart + i;
          const tid = toast.loading(`Reintentando ${file.name} (${globalIndex + 1}/${TOTAL_FILES})`);
          
          try {
            // Procesar archivo individualmente
            const hash = await sha256OfFile(file);
            
            if (!file.name.includes('_pagina') && await repoDexie.hasFileHash(hash)) {
              skip++;
              setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "skipped", reason: "duplicado" } : u)));
              toast.dismiss(tid);
              fallbackResults.push({ status: "skipped", reason: "duplicado" });
              continue;
            }
            
            const res = await parsePdfReceiptToRecord(file, showDebug);
            const parsed = (res?.data ?? {}) as Record<string, string>;
            
            // Verificar si el PDF debe guardarse
            if (parsed.GUARDAR === "false") {
              if (showDebug) {
                console.log(`⚠️ Archivo ${file.name} marcado como NO GUARDAR (fallback):`, parsed);
              }
              skip++;
              setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "skipped", reason: "no guardar" } : u)));
              toast.dismiss(tid);
              fallbackResults.push({ status: "skipped", reason: "no guardar" });
              continue;
            }
            
            const legajo = String(parsed.LEGAJO ?? "").trim();
            const periodo = String(parsed.PERIODO ?? "").trim();
            
            if (!legajo || !periodo) {
              throw new Error("No se pudo detectar LEGAJO o PERIODO");
            }
            
            const key = `${legajo}||${periodo}`;
            let nombre = (parsed.NOMBRE ?? "").trim();
            if (!nombre && officialNameByKey[key]) nombre = officialNameByKey[key];
            
            // Para páginas divididas, usar el nombre del archivo como identificador único
            const isDividedPage = file.name.includes('_pagina');
            const uniqueKey = isDividedPage ? `${legajo}||${periodo}||${file.name}` : key;
            
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
              uniqueKey: isDividedPage ? uniqueKey : undefined, // Pasar clave única para páginas divididas
            });
            
            ok++;
            console.log(`✅ Archivo ${globalIndex + 1}/${TOTAL_FILES} procesado exitosamente (fallback): ${file.name}`);
            setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "ok" } : u)));
            setLastProcessedIndex(globalIndex);
            toast.dismiss(tid);
            fallbackResults.push({ status: "ok" });
            
          } catch (err: unknown) {
            fail++;
            console.error(`❌ Error en archivo ${globalIndex + 1}/${TOTAL_FILES} (fallback): ${file.name}`, err);
            setUploads((prev) => prev.map((u, idx) => (idx === globalIndex ? { ...u, status: "error" } : u)));
            toast.dismiss(tid);
            fallbackResults.push({ status: "error", error: err });
          }
        }
        
        batchResults = fallbackResults;
      }
      
      // Log del progreso del lote
      const batchOk = batchResults.filter(r => r.status === "ok").length;
      const batchSkip = batchResults.filter(r => r.status === "skipped").length;
      const batchFail = batchResults.filter(r => r.status === "error").length;
      
      console.log(`📊 Lote completado: ${batchOk} OK, ${batchSkip} omitidos, ${batchFail} errores`);
      
      // Pausa adaptativa entre lotes: más tiempo si hubo errores
      if (batchEnd < TOTAL_FILES) {
        const pauseTime = batchFail > 0 ? 200 : 50; // 200ms si hay errores, 50ms si todo OK
        console.log(`⏸️ Pausa de ${pauseTime}ms antes del siguiente lote...`);
        await new Promise((r) => setTimeout(r, pauseTime));
      }
    }

    console.log(`🎉 Procesamiento completado: ${ok} ok, ${skip} omitidos, ${fail} errores`);
    
    // Limpiar estado de procesamiento solo si terminó completamente
    setProcessingFiles(null);
    setLastProcessedIndex(-1);
    
    // Limpiar localStorage del último archivo procesado solo si no hubo errores
    if (fail === 0) {
      localStorage.removeItem('lastProcessedFile');
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setUploads([]), 2000);
    await loadConsolidated();
  }, [officialNameByKey]);

  /* --------------------- utilitarios UI --------------------- */

  // Funciones de split eliminadas - funcionalidad desactivada

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


  /* ------------------ Excel oficial + Control ------------------ */

  async function handleOfficialExcel(file: File): Promise<void> {
    try {
      
      // Validar que período y empresa estén seleccionados
      if (!periodoFiltro) {
        toast.error("Debe seleccionar un período");
        // Limpiar el input de archivo para permitir reintentar
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      if (!empresaFiltro) {
        toast.error("Debe seleccionar una empresa");
        // Limpiar el input de archivo para permitir reintentar
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      setControlLoading(true);
      
      // Usar la empresa del filtro o detectar automáticamente
      const empresaToUse = empresaFiltro || "LIMPAR";
      
      // SIEMPRE usar el período del desplegable, nunca del Excel
      const periodoResolver = () => periodoFiltro || "06/2025";
      
      if (showDebug) {
        console.log("🔍 Debug Excel Control - Configuración:", {
          empresaToUse,
          periodoFiltro,
          periodoResolver: "personalizado (siempre)",
          periodoUsado: periodoResolver()
        });
        console.log("🔍 Debug Excel Control - Filtros del formulario:", {
          empresaFiltro,
          periodoFiltro,
          empresaSeleccionada: empresaFiltro || "LIMPAR",
          periodoSeleccionado: periodoFiltro || "06/2025"
        });
      }
      
      const rows: OfficialRow[] = await readOfficialXlsxUnified(file, empresaToUse, { periodoResolver, debug: showDebug });
      
      // Debug: verificar valores del Excel de control
      if (showDebug) {
        console.log("🔍 Debug Excel Control - Excel cargado:", {
          totalFilas: rows.length,
          empresaExcel: empresaToUse,
          periodoExcel: "Se extrae del Excel (puede ser diferente al del formulario)"
        });
        
        console.log("🔍 Debug Excel Control - Primeras 3 filas del Excel:");
        for (let i = 0; i < Math.min(3, rows.length); i++) {
          const row = rows[i];
          console.log(`  Fila ${i}:`, {
            key: row.key,
            "20610 (RESGUARDO MUTUAL)": row.valores["20610"],
            "20540 (CONTRIBUCION SOLIDARIA)": row.valores["20540"],
            "20590 (SEGURO SEPELIO)": row.valores["20590"],
            "20595 (CUOTA MUTUAL)": row.valores["20595"],
            "20620 (DESC. MUTUAL)": row.valores["20620"]
          });
          console.log(`  Fila ${i} - Clave original del Excel:`, row.key);
          console.log(`  Fila ${i} - Meta:`, row.meta);
        }
      }
      
      // Regenerar las claves del control usando el periodo del desplegable
      if (showDebug) {
        console.log("🔍 Debug Excel Control - Iniciando regeneración de claves:", {
          periodoFormulario: periodoFiltro,
          periodoExcel: "Extraído de las claves del Excel",
          totalClaves: rows.length
        });
      }
      
      const controlRows = rows.map((r) => {
        // Extraer legajo de la clave original (formato: legajo||periodoExcel)
        const parts = r.key.split('||');
        const legajo = parts[0];
        const periodoExcel = parts[1] || "SIN_PERIODO";
        // Crear nueva clave con el periodo del desplegable
        const newKey = `${legajo}||${periodoFiltro}`;
        
        if (showDebug) {
          console.log(`🔍 Regenerando clave: "${r.key}" → "${newKey}" (legajo: ${legajo}, periodoExcel: ${periodoExcel}, periodoFormulario: ${periodoFiltro})`);
        }
        
        return { 
          key: newKey, 
          valores: r.valores,
          originalKey: r.key, // Mantener referencia a la clave original
          nombre: r.meta?.nombre || "" // Preservar el nombre
        };
      });
      
      if (showDebug) {
        console.log("🔍 Debug Excel Control - Resumen de regeneración:", {
          clavesOriginales: rows.slice(0, 3).map(r => r.key),
          clavesRegeneradas: controlRows.slice(0, 3).map(r => r.key),
          periodoFinal: periodoFiltro
        });
      }
      
      await repoDexie.upsertControl(controlRows.map((r) => ({ key: r.key, valores: r.valores })));
      
      if (showDebug) {
        console.log("🔍 Debug Excel Control - Control guardado en BD:", {
          totalClaves: controlRows.length,
          ejemploClaves: controlRows.slice(0, 3).map(r => r.key),
          periodoGuardado: periodoFiltro,
          empresaGuardada: empresaFiltro
        });
      }
      
      setOfficialKeys(controlRows.map((r) => r.key));
      setOfficialNameByKey(Object.fromEntries(controlRows.map((r) => [r.key, r.nombre])));
      
      await computeControl(controlRows.map((r) => r.key));
      
      // Forzar actualización de la lista de controles guardados
      setControlsRefreshKey(prev => prev + 1);
      
      toast.success(`Control procesado y guardado (${rows.length} filas)`);
    } catch (e: unknown) {
      console.error("❌ Error en handleOfficialExcel:", e);
      toast.error("Error importando oficial", { description: errorMessage(e) });
    } finally {
      setControlLoading(false);
    }
  }

  async function computeControl(keysFromExcel?: string[]): Promise<void> {
    if (showDebug) {
      console.log("🔍 computeControl - INICIO - Llamada a función con:", {
        periodoFiltro,
        empresaFiltro,
        nombreFiltro,
        keysFromExcelCount: keysFromExcel?.length || 0,
        consolidatedCount: consolidated.length,
        timestamp: new Date().toLocaleString()
      });
    }
    
    const empresaOf = (r: ConsolidatedEntity) => String(r.data?.EMPRESA ?? "LIMPAR");
    

    

    
    const filtered = consolidated
      .filter((r) => (periodoFiltro ? r.periodo === periodoFiltro : true))
      .filter((r) => {
        if (!empresaFiltro) return true;
        const empresaRecibo = empresaOf(r).toUpperCase().trim();
        const empresaFiltroUpper = empresaFiltro.toUpperCase().trim();
        // Comparación más flexible: "LI E" debería coincidir con "LIME"
        const coincide = empresaRecibo.includes(empresaFiltroUpper) || empresaFiltroUpper.includes(empresaRecibo);
        
        if (showDebug && empresaFiltro === "LIMPAR") {
          console.log(`🔍 Filtro empresa - Legajo: ${r.legajo}, Empresa BD: "${empresaRecibo}", Filtro: "${empresaFiltroUpper}", Coincide: ${coincide}`);
        }
        
        return coincide;
      })
      .filter((r) => {
        if (!nombreFiltro) return true;
        const nombre = r.nombre || r.data.NOMBRE || "";
        return nombre.toLowerCase().includes(nombreFiltro.toLowerCase());
      });
    const rows = filtered;
    
    // Debug: verificar si hay datos del Excel para guardar
    const hasExcelData = keysFromExcel && keysFromExcel.length > 0;
    if (showDebug) {
      console.log("🔍 computeControl - Verificación de datos:", {
        hasExcelData,
        excelKeysCount: keysFromExcel?.length || 0,
        consolidatedRowsCount: rows.length,
        shouldSaveControl: hasExcelData || rows.length > 0
      });
    }
    
    // Solo retornar temprano si no hay datos del Excel Y no hay recibos consolidados
    if (!hasExcelData && !rows.length) {
      if (showDebug) {
        console.log("⚠️ computeControl - No hay datos para procesar, retornando temprano");
      }
      setControlSummaries([]);
      setControlOKs([]);
      setControlMissing([]);
      setControlStats({ comps: 0, compOk: 0, compDif: 0, okReceipts: 0, difReceipts: 0 });
      return;
    }
    let pairs: Array<{ r: ConsolidatedEntity; ctl: ControlRow | null }> = [];
    
    if (rows.length > 0) {
      // Si hay recibos consolidados, procesarlos normalmente
      pairs = await Promise.all(
      rows.map(async (r: ConsolidatedEntity) => {
        const ctl = await repoDexie.getControl(r.key);
          return { r, ctl: ctl || null };
      }),
    );
    } else if (hasExcelData) {
      // Si no hay recibos pero sí hay datos del Excel, crear registros vacíos para procesar
      if (showDebug) {
        console.log("🔍 computeControl - No hay recibos consolidados, procesando solo datos del Excel");
      }
      
      // Crear registros ficticios para cada clave del Excel
      for (const excelKey of keysFromExcel!) {
        const [legajo, periodo] = excelKey.split("||");
        const fakeKey = `${legajo}||${periodo}||${empresaFiltro}`;
        
        // Crear un registro consolidado ficticio
        const fakeConsolidated: ConsolidatedEntity = {
          key: fakeKey,
          legajo,
          periodo,
          nombre: officialNameByKey[excelKey] || nameByKey[excelKey] || "N/A",
          data: {},
          archivos: [],
          cuil: undefined,
          cuilNorm: undefined
        };
        
        // Obtener el control del Excel
        const ctl = await repoDexie.getControl(fakeKey);
        
        pairs.push({ r: fakeConsolidated, ctl: ctl || null });
      }
    }

    const summaries: ControlSummary[] = [];
    const oks: ControlOkRow[] = [];
    let comps = 0,
      compOk = 0,
      compDif = 0;

    for (const { r, ctl } of pairs) {
      if (!ctl) continue;
      const difs: ControlSummary["difs"] = [];

      // Debug: verificar qué códigos se están procesando
      if (showDebug) {
        console.log(`🔍 Debug Control - Procesando registro:`, {
          legajo: r.legajo,
          key: r.key,
          conceptosPrincipales: getPrincipalLabels().map(([code, label]) => ({ code, label }))
        });
      }

      // Debug: verificar valores consolidados
      if (showDebug && r.data["20610"] !== undefined) {
        console.log(`🔍 Debug Consolidado - RESGUARDO MUTUAL para ${r.legajo}:`, {
          valor: r.data["20610"],
          tipo: typeof r.data["20610"],
          key: r.key
        });
      }

      // Debug: mostrar todos los códigos disponibles en datos consolidados
      const codigosDisponibles = Object.keys(r.data).filter(key => /^20\d{3}$/.test(key));
      if (showDebug && codigosDisponibles.length > 0) {
        console.log(`🔍 Debug Consolidado - Códigos disponibles para ${r.legajo}:`, codigosDisponibles);
        console.log(`🔍 Debug Consolidado - Valores para ${r.legajo}:`, 
          codigosDisponibles.reduce((acc, code) => ({ ...acc, [code]: r.data[code] }), {})
        );
      }

      // Usar solo los conceptos principales para evitar duplicados
      for (const [code, label] of getPrincipalLabels()) {
        const calc = Number(r.data[code] ?? 0);
        const off = Number(ctl.valores[code] ?? 0);
        const delta = off - calc;
        const dentro = Math.abs(delta) <= TOLERANCE;
        
        // Debug específico para RESGUARDO MUTUAL (código 20610)
        if (showDebug && code === "20610") {
          console.log(`🔍 Debug Control - RESGUARDO MUTUAL para ${r.legajo}:`);
          console.log(`  - Valor calculado (PDF):`, calc);
          console.log(`  - Valor oficial (Excel):`, off);
          console.log(`  - Diferencia:`, delta);
          console.log(`  - ¿Dentro de tolerancia?:`, dentro);
          console.log(`  - Tolerancia:`, TOLERANCE);
          console.log(`  - Datos del control disponibles:`, Object.keys(ctl.valores));
          console.log(`  - Valor 20610 en control:`, ctl.valores["20610"]);
        }
        
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
    
    // Normalizar las claves para que tengan el mismo formato
    // Las claves de consKeys tienen formato: "legajo||periodo||empresa"
    // Las claves de official tienen formato: "legajo||periodo"
    // Necesitamos agregar la empresa a las claves de official para la comparación
    const normalizedOfficial = new Set<string>();
    for (const key of official) {
      const parts = key.split("||");
      if (parts.length >= 2) {
        normalizedOfficial.add(`${parts[0]}||${parts[1]}||${empresaFiltro}`);
      }
    }
    
    const missing: Array<{ key: string; legajo: string; periodo: string }> = [];
    if (official.size > 0) {
      // Crear un set de legajos que ya están clasificados (en summaries o oks)
      const classifiedLegajos = new Set([
        ...summaries.map(s => s.legajo),
        ...oks.map(o => o.legajo)
      ]);
      
      for (const k of official) {
        const normalizedKey = `${k.split("||")[0]}||${k.split("||")[1]}||${empresaFiltro}`;
        const legajo = k.split("||")[0];
        
        // Solo agregar a missing si:
        // 1. No está en la base de datos Y
        // 2. No está ya clasificado en summaries o oks
        if (!consKeys.has(normalizedKey) && !classifiedLegajos.has(legajo)) {
          const [legajo = "", periodo = ""] = k.split("||");
          missing.push({ key: k, legajo, periodo });
        }
      }
    }
    
    // Debug: verificar si hay algún legajo específico que aparezca en ambas categorías (solo en modo debug)
    if (showDebug) {
      // Debug para legajos específicos de LIMPAR
      const legajosProblematicos = ["520", "531", "549", "550"];
      for (const legajo of legajosProblematicos) {
        const legajoKey = `${legajo}||${periodoFiltro}`;
        const legajoNormalized = `${legajo}||${periodoFiltro}||${empresaFiltro}`;
        
        const enSummaries = summaries.some(s => s.key === legajoNormalized);
        const enOks = oks.some(o => o.key === legajoNormalized);
        const enMissing = missing.some(m => m.key === legajoKey);
        const enConsKeys = consKeys.has(legajoNormalized);
        const enOfficial = official.has(legajoKey);
        
        console.log(`🔍 Debug legajo ${legajo}:`, {
          enSummaries,
          enOks,
          enMissing,
          enConsKeys,
          enOfficial,
          key: legajoKey,
          normalizedKey: legajoNormalized
        });
      }
      
      // Debug adicional: mostrar algunas claves para verificar formato
      console.log("🔑 Ejemplos de claves en consKeys:", Array.from(consKeys).slice(0, 3));
      console.log("🔑 Ejemplos de claves en official:", Array.from(official).slice(0, 3));
      console.log("🔑 Total consKeys:", consKeys.size);
      console.log("🔑 Total official:", official.size);
      
      // SUMAR: Debug específico para verificar claves
      if (empresaFiltro === "SUMAR") {
        console.log("🔍 SUMAR - DEBUG CONTROL COMPARISON:");
        console.log("🔍 Claves del Excel (official):", Array.from(official).slice(0, 5));
        console.log("🔍 Claves de recibos (consKeys):", Array.from(consKeys).slice(0, 5));
        console.log("🔍 Claves normalizadas (normalizedOfficial):", Array.from(normalizedOfficial).slice(0, 5));
        
        // Verificar si hay coincidencias
        const coincidencias = Array.from(official).filter(key => {
          const parts = key.split("||");
          const normalizedKey = `${parts[0]}||${parts[1]}||${empresaFiltro}`;
          return consKeys.has(normalizedKey);
        });
        console.log("🔍 SUMAR - Coincidencias encontradas:", coincidencias.length);
        console.log("🔍 SUMAR - Ejemplos de coincidencias:", coincidencias.slice(0, 3));
      }
    }
    

    

    // Verificar duplicación (solo en modo debug)
    if (showDebug) {
      // Normalizar todas las claves para la comparación
      const summaryKeys = new Set(summaries.map(s => {
        const parts = s.key.split("||");
        return parts.length >= 2 ? `${parts[0]}||${parts[1]}` : s.key;
      }));
      const okKeys = new Set(oks.map(o => {
        const parts = o.key.split("||");
        return parts.length >= 2 ? `${parts[0]}||${parts[1]}` : o.key;
      }));
      const missingKeys = new Set(missing.map(m => m.key));
      
      // Buscar duplicados
      const allKeys = new Set([...summaryKeys, ...okKeys, ...missingKeys]);
      const duplicates = [];
      
      for (const key of allKeys) {
        const inSummaries = summaryKeys.has(key);
        const inOks = okKeys.has(key);
        const inMissing = missingKeys.has(key);
        
        if ((inSummaries && inOks) || (inSummaries && inMissing) || (inOks && inMissing)) {
          duplicates.push({ key, inSummaries, inOks, inMissing });
        }
      }
      
      if (duplicates.length > 0) {
        console.warn("⚠️ DUPLICADOS DETECTADOS:", duplicates);
      }
      
      // Debug específico para entender la clasificación
      console.log("📊 RESUMEN DE CLASIFICACIÓN:");
      console.log(`- Total en consKeys (base de datos): ${consKeys.size}`);
      console.log(`- Total en official (Excel): ${official.size}`);
      console.log(`- Claves con diferencias: ${summaries.length}`);
      console.log(`- Claves OK: ${oks.length}`);
      console.log(`- Registros sin recibo: ${missing.length}`);
      console.log(`- Total clasificado: ${summaries.length + oks.length + missing.length}`);
      
      // Verificar que todos los legajos de consKeys estén clasificados
      const clasificados = new Set([...summaryKeys, ...okKeys]);
      const noClasificados = [];
      for (const key of consKeys) {
        const parts = key.split("||");
        const legajoKey = parts.length >= 2 ? `${parts[0]}||${parts[1]}` : key;
        if (!clasificados.has(legajoKey)) {
          noClasificados.push(key);
        }
      }
      
      if (noClasificados.length > 0) {
        console.warn("⚠️ LEGAJOS EN BD PERO NO CLASIFICADOS:", noClasificados);
      }
    }
    
    setControlMissing(missing);
    setControlStats({ comps, compOk, compDif, okReceipts: oks.length, difReceipts: summaries.length });
    
    // Debug: verificar los filtros antes de guardar
    if (showDebug) {
      console.log("🔍 Debug computeControl - Filtros antes de guardar:", {
        periodoFiltro,
        empresaFiltro,
        nombreFiltro,
        totalSummaries: summaries.length,
        totalOks: oks.length,
        totalMissing: missing.length
      });
    }
    
    // Guardar el control con los filtros actuales
    await saveControlToDexie(summaries, oks, missing, { comps, compOk, compDif, okReceipts: oks.length, difReceipts: summaries.length }, keysFromExcel ?? officialKeys, officialNameByKey, nameByKey);
    
    if (showDebug) {
      console.log("✅ computeControl - Control guardado exitosamente");
    }
    
    // Actualizar el estado para habilitar el botón de eliminar control
    setHasControlForCurrentFilters(true);
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

      <Tabs defaultValue="agregado" className="w-full" onValueChange={(value) => {
        setActiveTab(value);
        
        // Si se cambia a la pestaña "Recibos", limpiar filtros y mostrar resumen por empresa
        if (value === "agregado") {
          setPeriodoFiltro("");
          setEmpresaFiltro("Todas");
          setNombreFiltro("");
          if (showDebug) {
            console.log("🔄 Pestaña Recibos seleccionada - Filtros limpiados para mostrar resumen por empresa");
          }
        }
      }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agregado">Recibos</TabsTrigger>
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="export">Exportación</TabsTrigger>
          <TabsTrigger value="descuentos">Descuentos</TabsTrigger>
        </TabsList>

        {/* RECIBOS */}
        <TabsContent value="agregado" className="mt-4">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Recibos</CardTitle>
                <CardDescription></CardDescription>
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
                      valueEmpresa={empresaFiltro === "Todas" ? null : empresaFiltro || null}
                      onEmpresa={(v: string | null) => setEmpresaFiltro(v ?? "Todas")}
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
                    controlesPorEmpresa={controlesPorEmpresa}
                    getControlesPorEmpresaPeriodo={getControlesPorEmpresaPeriodo}
                  />
                </>

              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTROL */}
        <TabsContent value="control" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Control</CardTitle>
              <CardDescription>Compara valores oficiales vs calculados.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground min-w-16">Empresa</span>
                  <Select value={empresaFiltro || '__ALL__'} onValueChange={(v) => setEmpresaFiltro(v === '__ALL__' ? "" : v)}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">Todas</SelectItem>
                      {Array.from(new Set(consolidated.map((r) => String(r.data?.EMPRESA ?? "LIMPAR").trim()))).sort().map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground min-w-16">Periodo</span>
                  <Select value={periodoFiltro || '__ALL__'} onValueChange={(v) => {
                    const newPeriodo = v === '__ALL__' ? "" : v;
                    setPeriodoFiltro(newPeriodo);
                    // Blanquear el campo de upload para permitir subir el mismo archivo
                    if (controlFileInputRef.current) {
                      controlFileInputRef.current.value = "";
                    }
                  }}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ALL__">Todos</SelectItem>
                      {Array.from(new Set(consolidated.map((r) => r.periodo))).sort().map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  ref={controlFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="w-full sm:w-auto"
                  disabled={!periodoFiltro || !empresaFiltro}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) void handleOfficialExcel(e.target.files[0]);
                  }}
                />
              </div>
              

              
              <div className="mt-8">
                <SavedControlsList 
                  empresas={Array.from(new Set(consolidated.map((r) => String(r.data?.EMPRESA ?? "LIMPAR").trim()))).sort()}
                  refreshKey={controlsRefreshKey}
                  onViewDetails={handleViewDetails}
                  onCloseDetails={() => setSelectedControl(null)}
                  onEmpresaChange={(empresa) => {
                    setEmpresaFiltro(empresa);
                    // NO limpiar periodoFiltro para mantener la búsqueda del control
                    // setPeriodoFiltro("");
                    setSelectedControl(null); // Cerrar el panel de detalles al cambiar de empresa
                    if (controlFileInputRef.current) {
                      controlFileInputRef.current.value = "";
                    }
                  }}
                  onResetFields={() => {
                    setPeriodoFiltro("");
                    if (controlFileInputRef.current) {
                      controlFileInputRef.current.value = "";
                    }
                  }}
                  selectedEmpresa={empresaFiltro}
                  selectedControlId={selectedControl?.id?.toString() || null}
                  showDebug={showDebug}
                />
              </div>
              
              {/* Panel de detalles del control */}
              {selectedControl && (
                <div className="mt-8">
                  <ControlDetailsPanel
                    control={selectedControl}
                    onClose={() => setSelectedControl(null)}
                    nameByKey={nameByKey}
                    officialNameByKey={officialNameByKey}
                    consolidatedEntities={consolidated}
                  />
                </div>
              )}
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

        {/* DESCUENTOS */}
        <TabsContent value="descuentos" className="mt-4">
          <DescuentosPanel showDebug={showDebug} consolidatedData={consolidated} />
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
      {/* Área de drag & drop para subir PDFs */}
      <div className="fixed bottom-4 right-4 z-50">
        <div
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg shadow-lg cursor-pointer border-2 border-dashed border-blue-400 hover:border-blue-300 transition-colors min-w-[200px]"
          onClick={() => {
            console.log("🖱️ Área de subida clickeada");
            console.log("📁 fileInputRef.current:", fileInputRef.current);
            fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add('bg-blue-500', 'border-blue-200');
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('bg-blue-500', 'border-blue-200');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.remove('bg-blue-500', 'border-blue-200');
            
            console.log("📁 Archivos soltados:", e.dataTransfer.files);
            if (e.dataTransfer.files.length > 0) {
              void handleFiles(e.dataTransfer.files);
            }
          }}
        >
          <div className="flex flex-col items-center space-y-2">
            <FileUp className="h-8 w-8" />
            <div className="text-center">
              <div className="font-medium">Subir PDFs</div>
              <div className="text-xs text-blue-200">Click o arrastra archivos aquí</div>
            </div>
          </div>
        </div>
      </div>
        
        {/* Barra de progreso y botón para continuar procesamiento */}
        {processingFiles && (
          <div className="fixed bottom-6 right-32 shadow-lg z-50 bg-white dark:bg-gray-800 border rounded-lg p-3 min-w-[300px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Procesando archivos</span>
              <span className="text-xs text-muted-foreground">
                {lastProcessedIndex + 1} / {processingFiles.length}
              </span>
            </div>
            
            {/* Barra de progreso */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${Math.min(100, ((lastProcessedIndex + 1) / processingFiles.length) * 100)}%` 
                }}
              />
            </div>
            
            {/* Botón continuar */}
            {lastProcessedIndex >= 0 && lastProcessedIndex < processingFiles.length - 1 && (
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm" 
                onClick={() => handleFiles(processingFiles, lastProcessedIndex + 1)}
              >
                <FileUp className="mr-2 h-4 w-4" /> 
                Continuar desde {lastProcessedIndex + 2}
              </Button>
            )}
            
            {/* Mensaje de completado */}
            {lastProcessedIndex >= processingFiles.length - 1 && (
              <div className="text-center text-sm text-green-600 dark:text-green-400">
                ✅ Procesamiento completado
              </div>
            )}
          </div>
        )}
      
              {/* Panel unificado de estado */}
        <UnifiedStatusPanel uploads={uploads} />
        
        {/* Panel de debug */}
        {showDebug && (
          <DebugPanel
            debugInfo={debugInfo}
            onDeleteVisible={handleDeleteVisible}
            onDeleteControl={handleDeleteControl}
            activeTab={activeTab}
            periodoFiltro={periodoFiltro}
            empresaFiltro={empresaFiltro}
            nombreFiltro={nombreFiltro}
            hasControlForCurrentFilters={hasControlForCurrentFilters}
            processingFiles={processingFiles}
            lastProcessedIndex={lastProcessedIndex}
          />
        )}
        
        {/* Diálogo de split de PDF eliminado - funcionalidad desactivada */}
      </main>
    );
}
