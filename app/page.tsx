// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FileUp, Loader2, CheckCircle2, XCircle, Menu, X, Plus, User } from "lucide-react";
import { toast } from "sonner";

import { CODE_LABELS, CODE_KEYS, getPrincipalLabels } from "@/lib/code-labels";
import { sha256OfFile } from "@/lib/hash";
import { repoDexie } from '@/lib/repo-dexie';
import { db } from '@/lib/db';
import { processFiles, processSingleFile, processSingleFileWithData, type SimpleProcessingResult } from '@/lib/simple-pdf-processor';
// import { parsePdfReceiptToRecord } from '@/lib/pdf-parser'; // Importación dinámica para evitar SSR
import { useLearnedRules } from '@/hooks/useLearnedRules';
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
import ParserAdjustmentModal from "@/components/ParserAdjustmentModal";
import EditDataModal from "@/components/EditDataModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DescuentosPanel } from "@/components/DescuentosPanel";
import SidebarNavigation from "@/components/SidebarNavigation";
import Dashboard, { DashboardRef } from "@/components/Dashboard";
import BackupPanel from "@/components/BackupPanel";
import ProcessingProgress from "@/components/ProcessingProgress";
import PersistentUploadProgress from "@/components/PersistentUploadProgress";
import { UploadSessionManager } from "@/lib/upload-session-manager";

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
  const [activeTab, setActiveTab] = useState<string>("tablero");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Hook para reglas aprendidas
  const { learnRule, learnEmpresaRule, learnPeriodoRule, findApplicableRule } = useLearnedRules();
  
  // Función para obtener ayuda contextual según la sección activa
  const getContextualHelp = (tab: string) => {
    const baseShortcuts = "Navegación: T=Tablero, R=Recibos, C=Control, D=Descuentos, U=Usuarios, B=Backup, E=Export";
    const globalShortcuts = "Globales: F=Debug, H=Ayuda, M=Menú";
    
    switch (tab) {
      case 'tablero':
        return `${baseShortcuts} | Tablero: L=Actualizar datos | ${globalShortcuts}`;
      case 'recibos':
        return `${baseShortcuts} | Recibos: N=Subir archivos, L=Actualizar | ${globalShortcuts}`;
      case 'control':
        return `${baseShortcuts} | Control: S=Guardar, N=Nuevo control, L=Actualizar | ${globalShortcuts}`;
      case 'descuentos':
        return `${baseShortcuts} | Descuentos: N=Nuevo descuento, L=Actualizar | ${globalShortcuts}`;
      case 'usuarios':
        return `${baseShortcuts} | Usuarios: N=Nuevo usuario, L=Actualizar lista | ${globalShortcuts}`;
      case 'backup':
        return `${baseShortcuts} | Backup: L=Actualizar respaldos | ${globalShortcuts}`;
      case 'export':
        return `${baseShortcuts} | Exportar: X=Exportar datos, L=Actualizar | ${globalShortcuts}`;
      default:
        return `${baseShortcuts} | ${globalShortcuts}`;
    }
  };
  
  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Solo procesar atajos si no estamos en un input, textarea o select
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement || 
          event.target instanceof HTMLSelectElement) {
        return;
      }
      
      // Evitar atajos si se está presionando Ctrl, Alt o Meta
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      
      const key = event.key.toLowerCase();
      
      switch (key) {
        // Navegación entre secciones
        case 't':
          event.preventDefault();
          setActiveTab('tablero');
          break;
        case 'r':
          event.preventDefault();
          setActiveTab('recibos');
          break;
        case 'c':
          event.preventDefault();
          setActiveTab('control');
          break;
        case 'd':
          event.preventDefault();
          setActiveTab('descuentos');
          break;
        case 'u':
          event.preventDefault();
          setActiveTab('usuarios');
          break;
        case 'b':
          event.preventDefault();
          setActiveTab('backup');
          break;
        case 'e':
          event.preventDefault();
          setActiveTab('export');
          break;
        
        // Acciones rápidas globales
        case 'f':
          event.preventDefault();
          // Abrir modal de debug
          setShowDebugModal(true);
          console.log("🔧 Abriendo modal de debug");
          break;
        case 'h':
          event.preventDefault();
          // Abrir modal de ayuda
          setShowHelpModal(true);
          console.log("❓ Abriendo modal de ayuda");
          break;
        case '?':
          event.preventDefault();
          // Mostrar ayuda completa contextual
          const contextualHelp = getContextualHelp(activeTab);
          toast.info(contextualHelp);
          break;
        
        // Acciones contextuales por sección
        case 's':
          event.preventDefault();
          // Guardar datos actuales
          if (activeTab === 'control') {
            toast.info("Usa Ctrl+S para guardar el control");
          } else if (activeTab === 'descuentos') {
            toast.info("Los descuentos se guardan automáticamente");
          } else {
            toast.info("Función de guardado no disponible en esta sección");
          }
          break;
        case 'n':
          event.preventDefault();
          // Nueva acción (dependiendo de la sección)
          if (activeTab === 'recibos') {
            // Abrir selector de archivos
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) {
              fileInput.click();
            }
          } else if (activeTab === 'descuentos') {
            // Abrir modal de nuevo descuento
            toast.info("Usa el botón '+' para crear un nuevo descuento");
          } else if (activeTab === 'control') {
            toast.info("Usa el botón 'Nuevo Control' para crear un control");
          } else if (activeTab === 'usuarios') {
            // Crear nuevo usuario
            toast.info("Usa el botón 'Crear Usuario' para agregar un nuevo usuario");
          } else {
            toast.info("Nueva acción no disponible en esta sección");
          }
          break;
        case 'l':
          event.preventDefault();
          // Listar/refrescar datos
          if (activeTab === 'tablero') {
            loadData();
            toast.info("Datos actualizados");
          } else if (activeTab === 'recibos') {
            loadData();
            toast.info("Recibos actualizados");
          } else {
            toast.info("Usa Ctrl+R para refrescar esta sección");
          }
          break;
        case 'x':
          event.preventDefault();
          // Exportar datos
          if (activeTab === 'export') {
            toast.info("Usa los botones de exportación disponibles");
          } else {
            setActiveTab('export');
            toast.info("Navegando a Exportar");
          }
          break;
        case 'm':
          event.preventDefault();
          // Mostrar menú móvil
          setIsMobileMenuOpen(!isMobileMenuOpen);
          console.log("📱 Toggle menú móvil:", !isMobileMenuOpen);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
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
  const [showDebug, setShowDebug] = useState<boolean>(true); // Activado para debug
  const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  
  // Estados para persistencia de subidas
  const [currentUploadSessionId, setCurrentUploadSessionId] = useState<string | null>(null);
  const [hasPendingUploads, setHasPendingUploads] = useState<boolean>(false);
  
  // Estados para modal de empresa
  const [showEmpresaModal, setShowEmpresaModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Estados para drag & drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [showParserAdjustmentModal, setShowParserAdjustmentModal] = useState(false);
  const [pendingParserData, setPendingParserData] = useState<{file: File, data: Record<string, string>} | null>(null);
  const [showDescuentosInParserModal, setShowDescuentosInParserModal] = useState(false);
  const [shouldStopProcessing, setShouldStopProcessing] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  
  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRow, setEditingRow] = useState<ConsolidatedEntity | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRow, setDeletingRow] = useState<ConsolidatedEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlFileInputRef = useRef<HTMLInputElement>(null);
  const dashboardRef = useRef<DashboardRef>(null);

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

  // Cargar datos iniciales - SOLO UNA VEZ
  useEffect(() => {
    let isMounted = true; // Flag para evitar actualizaciones si el componente se desmonta
    
    const loadInitialData = async () => {
      try {
        console.log("🔍 Cargando datos iniciales...");
        const [consolidatedData, controlsData] = await Promise.all([
          db.consolidated.toArray(),
          db.savedControls.toArray()
        ]);
        
        // Solo actualizar si el componente sigue montado
        if (isMounted) {
          console.log("🔍 Datos cargados:", {
            consolidatedCount: consolidatedData.length,
            controlsCount: controlsData.length
          });
          
          setConsolidated(consolidatedData);
          setSavedControls(controlsData);
        }
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      }
    };

    loadInitialData();
    
    return () => {
      isMounted = false; // Cleanup
    };
  }, []); // Array vacío - solo se ejecuta una vez

  // Verificar subidas pendientes al cargar la app - SOLO UNA VEZ por usuario
  useEffect(() => {
    let isMounted = true;
    
    const checkPendingUploads = async () => {
      if (!session?.user?.id) {
        console.log("🔍 No hay usuario autenticado, saltando verificación de subidas pendientes");
        return;
      }
      
      console.log("🔍 Verificando subidas pendientes para usuario:", session.user.id);
      
      try {
        const activeSessions = await UploadSessionManager.getActiveSessions(session.user.id);
        console.log("🔍 Sesiones activas encontradas:", activeSessions.length);
        
        // Solo actualizar si el componente sigue montado
        if (isMounted) {
          if (activeSessions.length > 0) {
            console.log("📤 Subidas pendientes encontradas:", activeSessions.length);
            setHasPendingUploads(true);
            const latestSession = activeSessions.sort((a, b) => b.startedAt - a.startedAt)[0];
            setCurrentUploadSessionId(latestSession.sessionId);
            console.log("📤 Sesión seleccionada para mostrar:", latestSession.sessionId);
          } else {
            console.log("✅ No hay subidas pendientes");
            setHasPendingUploads(false);
            setCurrentUploadSessionId(null);
          }
        }
      } catch (error) {
        console.error("❌ Error verificando subidas pendientes:", error);
        if (isMounted) {
          setHasPendingUploads(false);
          setCurrentUploadSessionId(null);
        }
      }
    };

    if (session?.user?.id) {
      checkPendingUploads();
    }
    
    return () => {
      isMounted = false; // Cleanup
    };
  }, [session?.user?.id]);

  // Manejar cambio de filtros - SOLO cuando cambia el tab a control
  useEffect(() => {
    if (activeTab === "control") {
      console.log("🔄 Cargando control desde Dexie...");
      loadControlFromDexie();
    }
  }, [activeTab]); // Solo cuando cambia el tab, no en cada filtro

  // Manejar filtros de control - SIN recargar datos, solo filtrar
  useEffect(() => {
    if (activeTab === "control" && savedControls.length > 0) {
      console.log("🔍 Aplicando filtros de control...");
      // Aquí se aplicarán los filtros sin recargar datos
      // Los filtros se manejan en el componente ControlDetailsPanel
    }
  }, [periodoFiltro, empresaFiltro, activeTab, savedControls.length]);

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

    // CREAR SESIÓN INMEDIATAMENTE, ANTES DE CUALQUIER PROCESAMIENTO
    let sessionId: string | null = null;
    if (session?.user?.id) {
      try {
        const fileNames = Array.from(files).map(f => f.name);
        const uploadSession = await UploadSessionManager.createSession(session.user.id, fileNames);
        sessionId = uploadSession.sessionId;
        setCurrentUploadSessionId(sessionId);
        setHasPendingUploads(true);
        console.log("📤 Sesión de subida creada INMEDIATAMENTE:", sessionId);
        console.log("📊 Archivos registrados:", fileNames.length);
        toast.success(`Sesión creada: ${fileNames.length} archivos registrados`);
      } catch (error) {
        console.error("❌ Error creando sesión de subida:", error);
        toast.error("Error creando sesión de subida");
        return; // No continuar si no se puede crear la sesión
      }
    }

    const uploadItems: UploadItem[] = Array.from(files).map(file => ({
      name: file.name,
      status: "pending" as const
    }));

    setProcessingFiles(uploadItems);
    setLastProcessedIndex(0);
    setShouldStopProcessing(false);

    // Sistema de actualización cada 3 segundos
    const updateInterval = setInterval(async () => {
      if (sessionId && !shouldStopProcessing) {
        try {
          console.log("🔄 Actualizando estado de sesión cada 3 segundos...");
          const sessionState = await UploadSessionManager.getSessionState(sessionId);
          if (sessionState) {
            console.log("📊 Estado actual:", {
              totalFiles: sessionState.totalFiles,
              completedFiles: sessionState.completedFiles,
              failedFiles: sessionState.failedFiles,
              pendingFiles: sessionState.pendingFiles,
              status: sessionState.status
            });
          }
        } catch (error) {
          console.error("Error actualizando estado de sesión:", error);
        }
      }
    }, 3000);

    try {
      // Buscar reglas aprendidas para el primer archivo
      const firstFile = files[0];
      const applicableRule = findApplicableRule(firstFile.name);
      
      // Procesar archivos uno por uno para mostrar progreso en tiempo real
      const results: SimpleProcessingResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        if (shouldStopProcessing) {
          console.log('🛑 Procesamiento detenido por el usuario');
          break;
        }

        const file = files[i];
        
        // Actualizar el índice actual
        setLastProcessedIndex(i);
        
        try {
          const result = await processSingleFile(file, showDebug, applicableRule || undefined);
          results.push(result);
          
          // Actualizar el estado del archivo procesado
          setProcessingFiles(prev => {
            if (!prev) return null;
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: result.success ? (result.skipped ? "skipped" : "ok") : "error",
              reason: result.skipped ? result.reason : result.error,
              processingResult: result
            };
            return updated;
          });

          // Actualizar estado en la base de datos
          if (sessionId) {
            const fileStatus = result.success ? (result.skipped ? "skipped" : "completed") : "failed";
            await UploadSessionManager.updateFileStatus(
              sessionId,
              i,
              fileStatus,
              result.error || result.reason,
              result
            );
          }
          
          // Si necesita input de empresa, mostrar modal y parar
          if (result.needsEmpresaInput) {
            setPendingFile(file);
            setShowEmpresaModal(true);
            return; // No continuar con el procesamiento hasta que se seleccione la empresa
          }
          
        } catch (error) {
          console.error(`Error procesando archivo ${file.name}:`, error);
          results.push({
            success: false,
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
          
          // Actualizar el estado del archivo con error
          setProcessingFiles(prev => {
            if (!prev) return null;
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: "error",
              reason: error instanceof Error ? error.message : 'Error desconocido'
            };
            return updated;
          });
        }
      }
      
      // Verificar si algún archivo necesita ajustes del parser
      console.log('🔍 Verificando resultados para ajustes del parser:', results.map(r => ({
        fileName: r.fileName,
        needsParserAdjustment: r.needsParserAdjustment,
        skipped: r.skipped,
        reason: r.reason
      })));
      
      const needsParserAdjustment = results.some(result => result.needsParserAdjustment);
      console.log('🔍 needsParserAdjustment:', needsParserAdjustment);
      
      if (needsParserAdjustment) {
        // Mostrar modal para el primer archivo que necesita ajustes
        const firstFileNeedingAdjustment = Array.from(files).find((_, index) => results[index]?.needsParserAdjustment);
        if (firstFileNeedingAdjustment) {
          const resultIndex = Array.from(files).indexOf(firstFileNeedingAdjustment);
          const result = results[resultIndex];
          if (result && result.parsedData) {
            console.log('🔧 Abriendo modal de ajustes del parser para:', firstFileNeedingAdjustment.name);
            setPendingParserData({
              file: firstFileNeedingAdjustment,
              data: result.parsedData
            });
            setShowParserAdjustmentModal(true);
            return; // No continuar con el procesamiento hasta que se ajusten los datos
          }
        }
      }
      
      // Los estados ya se actualizaron durante el procesamiento
      
      // Recargar datos consolidados
      const newConsolidated = await db.consolidated.toArray();
      setConsolidated(newConsolidated);
      
      // Finalizar sesión de subida
      if (sessionId) {
        await UploadSessionManager.completeSession(sessionId);
        setCurrentUploadSessionId(null);
        setHasPendingUploads(false);
      }
      
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
      
      // NO cancelar la sesión en caso de error - mantenerla activa para retomar
      if (sessionId) {
        try {
          // Marcar sesión como fallida pero mantenerla para retomar
          await UploadSessionManager.updateSessionStatus(sessionId, 'failed', error instanceof Error ? error.message : 'Error desconocido');
          console.log(`❌ Sesión marcada como fallida pero mantenida para retomar: ${sessionId}`);
        } catch (updateError) {
          console.error("Error actualizando sesión:", updateError);
        }
      }
    } finally {
      // Limpiar intervalo de actualización
      clearInterval(updateInterval);
      console.log("🧹 Intervalo de actualización limpiado");
      
      setProcessingFiles(null);
      setLastProcessedIndex(0);
      // NO resetear currentUploadSessionId y hasPendingUploads para mantener la sesión
      // setCurrentUploadSessionId(null);
      // setHasPendingUploads(false);
    }
  }, []);

  // Manejar subida de archivos
  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  }, [handleFiles]);

  // Handlers para drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    const pdfFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf'
    );
    
    if (pdfFiles.length > 0) {
      // Crear un FileList simulado
      const fileList = {
        ...files,
        length: pdfFiles.length,
        item: (index: number) => pdfFiles[index] || null,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < pdfFiles.length; i++) {
            yield pdfFiles[i];
          }
        }
      } as FileList;
      
      handleFiles(fileList);
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
      // console.log("🔍 filteredData - consolidated vacío o no es array:", consolidated);
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
    
    // console.log("🔍 filteredData - Resultado:", {
    //   totalConsolidated: consolidated.length,
    //   totalFiltered: filtered.length,
    //   periodoFiltro,
    //   empresaFiltro,
    //   nombreFiltro,
    //   primeros3: filtered.slice(0, 3).map(item => ({
    //     legajo: item.legajo,
    //     periodo: item.periodo,
    //     nombre: item.nombre,
    //     empresa: item.data?.EMPRESA
    //   }))
    // });
    
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
        
        // Recargar datos del tablero
        await loadData();
        
        toast.success("Base de datos limpiada completamente");
      }
    } catch (error) {
      console.error("Error limpiando base de datos:", error);
      toast.error("Error limpiando base de datos");
    }
  }, []);

  // Función para verificar manualmente subidas pendientes
  const handleCheckPendingUploads = useCallback(async () => {
    if (!session?.user?.id) {
      toast.error("No hay usuario autenticado");
      return;
    }

    try {
      console.log("🔍 Verificando manualmente subidas pendientes...");
      const activeSessions = await UploadSessionManager.getActiveSessions(session.user.id);
      
      if (activeSessions.length > 0) {
        console.log("📤 Subidas pendientes encontradas:", activeSessions.length);
        setHasPendingUploads(true);
        const latestSession = activeSessions.sort((a, b) => b.startedAt - a.startedAt)[0];
        setCurrentUploadSessionId(latestSession.sessionId);
        toast.success(`Se encontraron ${activeSessions.length} subidas pendientes`);
      } else {
        console.log("✅ No hay subidas pendientes");
        setHasPendingUploads(false);
        setCurrentUploadSessionId(null);
        toast.info("No hay subidas pendientes");
      }
    } catch (error) {
      console.error("Error verificando subidas pendientes:", error);
      toast.error("Error verificando subidas pendientes");
    }
  }, [session?.user?.id]);

  // Función para verificar todas las sesiones en la base de datos
  const handleCheckAllSessions = useCallback(async () => {
    try {
      console.log("🔍 Verificando todas las sesiones en la base de datos...");
      const allSessions = await UploadSessionManager.getAllSessions();
      
      if (allSessions.length > 0) {
        console.log("📊 Total de sesiones encontradas:", allSessions.length);
        toast.success(`Se encontraron ${allSessions.length} sesiones en total`);
      } else {
        console.log("❌ No hay sesiones en la base de datos");
        toast.info("No hay sesiones en la base de datos");
      }
    } catch (error) {
      console.error("Error verificando todas las sesiones:", error);
      toast.error("Error verificando todas las sesiones");
    }
  }, []);

  // Limpiar recibos sin empresa

  // Manejar confirmación de empresa manual
  const handleEmpresaConfirm = useCallback(async (empresa: string) => {
    if (!pendingFile) return;
    
    try {
      // Aprender regla de empresa para este tipo de archivo
      learnEmpresaRule(pendingFile.name, empresa);
      
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

  // Funciones para manejar edición de datos
  const handleEditRow = useCallback((row: ConsolidatedEntity) => {
    setEditingRow(row);
    setShowEditModal(true);
  }, []);

  const handleEditSave = useCallback(async (updatedData: Record<string, string>) => {
    if (!editingRow) return;
    
    try {
      // Actualizar el registro en la base de datos
      await db.consolidated.update(editingRow.key, {
        nombre: updatedData.NOMBRE,
        legajo: updatedData.LEGAJO,
        periodo: updatedData.PERIODO,
        data: {
          ...editingRow.data,
          ...updatedData
        }
      });
      
      // Recargar datos
      const newConsolidated = await db.consolidated.toArray();
      setConsolidated(newConsolidated);
      
      toast.success("Datos actualizados correctamente");
    } catch (error) {
      console.error("Error actualizando datos:", error);
      toast.error("Error actualizando datos");
    }
  }, [editingRow]);

  const handleEditCancel = useCallback(() => {
    setShowEditModal(false);
    setEditingRow(null);
  }, []);

  // Funciones para eliminar registro
  const handleDeleteRow = useCallback((row: ConsolidatedEntity) => {
    setDeletingRow(row);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingRow) return;
    
    setIsDeleting(true);
    try {
      // Eliminar archivos físicos asociados
      if (deletingRow.archivos && deletingRow.archivos.length > 0) {
        for (const filename of deletingRow.archivos) {
          try {
            // Buscar el registro en receipts por filename
            const receiptRecord = await db.receipts.where('filename').equals(filename).first();
            if (receiptRecord) {
              // Eliminar el registro de receipts
              await db.receipts.delete(receiptRecord.id!);
              console.log(`🗑️ Archivo eliminado de receipts: ${filename}`);
            }
          } catch (error) {
            console.error(`Error eliminando archivo ${filename}:`, error);
          }
        }
      }
      
      // Eliminar el registro consolidado
      await db.consolidated.delete(deletingRow.key);
      toast.success('Registro y archivos eliminados exitosamente');
      setShowDeleteModal(false);
      setDeletingRow(null);
      // Recargar datos
      loadData();
    } catch (error) {
      console.error('Error eliminando registro:', error);
      toast.error('Error al eliminar el registro');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingRow]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
    setDeletingRow(null);
  }, []);

  // Manejar confirmación de ajustes del parser
  const handleParserAdjustmentConfirm = useCallback(async (adjustedData: Record<string, string>) => {
    if (!pendingParserData) return;
    
    try {
      // Aprender reglas del archivo procesado
      if (adjustedData.EMPRESA && adjustedData.PERIODO) {
        learnRule(pendingParserData.file.name, adjustedData.EMPRESA, adjustedData.PERIODO);
      }
      
      // Procesar el archivo con los datos ajustados
      const result = await processSingleFileWithData(pendingParserData.file, adjustedData, showDebug);
      
      if (result.success && !result.skipped) {
        toast.success(`Archivo procesado con ajustes: ${pendingParserData.file.name}`);
      } else {
        toast.warning(`Archivo omitido: ${result.reason}`);
      }
      
      // Recargar datos consolidados
      const newConsolidated = await db.consolidated.toArray();
      setConsolidated(newConsolidated);
      
    } catch (error) {
      console.error("Error procesando archivo con ajustes:", error);
      toast.error("Error procesando archivo");
    } finally {
      setShowParserAdjustmentModal(false);
      setPendingParserData(null);
    }
  }, [pendingParserData, showDebug]);

  // Manejar cancelación de ajustes del parser
  const handleParserAdjustmentCancel = useCallback(() => {
    setShowParserAdjustmentModal(false);
    setPendingParserData(null);
    toast.info("Ajustes del parser cancelados");
  }, []);

  // Función para recargar datos
  const loadData = useCallback(async () => {
    try {
      const [consolidatedData, controlsData] = await Promise.all([
        db.consolidated.toArray(),
        db.savedControls.toArray()
      ]);
      setConsolidated(consolidatedData);
      setSavedControls(controlsData);
    } catch (error) {
      console.error("Error recargando datos:", error);
    }
  }, []);

  // Funciones para manejar descuentos en el modal del parser
  const handleDescuentosInParserConfirm = useCallback(async (descuentos: Record<string, string>) => {
    if (!pendingParserData) return;
    
    try {
      // Aquí podrías procesar los descuentos si es necesario
      console.log('Descuentos confirmados:', descuentos);
      
      // Continuar con el procesamiento normal
      const result = await processSingleFileWithData(pendingParserData.file, pendingParserData.data, showDebug);
      
      if (result.success) {
        toast.success(`Archivo procesado: ${pendingParserData.file.name}`);
        // Recargar datos
        await loadData();
      } else {
        toast.error(`Error procesando archivo: ${result.error}`);
      }
    } catch (error) {
      console.error('Error procesando archivo con descuentos:', error);
      toast.error('Error procesando archivo');
    } finally {
      setShowParserAdjustmentModal(false);
      setPendingParserData(null);
    }
  }, [pendingParserData, showDebug, loadData]);

  // Función para abrir el modal con descuentos habilitados
  const openParserModalWithDescuentos = useCallback((file: File, data: Record<string, string>) => {
    setPendingParserData({ file, data });
    setShowDescuentosInParserModal(true);
    setShowParserAdjustmentModal(true);
  }, []);

  // Debug del estado de consolidated
  // useEffect(() => {
  //   console.log("🔍 Estado de consolidated actualizado:", {
  //     consolidated: consolidated,
  //     length: consolidated?.length,
  //     isArray: Array.isArray(consolidated),
  //     firstItem: consolidated?.[0]
  //   });
  // }, [consolidated]);

  // Opciones de filtros
  const periodos = useMemo(() => {
    if (!consolidated || !Array.isArray(consolidated)) {
      // console.log("🔍 periodos - consolidated vacío o no es array:", consolidated);
      return [];
    }
    
    // Si no hay empresa seleccionada o es "Todas", mostrar todos los períodos
    if (!empresaFiltro || empresaFiltro === "Todas") {
      const unique = [...new Set(consolidated.map(item => item.periodo))].sort();
      return unique;
    }
    
    // Filtrar períodos solo de la empresa seleccionada
    const periodosDeEmpresa = consolidated
      .filter(item => {
        const empresa = item.data?.EMPRESA || 'DESCONOCIDA';
        return empresa === empresaFiltro;
      })
      .map(item => item.periodo);
    
    const unique = [...new Set(periodosDeEmpresa)].sort();
    // console.log("🔍 periodos generados para empresa", empresaFiltro, ":", unique);
    return unique;
  }, [consolidated, empresaFiltro]);

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
    
    // console.log("🔍 empresas detectadas en datos:", {
    //   totalItems: consolidated.length,
    //   empresas: unique,
    //   sampleData: consolidated.slice(0, 3).map(item => ({
    //     legajo: item.legajo,
    //     empresa: item.data?.EMPRESA,
    //     archivos: item.archivos
    //   }))
    // });
    
    return unique;
  }, [consolidated]);

  // Limpiar filtro de período cuando cambie la empresa
  useEffect(() => {
    if (empresaFiltro && empresaFiltro !== "Todas") {
      // Verificar si el período actual existe para la empresa seleccionada
      const periodosDisponibles = periodos;
      if (periodoFiltro && !periodosDisponibles.includes(periodoFiltro)) {
        setPeriodoFiltro("Todas");
      }
    }
  }, [empresaFiltro, periodos, periodoFiltro]);

  // Actualizar datos cuando se regresa al tablero (focus)
  useEffect(() => {
    if (activeTab === "tablero") {
      // Solo actualizar si no se han cargado datos aún
      if (consolidated.length === 0) {
        console.log("🔄 Cargando datos para tablero...");
        loadData();
      }
      // Actualizar Dashboard si está disponible
      if (dashboardRef.current) {
        dashboardRef.current.refresh();
      }
    }
  }, [activeTab]); // Removido loadData de las dependencias

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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Presiona H para ver shortcuts disponibles")}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Shortcuts disponibles"
            >
              ⌨️
            </Button>
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
              variant={activeTab === "tablero" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("tablero");
                setIsMobileMenuOpen(false);
              }}
              className="text-xs"
            >
              Tablero
            </Button>
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
            {activeTab === 'tablero' && 'Tablero'}
            {activeTab === 'recibos' && 'Recibos'}
            {activeTab === 'control' && 'Control'}
            {activeTab === 'export' && 'Exportar'}
            {activeTab === 'descuentos' && 'Descuentos'}
            {activeTab === 'usuarios' && 'Usuarios'}
            {activeTab === 'backup' && 'Backup'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'tablero' && 'Estadísticas y resumen del sistema'}
            {activeTab === 'recibos' && 'Gestión de recibos de sueldo'}
            {activeTab === 'control' && 'Control de nóminas y comparaciones'}
            {activeTab === 'export' && 'Exportación de datos'}
            {activeTab === 'descuentos' && 'Gestión de descuentos'}
            {activeTab === 'usuarios' && 'Administración de usuarios'}
            {activeTab === 'backup' && 'Respaldo de base de datos'}
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

        {/* Notificación de subidas pendientes */}
        {hasPendingUploads && currentUploadSessionId && !processingFiles && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    Subida pendiente detectada
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Tienes una subida de archivos que se interrumpió. Puedes retomarla desde donde se quedó.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  // Forzar actualización del componente
                  setCurrentUploadSessionId(currentUploadSessionId);
                }}
                variant="outline"
                size="sm"
                className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
              >
                Ver Detalles
              </Button>
            </div>
          </div>
        )}

        {/* Persistent Upload Progress */}
        {hasPendingUploads && currentUploadSessionId && !processingFiles && (
          <PersistentUploadProgress
            sessionId={currentUploadSessionId}
            onSessionComplete={(sessionId) => {
              console.log("Sesión completada:", sessionId);
              // Delay más largo para permitir ver la finalización
              setTimeout(() => {
                setCurrentUploadSessionId(null);
                setHasPendingUploads(false);
                loadData(); // Recargar datos
                console.log("🧹 Interfaz de upload ocultada después de completar sesión");
              }, 5000); // Delay de 5 segundos para permitir ver la finalización
            }}
            onSessionError={(sessionId, error) => {
              console.error("Error en sesión:", sessionId, error);
              toast.error(`Error en subida: ${error}`);
            }}
            showDetails={showDebug}
          />
        )}

        {/* Debug info para verificar estado */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs rounded z-50">
            <div>hasPendingUploads: {hasPendingUploads ? 'true' : 'false'}</div>
            <div>currentUploadSessionId: {currentUploadSessionId || 'null'}</div>
            <div>processingFiles: {processingFiles ? 'true' : 'false'}</div>
            <div>Show Progress: {hasPendingUploads && currentUploadSessionId && !processingFiles ? 'YES' : 'NO'}</div>
          </div>
        )}

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tablero Tab */}
          <TabsContent value="tablero" className="space-y-4">
            <Dashboard 
              ref={dashboardRef} 
              onNavigateToTab={setActiveTab}
              onResumeSession={async (sessionId: string) => {
                console.log(`🔄 Reanudando sesión desde modal: ${sessionId}`);
                setCurrentUploadSessionId(sessionId);
                setHasPendingUploads(true);
                toast.success('Sesión reanudada. Ver evolución en la interfaz principal.', {
                  duration: 3000,
                  description: 'La interfaz de progreso aparecerá en unos segundos'
                });
              }}
              onOpenNewDescuento={() => {
                console.log('🔄 onOpenNewDescuento llamado desde Dashboard');
                // Activar modal de nuevo descuento después de navegar
                setTimeout(() => {
                  console.log('📡 Disparando evento openNewDescuento...');
                  // Disparar evento personalizado para activar modal de descuento
                  window.dispatchEvent(new CustomEvent('openNewDescuento'));
                }, 100);
              }}
              onOpenNewEmployee={() => {
                console.log('👤 onOpenNewEmployee llamado desde Dashboard');
                // Activar modal de nueva empresa después de navegar (para empleados)
                setTimeout(() => {
                  console.log('👤 Abriendo modal de empresa para empleados...');
                  setShowEmpresaModal(true);
                }, 100);
              }}
              onOpenNewEmpresa={() => {
                console.log('🏢 onOpenNewEmpresa llamado desde Dashboard');
                // Activar modal de nueva empresa después de navegar
                setTimeout(() => {
                  console.log('🏢 Abriendo modal de empresa...');
                  setShowEmpresaModal(true);
                }, 100);
              }}
            />
          </TabsContent>

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
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-full sm:w-auto transition-all duration-200 ${
                        isDragOver 
                          ? 'scale-105 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : ''
                      }`}
                      disabled={!!processingFiles}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      {isDragOver ? 'Suelta los PDFs aquí' : 'Subir PDFs'}
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
                  onEditRow={handleEditRow}
                  onDeleteRow={handleDeleteRow}
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

          {/* Backup Tab */}
          <TabsContent value="backup" className="space-y-4">
            <BackupPanel />
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
          onCheckDatabase={handleCheckDatabase}
          onCheckPendingUploads={handleCheckPendingUploads}
          onCheckAllSessions={handleCheckAllSessions}
          onClearUploadSessions={async () => {
            // Recargar datos después de limpiar sesiones
            await loadData();
            setHasPendingUploads(false);
            setCurrentUploadSessionId(null);
            console.log('🔄 Datos recargados después de limpiar sesiones');
          }}
          onResumeSession={async (sessionId: string) => {
            // Manejar reanudación desde el modal
            console.log(`🔄 Reanudando sesión desde modal: ${sessionId}`);
            console.log('🔍 Estado antes de reanudar:', {
              hasPendingUploads,
              currentUploadSessionId,
              processingFiles
            });
            
            setCurrentUploadSessionId(sessionId);
            setHasPendingUploads(true);
            setShowDebugModal(false); // Cerrar el modal
            
            console.log('🔍 Estado después de establecer:', {
              sessionId,
              hasPendingUploads: true,
              currentUploadSessionId: sessionId
            });
            
            toast.success('Sesión reanudada. Ver evolución en la interfaz principal.', {
              duration: 3000,
              description: 'La interfaz de progreso aparecerá en unos segundos'
            });
          }}
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
        
        <ParserAdjustmentModal
          open={showParserAdjustmentModal}
          onClose={handleParserAdjustmentCancel}
          onConfirm={handleParserAdjustmentConfirm}
          originalData={pendingParserData?.data || {}}
          fileName={pendingParserData?.file.name || ''}
          file={pendingParserData?.file}
          showDescuentos={showDescuentosInParserModal}
          onDescuentosConfirm={handleDescuentosInParserConfirm}
        />
        
        <EditDataModal
          open={showEditModal}
          onClose={handleEditCancel}
          onSave={handleEditSave}
          originalData={editingRow ? {
            NOMBRE: editingRow.nombre || '',
            LEGAJO: editingRow.legajo || '',
            PERIODO: editingRow.periodo || '',
            EMPRESA: editingRow.data?.EMPRESA || '',
            CUIL: editingRow.data?.CUIL || '',
            SUELDO_BASICO: editingRow.data?.SUELDO_BASICO || '',
            TOTAL: editingRow.data?.TOTAL || '',
            DESCUENTOS: editingRow.data?.DESCUENTOS || '',
            ...editingRow.data
          } : {}}
          fileName={editingRow?.archivos?.[0] || ''}
          pdfText={editingRow?.data?.TEXTO_COMPLETO}
        />

        <DeleteConfirmModal
          open={showDeleteModal}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          employee={deletingRow}
          isDeleting={isDeleting}
        />

        {/* Help Modal */}
        <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">⌨️</span>
                Atajos de Teclado (Shortcuts)
              </DialogTitle>
              <DialogDescription>
                Presiona las teclas para navegar rápidamente por la aplicación
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Navegación */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Navegación entre Secciones</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">T</kbd>
                    <span>Tablero</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">R</kbd>
                    <span>Recibos</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">C</kbd>
                    <span>Control</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">D</kbd>
                    <span>Descuentos</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">U</kbd>
                    <span>Usuarios</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">B</kbd>
                    <span>Backup</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">E</kbd>
                    <span>Export</span>
                  </div>
                </div>
              </div>

              {/* Acciones Globales */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Acciones Globales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-sm font-mono">F</kbd>
                    <span>Debug (abrir panel de debug)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-sm font-mono">H</kbd>
                    <span>Ayuda (este modal)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-sm font-mono">M</kbd>
                    <span>Menú móvil (toggle)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-sm font-mono">?</kbd>
                    <span>Ayuda contextual (toast)</span>
                  </div>
                </div>
              </div>

              {/* Acciones Contextuales */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Acciones por Sección</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-800 mb-2">📊 Tablero</h4>
                    <div className="flex justify-between items-center">
                      <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">L</kbd>
                      <span>Actualizar datos</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-800 mb-2">📄 Recibos</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">N</kbd>
                        <span>Subir archivos</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">L</kbd>
                        <span>Actualizar recibos</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-800 mb-2">📋 Control</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">S</kbd>
                        <span>Guardar control</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">N</kbd>
                        <span>Nuevo control</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">L</kbd>
                        <span>Actualizar control</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-800 mb-2">💰 Descuentos</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">N</kbd>
                        <span>Nuevo descuento</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">L</kbd>
                        <span>Actualizar descuentos</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-800 mb-2">👥 Usuarios</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">N</kbd>
                        <span>Nuevo usuario</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">L</kbd>
                        <span>Actualizar lista</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded">
                    <h4 className="font-medium text-green-800 mb-2">📤 Export</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">X</kbd>
                        <span>Exportar datos</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <kbd className="px-2 py-1 bg-green-200 rounded text-sm font-mono">L</kbd>
                        <span>Actualizar datos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Los shortcuts funcionan en cualquier parte de la aplicación, 
                  excepto cuando estás escribiendo en campos de texto. Presiona <kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">H</kbd> 
                  en cualquier momento para ver esta ayuda.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
    );
}