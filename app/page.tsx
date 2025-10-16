// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileUp, Loader2, CheckCircle2, XCircle, Menu, X, Plus, User } from "lucide-react";
import { toast } from "sonner";

import { CODE_LABELS, CODE_KEYS, getPrincipalLabels } from "@/lib/code-labels";
import { sha256OfFile } from "@/lib/hash";
import { repoDexie } from '@/lib/repo-dexie';
import { db } from '@/lib/db';
import { processFiles, processSingleFile, type SimpleProcessingResult } from '@/lib/simple-pdf-processor';
// import { parsePdfReceiptToRecord } from '@/lib/pdf-parser'; // Importación dinámica para evitar SSR
import type { ConsolidatedEntity } from "@/lib/repo";
import type { SavedControlDB, ControlRow } from "@/lib/db";
import { readOfficialXlsxUnified, type OfficialRow } from "@/lib/import-excel-unified";
import TablaAgregada from "@/components/TablaAgregada/TablaAgregada";
import ExcelExporter from "@/components/ExcelExporter";

import SavedControlsList from "@/components/Control/SavedControlsList";
import ControlDetailsPanel from "@/components/Control/ControlDetailsPanel";
import { type ControlOk as ControlOkRow } from "@/lib/export-control";
import type { ControlSummary as ControlSummaryType } from "@/lib/control-types";

// Tipo local para el resumen del control
type ControlSummary = {
  totalEmpleados: number;
  totalOk: number;
  totalDif: number;
  totalFaltantes: number;
};
import { buildAggregatedCsv } from "@/lib/export-aggregated";
import ReceiptsFilters from "@/components/ReceiptsFilters";
import { UnifiedStatusPanel } from "@/components/UnifiedStatusPanel";
import { DebugPanel } from "@/components/DebugPanel";
import DebugModal from "@/components/DebugModal";
import EmpresaModal from "@/components/EmpresaModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DescuentosPanel } from "@/components/DescuentosPanel";
import SidebarNavigation from "@/components/SidebarNavigation";
import ProcessingProgress from "@/components/ProcessingProgress";

type UploadItem = { 
  name: string; 
  status: "pending" | "ok" | "error" | "skipped";
  reason?: string;
  processingResult?: SimpleProcessingResult;
};

const LS_KEY = "recibos_v1";
const BASE_COLS = ["LEGAJO", "PERIODO", "NOMBRE", "ARCHIVO"] as const;

const BATCH_SIZE = 200;

/* -------------------------- helpers -------------------------- */
const makeKey = (r: ConsolidatedEntity) => `${r.legajo}||${r.periodo}||${r.data?.EMPRESA || 'DESCONOCIDA'}`;

export default function Page() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<string>("recibos");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estados principales
  const [consolidated, setConsolidated] = useState<ConsolidatedEntity[]>([]);
  const [savedControls, setSavedControls] = useState<SavedControlDB[]>([]);
  const [currentControl, setCurrentControl] = useState<ControlOkRow[] | null>(null);
  const [controlSummary, setControlSummary] = useState<ControlSummary | null>(null);
  
  // Estados de filtros
  const [periodoFiltro, setPeriodoFiltro] = useState<string>("Todas");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("Todas");
const [nombreFiltro, setNombreFiltro] = useState<string>("");

  // Estados de carga
  const [processingFiles, setProcessingFiles] = useState<UploadItem[] | null>(null);
  const [lastProcessedIndex, setLastProcessedIndex] = useState<number>(0);
  const [showDebug, setShowDebug] = useState<boolean>(true); // Habilitado temporalmente para debug
  const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
  
  // Estados para modal de empresa
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [shouldStopProcessing, setShouldStopProcessing] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlFileInputRef = useRef<HTMLInputElement>(null);

  // Función para extraer empresa del archivo
  const extractEmpresaFromArchivo = (archivo: string): string => {
    if (!archivo) return 'N/A';
    const archivoUpper = archivo.toUpperCase();
    if (archivoUpper.includes('LIME')) return 'LIME';
    if (archivoUpper.includes('LIMPAR')) return 'LIMPAR';
    if (archivoUpper.includes('SUMAR')) return 'SUMAR';
    if (archivoUpper.includes('TYSA')) return 'TYSA';
    if (archivoUpper.includes('ESTRATEGIA AMBIENTAL')) return 'ESTRATEGIA AMBIENTAL';
    if (archivoUpper.includes('ESTRATEGIA URBANA')) return 'ESTRATEGIA URBANA';
    return 'N/A';
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log("🔍 Cargando datos iniciales...");
        const [consolidatedData, controlsData] = await Promise.all([
          db.consolidated.toArray(),
          db.savedControls.toArray()
        ]);
        
        console.log("🔍 Datos cargados:", {
          consolidatedCount: consolidatedData.length,
          controlsCount: controlsData.length,
          consolidatedSample: consolidatedData.slice(0, 2),
          consolidatedFirst: consolidatedData[0],
          consolidatedKeys: consolidatedData.length > 0 ? Object.keys(consolidatedData[0]) : []
        });
        
        setConsolidated(consolidatedData);
        setSavedControls(controlsData);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      }
    };

    loadInitialData();
}, []);

  // Manejar cambio de filtros
