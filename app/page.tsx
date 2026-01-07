// app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, FileUp, Loader2, CheckCircle2, XCircle, Menu, X, Plus, User, FileText, Bug, RefreshCw, Database, Wrench, ListTodo, Trash2, Settings, Square, AlertTriangle, Camera } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useConfiguration } from "@/contexts/ConfigurationContext";
import { useCentralizedDataManager } from "@/hooks/useCentralizedDataManager";

import { CODE_LABELS, CODE_KEYS, getPrincipalLabels } from "@/lib/code-labels";
import { sha256OfFile } from "@/lib/hash";
// import { repoDexie } from '@/lib/repo-dexie'; // ELIMINADO
// // import { db } from '@/lib/db'; // Removed - using centralized data manager // Removido - usar dataManager en su lugar
import { processFiles, processSingleFile, processSingleFileWithData, type SimpleProcessingResult } from '@/lib/simple-pdf-processor';
// import { parsePdfReceiptToRecord } from '@/lib/pdf-parser'; // Importación dinámica para evitar SSR
import { useLearnedRules } from '@/hooks/useLearnedRules';
import type { ConsolidatedEntity } from "@/lib/repo";
import type { SavedControlDB, ControlRow } from "@/lib/data-manager-singleton";
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
import EmpresaModal from "@/components/EmpresaModal";
import ParserAdjustmentModal from "@/components/ParserAdjustmentModal";
import EditDataModal from "@/components/EditDataModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ReceiptOCRMarker from "@/components/ReceiptOCRMarker";
import { ConfirmModal } from "@/components/ConfirmModal";
import ConfirmLogoutModal from "@/components/ConfirmLogoutModal";
import PendingItemsManager from '@/components/PendingItemsManager';
import { UploadLogModal } from "@/components/UploadLogModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DescuentosPanel } from "@/components/DescuentosPanel";
import { EmpleadosPanel } from "@/components/EmpleadosPanel";
import { EmpresasPanel } from "@/components/EmpresasPanel";
import SidebarNavigation from "@/components/SidebarNavigation";
import Dashboard, { DashboardRef } from "@/components/Dashboard";
import FichaEmpleadoModal from "@/components/FichaEmpleadoModal";
import BackupPanel from "@/components/BackupPanel";
import AccesosPanel from "@/components/AccesosPanel";
import ProcessingProgress from "@/components/ProcessingProgress";
import PersistentUploadProgress from "@/components/PersistentUploadProgress";
import DocumentationPanel from "@/components/DocumentationPanel";
import ConfigurationPanel from "@/components/ConfigurationPanel";
import PendingItemsPage from "@/components/PendingItemsPage";
import PersistentDevTools from "@/components/PersistentDevTools";
// import { UploadSessionManager } from "@/lib/upload-session-manager"; // ELIMINADO
import DebugSessions from "@/components/DebugSessions";
import SimpleDebugModal from "@/components/SimpleDebugModal";
import OCRConfigModal from "@/components/OCRConfigModal";
import FieldMarkerConfigurator from "@/components/FieldMarkerConfigurator";

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
  const { config, saveConfiguration: updateConfig } = useConfiguration();
  const { dataManager } = useCentralizedDataManager();
  const [activeTab, setActiveTab] = useState<string>("tablero");
  
  // Redirigir registro@recibos.com automáticamente a la página de registro
  useEffect(() => {
    if (session?.user?.email === 'registro@recibos.com' && activeTab !== 'registro') {
      // Redirigir a la página de registro
      window.location.href = '/test-face-recognition';
    }
  }, [session, activeTab]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUploadLog, setShowUploadLog] = useState(false);
  const [showTestTools, setShowTestTools] = useState(false);
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [showPendingItems, setShowPendingItems] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    title: string;
    message: string;
    details: string;
    onConfirm: () => void;
  }>({
    title: '',
    message: '',
    details: '',
    onConfirm: () => {}
  });
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [deleteData, setDeleteData] = useState<any>(null);
  
  // Hook para reglas aprendidas
  const { learnRule, learnEmpresaRule, learnPeriodoRule, findApplicableRule } = useLearnedRules();
  
  // Función para obtener ayuda contextual según la sección activa
  const getContextualHelp = (tab: string) => {
    const baseShortcuts = "Navegación: T=Tablero, R=Recibos, C=Control, D=Descuentos, U=Usuarios, B=Backup, O=Documentación, E=Export";
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
      case 'documentacion':
        return `${baseShortcuts} | Documentación: L=Actualizar lista | ${globalShortcuts}`;
      case 'export':
        return `${baseShortcuts} | Exportar: X=Exportar datos, L=Actualizar | ${globalShortcuts}`;
      default:
        return `${baseShortcuts} | ${globalShortcuts}`;
    }
  };
  
  // Atajos de teclado globales - DESHABILITADOS TEMPORALMENTE PARA DEBUG
  // useEffect(() => {
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
        case 'h':
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
        case 'e':
          event.preventDefault();
          setActiveTab('empleados');
          break;
        case 'm':
          event.preventDefault();
          setActiveTab('empresas');
          break;
        case 'u':
          event.preventDefault();
          setActiveTab('usuarios');
          break;
        case 'b':
          event.preventDefault();
          setActiveTab('backup');
          break;
        case 'p':
          event.preventDefault();
          setActiveTab('pending-items');
          break;
        case 'o':
          event.preventDefault();
          setActiveTab('documentacion');
          break;
        case 'f':
          event.preventDefault();
          setActiveTab('configuracion');
          break;
        case 'l':
          event.preventDefault();
          // Logout - Abrir modal de confirmación
          setShowLogoutModal(true);
          break;
        case 'x':
          event.preventDefault();
          setActiveTab('export');
          break;
        
        // Acciones rápidas globales
        case '?':
          event.preventDefault();
          // Mostrar ayuda completa contextual
          const contextualHelp = getContextualHelp(activeTab);
          toast.info(contextualHelp);
          break;
        
        // Acciones contextuales por sección
        case 's':
          event.preventDefault();
          // Ir a configuración
          setActiveTab('configuracion');
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

          break;
        case 'Escape':
          event.preventDefault();
          // Cerrar panel de debug si está abierto
          if (config.showDebugPanel) {
            updateConfig({ showDebugPanel: false });
            toast.info("Panel de debug cerrado");
          }
          break;
      }
    };
    
  //   document.addEventListener('keydown', handleKeyDown);
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, []);
  
  // Estados principales
  const [consolidated, setConsolidated] = useState<ConsolidatedEntity[]>([]);
  const [savedControls, setSavedControls] = useState<SavedControlDB[]>([]);
  const [currentControl, setCurrentControl] = useState<ControlOkRow[] | null>(null);
  const [controlSummary, setControlSummary] = useState<ControlSummary | null>(null);
  
  // Estados de filtros
  const [periodoFiltro, setPeriodoFiltro] = useState<string>("Todos");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("Todas");