useEffect(() => {
    if (activeTab === "control") {
      loadControlFromDexie();
    }
  }, [periodoFiltro, empresaFiltro, activeTab]);

  const loadControlFromDexie = async () => {
    try {
      const control = await db.savedControls
        .where('empresa')
        .equals(empresaFiltro || "")
        .and(c => c.periodo === (periodoFiltro || ""))
        .first();

      if (control) {
        setCurrentControl(control.summaries);
        setControlSummary({
          totalEmpleados: control.summaries.length + control.oks.length + control.missing.length,
          totalOk: control.oks.length,
          totalDif: control.summaries.length,
          totalFaltantes: control.missing.length
        });
      } else {
        setCurrentControl(null);
        setControlSummary(null);
      }
    } catch (error) {
      console.error("Error cargando control:", error);
    }
  };

  // Procesar archivos de forma simple
  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    const uploadItems: UploadItem[] = Array.from(files).map(file => ({
      name: file.name,
      status: "pending" as const
    }));

    setProcessingFiles(uploadItems);
    setLastProcessedIndex(0);
    setShouldStopProcessing(false);

    try {
      // Procesar archivos de forma simple
      const results = await processFiles(files, showDebug);
      
      // Verificar si algún archivo necesita input manual de empresa
      const needsEmpresaInput = results.some(result => result.needsEmpresaInput);
      if (needsEmpresaInput) {
        // Mostrar modal para el primer archivo que necesita empresa
        const firstFileNeedingEmpresa = Array.from(files).find((_, index) => results[index]?.needsEmpresaInput);
        if (firstFileNeedingEmpresa) {
          setPendingFile(firstFileNeedingEmpresa);
          setShowEmpresaModal(true);
          return; // No continuar con el procesamiento hasta que se seleccione la empresa
        }
      }
      
      // Actualizar estados
      results.forEach((result, index) => {
        uploadItems[index] = {
          name: result.fileName,
          status: result.skipped ? "skipped" : result.success ? "ok" : "error",
          reason: result.skipped ? result.reason : result.error,
          processingResult: result
        };
      });
      
      setProcessingFiles([...uploadItems]);

      // Recargar datos consolidados
      const newConsolidated = await db.consolidated.toArray();
      setConsolidated(newConsolidated);
      
      // Mostrar resumen
      const successfulCount = results.filter(r => r.success && !r.skipped).length;
      const skippedCount = results.filter(r => r.skipped).length;
      const failedCount = results.filter(r => !r.success && !r.skipped).length;

      if (failedCount === 0) {
        toast.success(`Procesados ${successfulCount} archivos${skippedCount > 0 ? `, ${skippedCount} omitidos` : ''}`);
      } else {
        toast.error(`Procesados ${successfulCount} archivos, ${failedCount} fallaron${skippedCount > 0 ? `, ${skippedCount} omitidos` : ''}`);
      }

    } catch (error) {
      console.error("Error en procesamiento:", error);
      toast.error("Error procesando archivos");
    } finally {
      setProcessingFiles(null);
      setLastProcessedIndex(0);
    }
  }, []);

  // Manejar subida de archivos
  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, [handleFiles]);

  // Manejar subida de controles
  const handleControlUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
                const excelData = await readOfficialXlsxUnified(file, empresaFiltro || "", {
                  periodoResolver: (periodoRaw: unknown) => periodoFiltro || "07/2025",
                  debug: showDebug
                });
      
      if (excelData.length === 0) {
        toast.error("No se encontraron datos en el archivo Excel");
        return;
      }
      
      // Procesar control
      const controlRows: ControlOkRow[] = excelData.map(row => ({
        key: row.key,
        legajo: row.meta?.legajo || '',
        periodo: row.meta?.periodo || '',
        nombre: row.meta?.nombre || '',
        cuil: row.meta?.cuil || '',
                  empresa: empresaFiltro || "TODAS",
        conceptos: row.valores,
        total: Object.values(row.valores).reduce((sum, val) => sum + parseFloat(val || '0'), 0),
        archivo: file.name
      }));

      const summary: ControlSummary = {
        totalEmpleados: controlRows.length,
        totalOk: controlRows.length, // Por ahora todos son OK
        totalDif: 0,
        totalFaltantes: 0
      };

      // Guardar control
                const savedControl: SavedControlDB = {
                  filterKey: `${periodoFiltro || ""}||${empresaFiltro || ""}`,
                  empresa: empresaFiltro || "",
                  periodo: periodoFiltro || "",
        summaries: [], // Por ahora vacío
        oks: controlRows.map(row => ({
          key: row.key,
          legajo: row.legajo,
          periodo: row.periodo
        })),
        missing: [], // Por ahora vacío
        stats: {
          comps: controlRows.length,
          compOk: controlRows.length,
          compDif: 0,
          okReceipts: controlRows.length,
          difReceipts: 0
        },
        officialKeys: controlRows.map(row => row.key),
        officialNameByKey: Object.fromEntries(controlRows.map(row => [row.key, row.legajo])),
        nameByKey: Object.fromEntries(controlRows.map(row => [row.key, row.legajo])),
        createdAt: Date.now()
      };

      await db.savedControls.add(savedControl);
      setSavedControls(prev => [...prev, savedControl]);
      setCurrentControl([]); // Por ahora vacío hasta implementar la lógica de comparación
      setControlSummary(summary);

      toast.success(`Control cargado: ${controlRows.length} empleados`);

    } catch (error) {
      console.error("Error cargando control:", error);
      toast.error("Error cargando archivo de control");
    }
  }, [empresaFiltro, periodoFiltro]);

  // Parar procesamiento
  const continueProcessing = useCallback(() => {
    setShouldStopProcessing(true);
    setProcessingFiles(null);
    setLastProcessedIndex(0);
    toast.info("Procesamiento cancelado");
  }, []);


  // Eliminar control actual
  const handleDeleteControl = useCallback(async () => {
    try {
      if (!empresaFiltro || !periodoFiltro) {
        toast.error("Selecciona empresa y período para eliminar el control");
        return;
      }

      const filterKey = `${periodoFiltro}||${empresaFiltro}`;
      await db.savedControls.where('filterKey').equals(filterKey).delete();
      
      // Recargar controles
      const newControls = await db.savedControls.toArray();
      setSavedControls(newControls);
      
      setCurrentControl(null);
      setControlSummary(null);
      
      toast.success("Control eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando control:", error);
      toast.error("Error eliminando control");
    }
  }, [empresaFiltro, periodoFiltro]);

  // Datos filtrados
  const filteredData = useMemo(() => {
    if (!consolidated || !Array.isArray(consolidated)) {
      console.log("🔍 filteredData - consolidated vacío o no es array:", consolidated);
      return [];
    }
    
    const filtered = consolidated.filter(item => {
      const matchesPeriodo = !periodoFiltro || periodoFiltro === "Todas" || item.periodo === periodoFiltro;
      
      // Para empresa, verificar si coincide con la empresa detectada
      let matchesEmpresa = true;
      if (empresaFiltro && empresaFiltro !== "Todas") {
        const itemEmpresa = item.data?.EMPRESA || extractEmpresaFromArchivo(item.archivos ? item.archivos.join(', ') : '');
        matchesEmpresa = itemEmpresa === empresaFiltro;
        
        // Debug específico para legajo 10
        if (item.legajo === '10') {
          console.log('🔍 Debug legajo 10:', {
            legajo: item.legajo,
            itemEmpresa,
            empresaFiltro,
            matchesEmpresa,
            dataEMPRESA: item.data?.EMPRESA,
            archivos: item.archivos
          });
        }
      }
      
      const matchesNombre = nombreFiltro === "" || 
        (item.nombre && item.nombre.toLowerCase().includes(nombreFiltro.toLowerCase())) ||
        (item.legajo && item.legajo.toLowerCase().includes(nombreFiltro.toLowerCase()));
      
      return matchesPeriodo && matchesEmpresa && matchesNombre;
    });
    
    console.log("🔍 filteredData - Resultado:", {
      totalConsolidated: consolidated.length,
      totalFiltered: filtered.length,
      periodoFiltro,
      empresaFiltro,
      nombreFiltro,
      primeros3: filtered.slice(0, 3).map(item => ({
        legajo: item.legajo,
        periodo: item.periodo,
        nombre: item.nombre,
        empresa: item.data?.EMPRESA
      }))
    });
    
    return filtered;
  }, [consolidated, periodoFiltro, empresaFiltro, nombreFiltro]);

  // Eliminar registros visibles
  const handleDeleteVisible = useCallback(async () => {
    try {
      // Obtener datos filtrados actuales
      const currentFiltered = consolidated.filter(item => {
        const matchesPeriodo = !periodoFiltro || periodoFiltro === "Todas" || item.periodo === periodoFiltro;
        
        let matchesEmpresa = true;
        if (empresaFiltro && empresaFiltro !== "Todas") {
          const itemEmpresa = item.data?.EMPRESA || extractEmpresaFromArchivo(item.archivos ? item.archivos.join(', ') : '');
          matchesEmpresa = itemEmpresa === empresaFiltro;
        }
        
        const matchesNombre = nombreFiltro === "" || 
          (item.nombre && item.nombre.toLowerCase().includes(nombreFiltro.toLowerCase())) ||
          (item.legajo && item.legajo.toLowerCase().includes(nombreFiltro.toLowerCase()));
        
        return matchesPeriodo && matchesEmpresa && matchesNombre;
      });
      
      // Obtener las claves de los registros filtrados
      const keysToDelete = currentFiltered.map(item => `${item.legajo}||${item.periodo}||${item.data?.EMPRESA || 'DESCONOCIDA'}`);
      
      // Eliminar de la base de datos
      await db.consolidated.where('legajo').anyOf(currentFiltered.map(item => item.legajo)).delete();
      
      // Recargar datos
      const newConsolidated = await db.consolidated.toArray();
      setConsolidated(newConsolidated);
      
      toast.success(`${keysToDelete.length} registros eliminados correctamente`);
    } catch (error) {
      console.error("Error eliminando registros:", error);
      toast.error("Error eliminando registros");
    }
  }, [consolidated, periodoFiltro, empresaFiltro, nombreFiltro]);

  // Función para verificar el estado de la base de datos
  const handleCheckDatabase = useCallback(async () => {
    try {
      const allConsolidated = await db.consolidated.toArray();
      const allControls = await db.savedControls.toArray();
      const allReceipts = await db.receipts.toArray();
      
      console.log("🔍 Estado actual de la base de datos:", {
        receipts: allReceipts.length,
        consolidated: allConsolidated.length,
        controls: allControls.length,
        receiptsData: allReceipts.slice(0, 3).map(item => ({
          legajo: item.legajo,
          periodo: item.periodo,
          filename: item.filename,
          hashes: item.hashes
        })),
        consolidatedData: allConsolidated.slice(0, 3).map(item => ({
          legajo: item.legajo,
          periodo: item.periodo,
          archivos: item.archivos,
          data: item.data
        }))
      });
      
      toast.info(`Base de datos: ${allReceipts.length} archivos, ${allConsolidated.length} consolidados, ${allControls.length} controles`);
    } catch (error) {
      console.error("Error verificando base de datos:", error);
      toast.error("Error verificando base de datos");
    }
  }, []);

  // Función para limpiar TODA la base de datos (para testing)
  const handleClearAllData = useCallback(async () => {
    try {
      if (window.confirm('¿Estás seguro de que quieres eliminar TODOS los registros? Esta acción no se puede deshacer.')) {
        console.log("🧹 Limpiando base de datos...");
        
        // Limpiar todas las tablas
        await db.receipts.clear();
        await db.consolidated.clear();
        await db.savedControls.clear();
        
        console.log("✅ Base de datos limpiada");
        
        // Recargar datos
        const newConsolidated = await db.consolidated.toArray();
        const newControls = await db.savedControls.toArray();
        
        console.log("📊 Datos después de limpiar:", {
          consolidated: newConsolidated.length,
          controls: newControls.length
        });
        
        setConsolidated(newConsolidated);
        setSavedControls(newControls);
        
        toast.success("Base de datos limpiada completamente");
      }
    } catch (error) {
      console.error("Error limpiando base de datos:", error);
      toast.error("Error limpiando base de datos");
    }
  }, []);

  // Limpiar recibos sin empresa
  const handleClearReceiptsWithoutEmpresa = useCallback(async () => {
    try {
      if (window.confirm('¿Estás seguro de que quieres eliminar todos los recibos sin empresa detectada?')) {
        console.log("🧹 Limpiando recibos sin empresa...");
        
        // Obtener todos los recibos
        const allReceipts = await db.receipts.toArray();
        const allConsolidated = await db.consolidated.toArray();
        
        // Filtrar recibos sin empresa
        const receiptsWithoutEmpresa = allReceipts.filter(receipt => {
          const empresa = receipt.data?.EMPRESA;
          return !empresa || empresa === 'DESCONOCIDA' || empresa === 'N/A' || empresa === '';
        });
        
        // Filtrar consolidados sin empresa
        const consolidatedWithoutEmpresa = allConsolidated.filter(item => {
          const empresa = item.data?.EMPRESA;
          return !empresa || empresa === 'DESCONOCIDA' || empresa === 'N/A' || empresa === '';
        });
        
        console.log("🔍 Recibos sin empresa encontrados:", {
          receipts: receiptsWithoutEmpresa.length,
          consolidated: consolidatedWithoutEmpresa.length,
          receiptsData: receiptsWithoutEmpresa.map(r => ({
            legajo: r.legajo,
            filename: r.filename,
            empresa: r.data?.EMPRESA
          }))
        });
        
        // Eliminar recibos sin empresa
        for (const receipt of receiptsWithoutEmpresa) {
          await db.receipts.delete(receipt.id!);
        }
        
        // Eliminar consolidados sin empresa
        for (const item of consolidatedWithoutEmpresa) {
          await db.consolidated.delete(item.legajo + '||' + item.periodo + '||' + (item.data?.EMPRESA || 'DESCONOCIDA'));
        }
        
        // Recargar datos
        const newConsolidated = await db.consolidated.toArray();
        const newControls = await db.savedControls.toArray();
        
        console.log("📊 Datos después de limpiar:", {
          consolidated: newConsolidated.length,
          controls: newControls.length
        });
        
        setConsolidated(newConsolidated);
        setSavedControls(newControls);
        
        toast.success(`${receiptsWithoutEmpresa.length} recibos sin empresa eliminados`);
      }
    } catch (error) {
      console.error("Error limpiando recibos sin empresa:", error);
      toast.error("Error limpiando recibos sin empresa");
    }
  }, []);

  // Manejar confirmación de empresa manual
  const handleEmpresaConfirm = useCallback(async (empresa: string) => {
    if (!pendingFile) return;
    
    try {
      // Procesar el archivo con la empresa seleccionada
      const result = await processSingleFile(pendingFile, showDebug);
      
      // Actualizar el resultado con la empresa seleccionada
      if (result.success && !result.skipped) {
        // Actualizar la base de datos con la empresa correcta
        const hash = await sha256OfFile(pendingFile);
        if (hash) {
          const existing = await repoDexie.findReceiptByHash(hash);
          if (existing) {
            // Actualizar la empresa en el registro existente
            await db.receipts.update(existing.id!, {
              data: { ...existing.data, EMPRESA: empresa }
            });
            
            // Actualizar también en consolidated si existe
            const consolidatedItem = await db.consolidated.where('legajo').equals(existing.legajo).first();
            if (consolidatedItem) {
              const key = consolidatedItem.legajo + '||' + consolidatedItem.periodo + '||' + (consolidatedItem.data?.EMPRESA || 'DESCONOCIDA');
              await db.consolidated.update(key, {
                data: { ...consolidatedItem.data, EMPRESA: empresa }
              });
            }
          }
        }
      }
      
      // Cerrar modal y limpiar estado
      setShowEmpresaModal(false);
      setPendingFile(null);
      
      // Recargar datos
      const newConsolidated = await db.consolidated.toArray();
      setConsolidated(newConsolidated);
      
      toast.success(`Archivo procesado con empresa: ${empresa}`);
    } catch (error) {
      console.error("Error procesando archivo con empresa manual:", error);
      toast.error("Error procesando archivo");
    }
  }, [pendingFile, showDebug]);

  // Manejar cancelación del modal de empresa
  const handleEmpresaCancel = useCallback(() => {
    setShowEmpresaModal(false);
    setPendingFile(null);
    toast.info("Procesamiento cancelado");
  }, []);

  // Debug del estado de consolidated
  useEffect(() => {
    console.log("🔍 Estado de consolidated actualizado:", {
      consolidated: consolidated,
      length: consolidated?.length,
      isArray: Array.isArray(consolidated),
      firstItem: consolidated?.[0]
    });
  }, [consolidated]);

  // Opciones de filtros
  const periodos = useMemo(() => {
    if (!consolidated || !Array.isArray(consolidated)) {
      console.log("🔍 periodos - consolidated vacío o no es array:", consolidated);
      return [];
    }
    const unique = [...new Set(consolidated.map(item => item.periodo))].sort();
    console.log("🔍 periodos generados:", unique);
    return unique;
  }, [consolidated]);

  const empresas = useMemo(() => {
    if (!consolidated || !Array.isArray(consolidated)) {
      console.log("🔍 empresas - consolidated vacío o no es array:", consolidated);
      return [];
    }
    
    // Extraer empresas únicamente de los datos reales
    const empresasSet = new Set<string>();
    
    consolidated.forEach(item => {
      // 1. Buscar en data.EMPRESA
      if (item.data?.EMPRESA && item.data.EMPRESA !== 'DESCONOCIDA') {
        empresasSet.add(item.data.EMPRESA);
      }
      
      // 2. Si no hay empresa en data, extraer del nombre del archivo
      if (!item.data?.EMPRESA || item.data.EMPRESA === 'DESCONOCIDA') {
        const archivos = item.archivos || [];
        for (const archivo of archivos) {
          const archivoUpper = archivo.toUpperCase();
          if (archivoUpper.includes('LIME')) {
            empresasSet.add('LIME');
            break;
          }
          if (archivoUpper.includes('LIMPAR')) {
            empresasSet.add('LIMPAR');
            break;
          }
          if (archivoUpper.includes('SUMAR')) {
            empresasSet.add('SUMAR');
            break;
          }
          if (archivoUpper.includes('TYSA')) {
            empresasSet.add('TYSA');
            break;
          }
          if (archivoUpper.includes('ESTRATEGIA AMBIENTAL')) {
            empresasSet.add('ESTRATEGIA AMBIENTAL');
            break;
          }
          if (archivoUpper.includes('ESTRATEGIA URBANA')) {
            empresasSet.add('ESTRATEGIA URBANA');
            break;
          }
        }
      }
    });
    
    const unique = Array.from(empresasSet).sort();
    
    console.log("🔍 empresas detectadas en datos:", {
      totalItems: consolidated.length,
      empresas: unique,
      sampleData: consolidated.slice(0, 3).map(item => ({
        legajo: item.legajo,
        empresa: item.data?.EMPRESA,
        archivos: item.archivos
      }))
    });
    
    return unique;
  }, [consolidated]);

  // Mostrar loading mientras se verifica la autenticación
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Redirigir a login si no está autenticado
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h1>
          <p className="text-gray-600 mb-6">Necesitas iniciar sesión para acceder al sistema</p>
          <Button onClick={() => window.location.href = '/auth/signin'} className="w-full sm:w-auto">
            Ir a Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
          <Button
              variant="ghost"
            size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
          >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
            <h1 className="text-lg font-semibold text-gray-900">
              Gestor de Recibos
            </h1>
          </div>
          <div className="flex items-center space-x-2">
          <ThemeToggle />
            <div className="text-sm text-gray-600">
              {session?.user?.name}
        </div>
          </div>
        </div>
      </div>

      {/* Navigation Desktop */}
      <div className="hidden lg:block">
        <SidebarNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          onDebugClick={() => setShowDebugModal(true)}
        />
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "recibos" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("recibos");
                setIsMobileMenuOpen(false);
              }}
              className="text-xs"
            >
              Recibos
            </Button>
            <Button
              variant={activeTab === "control" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("control");
                setIsMobileMenuOpen(false);
              }}
              className="text-xs"
            >
              Control
            </Button>
            <Button
              variant={activeTab === "export" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("export");
                setIsMobileMenuOpen(false);
              }}
              className="text-xs"
            >
              Exportar
            </Button>
            <Button
              variant={activeTab === "descuentos" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("descuentos");
                setIsMobileMenuOpen(false);
              }}
              className="text-xs"
            >
              Descuentos
            </Button>
            <Button
              variant={activeTab === "usuarios" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("usuarios");
                setIsMobileMenuOpen(false);
              }}
              className="text-xs"
            >
              Usuarios
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl p-4 lg:p-6 lg:ml-64">
        {/* Header contextual */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            {activeTab === 'recibos' && 'Recibos'}
            {activeTab === 'control' && 'Control'}
            {activeTab === 'export' && 'Exportar'}
            {activeTab === 'descuentos' && 'Descuentos'}
            {activeTab === 'usuarios' && 'Usuarios'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'recibos' && 'Gestión de recibos de sueldo'}
            {activeTab === 'control' && 'Control de nóminas y comparaciones'}
            {activeTab === 'export' && 'Exportación de datos'}
            {activeTab === 'descuentos' && 'Gestión de descuentos'}
            {activeTab === 'usuarios' && 'Administración de usuarios'}
          </p>
        </div>
        {/* Progress Bar */}
        {processingFiles && (
          <ProcessingProgress
            files={processingFiles}
            currentIndex={lastProcessedIndex}
            onStop={continueProcessing}
            showDetails={showDebug}
          />
        )}

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Recibos Tab */}
          <TabsContent value="recibos" className="space-y-4">
          <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Recibos de Sueldo
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {filteredData.length} registros encontrados
                    </CardDescription>
              </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                      disabled={!!processingFiles}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Subir PDFs
                    </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
                    <ReceiptsFilters
                  periodos={periodos}
                  empresas={empresas}
                  valuePeriodo={periodoFiltro}
                  onPeriodo={(v) => setPeriodoFiltro(v || "")}
                  valueEmpresa={empresaFiltro}
                  onEmpresa={(v) => setEmpresaFiltro(v || "")}
                      valueNombre={nombreFiltro}
                      onNombre={setNombreFiltro}
                    />
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {filteredData.length} registros encontrados
                  </div>
                  <ExcelExporter 
                    data={filteredData} 
                    showEmpresa={empresaFiltro === "Todas" || !empresaFiltro}
                    fileName="recibos"
                    visibleColumns={visibleColumns}
                    columnAliases={columnAliases}
                  />
                </div>
                <div className="mt-4">
                  <TablaAgregada 
                  data={filteredData} 
                  showEmpresa={empresaFiltro === "Todas" || !empresaFiltro}
                  onColumnsChange={(columns, aliases) => {
                    setVisibleColumns(columns);
                    setColumnAliases(aliases);
                  }}
                />
                  </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Control Tab */}
          <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Control de Recibos</CardTitle>
                <CardDescription>
                  Comparar recibos con datos oficiales
                </CardDescription>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Empresa</label>
                    <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
                      <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {empresas.map(empresa => (
                          <SelectItem key={empresa} value={empresa}>
                            {empresa}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Período</label>
                    <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                      <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {periodos.map(periodo => (
                          <SelectItem key={periodo} value={periodo}>
                            {periodo}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                  <div className="flex items-end">
                    <input
                  ref={controlFileInputRef}
                  type="file"
                      accept=".xlsx,.xls"
                      onChange={handleControlUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => controlFileInputRef.current?.click()}
                      className="w-full sm:w-auto"
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Subir Control
                    </Button>
              </div>
              </div>
              
                {currentControl && controlSummary && (
                  <div className="mt-6">
                  <ControlDetailsPanel
                      control={null} // Por ahora null hasta implementar la lógica completa
                      onClose={() => setCurrentControl(null)}
                      nameByKey={{}}
                      consolidatedEntities={filteredData}
                  />
                </div>
              )}

                <SavedControlsList
                  empresas={empresas}
                  onViewDetails={(control) => {
                    setCurrentControl(control.summaries || []);
                    setControlSummary({
                      totalEmpleados: control.stats.comps,
                      totalOk: control.stats.compOk,
                      totalDif: control.stats.compDif,
                      totalFaltantes: control.missing.length
                    });
                    setEmpresaFiltro(control.empresa || "Todas");
                    setPeriodoFiltro(control.periodo || "Todas");
                  }}
                />
            </CardContent>
          </Card>
        </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Exportar Datos</CardTitle>
                <CardDescription>
                  Exportar recibos y controles en diferentes formatos
                </CardDescription>
            </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={() => {
                      const csv = buildAggregatedCsv(filteredData, [...BASE_COLS]);
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `recibos_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                    }}
                    className="w-full"
                    disabled={filteredData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const json = JSON.stringify(filteredData, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `recibos_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="w-full"
                    disabled={filteredData.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar JSON
                    </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          {/* Descuentos Tab */}
          <TabsContent value="descuentos" className="space-y-4">
            <DescuentosPanel empresaFiltro={empresaFiltro} employees={consolidated} />
          </TabsContent>

          {/* Usuarios Tab */}
          <TabsContent value="usuarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Gestión de Usuarios</CardTitle>
                <CardDescription>
                  Administrar usuarios y permisos del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Botón para crear usuario */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Usuarios del Sistema</h3>
                    <p className="text-sm text-gray-600">
                      Gestiona los usuarios y sus permisos
                    </p>
                  </div>
          <Button 
                    onClick={() => {
                      // TODO: Implementar modal de creación de usuario
                      toast.info("Funcionalidad de creación de usuarios en desarrollo");
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crear Usuario
          </Button>
                </div>

                {/* Lista de usuarios (placeholder) */}
                <div className="border rounded-lg p-4">
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">
                      No hay usuarios registrados
                    </p>
                    <p className="text-sm text-gray-500">
                      Usa el botón "Crear Usuario" para agregar el primer usuario
                    </p>
                  </div>
                </div>

                {/* Información del usuario actual */}
                {session?.user && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Usuario Actual</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Nombre:</span> {session.user.name || 'N/A'}</p>
                      <p><span className="font-medium">Email:</span> {session.user.email || 'N/A'}</p>
                      <p><span className="font-medium">Rol:</span> {session.user.role || 'N/A'}</p>
                      <p><span className="font-medium">Empresa:</span> {session.user.empresaId || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>

        {/* Debug Modal */}
        <DebugModal
          isOpen={showDebugModal}
          onClose={() => setShowDebugModal(false)}
          debugInfo={{
            totalRows: consolidated?.length || 0,
            consolidatedCount: consolidated?.length || 0,
            controlCount: 0,
            savedControlsCount: savedControls?.length || 0,
            settingsCount: 0
          }}
          onDeleteVisible={handleDeleteVisible}
          onDeleteControl={handleDeleteControl}
          onClearAllData={handleClearAllData}
          onClearReceiptsWithoutEmpresa={handleClearReceiptsWithoutEmpresa}
          onCheckDatabase={handleCheckDatabase}
          activeTab={activeTab}
          periodoFiltro={periodoFiltro}
          empresaFiltro={empresaFiltro}
          nombreFiltro={nombreFiltro}
          hasControlForCurrentFilters={!!savedControls && savedControls.length > 0}
          processingFiles={processingFiles}
          lastProcessedIndex={lastProcessedIndex}
        />
        
        {/* Modal de Empresa Manual */}
        <EmpresaModal
          isOpen={showEmpresaModal}
          onClose={handleEmpresaCancel}
          onConfirm={handleEmpresaConfirm}
          fileName={pendingFile?.name || ''}
        />
      </main>
    </div>
    );
}