const [nombreFiltro, setNombreFiltro] = useState<string>("");

  // Estados de carga
  const [processingFiles, setProcessingFiles] = useState<UploadItem[] | null>(null);
  const [lastProcessedIndex, setLastProcessedIndex] = useState<number>(0);
  const [showDebug, setShowDebug] = useState<boolean>(true); // Activado para debug
  const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  
  // Estados para persistencia de subidas
  const [currentUploadSessionId, setCurrentUploadSessionId] = useState<string | null>(null);
  const [hasPendingUploads, setHasPendingUploads] = useState<boolean>(false);
  
  // Estados para modal de empresa
  const [showEmpresaModal, setShowEmpresaModal] = useState<boolean>(false);
  const [showFichaModal, setShowFichaModal] = useState<boolean>(false);
  const [selectedLegajo, setSelectedLegajo] = useState<string>('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');

  // Debug: verificar cuándo se cambia showEmpresaModal
  // useEffect(() => {
  //   console.log('🔍 Debug page.tsx - showEmpresaModal cambió a:', showEmpresaModal);
  // }, [showEmpresaModal]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Estados para drag & drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [showParserAdjustmentModal, setShowParserAdjustmentModal] = useState(false);
  const [pendingParserData, setPendingParserData] = useState<{file: File, data: Record<string, string>} | null>(null);
  const [showDescuentosInParserModal, setShowDescuentosInParserModal] = useState(false);
  const [shouldStopProcessing, setShouldStopProcessing] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showOCRConfigModal, setShowOCRConfigModal] = useState(false);
  const [showFieldMarkerModal, setShowFieldMarkerModal] = useState(false);
  
  // Estados para modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRow, setEditingRow] = useState<ConsolidatedEntity | null>(null);
  const [editingRowOcrDebug, setEditingRowOcrDebug] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRow, setDeletingRow] = useState<ConsolidatedEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOCRMarker, setShowOCRMarker] = useState(false);
  const [ocrMarkerReceipt, setOcrMarkerReceipt] = useState<ConsolidatedEntity | null>(null);
  const [ocrMarkerField, setOcrMarkerField] = useState<string>(''); // Campo específico a marcar
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

  // Función para manejar eliminación con progreso
  const handleDeleteWithProgress = async (deleteData: any) => {
    setDeleteProgress(0);
    setDeleteStatus('Iniciando eliminación...');
    
    try {
      const { targetEmpresa, hasFilters, empresaConsolidatedCount, empresaReceiptsCount } = deleteData;
      let empresaConsolidated = 0;
      let empresaReceipts = 0;
      
      if (hasFilters) {
        setDeleteStatus('Eliminando registros filtrados...');
        const filtered = consolidated.filter(item => {
          const empresa = item.data?.EMPRESA || 'N/A';
          const periodo = item.periodo;
          const nombre = item.nombre?.toLowerCase() || '';
          
          const matchEmpresa = empresaFiltro === 'Todas' || empresa === empresaFiltro;
          const matchPeriodo = periodoFiltro === 'Todos' || periodo === periodoFiltro;
          const matchNombre = nombreFiltro === '' || nombre.includes(nombreFiltro.toLowerCase());
          
          return matchEmpresa && matchPeriodo && matchNombre && empresa === targetEmpresa;
        });
        
        setDeleteProgress(25);
        setDeleteStatus('Eliminando recibos procesados...');
        
        for (const item of filtered) {
          const key = makeKey(item);
          await dataManager.deleteConsolidated(key);
          empresaConsolidated++;
        }
        
        setDeleteProgress(50);
        setDeleteStatus('Eliminando archivos de recibos...');
        
        for (const item of filtered) {
          const receipts = await dataManager.getReceiptsByLegajo(item.legajo);
          
          for (const receipt of receipts) {
            await dataManager.deleteReceipt(receipt.id!);
            empresaReceipts++;
          }
        }
      } else {
        setDeleteProgress(25);
        setDeleteStatus('Eliminando todos los registros...');
        
        // Para Supabase necesitaríamos implementar deleteByFilter
        // Por ahora mantenemos la lógica de IndexedDB
        await dataManager.deleteConsolidatedByEmpresa(targetEmpresa);
        empresaConsolidated = 0; // Reset counter
        
        setDeleteProgress(50);
        setDeleteStatus('Eliminando archivos...');
        
        await dataManager.deleteReceiptsByEmpresa(targetEmpresa);
        empresaReceipts = 0; // Reset counter
      }
      
      setDeleteProgress(75);
      setDeleteStatus('Recargando datos...');
      
      await loadData();
      
      setDeleteProgress(100);
      setDeleteStatus('Eliminación completada');
      
      toast.success(`✅ Eliminados ${empresaConsolidated} recibos procesados y ${empresaReceipts} archivos de ${targetEmpresa}`);
      
      return {
        success: true,
        message: `Eliminados ${empresaConsolidated} recibos procesados y ${empresaReceipts} archivos de ${targetEmpresa}`,
        consolidated: empresaConsolidated,
        receipts: empresaReceipts
      };
    } catch (error) {
      setDeleteStatus(`Error: ${error}`);
      toast.error(`Error durante eliminación: ${error}`);
      throw error;
    } finally {
      setTimeout(() => {
        setShowDeleteConfirm(false);
        setDeleteProgress(0);
        setDeleteStatus('');
        setDeleteData(null);
      }, 2000);
    }
  };

  // Función para manejar acciones de la DevToolbar

  const handleDevAction = useCallback(async (action: string, data?: any) => {
    
    switch (action) {
      case 'clean-sumar':
      case 'clean-empresa':
        try {
          // Determinar la empresa objetivo
          const targetEmpresa = empresaFiltro !== 'Todas' ? empresaFiltro : 'SUMAR';
          
          // Determinar si hay filtros activos
          const hasFilters = empresaFiltro !== 'Todas' || (periodoFiltro !== 'Todos' && periodoFiltro !== 'Todas') || nombreFiltro !== '';
          
          // Contar registros antes de eliminar (respetando filtros si existen)
          let empresaConsolidatedCount = 0;
          let empresaReceiptsCount = 0;
          
          if (hasFilters) {
            // Con filtros: eliminar solo lo filtrado de la empresa objetivo
            const filtered = consolidated.filter(item => {
              const empresa = item.data?.EMPRESA || 'N/A';
              const periodo = item.periodo;
              const nombre = item.nombre?.toLowerCase() || '';
              
              // Usar EXACTAMENTE la misma lógica que la UI (filteredData)
              const matchEmpresa = empresaFiltro === 'Todas' || empresaFiltro === '' || empresa === empresaFiltro;
              const matchPeriodo = periodoFiltro === 'Todos' || periodoFiltro === 'Todas' || periodoFiltro === '' || periodo === periodoFiltro;
              const matchNombre = nombreFiltro === '' || nombre.includes(nombreFiltro.toLowerCase());
              
              return matchEmpresa && matchPeriodo && matchNombre && empresa === targetEmpresa;
            });
            
            empresaConsolidatedCount = filtered.length;
            empresaReceiptsCount = filtered.length; // Aproximado
            
          } else {
            // Sin filtros: eliminar toda la empresa objetivo
            const empresaItems = consolidated.filter(item => item.data?.EMPRESA === targetEmpresa);
            empresaConsolidatedCount = empresaItems.length;
            
            const empresaReceipts = await dataManager.getReceiptsByEmpresa(targetEmpresa);
            empresaReceiptsCount = empresaReceipts.length;
            
          }
          
          const totalRecords = empresaConsolidatedCount + empresaReceiptsCount;
          
          if (totalRecords === 0) {
            setShowDeleteConfirm(true);
            setDeleteConfirmData({
              title: `Sin registros para eliminar`,
              message: `No se encontraron registros de ${targetEmpresa} para eliminar`,
              details: `No hay registros que coincidan con los filtros actuales.\n\nVerifica que:\n- La empresa seleccionada tenga registros\n- Los filtros no estén ocultando los datos\n- Los datos estén cargados correctamente`,
              onConfirm: () => {
                setShowDeleteConfirm(false);
              }
            });
            return {
              success: true,
              message: `No se encontraron registros de ${targetEmpresa} para eliminar`,
              consolidated: 0,
              receipts: 0
            };
          }
          
          // Mostrar modal de confirmación
          const filterInfo = hasFilters ? ` (con filtros actuales)` : '';
          setShowDeleteConfirm(true);
          
          // Guardar datos para el modal
          const confirmData = {
            title: `Eliminar ${targetEmpresa}`,
            message: `¿Estás seguro de que quieres eliminar ${totalRecords} registros de ${targetEmpresa}${filterInfo}?`,
            details: `Esta acción eliminará:\n- ${empresaConsolidatedCount} recibos procesados\n- ${empresaReceiptsCount} archivos de recibos\n- Todos los datos asociados\n\nEsta acción no se puede deshacer.`,
            onConfirm: async () => {
              try {
                // Proceder con la eliminación
                let empresaConsolidated = 0;
                let empresaReceipts = 0;
                
                if (hasFilters) {
                  // Eliminar solo registros filtrados
                  const filtered = consolidated.filter(item => {
                    const empresa = item.data?.EMPRESA || 'N/A';
                    const periodo = item.periodo;
                    const nombre = item.nombre?.toLowerCase() || '';
                    
                    const matchEmpresa = empresaFiltro === 'Todas' || empresaFiltro === '' || empresa === empresaFiltro;
                    const matchPeriodo = periodoFiltro === 'Todos' || periodoFiltro === 'Todas' || periodoFiltro === '' || periodo === periodoFiltro;
                    const matchNombre = nombreFiltro === '' || nombre.includes(nombreFiltro.toLowerCase());
                    
                    return matchEmpresa && matchPeriodo && matchNombre && empresa === targetEmpresa;
                  });
                  
                  for (const item of filtered) {
                    const key = makeKey(item);
                    await dataManager.deleteConsolidated(key);
                    empresaConsolidated++;
                  }
                  
                  // Eliminar receipts asociados
                  for (const item of filtered) {
                    const receipts = await dataManager.getReceiptsByFilename(item.archivos?.[0] || '');
                    
                    for (const receipt of receipts) {
                      await dataManager.deleteReceipt(receipt.id!);
                      empresaReceipts++;
                    }
                  }
                } else {
                  // Eliminar toda la empresa
                  await dataManager.deleteConsolidatedByEmpresa(targetEmpresa);
                  empresaConsolidated = 0; // Reset counter
                  
                  await dataManager.deleteReceiptsByEmpresa(targetEmpresa);
                  empresaReceipts = 0; // Reset counter
                }
                
                // Recargar datos
                await loadData();
                
                toast.success(`Eliminados ${empresaConsolidated + empresaReceipts} registros de ${targetEmpresa}`);
                setShowDeleteConfirm(false);
                
                return {
                  success: true,
                  message: `Eliminados ${empresaConsolidated + empresaReceipts} registros de ${targetEmpresa}`,
                  consolidated: empresaConsolidated,
                  receipts: empresaReceipts
                };
              } catch (error) {
                toast.error(`Error eliminando registros: ${error}`);
                setShowDeleteConfirm(false);
                throw error;
              }
            }
          };

          setDeleteConfirmData(confirmData);
          
          return {
            success: true,
            message: 'Mostrando confirmación de eliminación',
            pending: true
          };
        } catch (error) {
          toast.error(`Error limpiando SUMAR: ${error}`);
          throw new Error(`Error limpiando SUMAR: ${error}`);
        }
        
      case 'clean-all':
        try {
          await dataManager.clearConsolidated();
          await dataManager.clearReceipts();
          // Recargar datos después de limpiar
          const [consolidatedData, controlsData] = await Promise.all([
            dataManager.getConsolidated(),
            dataManager.getSavedControls()
          ]);
          setConsolidated(consolidatedData);
          setSavedControls(controlsData);
          toast.success('Base de datos limpiada completamente');
          
          return {
            success: true,
            message: 'Base de datos limpiada completamente'
          };
        } catch (error) {
          toast.error(`Error limpiando todo: ${error}`);
          throw new Error(`Error limpiando todo: ${error}`);
        }
        
      case 'normalize-filenames':
        try {
          const { normalizeFileName } = await import('@/lib/simple-pdf-processor');
          const allReceipts = await dataManager.getReceipts();
          let normalized = 0;
          
          for (const receipt of allReceipts) {
            const normalizedName = normalizeFileName(receipt.filename);
            if (normalizedName !== receipt.filename) {
              await dataManager.updateReceipt(receipt.id!, { filename: normalizedName });
              normalized++;
            }
          }
          
          toast.success(`Normalizados ${normalized} nombres de archivos`);
          
          return {
            success: true,
            message: `Normalizados ${normalized} nombres de archivos`,
            normalized
          };
        } catch (error) {
          toast.error(`Error normalizando nombres: ${error}`);
          throw new Error(`Error normalizando nombres: ${error}`);
        }
        
      case 'refresh-data':
        try {
          // Recargar datos después de limpiar
          const [consolidatedData, controlsData] = await Promise.all([
            dataManager.getConsolidated(),
            dataManager.getSavedControls()
          ]);
          setConsolidated(consolidatedData);
          setSavedControls(controlsData);
          toast.success('Datos refrescados');
          
          return {
            success: true,
            message: 'Datos refrescados',
            count: consolidated.length
          };
        } catch (error) {
          toast.error(`Error refrescando datos: ${error}`);
          throw new Error(`Error refrescando datos: ${error}`);
        }
        
      case 'export-debug':
        try {
          const debugInfo = {
            consolidated: consolidated.length,
            receipts: (await dataManager.countReceipts()),
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.href : 'N/A',
            port: typeof window !== 'undefined' ? (window.location.port || '3000') : 'N/A'
          };

          toast.success('Información exportada a consola');
          
          return {
            success: true,
            message: 'Información de debug exportada',
            debugInfo
          };
        } catch (error) {
          toast.error(`Error exportando debug: ${error}`);
          throw new Error(`Error exportando debug: ${error}`);
        }
        
      case 'test-progress':
        try {
          const progress = Math.random() * 100;
          toast.success(`Test de progreso: ${progress.toFixed(0)}%`);
          
          return {
            success: true,
            message: 'Test de progreso ejecutado',
            progress
          };
        } catch (error) {
          toast.error(`Error en test de progreso: ${error}`);
          throw new Error(`Error en test de progreso: ${error}`);
        }
        
      case 'check-files':
        try {
          const receipts = await dataManager.getReceipts();
          const fileChecks = await Promise.all(
            receipts.slice(0, 5).map(async (receipt) => {
              try {
                const response = await fetch(`/recibos/${encodeURIComponent(receipt.filename)}`, { method: 'HEAD' });
                return {
                  filename: receipt.filename,
                  exists: response.ok,
                  status: response.status
                };
              } catch {
                return {
                  filename: receipt.filename,
                  exists: false,
                  status: 'error'
                };
              }
            })
          );
          
          toast.success('Verificación completada - ver consola');

          return {
            success: true,
            message: 'Verificación de archivos completada',
            fileChecks
          };
        } catch (error) {
          toast.error(`Error verificando archivos: ${error}`);
          throw new Error(`Error verificando archivos: ${error}`);
        }
        
      case 'show-debug-panel':
        try {
          updateConfig({ showDebugPanel: true });
          toast.success('Panel de debug activado');
          
          return {
            success: true,
            message: 'Panel de debug activado'
          };
        } catch (error) {
          toast.error(`Error activando panel de debug: ${error}`);
          throw new Error(`Error activando panel de debug: ${error}`);
        }
        
      case 'show-debug-modal':
        try {
          const newState = !showDebugModal;
          setShowDebugModal(newState);
          
          // Quitar foco del botón
          if (typeof window !== 'undefined') {
            (document.activeElement as HTMLElement)?.blur();
          }
          
          return {
            success: true,
            message: newState ? 'Modal de debug abierto' : 'Modal de debug cerrado'
          };
        } catch (error) {
          toast.error(`Error toggleando modal de debug: ${error}`);
          throw new Error(`Error toggleando modal de debug: ${error}`);
        }
        
      case 'show-help-modal':
        try {
          const newState = !showHelpModal;
          setShowHelpModal(newState);
          
          // Quitar foco del botón
          if (typeof window !== 'undefined') {
            (document.activeElement as HTMLElement)?.blur();
          }
          
          return {
            success: true,
            message: newState ? 'Modal de ayuda abierto' : 'Modal de ayuda cerrado'
          };
        } catch (error) {
          toast.error(`Error toggleando modal de ayuda: ${error}`);
          throw new Error(`Error toggleando modal de ayuda: ${error}`);
        }
        
      case 'test-tools':
        try {
          setShowTestTools(true);
          toast.success('Herramientas de test abiertas');
          
          return {
            success: true,
            message: 'Herramientas de test abiertas'
          };
        } catch (error) {
          toast.error(`Error abriendo herramientas de test: ${error}`);
          throw new Error(`Error abriendo herramientas de test: ${error}`);
        }
        
      case 'show-upload-log':
        try {
          const newState = !showUploadLog;
          setShowUploadLog(newState);
          
          // Quitar foco del botón
          if (typeof window !== 'undefined') {
            (document.activeElement as HTMLElement)?.blur();
          }
          
          return {
            success: true,
            message: newState ? 'Log de subidas abierto' : 'Log de subidas cerrado'
          };
        } catch (error) {
          toast.error(`Error toggleando log de subidas: ${error}`);
          throw new Error(`Error toggleando log de subidas: ${error}`);
        }
        
      case 'show-pending-items':
        try {
          setShowPendingItems(true);
          toast.success('Items pendientes abierto');
          
          return {
            success: true,
            message: 'Items pendientes abierto'
          };
        } catch (error) {
          toast.error(`Error abriendo items pendientes: ${error}`);
          throw new Error(`Error abriendo items pendientes: ${error}`);
        }
        
      default:
        throw new Error(`Acción desconocida: ${action}`);
    }
  }, [consolidated, empresaFiltro, periodoFiltro, nombreFiltro, showDebugModal, showHelpModal, extractEmpresaFromArchivo, updateConfig, handleDeleteWithProgress]);

  // Función loadInitialData eliminada - duplicada

  // Recargar datos cuando cambie el tipo de storage - ELIMINADO (duplicado)

  // Cargar datos iniciales - SOLO UNA VEZ
  useEffect(() => {
    let isMounted = true; // Flag para evitar actualizaciones si el componente se desmonta
    
    const loadData = async () => {
      try {
        const [consolidatedData, controlsData] = await Promise.all([
          dataManager.getConsolidated(),
          dataManager.getSavedControls()
        ]);
        
        // Solo actualizar si el componente sigue montado
        if (isMounted) {
          
          setConsolidated(consolidatedData);
          setSavedControls(controlsData);
        }
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      }
    };

    loadData();
    
    // Listener para cuando se aplica una regla OCR
    const handleOcrRuleApplied = () => {

      if (isMounted) {
        loadData();
      }
    };
    
    // Listener para cuando se borran datos
    const handleDataCleared = () => {

      if (isMounted) {
        // Limpiar estado inmediatamente
        setConsolidated([]);
        setSavedControls([]);
        // Recargar datos frescos
        loadData();
      }
    };
    
    // Listener para cuando se elimina un registro individual
    const handleDataDeleted = () => {

      if (isMounted) {
        loadData();
      }
    };
    
    window.addEventListener('ocr-rule-applied', handleOcrRuleApplied);
    window.addEventListener('data-cleared', handleDataCleared);
    window.addEventListener('data-deleted', handleDataDeleted);
    
    return () => {
      isMounted = false; // Cleanup
      window.removeEventListener('ocr-rule-applied', handleOcrRuleApplied);
      window.removeEventListener('data-cleared', handleDataCleared);
      window.removeEventListener('data-deleted', handleDataDeleted);
    };
  }, []); // Removido config.enableSupabaseStorage para evitar loops infinitos

  // Verificar subidas pendientes al cargar la app - SOLO UNA VEZ por usuario
  useEffect(() => {
    let isMounted = true;
    
    const checkPendingUploads = async () => {
      if (!session?.user?.id) {
        return;
      }

      try {
        // const activeSessions = await UploadSessionManager.getActiveSessions(session.user.id); // ELIMINADO
        const activeSessions = []; // TODO: Implementar con dataManager
        
        // Solo actualizar si el componente sigue montado
        if (isMounted) {
          if (activeSessions.length > 0) {

            setHasPendingUploads(true);
            const latestSession = activeSessions.sort((a, b) => b.startedAt - a.startedAt)[0];
            setCurrentUploadSessionId(latestSession.sessionId);

          } else {
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
  }, []); // Removido session?.user?.id para evitar loops infinitos

  // Manejar cambio de filtros - SOLO cuando cambia el tab a control
  useEffect(() => {
    if (activeTab === "control") {

      loadControlFromDexie();
    }
  }, [activeTab]); // Solo cuando cambia el tab, no en cada filtro

  // Manejar filtros de control - SIN recargar datos, solo filtrar
  useEffect(() => {
    if (activeTab === "control" && savedControls.length > 0) {

      // Aquí se aplicarán los filtros sin recargar datos
      // Los filtros se manejan en el componente ControlDetailsPanel
    }
  }, [activeTab]); // Simplificado para evitar loops infinitos

  const loadControlFromDexie = async () => {
    try {
      const control = await dataManager.getSavedControlByFilterKey(
        `${empresaFiltro || ""}||${periodoFiltro || ""}`
      );

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

    // MOSTRAR UI INMEDIATAMENTE, sin esperar a crear sesión o procesar
    const uploadItems: UploadItem[] = Array.from(files).map(file => ({
      name: file.name,
      status: "pending" as const
    }));

    setProcessingFiles(uploadItems);
    setLastProcessedIndex(0);
    setShouldStopProcessing(false);
    setHasPendingUploads(true);
    
    // CREAR SESIÓN EN BACKGROUND (no bloquear UI)
    const tempSessionId = `temp-${Date.now()}`;
    setCurrentUploadSessionId(tempSessionId);
    
    if (session?.user?.id) {
      // Crear sesión de forma asíncrona sin bloquear
      Promise.resolve().then(async () => {
        try {
          const fileNames = Array.from(files).map(f => f.name);
          // const uploadSession = await UploadSessionManager.createSession(session.user.id, fileNames); // ELIMINADO
          const uploadSession = { id: tempSessionId, userId: session.user.id, fileNames }; // TODO: Implementar con dataManager
          toast.success(`Sesión creada: ${fileNames.length} archivos registrados`);
        } catch (error) {
          console.error("❌ Error creando sesión de subida:", error);
          // No mostrar error al usuario si ya está procesando
        }
      });
    }

    // Sistema de actualización cada 3 segundos - DESHABILITADO por ahora
    // TODO: Implementar tracking de sesión con dataManager si es necesario
    // const updateInterval = setInterval(async () => { ... }, 3000);

    try {
      // Buscar reglas aprendidas para el primer archivo
      const firstFile = files[0];
      const applicableRule = findApplicableRule(firstFile.name);
      
      // Procesar archivos UNO POR UNO para actualizar progreso en tiempo real
      
      const results: SimpleProcessingResult[] = [];
      
      for (let i = 0; i < files.length; i++) {
        if (shouldStopProcessing) {
          break;
        }
        
        const file = files[i];
        let result: SimpleProcessingResult;
        try {
          // Procesar archivo individual
          result = await processSingleFile(file, dataManager, showDebug, applicableRule || undefined);
          results.push(result);
          
          if (result.success) {
          } else {
            console.error(`❌ [${i + 1}/${files.length}] ${file.name}: Error - ${result.error}`);
          }
        } catch (error) {
          console.error(`❌ [${i + 1}/${files.length}] Error procesando ${file.name}:`, error);
          result = {
            success: false,
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Error desconocido'
          };
          results.push(result);
        }
        
        // Si el archivo se procesó exitosamente, enviarlo al servidor
        if (result.success && result.parsedData && !result.skipped) {
          // Verificar si hay empresa para aplicar OCR
          const empresa = result.parsedData.EMPRESA;
          if (empresa) {

          }
          
          const formData = new FormData();
          formData.append('file', file);
          if (result.parsedData.legajo) formData.append('legajo', result.parsedData.legajo);
          if (result.parsedData.periodo) formData.append('periodo', result.parsedData.periodo);
          if (result.parsedData.key) formData.append('key', result.parsedData.key);
          
          try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
              
              // Manejar archivos duplicados (409) como éxito pero omitido
              // NOTA: Ya no rechazamos por archivo físico existente, solo por BD
              if (response.status === 409 && errorData.duplicate) {

                result.skipped = true;
                result.reason = `Archivo ya existe: ${errorData.existingFile}`;
              } else {
                // Otros errores se manejan como fallos
                result.success = false;
                result.error = `Error del servidor: ${response.status} - ${errorData.error || 'Error desconocido'}`;
              }
            } else {
              // Archivo guardado exitosamente
              const uploadData = await response.json();
              
              // Aplicar reglas OCR automáticamente si hay una regla guardada para esta empresa
              if (result.parsedData?.EMPRESA && uploadData.name) {
                try {

                  const ocrResponse = await fetch('/api/apply-ocr-rules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      empresa: result.parsedData.EMPRESA,
                      archivo: uploadData.name,
                      reciboKey: result.parsedData.key || `${result.parsedData.LEGAJO}-${result.parsedData.PERIODO}-${result.parsedData.EMPRESA}`
                    })
                  });
                  
                  if (ocrResponse.ok) {
                    const ocrData = await ocrResponse.json();
                    
                    if (ocrData.extractedValues && Object.keys(ocrData.extractedValues).length > 0) {

                    } else {
                      // Mostrar información detallada sobre por qué no se extrajeron valores
                      const debugInfo = ocrData.debugInfo;
                      if (debugInfo) {
                        if (!debugInfo.reglaEncontrada) {
                          console.warn(`⚠️ OCR: ${debugInfo.razon || 'Regla no encontrada'}`);
                        } else {
                          console.warn(`⚠️ OCR: Regla encontrada pero no se extrajeron valores:`);
                          console.warn(`   - Empresa: ${debugInfo.empresa}`);
                          console.warn(`   - Campos configurados: ${debugInfo.camposConfigurados}`);
                          console.warn(`   - Campos procesados: ${debugInfo.camposProcesados}`);
                          
                          if (debugInfo.textosExtraidos && debugInfo.textosExtraidos.length > 0) {
                            console.warn(`   - Textos encontrados pero rechazados:`);
                            debugInfo.textosExtraidos.forEach((t: any) => {
                              if (!t.aceptado) {
                                console.warn(`     • ${t.campo}: "${t.texto || '(vacío)'}" ${t.razonRechazo ? `→ ${t.razonRechazo}` : ''}`);
                              }
                            });
                          } else {
                            console.warn(`   - No se encontró texto en ninguna región marcada`);
                          }
                          
                          if (debugInfo.errores && debugInfo.errores.length > 0) {
                            console.warn(`   - Errores:`, debugInfo.errores);
                          }
                        }
                      } else {
                        console.warn(`⚠️ OCR: No se extrajeron valores (sin información de depuración)`);
                      }
                    }
                  } else {
                    const ocrError = await ocrResponse.json().catch(() => ({ error: 'Error desconocido' }));
                    console.warn(`❌ OCR: Error aplicando regla:`, ocrError.error || ocrError.details || ocrError);
                  }
                } catch (ocrError) {
                  // No fallar si la aplicación de OCR falla - es opcional
                  // Los errores ya se loguean en apply-ocr-rules.ts
                  console.error(`Error aplicando OCR a ${uploadData.name}:`, ocrError);
                }
              }
            }
          } catch (error) {
            console.error(`Error subiendo archivo ${file.name}:`, error);
            result.success = false;
            result.error = error instanceof Error ? error.message : 'Error desconocido';
          }
        }
        
        // Actualizar progreso en tiempo real
        setProcessingFiles(prev => {
          if (!prev) return null;
          const updated = [...prev];
          if (updated[i]) {
            updated[i] = {
              ...updated[i],
              status: result.success ? (result.skipped ? "skipped" : "ok") : "error",
              reason: result.skipped ? result.reason : result.error,
              processingResult: result
            };
          }
          return updated;
        });
        
        setLastProcessedIndex(i + 1);
      }

      // Actualizar estado en la base de datos para todos los archivos
      // TODO: Implementar updateFileStatus con dataManager cuando sea necesario
      // Por ahora solo procesamos los archivos, no necesitamos tracking de sesión
      
      // Log del resumen de procesamiento
      const successful = results.filter(r => r.success && !r.skipped);
      const skipped = results.filter(r => r.skipped);
      const failed = results.filter(r => !r.success);
      
      
      if (skipped.length > 0) {

      }
      
      if (failed.length > 0) {
        console.log(`❌ Archivos fallidos:`, failed.map(f => ({ name: f.fileName, error: f.error })));
      }
      
      // Verificar si algún archivo necesita ajustes del parser
      const needsParserAdjustment = results.some(result => result.needsParserAdjustment);
      
      if (needsParserAdjustment) {
        // Mostrar modal para el primer archivo que necesita ajustes
        const firstFileNeedingAdjustment = Array.from(files).find((_, index) => results[index]?.needsParserAdjustment);
        if (firstFileNeedingAdjustment) {
          const resultIndex = Array.from(files).indexOf(firstFileNeedingAdjustment);
          const result = results[resultIndex];
          if (result && result.parsedData) {

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
      
      // Recargar datos consolidados después del procesamiento
      // Esperar un momento para asegurar que las actualizaciones OCR del servidor se completen
      try {
        // Esperar un breve delay para que las actualizaciones del servidor se completen
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Limpiar cache antes de recargar
        const manager = dataManager as any;
        if (manager.dataCache) {
          manager.dataCache.clear();
        }
        
        const [newConsolidated, newControls] = await Promise.all([
          dataManager.getConsolidated(),
          dataManager.getSavedControls()
        ]);
        setConsolidated(newConsolidated);
        setSavedControls(newControls);

        // Notificar al usuario sobre el resultado
        if (successful.length > 0) {
          toast.success(`✅ ${successful.length} recibos procesados exitosamente`);
        }
        if (skipped.length > 0) {
          toast.warning(`⏭️ ${skipped.length} recibos omitidos (ver consola para detalles)`);
        }
        if (failed.length > 0) {
          toast.error(`❌ ${failed.length} recibos fallaron`);
        }
      } catch (error) {
        console.error('❌ Error recargando datos consolidados:', error);
        toast.error('Error recargando datos después del procesamiento');
      }
      
      // Finalizar sesión de subida
      if (tempSessionId) {
        // TODO: Implementar completeSession con dataManager si es necesario
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
      if (tempSessionId) {
        try {
          // Marcar sesión como fallida pero mantenerla para retomar
          // TODO: Implementar updateSessionStatus con dataManager si es necesario
        } catch (updateError) {
          console.error("Error actualizando sesión:", updateError);
        }
      }
    } finally {
      // Interval deshabilitado por ahora
      // clearInterval(updateInterval);
      
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

      await dataManager.addSavedControl(savedControl);
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
      await dataManager.deleteSavedControl(filterKey);
      
      // Recargar controles
      const newControls = await dataManager.getSavedControls();
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
    // Filtrar y preparar datos
    if (!consolidated || !Array.isArray(consolidated)) {
      return [];
    }
    
    
    const filtered = consolidated.filter(item => {
      // Excluir empleados manuales (solo mostrar recibos reales)
      const isManualEmployee = item.data?.MANUAL === 'true';
      if (isManualEmployee) {
        return false;
      }
      
      const matchesPeriodo = !periodoFiltro || periodoFiltro === "Todos" || periodoFiltro === "Todas" || item.periodo === periodoFiltro;
      
      // Para empresa, verificar si coincide con la empresa detectada
      let matchesEmpresa = true;
      if (empresaFiltro && empresaFiltro !== "Todas") {
        const itemEmpresa = item.data?.EMPRESA || extractEmpresaFromArchivo(item.archivos ? item.archivos.join(', ') : '');
        // Si se filtra por "Sin nombre", buscar registros que tienen "Sin nombre" como empresa
        if (empresaFiltro === "Sin nombre") {
          // Buscar registros que tienen explícitamente "Sin nombre" como empresa
          matchesEmpresa = itemEmpresa === 'Sin nombre' || item.data?.EMPRESA === 'Sin nombre';
        } else {
          matchesEmpresa = itemEmpresa === empresaFiltro;
        }
        
        // Debug específico para legajo 10
        if (item.legajo === '10') {
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


      // Obtener datos filtrados actuales usando la misma lógica que la interfaz
      const currentFiltered = consolidated.filter(item => {
        // Filtro por período
        const matchesPeriodo = !periodoFiltro || periodoFiltro === "Todos" || periodoFiltro === "Todas" || item.periodo === periodoFiltro;
        
        // Filtro por empresa
        let matchesEmpresa = true;
        if (empresaFiltro && empresaFiltro !== "Todas") {
          const itemEmpresa = item.data?.EMPRESA || extractEmpresaFromArchivo(item.archivos ? item.archivos.join(', ') : '');
          matchesEmpresa = itemEmpresa === empresaFiltro;

        }
        
        // Filtro por nombre
        const matchesNombre = nombreFiltro === "" || 
          (item.nombre && item.nombre.toLowerCase().includes(nombreFiltro.toLowerCase())) ||
          (item.legajo && item.legajo.toLowerCase().includes(nombreFiltro.toLowerCase()));
        
        const matches = matchesPeriodo && matchesEmpresa && matchesNombre;
        if (matches) {

        }
        
        return matches;
      });

      // Verificar que tenemos registros para eliminar
      if (currentFiltered.length === 0) {
        toast.warning('No hay registros visibles para eliminar con los filtros actuales');
        return;
      }
      
      // Confirmar eliminación con información detallada
      const confirmMessage = `¿Estás seguro de que quieres eliminar ${currentFiltered.length} recibos visibles?\n\n` +
        `Esta acción eliminará:\n` +
        `- ${currentFiltered.length} recibos procesados\n` +
        `- Archivos PDF asociados\n` +
        `- Todos los datos de estos recibos\n\n` +
        `Esta acción no se puede deshacer.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      // Obtener las claves de los registros filtrados
      const keysToDelete = currentFiltered.map(item => item.key);

      // Eliminar de la base de datos usando las claves
      for (const key of keysToDelete) {
        // Buscar el registro para obtener información de archivos
        const recordToDelete = currentFiltered.find(item => item.key === key);
        
        if (recordToDelete) {
          // IMPORTANTE: Eliminar receipts relacionados ANTES de eliminar archivos físicos
          // Esto asegura que el hash y filename se eliminen para permitir re-subida
          if (recordToDelete.legajo) {
            try {
              const relatedReceipts = await dataManager.getReceiptsByLegajo(recordToDelete.legajo);
              
              // Filtrar receipts que correspondan a este registro
              const receiptsToDelete = relatedReceipts.filter(receipt => {
                // Coincidir por periodo
                if (receipt.periodo === recordToDelete.periodo) return true;
                
                // Coincidir por filename en archivos
                if (recordToDelete.archivos && Array.isArray(recordToDelete.archivos)) {
                  const receiptFilename = receipt.filename || receipt.data?.filename || '';
                  if (recordToDelete.archivos.includes(receiptFilename)) return true;
                  
                  if (receipt.archivos && Array.isArray(receipt.archivos)) {
                    return receipt.archivos.some((arch: string) => 
                      recordToDelete.archivos!.includes(arch)
                    );
                  }
                }
                
                // Coincidir por hash
                if (recordToDelete.data?.fileHash && receipt.data?.fileHash) {
                  return receipt.data.fileHash === recordToDelete.data.fileHash;
                }
                
                return false;
              });
              
              // Eliminar los receipts encontrados
              for (const receipt of receiptsToDelete) {
                if (receipt.id) {
                  await dataManager.deleteReceipt(receipt.id);

                }
              }
              
              if (receiptsToDelete.length > 0) {

              }
            } catch (error) {
              console.warn(`⚠️ Error eliminando receipts relacionados:`, error);
            }
          }
          
          // Eliminar archivos físicos si existen
          if (recordToDelete.archivos && recordToDelete.archivos.length > 0) {
            for (const filename of recordToDelete.archivos) {
            // Solo intentar eliminar si el filename no está vacío
            if (filename && filename.trim() !== '') {
              try {

                // Eliminar archivo físico del servidor
                const deleteResponse = await fetch('/api/delete-file', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ filename }),
                });
                
                if (deleteResponse.ok) {

                } else {
                  console.warn(`⚠️ No se pudo eliminar archivo físico: ${filename}`);
                }
              } catch (error) {
                // Manejar diferentes tipos de error
                let errorMsg: string;
                if (error instanceof Error) {
                  errorMsg = error.message;
                } else if (typeof error === 'string') {
                  errorMsg = error;
                } else if (error && typeof error === 'object') {
                  // Intentar extraer información útil del objeto
                  try {
                    errorMsg = JSON.stringify(error);
                  } catch {
                    errorMsg = String(error);
                  }
                } else {
                  errorMsg = String(error);
                }
                console.error(`Error eliminando archivo ${filename}:`, errorMsg);
              }
            } else {

            }
            }
          } else {

          }
          
          // Eliminar el registro consolidado
          await dataManager.deleteConsolidated(key);

        }
      }
      
      // ACTUALIZACIÓN INMEDIATA: Remover registros del estado ANTES de recargar
      setConsolidated(prev => prev.filter(item => !keysToDelete.includes(item.key)));
      
      // Recargar datos frescos
      const newConsolidated = await dataManager.getConsolidated();
      setConsolidated(newConsolidated);
      
      // Disparar evento para notificar a otros componentes
      window.dispatchEvent(new CustomEvent('data-deleted', { 
        detail: { deletedKeys: keysToDelete } 
      }));
      
      // Actualizar Dashboard si está activo
      if (dashboardRef.current) {
        dashboardRef.current.refresh();
      }
      
      toast.success(`${keysToDelete.length} registros eliminados correctamente`);
    } catch (error) {
      console.error("Error eliminando registros:", error);
      toast.error("Error eliminando registros");
    }
  }, [consolidated, periodoFiltro, empresaFiltro, nombreFiltro]);

  // Función para verificar el estado de la base de datos
  const handleCheckDatabase = useCallback(async () => {
    try {
      const allConsolidated = await dataManager.getConsolidated();
      const allControls = await dataManager.getSavedControls();
      const allReceipts = await dataManager.getReceipts();
      
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
      // Contar registros antes de eliminar
      const consolidatedCount = await dataManager.countConsolidated();
      const receiptsCount = await dataManager.countReceipts();
      const controlsCount = await dataManager.countSavedControls();
      const sessionsCount = await dataManager.countUploadSessions();
      
      const totalRecords = consolidatedCount + receiptsCount + controlsCount + sessionsCount;
      
      if (totalRecords === 0) {
        toast.info('No hay registros para eliminar');
        return;
      }
      
      const confirmed = window.confirm(
        `¿Estás seguro de que quieres eliminar TODOS los datos?\n\n` +
        `Esta acción eliminará:\n` +
        `- ${consolidatedCount} recibos procesados\n` +
        `- ${receiptsCount} archivos de recibos\n` +
        `- ${controlsCount} controles guardados\n` +
        `- ${sessionsCount} sesiones de subida\n` +
        `- Todos los archivos PDF\n\n` +
        `TOTAL: ${totalRecords} elementos\n\n` +
        `Esta acción no se puede deshacer.`
      );
      
      if (confirmed) {
        console.log("🧹 Limpiando base de datos...");
        
        // Limpiar todas las tablas
        await dataManager.clearReceipts();
        await dataManager.clearConsolidated();
        await dataManager.clearSavedControls();

        // ACTUALIZACIÓN INMEDIATA: Establecer arrays vacíos ANTES de cualquier otra cosa
        setConsolidated([]);
        setSavedControls([]);
        
        // Forzar actualización del Dashboard inmediatamente
        if (dashboardRef.current) {
          dashboardRef.current.refresh();
        }
        
        // Recargar datos frescos desde la base (sin caché) - forzar recarga
        const newConsolidated = await dataManager.getConsolidated();
        const newControls = await dataManager.getSavedControls();
        
        console.log("📊 Datos después de limpiar:", {
          consolidated: newConsolidated.length,
          controls: newControls.length
        });
        
        // Actualizar con arrays nuevos (forzar nuevo reference)
        setConsolidated(newConsolidated.length > 0 ? [...newConsolidated] : []);
        setSavedControls(newControls.length > 0 ? [...newControls] : []);
        
        // Disparar evento para notificar a otros componentes
        window.dispatchEvent(new CustomEvent('data-cleared', { 
          detail: { type: 'all' } 
        }));
        
        // Recargar datos del tablero (esto también actualiza filtros, etc.)
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

      // const activeSessions = await UploadSessionManager.getActiveSessions(session.user.id); // ELIMINADO
      const activeSessions = []; // TODO: Implementar con dataManager
      
      if (activeSessions.length > 0) {

        setHasPendingUploads(true);
        const latestSession = activeSessions.sort((a, b) => b.startedAt - a.startedAt)[0];
        setCurrentUploadSessionId(latestSession.sessionId);
        toast.success(`Se encontraron ${activeSessions.length} subidas pendientes`);
      } else {

        setHasPendingUploads(false);
        setCurrentUploadSessionId(null);
        toast.info("No hay subidas pendientes");
      }
    } catch (error) {
      console.error("Error verificando subidas pendientes:", error);
      toast.error("Error verificando subidas pendientes");
    }
  }, []); // Removido session?.user?.id para evitar loops infinitos

  // Función para verificar todas las sesiones en la base de datos
  const handleCheckAllSessions = useCallback(async () => {
    try {

      // const allSessions = await UploadSessionManager.getAllSessions(); // ELIMINADO
      const allSessions = []; // TODO: Implementar con dataManager
      
      if (allSessions.length > 0) {

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
      const result = await processSingleFile(pendingFile, dataManager, showDebug);
      
      // Actualizar el resultado con la empresa seleccionada
      if (result.success && !result.skipped) {
        // Actualizar la base de datos con la empresa correcta
        const hash = await sha256OfFile(pendingFile);
        if (hash) {
          // const existing = await repoDexie.findReceiptByHash(hash); // ELIMINADO - usar dataManager
          // TODO: Implementar búsqueda por hash en dataManager
          // if (existing) {
          //   await dataManager.updateReceipt(existing.id!, {
          //     data: { ...existing.data, EMPRESA: empresa }
          //   });
          //   
          //   // Actualizar también en consolidated si existe
          //   const consolidatedItem = await dataManager.getConsolidatedByLegajo(existing.legajo);
          //   if (consolidatedItem) {
          //     const key = consolidatedItem.legajo + '||' + consolidatedItem.periodo + '||' + (consolidatedItem.data?.EMPRESA || 'DESCONOCIDA');
          //     await dataManager.updateConsolidated(key, {
          //       data: { ...consolidatedItem.data, EMPRESA: empresa }
          //     });
          //   }
          // }
        }
      }
      
      // Cerrar modal y limpiar estado
      setShowEmpresaModal(false);
      setPendingFile(null);
      
      // Recargar datos
      const newConsolidated = await dataManager.getConsolidated();
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
    // Verificar si tiene campos obligatorios faltantes
    const hasAllRequired = row.data?._hasAllRequiredFields === true;
    const missingFields = Array.isArray(row.data?._missingFields) ? row.data._missingFields as string[] : [];
    const isIncomplete = !hasAllRequired || missingFields.length > 0;
    
    // Si está incompleto, mostrar primero el marcador OCR
    if (isIncomplete && missingFields.length > 0) {
      setOcrMarkerReceipt(row);
      setShowOCRMarker(true);
      return;
    }
    
    // Si está completo, mostrar el editor normal
    const loadLatestRow = async () => {
      try {
        const latest = await dataManager.getConsolidatedByKey(row.key);
        if (latest) {
          setEditingRow(latest);
        } else {
          setEditingRow(row);
        }
        
        // Intentar obtener información de debug OCR si existe
        try {
          const archivo = latest?.archivos?.[0] || row.archivos?.[0] || '';
          const empresa = latest?.data?.EMPRESA || row.data?.EMPRESA || '';
          if (archivo && empresa) {
            // Obtener información de OCR del último intento
            const response = await fetch('/api/apply-ocr-rules', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                empresa, 
                archivo, 
                reciboKey: latest?.key || row.key,
                debugOnly: true // Flag para solo obtener info sin aplicar
              })
            });
            if (response.ok) {
              const result = await response.json();
              if (result.debugInfo) {
                setEditingRowOcrDebug(result.debugInfo);
              }
            }
          }
        } catch (ocrError) {
          // Si falla, no es crítico
          console.log('No se pudo obtener info OCR:', ocrError);
        }
      } catch (error) {
        console.error('Error cargando registro actualizado:', error);
        setEditingRow(row); // Usar el que tenemos si falla
      }
    };
    
    loadLatestRow();
    setShowEditModal(true);
  }, [dataManager]);

  const handleEditSave = useCallback(async (updatedData: Record<string, string>) => {
    if (!editingRow) return;
    
    try {
      const empresa = editingRow.data?.EMPRESA || '';
      
      // Verificar si hubo cambios reales y crear reglas de reemplazo automáticamente
      const hasChanges = Object.keys(updatedData).some(key => {
        const oldValue = editingRow.data?.[key] || '';
        const newValue = updatedData[key] || '';
        return oldValue !== newValue;
      });
      
      // Crear reglas de reemplazo para campos que cambiaron
      if (hasChanges && empresa) {
        try {
          const existingRules = await dataManager.getAppConfig(`ocr_replacements_${empresa}`) || { rules: [] };
          const rules = Array.isArray(existingRules.rules) ? existingRules.rules : [];
          
          // Verificar cada campo que cambió
          for (const key of Object.keys(updatedData)) {
            const oldValue = editingRow.data?.[key] || '';
            const newValue = updatedData[key] || '';
            
            // Si el valor cambió y ambos valores existen, crear regla de reemplazo
            if (oldValue && newValue && oldValue !== newValue && oldValue.trim() !== '' && newValue.trim() !== '') {
              // Buscar si ya existe una regla para este campo y valor original
              const existingRuleIndex = rules.findIndex((r: any) => 
                r.fieldName === key && 
                r.from && r.from.trim().toUpperCase() === oldValue.trim().toUpperCase()
              );
              
              const newRule = {
                fieldName: key,
                from: oldValue.trim(),
                to: newValue.trim(),
                createdAt: new Date().toISOString()
              };
              
              if (existingRuleIndex >= 0) {
                // Actualizar regla existente
                rules[existingRuleIndex] = newRule;
              } else {
                // Agregar nueva regla
                rules.push(newRule);
              }
            }
          }
          
          // Guardar reglas de reemplazo
          if (rules.length > 0) {
            await dataManager.setAppConfig(`ocr_replacements_${empresa}`, { rules });
            const newRulesCount = rules.filter((r: any) => {
              const oldValue = editingRow.data?.[r.fieldName] || '';
              return oldValue && oldValue.trim() !== '' && r.from && r.from.trim().toUpperCase() === oldValue.trim().toUpperCase();
            }).length;
            if (newRulesCount > 0) {
              toast.success(`✅ ${newRulesCount} regla(s) de reemplazo guardada(s) para ${empresa}`);
            }
          }
        } catch (replacementError) {
          console.error('Error guardando reglas de reemplazo:', replacementError);
          // No fallar si no se pueden guardar las reglas
        }
      }
      
      // Actualizar el registro en la base de datos
            await dataManager.updateConsolidated(editingRow.key, {
        nombre: updatedData.NOMBRE,
        legajo: updatedData.LEGAJO,
        periodo: updatedData.PERIODO,
        data: {
          ...editingRow.data,
          ...updatedData,
          // Marcar como modificado si hubo cambios
          _modified: hasChanges ? true : editingRow.data?._modified,
          _modifiedAt: hasChanges ? new Date().toISOString() : editingRow.data?._modifiedAt,
          // Mantener _reviewed si ya estaba marcado
          _reviewed: editingRow.data?._reviewed || false,
          _reviewedAt: editingRow.data?._reviewedAt
        }
      });
      
      // Aplicar reglas de reemplazo a todos los recibos de la misma empresa que tengan el valor original
      if (hasChanges && empresa) {
        try {
          const allConsolidated = await dataManager.getConsolidated();
          const empresaReceipts = allConsolidated.filter((r: any) => {
            const rEmpresa = r.data?.EMPRESA || '';
            return rEmpresa === empresa && r.key !== editingRow.key; // Excluir el recibo actual
          });
          
          let updatedCount = 0;
          for (const receipt of empresaReceipts) {
            let receiptUpdated = false;
            const updatedReceiptData = { ...receipt.data };
            
            // Aplicar cada regla de reemplazo
            for (const key of Object.keys(updatedData)) {
              const oldValue = editingRow.data?.[key] || '';
              const newValue = updatedData[key] || '';
              
              if (oldValue && newValue && oldValue !== newValue) {
                const currentValue = receipt.data?.[key] || '';
                // Si el valor actual coincide con el valor original, reemplazarlo
                if (currentValue && currentValue.trim().toUpperCase() === oldValue.trim().toUpperCase()) {
                  updatedReceiptData[key] = newValue;
                  receiptUpdated = true;
                }
              }
            }
            
            // Actualizar el recibo si hubo cambios
            if (receiptUpdated) {
              await dataManager.updateConsolidated(receipt.key, {
                data: updatedReceiptData
              });
              updatedCount++;
            }
          }
          
          if (updatedCount > 0) {
            toast.success(`✅ ${updatedCount} recibo(s) actualizado(s) automáticamente con el nuevo valor`);
          }
        } catch (bulkUpdateError) {
          console.error('Error actualizando recibos en masa:', bulkUpdateError);
          // No fallar si no se pueden actualizar en masa
        }
      }
      
      // Recargar datos
      const newConsolidated = await dataManager.getConsolidated();
      setConsolidated(newConsolidated);
      
      toast.success("Datos actualizados correctamente");
    } catch (error) {
      console.error("Error actualizando datos:", error);
      toast.error("Error actualizando datos");
    }
  }, [editingRow, dataManager]);

  // Función para editar una celda directamente desde la tabla
  const handleCellEdit = useCallback(async (row: ConsolidatedEntity, field: string, newValue: string) => {
    try {
      const empresa = row.data?.EMPRESA || '';
      const oldValue = row.data?.[field] || '';
      
      // Si no cambió, no hacer nada
      if (oldValue === newValue) {
        return;
      }
      
      // Actualizar el registro
      await dataManager.updateConsolidated(row.key, {
        data: {
          ...row.data,
          [field]: newValue,
          _modified: true,
          _modifiedAt: new Date().toISOString()
        }
      });
      
      // Aplicar a todos los recibos de la misma empresa que tengan el valor original
      if (empresa) {
        try {
          const allConsolidated = await dataManager.getConsolidated();
          const empresaReceipts = allConsolidated.filter((r: any) => {
            const rEmpresa = r.data?.EMPRESA || '';
            return rEmpresa === empresa && r.key !== row.key;
          });
          
          let updatedCount = 0;
          for (const receipt of empresaReceipts) {
            const currentValue = receipt.data?.[field] || '';
            if (currentValue && currentValue.trim().toUpperCase() === oldValue.trim().toUpperCase()) {
              await dataManager.updateConsolidated(receipt.key, {
                data: {
                  ...receipt.data,
                  [field]: newValue
                }
              });
              updatedCount++;
            }
          }
          
          if (updatedCount > 0) {
            toast.success(`✅ ${updatedCount} recibo(s) actualizado(s) automáticamente`);
          }
        } catch (bulkUpdateError) {
          console.error('Error actualizando recibos en masa:', bulkUpdateError);
        }
      }
      
      // Recargar datos
      const newConsolidated = await dataManager.getConsolidated();
      setConsolidated(newConsolidated);
      
      toast.success("Campo actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando celda:", error);
      toast.error("Error actualizando el campo");
      throw error;
    }
  }, [dataManager]);

  // Función para marcar recibos como revisados
  const handleMarkAsReviewed = useCallback(async (rows: ConsolidatedEntity[]) => {
    if (rows.length === 0) return;
    
    try {
      toast.info(`Marcando ${rows.length} recibo(s) como revisado(s)...`);
      
      for (const row of rows) {
        try {
          await dataManager.updateConsolidated(row.key, {
            data: {
              ...row.data,
              _reviewed: true,
              _reviewedAt: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error(`Error marcando recibo ${row.key} como revisado:`, error);
        }
      }
      
      // Recargar datos
      const newConsolidated = await dataManager.getConsolidated();
      setConsolidated(newConsolidated);
      
      toast.success(`${rows.length} recibo(s) marcado(s) como revisado(s)`);
    } catch (error) {
      console.error('Error en handleMarkAsReviewed:', error);
      toast.error('Error marcando recibos como revisados');
    }
  }, [dataManager]);

  // Estado para controlar la ejecución de OCR
  const [isOCRRunning, setIsOCRRunning] = useState(false);
  const [ocrStopRequested, setOcrStopRequested] = useState(false);
  const ocrAbortControllerRef = useRef<AbortController | null>(null);

  // Función para releer datos usando OCR
  const handleReReadOCR = useCallback(async (rows: ConsolidatedEntity[]) => {
    if (rows.length === 0) return;
    
    // Prevenir ejecuciones múltiples simultáneas
    if (isOCRRunning) {
      toast.warning('Ya hay una lectura OCR en progreso. Espera a que termine.');
      return;
    }
    
    try {
      setIsOCRRunning(true);
      setOcrStopRequested(false);
      ocrAbortControllerRef.current = new AbortController();
      
      toast.info(`Releyendo ${rows.length} recibo(s) con OCR...`, {
        action: {
          label: 'Detener',
          onClick: () => {
            setOcrStopRequested(true);
            ocrAbortControllerRef.current?.abort();
            toast.warning('Deteniendo lectura OCR...');
          }
        }
      });
      
      let processed = 0;
      for (const row of rows) {
        // Verificar si se solicitó detener
        if (ocrStopRequested || ocrAbortControllerRef.current?.signal.aborted) {
          toast.warning(`Lectura OCR detenida. Procesados: ${processed}/${rows.length}`);
          break;
        }
        const archivo = row.archivos && row.archivos.length > 0 ? row.archivos[0] : '';
        const empresa = row.data?.EMPRESA || (archivo ? extractEmpresaFromArchivo(archivo) : '');
        const reciboKey = row.key;
        
        if (!empresa || !archivo || !reciboKey) {
          console.warn(`⚠️ No se puede releer OCR para ${row.key}: datos incompletos`);
          continue;
        }
        
        try {
          const response = await fetch('/api/apply-ocr-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa, archivo, reciboKey }),
            signal: ocrAbortControllerRef.current?.signal
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.extractedValues && Object.keys(result.extractedValues).length > 0) {

            } else {
              console.warn(`⚠️ OCR no extrajo valores para ${archivo}`);
            }
          } else {
            console.error(`❌ Error aplicando OCR a ${archivo}`);
          }
          processed++;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Lectura OCR cancelada por el usuario');
            break;
          }
          console.error(`❌ Error procesando OCR para ${archivo}:`, error);
        }
        
        // Pequeña pausa entre recibos para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Solo recargar datos si no se detuvo
      if (!ocrStopRequested && !ocrAbortControllerRef.current?.signal.aborted) {
      // Recargar datos después de aplicar OCR
      // Esperar un momento para que las actualizaciones se completen
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Limpiar cache antes de recargar
      const manager = dataManager as any;
      if (manager.dataCache) {
        manager.dataCache.clear();
      }
      
      const [consolidatedData, controlsData] = await Promise.all([
        dataManager.getConsolidated(),
        dataManager.getSavedControls()
      ]);
      
      // Log para verificar que TOTAL esté en los datos
      const totalValues = consolidatedData.filter(item => item.data?.TOTAL).map(item => ({
        key: item.key,
        total: item.data.TOTAL
      }));

      setConsolidated(consolidatedData);
      setSavedControls(controlsData);
      
      toast.success(`OCR aplicado a ${processed} recibo(s)`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Lectura OCR cancelada por el usuario');
        toast.warning('Lectura OCR cancelada');
      } else {
      console.error('Error en handleReReadOCR:', error);
      toast.error('Error aplicando OCR');
    }
    } finally {
      setIsOCRRunning(false);
      setOcrStopRequested(false);
      ocrAbortControllerRef.current = null;
    }
  }, [dataManager, isOCRRunning]);

  const handleEditCancel = useCallback(() => {
    setShowEditModal(false);
    setEditingRow(null);
    setEditingRowOcrDebug(null);
  }, []);

  // Funciones para eliminar registro
  const handleDeleteRow = useCallback((row: ConsolidatedEntity) => {
    // Mostrar modal INMEDIATAMENTE - estado síncrono, no hay await ni consultas
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
          // Solo intentar eliminar si el filename no está vacío
          if (filename && filename.trim() !== '') {
            try {
              // Buscar el registro en receipts por filename
              const receiptRecords = await dataManager.getReceiptsByFilename(filename);
              // getReceiptsByFilename retorna un array, eliminar todos los que coincidan
              for (const receiptRecord of receiptRecords) {
                if (receiptRecord.id) {
                  await dataManager.deleteReceipt(receiptRecord.id);

                }
              }
              
              // Eliminar archivo físico del servidor

              const deleteResponse = await fetch('/api/delete-file', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename }),
              });
              
              const deleteResult = await deleteResponse.json();
              
              if (deleteResponse.ok && deleteResult.success) {

              } else {
                const errorMsg = deleteResult.error || `HTTP ${deleteResponse.status}`;
                console.warn(`⚠️ No se pudo eliminar archivo físico: ${filename} - ${errorMsg}`);
                // No fallar completamente si el archivo físico no se puede eliminar
                // (puede que ya no exista o que haya sido eliminado manualmente)
              }
            } catch (error) {
              // Manejar diferentes tipos de error
              let errorMsg: string;
              if (error instanceof Error) {
                errorMsg = error.message;
              } else if (typeof error === 'string') {
                errorMsg = error;
              } else if (error && typeof error === 'object') {
                // Intentar extraer información útil del objeto
                try {
                  errorMsg = JSON.stringify(error);
                } catch {
                  errorMsg = String(error);
                }
              } else {
                errorMsg = String(error);
              }
              console.error(`Error eliminando archivo ${filename}:`, errorMsg);
              // No lanzar el error, solo registrarlo - continuar con la eliminación del registro
            }
          } else {

          }
        }
      } else {

      }
      
      // Eliminar el registro consolidado

      await dataManager.deleteConsolidated(deletingRow.key);

      // IMPORTANTE: Eliminar TODOS los receipts relacionados con este registro consolidado
      // Buscar y eliminar receipts por legajo y periodo para asegurar limpieza completa
      if (deletingRow.legajo && deletingRow.periodo) {
        try {
          const relatedReceipts = await dataManager.getReceiptsByLegajo(deletingRow.legajo);
          
          // Filtrar receipts que correspondan a este periodo o a los archivos eliminados
          const receiptsToDelete = relatedReceipts.filter(receipt => {
            // Eliminar si coincide el periodo
            if (receipt.periodo === deletingRow.periodo) {
              return true;
            }
            
            // Eliminar si el filename está en los archivos eliminados
            if (deletingRow.archivos && deletingRow.archivos.length > 0) {
              const receiptFilename = receipt.filename || receipt.data?.filename || '';
              if (deletingRow.archivos.includes(receiptFilename)) {
                return true;
              }
              
              // También verificar en el array archivos si existe
              if (receipt.archivos && Array.isArray(receipt.archivos)) {
                const hasMatchingFile = receipt.archivos.some((arch: string) => 
                  deletingRow.archivos!.includes(arch)
                );
                if (hasMatchingFile) return true;
              }
            }
            
            // Eliminar si el hash del archivo coincide con algún hash en data.fileHash
            if (deletingRow.data?.fileHash && receipt.data?.fileHash) {
              if (receipt.data.fileHash === deletingRow.data.fileHash) {
                return true;
              }
            }
            
            return false;
          });
          
          // Eliminar los receipts encontrados
          for (const receipt of receiptsToDelete) {
            if (receipt.id) {
              await dataManager.deleteReceipt(receipt.id);

            }
          }
          
          if (receiptsToDelete.length > 0) {

          }
        } catch (error) {
          console.warn(`⚠️ Error eliminando receipts relacionados:`, error);
          // No fallar completamente si hay un error eliminando receipts
        }
      }
      
      toast.success('Registro y archivos eliminados exitosamente');
      setShowDeleteModal(false);
      setDeletingRow(null);
      
      // ACTUALIZACIÓN INMEDIATA: Remover el registro del estado ANTES de recargar
      setConsolidated(prev => prev.filter(item => item.key !== deletingRow.key));
      
      // Limpiar cache y recargar datos

      // Forzar recarga inmediata sin cache
      const freshData = await dataManager.getConsolidated();
      setConsolidated(freshData);

      // Forzar actualización del Dashboard si está activo
      if (dashboardRef.current) {
        dashboardRef.current.refresh();
      }
      
      // Disparar evento para notificar a otros componentes
      window.dispatchEvent(new CustomEvent('data-deleted', { 
        detail: { deletedKey: deletingRow.key } 
      }));
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

  // Función para eliminar múltiples registros
  const [deletingRows, setDeletingRows] = useState<ConsolidatedEntity[]>([]);
  const [deleteBatchProgress, setDeleteBatchProgress] = useState<{
    current: number;
    total: number;
    currentItem: string;
  } | null>(null);
  
  const handleDeleteRows = useCallback((rows: ConsolidatedEntity[]) => {
    if (rows.length === 0) return;
    setDeletingRows(rows);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteRowsConfirm = useCallback(async () => {
    if (deletingRows.length === 0) return;
    
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    
    // Inicializar progreso
    setDeleteBatchProgress({
      current: 0,
      total: deletingRows.length,
      currentItem: deletingRows[0]?.nombre || deletingRows[0]?.key || ''
    });
    
    try {
      let deletedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < deletingRows.length; i++) {
        const row = deletingRows[i];
        
        // Actualizar progreso
        setDeleteBatchProgress({
          current: i + 1,
          total: deletingRows.length,
          currentItem: row.nombre || row.key || ''
        });
        try {
          // Eliminar archivos físicos asociados
          if (row.archivos && row.archivos.length > 0) {
            for (const filename of row.archivos) {
              if (filename && filename.trim() !== '') {
                try {
                  // Buscar y eliminar receipts
                  const receiptRecords = await dataManager.getReceiptsByFilename(filename);
                  for (const receiptRecord of receiptRecords) {
                    if (receiptRecord.id) {
                      await dataManager.deleteReceipt(receiptRecord.id);
                    }
                  }
                  
                  // Eliminar archivo físico
                  const deleteResponse = await fetch('/api/delete-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename }),
                  });
                  
                  if (!deleteResponse.ok) {
                    console.warn(`⚠️ No se pudo eliminar archivo físico: ${filename}`);
                  }
                } catch (error) {
                  console.error(`Error eliminando archivo ${filename}:`, error);
                }
              }
            }
          }
          
          // Eliminar el registro consolidado
          await dataManager.deleteConsolidated(row.key);
          deletedCount++;
        } catch (error) {
          console.error(`Error eliminando registro ${row.key}:`, error);
          errorCount++;
        }
      }
      
      // Recargar datos
      const freshData = await dataManager.getConsolidated();
      setConsolidated(freshData);
      
      // Mostrar resultado
      if (errorCount === 0) {
        toast.success(`${deletedCount} registro(s) eliminado(s) exitosamente`);
      } else {
        toast.warning(`${deletedCount} eliminado(s), ${errorCount} error(es)`);
      }
      
      // Disparar evento para notificar a otros componentes
      window.dispatchEvent(new CustomEvent('data-deleted', { 
        detail: { deletedKeys: deletingRows.map(r => r.key) } 
      }));
      
      // Forzar actualización del Dashboard
      if (dashboardRef.current) {
        dashboardRef.current.refresh();
      }
    } catch (error) {
      console.error('Error eliminando registros:', error);
      toast.error('Error al eliminar los registros');
    } finally {
      setIsDeleting(false);
      setDeletingRows([]);
      // Mantener el progreso por un momento para que se vea el 100%
      setTimeout(() => {
        setDeleteBatchProgress(null);
      }, 1000);
    }
  }, [deletingRows, dataManager]);

  // Manejar confirmación de ajustes del parser
  const handleParserAdjustmentConfirm = useCallback(async (adjustedData: Record<string, string>) => {
    if (!pendingParserData) return;
    
    try {
      // Aprender reglas del archivo procesado
      if (adjustedData.EMPRESA && adjustedData.PERIODO) {
        learnRule(pendingParserData.file.name, adjustedData.EMPRESA, adjustedData.PERIODO);
      }
      
      // Procesar el archivo con los datos ajustados
      const result = await processSingleFileWithData(pendingParserData.file, adjustedData, dataManager, showDebug);
      
      if (result.success && !result.skipped) {
        toast.success(`Archivo procesado con ajustes: ${pendingParserData.file.name}`);
      } else {
        toast.warning(`Archivo omitido: ${result.reason}`);
      }
      
      // Recargar datos consolidados
      const newConsolidated = await dataManager.getConsolidated();
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
        dataManager.getConsolidated(),
        dataManager.getSavedControls()
      ]);
      setConsolidated(consolidatedData);
      setSavedControls(controlsData);
      
      // Limpiar filtros si los elementos seleccionados no existen
      const empresas = Array.from(new Set(consolidatedData.map(item => item.data?.EMPRESA).filter(Boolean)));
      const periodos = Array.from(new Set(consolidatedData.map(item => item.periodo).filter(Boolean)));
      
      // Verificar y limpiar filtro de empresa
      if (empresaFiltro !== 'Todas' && !empresas.includes(empresaFiltro)) {


        setEmpresaFiltro('Todas');
      }
      
      // Verificar y limpiar filtro de periodo
      if (periodoFiltro !== 'Todos' && periodoFiltro !== 'Todas' && !periodos.includes(periodoFiltro)) {


        setPeriodoFiltro('Todos');
      }
    } catch (error) {
      console.error("Error recargando datos:", error);
    }
  }, []); // Removido las dependencias para evitar bucles infinitos

  // Verificar filtros cuando cambien los datos
  useEffect(() => {
    if (consolidated.length === 0) return; // No hacer nada si no hay datos
    
    const empresas = Array.from(new Set(consolidated.map(item => item.data?.EMPRESA).filter(Boolean)));
    const periodos = Array.from(new Set(consolidated.map(item => item.periodo).filter(Boolean)));
    
    // Verificar y limpiar filtro de empresa
    if (empresaFiltro !== 'Todas' && !empresas.includes(empresaFiltro)) {


      setEmpresaFiltro('Todas');
    }
    
    // Verificar y limpiar filtro de periodo
    if (periodoFiltro !== 'Todos' && periodoFiltro !== 'Todas' && !periodos.includes(periodoFiltro)) {


      setPeriodoFiltro('Todos');
    }
  }, [consolidated]); // Removidos empresaFiltro y periodoFiltro para evitar loop infinito

  // Función para limpiar hashes huérfanos (recibos eliminados pero hashes que quedaron)
  const cleanOrphanedHashes = useCallback(async () => {
    try {
      console.log('🧹 Iniciando limpieza de hashes huérfanos...');
      
      // Obtener todos los registros de receipts
      const allReceipts = await dataManager.getReceipts();

      // Obtener todas las claves de consolidated
      const allConsolidated = await dataManager.getConsolidated();
      const consolidatedKeys = new Set(allConsolidated.map(c => c.key));

      // Encontrar registros de receipts que no tienen correspondencia en consolidated
      const orphanedReceipts = allReceipts.filter(receipt => {
        const receiptKey = `${receipt.legajo}||${receipt.periodo}`;
        return !consolidatedKeys.has(receiptKey);
      });

      if (orphanedReceipts.length > 0) {
        // Eliminar registros huérfanos
        for (const orphan of orphanedReceipts) {
          await dataManager.deleteReceipt(orphan.id!);

        }
        
        toast.success(`Limpieza completada: ${orphanedReceipts.length} registros huérfanos eliminados`);
      } else {
        toast.info('No se encontraron registros huérfanos');
      }
      
      // Recargar datos
      loadData();
      
    } catch (error) {
      console.error('Error en limpieza de hashes huérfanos:', error);
      toast.error('Error durante la limpieza');
    }
  }, []); // Removido loadData para evitar loop infinito

  // Función para depurar archivos físicos huérfanos
  const cleanOrphanedFiles = useCallback(async () => {
    try {
      console.log('🧹 Iniciando limpieza de archivos físicos huérfanos...');
      
      // Obtener todos los archivos referenciados en la base de datos
      const allReceipts = await dataManager.getReceipts();
      const referencedFiles = new Set<string>();
      
      // Recopilar todos los archivos referenciados
      for (const receipt of allReceipts) {
        if (receipt.filename) {
          referencedFiles.add(receipt.filename);
        }
      }

      // Obtener lista de archivos desde el servidor
      const response = await fetch('/api/cleanup-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      
      if (result.success) {

        // Por ahora solo mostrar información, no eliminar archivos
        toast.success(`Encontrados ${result.totalFiles} archivos PDF en servidor. Función de limpieza en desarrollo.`);
      } else {
        console.error('Error en limpieza de archivos:', result.error);
        toast.error('Error durante la limpieza de archivos');
      }
      
      // Recargar datos
      loadData();
      
    } catch (error) {
      console.error('Error en limpieza de archivos físicos:', error);
      toast.error('Error durante la limpieza de archivos');
    }
  }, []); // Removido loadData para evitar loop infinito

  // Función para normalizar nombres de archivos (aplicable a todos los parsers)
  const normalizeFileNames = useCallback(async () => {
    try {

      // Buscar todos los registros con nombres que contengan paréntesis
      const receipts = await dataManager.getReceipts();
      const consolidated = await dataManager.getConsolidated();
      
      // Filtrar archivos con paréntesis en el nombre
      const receiptsWithParentheses = receipts.filter(r => 
        r.filename && r.filename.includes('(') && r.filename.includes(')')
      );
      
      const consolidatedWithParentheses = consolidated.filter(c => 
        c.archivos && c.archivos.some(archivo => archivo.includes('(') && archivo.includes(')'))
      );


      let correctedReceipts = 0;
      let correctedConsolidated = 0;
      
      // Normalizar receipts
      for (const receipt of receiptsWithParentheses) {
        const originalName = receipt.filename;
        const normalizedName = originalName.replace(/\([^)]*\)/g, '').trim();
        
        if (originalName !== normalizedName) {
          await dataManager.addReceipt({
            ...receipt,
            filename: normalizedName
          });

          correctedReceipts++;
        }
      }
      
      // Normalizar consolidated
      for (const consolidated of consolidatedWithParentheses) {
        if (consolidated.archivos && consolidated.archivos.length > 0) {
          const normalizedArchivos = consolidated.archivos.map(archivo => {
            return archivo.replace(/\([^)]*\)/g, '').trim();
          });
          
          // Verificar si hay cambios
          const hasChanges = normalizedArchivos.some((normalized, index) => 
            normalized !== consolidated.archivos[index]
          );
          
          if (hasChanges) {
            await dataManager.addConsolidated({
              ...consolidated,
              archivos: normalizedArchivos
            });

            correctedConsolidated++;
          }
        }
      }
      
      if (correctedReceipts + correctedConsolidated > 0) {
        toast.success(`Nombres normalizados: ${correctedReceipts + correctedConsolidated} archivos`);
        loadData();
      } else {
        toast.info('No se encontraron nombres que necesiten normalización');
      }
      
      return {
        correctedReceipts,
        correctedConsolidated,
        total: correctedReceipts + correctedConsolidated
      };
      
    } catch (error) {
      console.error('❌ Error normalizando nombres:', error);
      toast.error('Error durante la normalización de nombres');
      return null;
    }
  }, []); // Removido loadData para evitar loop infinito


  // Exponer funciones globalmente para uso desde consola
  useEffect(() => {
    (window as any).cleanOrphanedHashes = cleanOrphanedHashes;
    (window as any).cleanOrphanedFiles = cleanOrphanedFiles;
    (window as any).normalizeFileNames = normalizeFileNames;
    // (window as any).db = db; // Removido - usar dataManager en su lugar
    
    return () => {
      delete (window as any).cleanOrphanedHashes;
      delete (window as any).cleanOrphanedFiles;
      delete (window as any).normalizeFileNames;
      // delete (window as any).db; // Removido
    };
  }, [cleanOrphanedHashes, cleanOrphanedFiles, normalizeFileNames]);

  // Funciones para manejar descuentos en el modal del parser
  const handleDescuentosInParserConfirm = useCallback(async (descuentos: Record<string, string>) => {
    if (!pendingParserData) return;
    
    try {
      // Aquí podrías procesar los descuentos si es necesario
      console.log('Descuentos confirmados:', descuentos);
      
      // Continuar con el procesamiento normal
      const result = await processSingleFileWithData(pendingParserData.file, pendingParserData.data, dataManager, showDebug);
      
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
  }, [pendingParserData, showDebug]); // Removido loadData para evitar loop infinito

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
  }, [empresaFiltro, periodos]); // Removido periodoFiltro para evitar loop infinito

  // Actualizar datos cuando se regresa al tablero (focus)
  useEffect(() => {
    if (activeTab === "tablero") {
      // Solo actualizar si no se han cargado datos aún
      if (consolidated.length === 0) {
        loadData();
      }
      // Actualizar Dashboard si está disponible
      if (dashboardRef.current) {
        dashboardRef.current.refresh();
      }
    }
  }, [activeTab, consolidated.length]); // Agregado consolidated.length para evitar loops

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
          onDebugClick={() => setShowDevTools(!showDevTools)}
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
            <Button
              variant={activeTab === "documentacion" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("documentacion");
                setIsMobileMenuOpen(false);
              }}
              className="text-xs"
            >
              Documentación
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl 2xl:max-w-full p-4 lg:p-6 lg:ml-64">
        {/* Banner temporal de prueba de reconocimiento facial */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-800 font-medium">🧪 Prueba Temporal:</span>
            <span className="text-yellow-700 text-sm">Reconocimiento Facial</span>
          </div>
          <Link href="/test-face-recognition">
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
              <Camera className="h-4 w-4 mr-2" />
              Probar Ahora
            </Button>
          </Link>
        </div>

        {/* Header contextual - oculto en desktop */}
        <div className="mb-6 lg:hidden">
          <h2 className="text-2xl font-semibold text-gray-900">
            {activeTab === 'tablero' && 'Dashboard'}
            {activeTab === 'recibos' && 'Recibos'}
            {activeTab === 'control' && 'Control'}
            {activeTab === 'export' && 'Exportar'}
            {activeTab === 'descuentos' && 'Descuentos'}
            {activeTab === 'empleados' && 'Empleados'}
            {activeTab === 'empresas' && 'Empresas'}
            {activeTab === 'accesos' && 'Accesos'}
            {activeTab === 'usuarios' && 'Usuarios'}
            {activeTab === 'backup' && 'Backup'}
            {activeTab === 'documentacion' && 'Documentación'}
            {activeTab === 'configuracion' && 'Configuración'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === 'tablero' && 'Estadísticas y resumen del sistema'}
            {activeTab === 'recibos' && 'Gestión de recibos de sueldo'}
            {activeTab === 'control' && 'Control de nóminas y comparaciones'}
            {activeTab === 'export' && 'Exportación de datos'}
            {activeTab === 'descuentos' && 'Gestión de descuentos'}
            {activeTab === 'empleados' && 'Gestión de empleados'}
            {activeTab === 'empresas' && 'Gestión de empresas'}
            {activeTab === 'accesos' && 'Registros de entradas y salidas'}
            {activeTab === 'usuarios' && 'Administración de usuarios'}
            {activeTab === 'backup' && 'Respaldo de base de datos'}
            {activeTab === 'documentacion' && 'Documentación del proyecto'}
            {activeTab === 'configuracion' && 'Configuración del sistema y personalización'}
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

        {/* Delete Progress */}
        {deleteBatchProgress && (
          <div className="fixed bottom-0 right-0 z-50 p-4 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]">
            <Card className="w-96 max-w-[calc(100vw-2rem)] shadow-lg border-2 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Eliminando Registros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progreso:</span>
                    <span className="font-medium">{deleteBatchProgress.current} / {deleteBatchProgress.total}</span>
                  </div>
                  <Progress value={(deleteBatchProgress.current / deleteBatchProgress.total) * 100} className="h-2" />
                </div>
                {deleteBatchProgress.currentItem && (
                  <div className="text-sm text-gray-500 truncate">
                    Eliminando: {deleteBatchProgress.currentItem}
                  </div>
                )}
              </CardContent>
            </Card>
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

                setCurrentUploadSessionId(sessionId);
                setHasPendingUploads(true);
                toast.success('Sesión reanudada. Ver evolución en la interfaz principal.', {
                  duration: 3000,
                  description: 'La interfaz de progreso aparecerá en unos segundos'
                });
              }}
              onOpenNewDescuento={() => {


                setActiveTab('descuentos');
                // Disparar evento para abrir modal de descuento
                setTimeout(() => {

                  const event = new CustomEvent('openNewDescuento');
                  window.dispatchEvent(event);


                }, 200);
              }}
              onOpenNewEmployee={() => {

                // Activar modal de nueva empresa después de navegar (para empleados)
                setTimeout(() => {

                  setShowEmpresaModal(true);
                }, 100);
              }}
              onOpenNewEmpresa={() => {


                setActiveTab('usuarios');
                // Activar modal de nueva empresa después de navegar
                setTimeout(() => {

                  setShowEmpresaModal(true);

                }, 100);
              }}
              onFilterByPeriod={(period: string) => {

                setPeriodoFiltro(period);
                setActiveTab('recibos');
              }}
              onFilterByCompany={(company: string) => {

                setEmpresaFiltro(company);
                setActiveTab('recibos');
              }}
              onOpenFicha={(legajo, empresa) => {
                setSelectedLegajo(legajo);
                setSelectedEmpresa(empresa);
                setShowFichaModal(true);
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
                    
                    <Button
                      onClick={() => setShowOCRConfigModal(true)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Configurar OCR
                    </Button>
                    
                    <Button
                      onClick={() => setShowFieldMarkerModal(true)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Marcar Campos
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
                <div className="mt-4 flex justify-end items-center">
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
                    onCellEdit={handleCellEdit} 
                  data={filteredData} 
                  showEmpresa={empresaFiltro === "Todas" || !empresaFiltro}
                  onColumnsChange={(columns, aliases) => {
                    setVisibleColumns(columns);
                    setColumnAliases(aliases);
                  }}
                  onEditRow={handleEditRow}
                  onDeleteRow={handleDeleteRow}
                  onDeleteRows={handleDeleteRows}
                  onReReadOCR={handleReReadOCR}
                  onMarkAsReviewed={handleMarkAsReviewed}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

          {/* Empleados Tab */}
          <TabsContent value="empleados" className="space-y-4">
            <EmpleadosPanel empresaFiltro={empresaFiltro} />
          </TabsContent>

          {/* Empresas Tab */}
          <TabsContent value="empresas" className="space-y-4">
            <EmpresasPanel empresaFiltro={empresaFiltro} />
          </TabsContent>

          {/* Accesos Tab */}
          <TabsContent value="accesos" className="space-y-4">
            <AccesosPanel />
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

          {/* Items Pendientes Tab */}
          <TabsContent value="pending-items" className="space-y-4">
            <PendingItemsPage />
          </TabsContent>

          {/* Documentación Tab */}
          <TabsContent value="documentacion" className="space-y-4">
            <DocumentationPanel />
          </TabsContent>

          {/* Configuración Tab */}
          <TabsContent value="configuracion" className="space-y-4">
            <ConfigurationPanel />
          </TabsContent>
      </Tabs>

        {/* Debug Modal */}
        <SimpleDebugModal
          isOpen={showDebugModal}
          onClose={() => setShowDebugModal(false)}
          onOpenDevTools={() => setShowDevTools(true)}
          debugInfo={{
            totalRows: consolidated?.length || 0,
            consolidatedCount: consolidated?.length || 0,
            controlCount: 0,
            savedControlsCount: savedControls?.length || 0,
            settingsCount: 0
          }}
        />
        
        {/* Modal de Empresa Manual */}
        {showEmpresaModal && (
          <EmpresaModal
            open={showEmpresaModal}
            onClose={handleEmpresaCancel}
            onSave={() => handleEmpresaConfirm('')}
          />
        )}
        
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
            CUIL: editingRow.data?.CUIL || editingRow.data?.DNI || '',
            CATEGORIA: editingRow.data?.CATEGORIA || editingRow.data?.CATEGORÍA || '',
            SUELDO_BASICO: editingRow.data?.SUELDO_BASICO || '',
            TOTAL: editingRow.data?.TOTAL || '',
            DESCUENTOS: editingRow.data?.DESCUENTOS || '',
            ...editingRow.data
          } : {}}
          fileName={editingRow?.archivos?.[0] || ''}
          pdfText={editingRow?.data?.TEXTO_COMPLETO}
          ocrDebugInfo={editingRowOcrDebug}
          onMarkFieldInPDF={(field, fileName) => {
            // Crear un objeto temporal para el marcador OCR
            if (editingRow) {
              const tempReceipt: ConsolidatedEntity = {
                ...editingRow,
                archivos: editingRow.archivos || [fileName]
              };
              setOcrMarkerReceipt(tempReceipt);
              setOcrMarkerField(field);
              setShowOCRMarker(true);
              // Cerrar el modal de edición temporalmente
              setShowEditModal(false);
            }
          }}
        />

        <ReceiptOCRMarker
          open={showOCRMarker}
          onClose={() => {
            setShowOCRMarker(false);
            setOcrMarkerReceipt(null);
            setOcrMarkerField('');
            // Si había un modal de edición abierto, volver a abrirlo
            if (editingRow) {
              setTimeout(() => {
                setShowEditModal(true);
              }, 100);
            }
          }}
          onSave={async (extractedValues: Record<string, string>, markedFields?: any[]) => {
            if (!ocrMarkerReceipt) return;
            
            try {
              // Función auxiliar para extraer empresa desde archivo
              const extractEmpresaFromArchivoHelper = (archivo: string): string => {
                if (!archivo) return 'N/A';
                const archivoUpper = archivo.toUpperCase();
                if (archivoUpper.includes('LIME')) return 'LIME';
                if (archivoUpper.includes('LIMPAR')) return 'LIMPAR';
                if (archivoUpper.includes('SUMAR')) return 'SUMAR';
                if (archivoUpper.includes('TYSA')) return 'TYSA';
                return 'N/A';
              };
              
              const empresa = ocrMarkerReceipt.data?.EMPRESA || extractEmpresaFromArchivoHelper(ocrMarkerReceipt.archivos?.[0] || '');
              const detectedEmpresa = empresa !== 'N/A' ? empresa : '';
              
              // Si hay campos marcados Y hay empresa, guardar como regla OCR
              if (markedFields && markedFields.length > 0 && detectedEmpresa) {
                try {
                  const ocrRule = {
                    empresa: detectedEmpresa,
                    fields: markedFields.map((f: any) => ({
                      id: f.id || `${f.fieldName}-${Date.now()}`,
                      fieldName: f.fieldName,
                      x: f.x,
                      y: f.y,
                      width: f.width,
                      height: f.height,
                      pageNumber: f.pageNumber
                    })),
                    createdAt: new Date().toISOString()
                  };
                  
                  // Guardar regla OCR en app_config
                  await dataManager.setAppConfig(`field_markers_${detectedEmpresa}`, ocrRule);
                  toast.success(`✅ Regla OCR guardada para ${detectedEmpresa}`);
                  
                  // Verificar si hay texto que podría necesitar reglas de reemplazo
                  // Por ejemplo, "CHOFE CHOFER" debería reemplazarse
                  // Esto se hace automáticamente si el usuario editó el valor manualmente
                  for (const field of markedFields) {
                    const fieldValue = extractedValues[field.fieldName];
                    if (fieldValue && (field.fieldName === 'CATEGORIA' || field.fieldName === 'CATEGORÍA')) {
                      const upperValue = fieldValue.toUpperCase();
                      // Si el valor contiene "CHOFE CHOFER" pero fue editado a algo diferente, crear regla
                      const originalValue = (field as any).originalDetectedValue || field.detectedValue || '';
                      const upperOriginal = originalValue.toUpperCase();
                      
                      // Crear regla si el valor original era "CHOFE CHOFER" y ahora es diferente
                      if (upperOriginal.includes('CHOFE') && upperOriginal.includes('CHOFER') && fieldValue !== originalValue) {
                        try {
                          const existingRules = await dataManager.getAppConfig(`ocr_replacements_${detectedEmpresa}`) || { rules: [] };
                          const rules = Array.isArray(existingRules.rules) ? existingRules.rules : [];
                          
                          // Usar el valor original como "from"
                          const fromText = originalValue;
                          
                          const newRule = {
                            fieldName: field.fieldName,
                            from: fromText,
                            to: fieldValue.trim(),
                            createdAt: new Date().toISOString()
                          };
                          
                          const existingRuleIndex = rules.findIndex((r: any) => 
                            r.fieldName === field.fieldName && 
                            r.from.toUpperCase() === fromText.toUpperCase()
                          );
                          
                          if (existingRuleIndex >= 0) {
                            rules[existingRuleIndex] = newRule;
                          } else {
                            rules.push(newRule);
                          }
                          
                          await dataManager.setAppConfig(`ocr_replacements_${detectedEmpresa}`, { rules });
                          toast.success(`✅ Regla de reemplazo guardada: "${fromText}" → "${fieldValue.trim()}"`);
                        } catch (replacementError) {
                          console.error('Error guardando regla de reemplazo:', replacementError);
                        }
                      }
                    }
                  }
                  
                  // NO aplicar automáticamente - el usuario debe aplicar las reglas manualmente cuando esté listo
                  // Las reglas ya están guardadas, ahora el usuario puede aplicarlas cuando quiera usando el botón "Releer OCR"
                } catch (ruleError) {
                  console.error('Error guardando regla OCR:', ruleError);
                  toast.error('Error guardando regla OCR, pero los valores se guardaron');
                }
              }
              
              // NO aplicar reglas a todos los recibos automáticamente
              // PERO actualizar el recibo actual y el formulario de edición con los valores extraídos
              
              // Procesar valores extraídos para manejar múltiples conceptos
              const processedValues: Record<string, string> = {};
              
              // Agrupar conceptos múltiples (ej: HORAS_EXTRAS_50 y HORAS_EXTRAS_100)
              const horasExtrasFields: string[] = [];
              const horasExtrasValues: string[] = [];
              
              for (const [key, value] of Object.entries(extractedValues)) {
                if (key.includes('HORAS_EXTRAS_50') || key.includes('HORAS_EXTRAS_100')) {
                  horasExtrasFields.push(key);
                  horasExtrasValues.push(value as string);
                  } else {
                  processedValues[key] = value as string;
                }
              }
              
              // Si hay múltiples HORAS EXTRAS, combinarlas
              if (horasExtrasValues.length > 0) {
                // Guardar cada instancia por separado
                horasExtrasFields.forEach((field, index) => {
                  processedValues[field] = horasExtrasValues[index];
                });
                // También guardar el total
                const totalHorasExtras = horasExtrasValues.reduce((sum, val) => {
                  const num = parseFloat((val || '0').replace(/[^\d.]/g, '')) || 0;
                  return sum + num;
                }, 0).toFixed(2);
                processedValues['HORAS_EXTRAS'] = totalHorasExtras;
              }
              
              // Actualizar el recibo actual con los valores extraídos (solo para mostrar en el formulario)
              if (ocrMarkerReceipt) {
              await dataManager.updateConsolidated(ocrMarkerReceipt.key, {
                nombre: ocrMarkerReceipt.nombre || '',
                legajo: ocrMarkerReceipt.legajo || '',
                periodo: ocrMarkerReceipt.periodo || '',
                data: {
                  ...ocrMarkerReceipt.data,
                    ...processedValues,
                  // Actualizar flags de campos obligatorios
                  _hasAllRequiredFields: true,
                  _missingFields: []
                }
              });
              
                // Actualizar editingRow con los valores extraídos para que se muestren en el formulario
                if (editingRow && editingRow.key === ocrMarkerReceipt.key) {
                  setEditingRow({
                    ...editingRow,
                    data: {
                      ...editingRow.data,
                      ...processedValues
                    }
                  });
                }
              }
              
              // Cerrar el modal de marcado OCR
              setShowOCRMarker(false);
              setOcrMarkerReceipt(null);
              setOcrMarkerField('');
              
              // Si había un modal de edición abierto, mantenerlo abierto con los valores actualizados
              if (editingRow) {
                  setShowEditModal(true);
                toast.success('✅ Reglas OCR guardadas. Valores extraídos actualizados en el formulario.');
              } else {
                toast.success('✅ Reglas OCR guardadas. Puedes aplicarlas a otros recibos usando "Releer OCR".');
              }
            } catch (error) {
              console.error('Error guardando valores extraídos:', error);
              toast.error('Error guardando valores extraídos');
            }
          }}
          receipt={ocrMarkerReceipt || { key: '', archivos: [] }}
          requiredFields={ocrMarkerField ? [ocrMarkerField] : (Array.isArray(ocrMarkerReceipt?.data?._missingFields) ? ocrMarkerReceipt.data._missingFields as string[] : [])}
          allowedFields={ocrMarkerField ? [] : ['JORNAL', 'HORAS_EXTRAS', 'SUELDO_BASICO', 'SUELDO_BRUTO', 'TOTAL', 'DESCUENTOS', 'CATEGORIA', 'INASISTENCIAS']}
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
            
            <DialogFooter>
              <Button onClick={() => setShowHelpModal(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Configuración OCR */}
        <OCRConfigModal
          open={showOCRConfigModal}
          onClose={() => setShowOCRConfigModal(false)}
        />

        {/* Modal de Marcado de Campos */}
        <FieldMarkerConfigurator
          open={showFieldMarkerModal}
          onClose={() => setShowFieldMarkerModal(false)}
          empresa={empresaFiltro !== 'Todas' && empresaFiltro ? empresaFiltro : undefined}
        />

        {/* Panel de Debug - Solo para admin general, no para ADMIN_REGISTRO */}
        {config.showDebugPanel && session?.user?.role !== 'ADMIN_REGISTRO' && (
          <Card className="mt-8 bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
                <Bug className="h-5 w-5" /> Panel de Debug
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700 space-y-2">
              <p><strong>Puerto de la Aplicación:</strong> {typeof window !== 'undefined' ? (window.location.port || '3000') : 'N/A'}</p>
              <p><strong>URL Completa:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
              <p><strong>Registros Consolidados:</strong> {consolidated.length}</p>
              <p><strong>Sesión de Subida Activa:</strong> {hasPendingUploads ? 'SÍ' : 'NO'}</p>
              {hasPendingUploads && (
                <p><strong>ID de Sesión:</strong> {currentUploadSessionId || 'N/A'}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button 
                  onClick={() => setShowDevTools(!showDevTools)} 
                  variant={showDevTools ? "default" : "outline"} 
                  size="sm"
                  className={showDevTools ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <Settings className="h-4 w-4 mr-2" /> 
                  {showDevTools ? "Cerrar DevTools" : "Abrir DevTools"}
                </Button>
                <Button onClick={() => handleDeleteWithProgress()} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar Registros Visibles
                </Button>
                <Button onClick={async () => {
                  if (confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción es irreversible.')) {
                    try {
                      await dataManager.clearConsolidated();
                      await dataManager.clearReceipts();
                      toast.success('Todos los datos han sido eliminados');
                      // Recargar datos
                      const [consolidatedData, controlsData] = await Promise.all([
                        dataManager.getConsolidated(),
                        dataManager.getSavedControls()
                      ]);
                      setConsolidated(consolidatedData);
                      setSavedControls(controlsData);
                    } catch (error) {
                      toast.error('Error eliminando datos');
                      console.error('Error:', error);
                    }
                  }
                }} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" /> Limpiar TODO
                </Button>
                <Button onClick={() => (window as any).cleanOrphanedHashes?.()} variant="outline" size="sm">
                  <Database className="h-4 w-4 mr-2" /> Limpiar Hashes Huérfanos
                </Button>
                <Button onClick={() => (window as any).cleanOrphanedFiles?.()} variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" /> Limpiar Archivos Físicos Huérfanos
                </Button>
                <Button onClick={() => updateConfig({ showDebugPanel: false })} variant="secondary" size="sm">
                  <Bug className="h-4 w-4 mr-2" /> Desactivar Debug
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Sessions - TEMPORAL - OCULTO */}
        {/* <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <DebugSessions />
        </div> */}
        
        
        {/* Upload Log Modal */}
        <UploadLogModal
          open={showUploadLog}
          onClose={() => setShowUploadLog(false)}
        />
        
        {/* Pending Items Modal */}
        <Dialog open={showPendingItems} onOpenChange={setShowPendingItems}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0 border-b pb-4">
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-blue-600" />
                  Items Pendientes
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPendingItems(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                Gestión de tareas y pruebas pendientes
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto">
              <PendingItemsManager />
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Modal - Para múltiples registros */}
        {deletingRows.length > 0 && (
          <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
            if (!open) {
              setShowDeleteConfirm(false);
              setDeletingRows([]);
            }
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  Confirmar Eliminación de {deletingRows.length} Registro(s)
                </DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer. Se eliminarán los registros y sus archivos PDF asociados.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    ¿Estás seguro de que deseas eliminar {deletingRows.length} registro(s)?
                  </AlertDescription>
                </Alert>
                
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {deletingRows.slice(0, 10).map((row, idx) => (
                      <div key={row.key} className="flex justify-between text-sm">
                        <span className="font-medium">{row.nombre || 'Sin nombre'}</span>
                        <span className="text-gray-600">{row.legajo} - {row.periodo}</span>
                      </div>
                    ))}
                    {deletingRows.length > 10 && (
                      <div className="text-sm text-gray-500 italic">
                        ... y {deletingRows.length - 10} registro(s) más
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingRows([]);
                  }}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteRowsConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : `Eliminar ${deletingRows.length} Registro(s)`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Test Tools Modal */}
        <Dialog open={showTestTools} onOpenChange={setShowTestTools}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-600" />
                Herramientas de Test
              </DialogTitle>
              <DialogDescription>
                Herramientas temporales para desarrollo
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test de Confirmación</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => {
                      setShowTestConfirm(true);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Probar Modal de Confirmación
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test de Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => {
                      // Simular test de upload
                      toast.success('Test de upload ejecutado');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Simular Proceso de Subida
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowTestTools(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Test Confirm Modal */}
        <ConfirmModal
          open={showTestConfirm}
          onClose={() => setShowTestConfirm(false)}
          onConfirm={() => {
            toast.success('Confirmación de test ejecutada');
            setShowTestConfirm(false);
          }}
          title="Test de Confirmación"
          description="Este es un modal de confirmación de prueba para verificar que funciona correctamente."
          confirmText="Ejecutar Test"
          cancelText="Cancelar"
          variant="destructive"
          details={[
            'Se ejecutará una acción de prueba',
            'Se mostrará un mensaje de confirmación',
            'Se registrará la acción en el log'
          ]}
        />

        {/* Logout Modal */}
        <ConfirmLogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          userName={session?.user?.name}
        />

        {/* Ficha del Empleado Modal */}
        {showFichaModal && (
          <FichaEmpleadoModal
            legajo={selectedLegajo}
            empresa={selectedEmpresa}
            onClose={() => {
              setShowFichaModal(false);
              setSelectedLegajo('');
              setSelectedEmpresa('');
            }}
          />
        )}

        {/* DevTools - Solo para admin general, no para ADMIN_REGISTRO */}
        {showDevTools && session?.user?.role !== 'ADMIN_REGISTRO' && <PersistentDevTools />}
      </main>
    </div>
    );
}