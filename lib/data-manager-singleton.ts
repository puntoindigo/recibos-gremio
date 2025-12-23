'use client';

// Importar directamente las implementaciones
import { getSupabaseManager } from '@/lib/supabase-manager';
import { getSupabaseClient } from '@/lib/supabase-client';
// import { db } from '@/lib/db'; // REMOVIDO - IndexedDB está roto
import { setCurrentStorageType, validateDataSource } from '@/lib/validate-data-source';

// Definir tipos que se usan en la aplicación
export type SavedControlDB = {
  id?: number;
  filterKey: string;
  periodo: string;
  empresa: string;
  summaries: Array<{
    key: string;
    legajo: string;
    periodo: string;
    difs: Array<{
      codigo: string;
      label: string;
      oficial: string;
      calculado: string;
      delta: string;
      dir: string;
    }>;
  }>;
  oks: Array<{ key: string; legajo: string; periodo: string }>;
  missing: Array<{ key: string; legajo: string; periodo: string }>;
  stats: {
    comps: number;
    compOk: number;
    compDif: number;
    okReceipts: number;
    difReceipts: number;
  };
  officialKeys: string[];
  officialNameByKey: Record<string, string>;
  nameByKey: Record<string, string>;
  createdAt: number;
};

export type ControlRow = {
  key: string;
  valores: Record<string, string>;
  meta?: Record<string, any>;
};

export type ConsolidatedEntity = {
  key: string;
  legajo: string;
  periodo: string;
  nombre?: string;
  cuil?: string;
  cuilNorm?: string;
  archivos: string[];
  data: Record<string, string>;
};

export type UploadSessionDB = {
  id: string;
  userId: string;
  fileNames: string[];
  status: string;
  progress: number;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  pendingFiles: number;
  createdAt: number;
  updatedAt: number;
};

export type Descuento = {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  tipo: string;
  monto: number;
  fecha: string;
  observaciones?: string;
  tags: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

// Definir la interfaz DataManager aquí
export interface DataManager {
  // Métodos principales
  getConsolidated(): Promise<any[]>;
  getConsolidatedByLegajo(legajo: string): Promise<any[]>;
  getConsolidatedByKey(key: string): Promise<any | null>;
  addConsolidated(data: any): Promise<void>;
  updateConsolidated(key: string, data: any): Promise<any | null>;
  deleteConsolidated(key: string): Promise<void>;
  deleteConsolidatedByEmpresa(empresa: string): Promise<void>;
  clearConsolidated(): Promise<void>;
  countConsolidated(): Promise<number>;
  
  // Métodos para recibos
  getReceipts(): Promise<any[]>;
  getReceiptsByLegajo(legajo: string): Promise<any[]>;
  getReceiptsByEmpresa(empresa: string): Promise<any[]>;
  getReceiptsByFilename(filename: string): Promise<any[]>;
  addReceipt(data: any): Promise<void>;
  updateReceipt(id: string, data: any): Promise<void>;
  deleteReceipt(id: string): Promise<void>;
  deleteReceiptsByEmpresa(empresa: string): Promise<void>;
  clearReceipts(): Promise<void>;
  countReceipts(): Promise<number>;
  
  // Métodos para descuentos
  getDescuentos(): Promise<any[]>;
  getDescuentosByLegajo(legajo: string): Promise<any[]>;
  getDescuentosByEmpresa(empresa: string): Promise<any[]>;
  addDescuento(data: any): Promise<void>;
  updateDescuento(id: string, data: any): Promise<void>;
  deleteDescuento(id: string): Promise<void>;
  clearDescuentos(): Promise<void>;
  countDescuentos(): Promise<number>;
  
  // Métodos para empresas
  getEmpresas(): Promise<any[]>;
  addEmpresa(data: any): Promise<void>;
  updateEmpresa(id: string, data: any): Promise<void>;
  deleteEmpresa(id: string): Promise<void>;
  clearEmpresas(): Promise<void>;
  countEmpresas(): Promise<number>;
  
  // Métodos para controles guardados
  getSavedControls(): Promise<any[]>;
  getSavedControlByFilterKey(filterKey: string): Promise<any | null>;
  addSavedControl(data: any): Promise<void>;
  deleteSavedControl(id: string): Promise<void>;
  clearSavedControls(): Promise<void>;
  countSavedControls(): Promise<number>;
  
  // Métodos para sesiones de upload
  getUploadSessions(): Promise<any[]>;
  countUploadSessions(): Promise<number>;
  
  // Métodos para configuración de aplicación
  getAppConfig(key: string, forceRefresh?: boolean): Promise<any>;
  setAppConfig(key: string, value: any): Promise<void>;
  getAllAppConfigs(): Promise<any[]>;
  deleteAppConfig(key: string): Promise<void>;
}

/**
 * Singleton centralizado para gestionar todas las instancias del DataManager
 * Permite cambiar el tipo de storage desde un solo lugar y se aplica a toda la aplicación
 */
// Implementaciones de DataManager
class IndexedDBDataManager implements DataManager {
  async getConsolidated(): Promise<any[]> {
    console.log('INDEXEDDB| getConsolidated() - Iniciando consulta...');
    console.error('🚨 INDEXEDDB ROTO - No se puede acceder a IndexedDB');
    console.error('🚨 Usa el sistema centralizado con Supabase');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getConsolidatedByLegajo(legajo: string): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getConsolidatedByLegajo');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getConsolidatedByKey(key: string): Promise<any | null> {
    console.error('🚨 INDEXEDDB ROTO - getConsolidatedByKey');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async addConsolidated(data: any): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - addConsolidated');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async updateConsolidated(key: string, data: any): Promise<any | null> {
    console.error('🚨 INDEXEDDB ROTO - updateConsolidated');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async deleteConsolidated(key: string): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - deleteConsolidated');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getReceipts(): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getReceipts');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async addReceipt(data: any): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - addReceipt');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getDescuentos(): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getDescuentos');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async addDescuento(data: any): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - addDescuento');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getEmpresas(): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getEmpresas');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async addEmpresa(data: any): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - addEmpresa');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getSavedControls(): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getSavedControls');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async addSavedControl(data: any): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - addSavedControl');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  // Métodos adicionales para IndexedDB - TODOS ROTOS
  async deleteConsolidatedByEmpresa(empresa: string): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - deleteConsolidatedByEmpresa');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async clearConsolidated(): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - clearConsolidated');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async countConsolidated(): Promise<number> {
    console.error('🚨 INDEXEDDB ROTO - countConsolidated');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getReceiptsByLegajo(legajo: string): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getReceiptsByLegajo');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getReceiptsByEmpresa(empresa: string): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getReceiptsByEmpresa');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getReceiptsByFilename(filename: string): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getReceiptsByFilename');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async updateReceipt(id: string, data: any): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - updateReceipt');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async deleteReceipt(id: string): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - deleteReceipt');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async deleteReceiptsByEmpresa(empresa: string): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - deleteReceiptsByEmpresa');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async clearReceipts(): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - clearReceipts');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async countReceipts(): Promise<number> {
    console.error('🚨 INDEXEDDB ROTO - countReceipts');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getSavedControlByFilterKey(filterKey: string): Promise<any | null> {
    console.error('🚨 INDEXEDDB ROTO - getSavedControlByFilterKey');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async deleteSavedControl(id: string): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - deleteSavedControl');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async clearSavedControls(): Promise<void> {
    console.error('🚨 INDEXEDDB ROTO - clearSavedControls');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async countSavedControls(): Promise<number> {
    console.error('🚨 INDEXEDDB ROTO - countSavedControls');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async getUploadSessions(): Promise<any[]> {
    console.error('🚨 INDEXEDDB ROTO - getUploadSessions');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }

  async countUploadSessions(): Promise<number> {
    console.error('🚨 INDEXEDDB ROTO - countUploadSessions');
    throw new Error('🚨 INDEXEDDB ROTO - Usa el sistema centralizado');
  }
}

class SupabaseDataManager implements DataManager {
  async getConsolidated(): Promise<any[]> {
    
    // Validar que se esté usando el sistema centralizado
    validateDataSource('SupabaseDataManager.getConsolidated', 'SUPABASE');
    
    const result = await getSupabaseManager().getConsolidated();
    return result;
  }

  async getConsolidatedByLegajo(legajo: string): Promise<any[]> {
    console.log('SUPABASE| getConsolidatedByLegajo(legajo:', legajo, ') - Iniciando consulta...');
    const result = await getSupabaseManager().getConsolidatedByLegajo(legajo);
    console.log('SUPABASE| getConsolidatedByLegajo() - Resultado:', result.length, 'items');
    return result;
  }

  async getConsolidatedByKey(key: string): Promise<any | null> {
    return await getSupabaseManager().getConsolidatedByKey(key);
  }

  async addConsolidated(data: any): Promise<void> {
    console.log('SUPABASE| addConsolidated(data:', data.legajo, data.data?.EMPRESA, ') - Iniciando inserción...');
    await getSupabaseManager().createConsolidated(data);
    console.log('SUPABASE| addConsolidated() - Inserción completada');
  }

  async updateConsolidated(key: string, data: any): Promise<any | null> {
    return await getSupabaseManager().updateConsolidated(key, data);
  }

  async deleteConsolidated(key: string): Promise<void> {
    await getSupabaseManager().deleteConsolidated(key);
  }

  async getReceipts(): Promise<any[]> {
    console.log('SUPABASE| getReceipts() - Iniciando consulta...');
    const result = await getSupabaseManager().getAllReceipts();
    console.log('SUPABASE| getReceipts() - Resultado:', result.length, 'items');
    return result;
  }

  async addReceipt(data: any): Promise<void> {
    await getSupabaseManager().createRecibo(data);
  }

  async getDescuentos(): Promise<any[]> {
    return await getSupabaseManager().getAllDescuentos();
  }

  async addDescuento(data: any): Promise<void> {
    await getSupabaseManager().createDescuento(data);
  }

  async getEmpresas(): Promise<any[]> {
    // getAllEmpresas() devuelve strings, pero necesitamos objetos completos
    // Obtener empresas completas desde Supabase
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('empresas')
      .select('id, nombre, logo_url, created_at, updated_at')
      .not('nombre', 'is', null);
    
    if (error) {
      console.error('Error obteniendo empresas:', error);
      // Fallback: devolver array vacío o usar método alternativo
      return [];
    }
    
    // Convertir a formato esperado
    return (data || []).map((emp: any) => ({
      id: emp.id,
      nombre: emp.nombre,
      logo: emp.logo_url,
      logoUrl: emp.logo_url,
      createdAt: emp.created_at ? new Date(emp.created_at).getTime() : Date.now(),
      updatedAt: emp.updated_at ? new Date(emp.updated_at).getTime() : Date.now(),
      descripcion: emp.descripcion || ''
    }));
  }

  async addEmpresa(data: any): Promise<void> {
    await getSupabaseManager().addEmpresa(data);
  }

  async getDescuentosByLegajo(legajo: string): Promise<any[]> {
    return await getSupabaseManager().getDescuentosByLegajo(legajo);
  }

  async getDescuentosByEmpresa(empresa: string): Promise<any[]> {
    return await getSupabaseManager().getDescuentosByEmpresa(empresa);
  }

  async updateDescuento(id: string, data: any): Promise<void> {
    await getSupabaseManager().updateDescuento(id, data);
  }

  async deleteDescuento(id: string): Promise<void> {
    await getSupabaseManager().deleteDescuento(id);
  }

  async clearDescuentos(): Promise<void> {
    await getSupabaseManager().clearDescuentos();
  }

  async countDescuentos(): Promise<number> {
    return await getSupabaseManager().countDescuentos();
  }

  async updateEmpresa(id: string, data: any): Promise<void> {
    await getSupabaseManager().updateEmpresa(id, data);
  }

  async deleteEmpresa(id: string): Promise<void> {
    await getSupabaseManager().deleteEmpresa(id);
  }

  async clearEmpresas(): Promise<void> {
    await getSupabaseManager().clearEmpresas();
  }

  async countEmpresas(): Promise<number> {
    return await getSupabaseManager().countEmpresas();
  }

  async getSavedControls(): Promise<any[]> {
    return await getSupabaseManager().getAllSavedControls();
  }

  async addSavedControl(data: any): Promise<void> {
    await getSupabaseManager().createSavedControl(data);
  }

  // Métodos adicionales para Supabase
  async deleteConsolidatedByEmpresa(empresa: string): Promise<void> {
    await getSupabaseManager().deleteConsolidatedByEmpresa(empresa);
  }

  async clearConsolidated(): Promise<void> {
    await getSupabaseManager().clearConsolidated();
  }

  async countConsolidated(): Promise<number> {
    // Obtener datos frescos (el método getConsolidated ya maneja el cache)
    const data = await getSupabaseManager().getConsolidated();
    return data?.length || 0;
  }

  async getReceiptsByLegajo(legajo: string): Promise<any[]> {
    return await getSupabaseManager().getReceiptsByLegajo(legajo);
  }

  async getReceiptsByEmpresa(empresa: string): Promise<any[]> {
    return await getSupabaseManager().getReceiptsByEmpresa(empresa);
  }

  async getReceiptsByFilename(filename: string): Promise<any[]> {
    return await getSupabaseManager().getReceiptsByFilename(filename);
  }

  async updateReceipt(id: string, data: any): Promise<void> {
    await getSupabaseManager().updateRecibo(id, data);
  }

  async deleteReceipt(id: string): Promise<void> {
    await getSupabaseManager().deleteRecibo(id);
  }

  async deleteReceiptsByEmpresa(empresa: string): Promise<void> {
    await getSupabaseManager().deleteReceiptsByEmpresa(empresa);
  }

  async clearReceipts(): Promise<void> {
    await getSupabaseManager().clearReceipts();
  }

  async countReceipts(): Promise<number> {
    // Obtener datos frescos (el método getAllReceipts ya maneja el cache)
    const data = await getSupabaseManager().getAllReceipts();
    return data?.length || 0;
  }

  async getSavedControlByFilterKey(filterKey: string): Promise<any | null> {
    console.log('SUPABASE| getSavedControlByFilterKey() - Implementación pendiente');
    // TODO: Implementar getSavedControlByFilterKey en getSupabaseManager()
    return null;
  }

  // Métodos para configuración de aplicación
  async getAppConfig(key: string, forceRefresh?: boolean): Promise<any> {
    return await getSupabaseManager().getAppConfig(key, forceRefresh);
  }

  async setAppConfig(key: string, value: any): Promise<void> {
    await getSupabaseManager().setAppConfig(key, value);
  }

  async getAllAppConfigs(): Promise<any[]> {
    return await getSupabaseManager().getAllAppConfigs();
  }

  async deleteAppConfig(key: string): Promise<void> {
    await getSupabaseManager().deleteAppConfig(key);
  }

  async deleteSavedControl(id: string): Promise<void> {
    console.log('SUPABASE| deleteSavedControl() - Implementación pendiente');
    // TODO: Implementar deleteSavedControl en getSupabaseManager()
  }

  async clearSavedControls(): Promise<void> {
    await getSupabaseManager().clearSavedControls();
  }

  async countSavedControls(): Promise<number> {
    const data = await getSupabaseManager().getAllSavedControls();
    return data.length;
  }

  async getUploadSessions(): Promise<any[]> {
    return await getSupabaseManager().getUploadSessions();
  }

  async countUploadSessions(): Promise<number> {
    return await getSupabaseManager().countUploadSessions();
  }
}

class DataManagerSingleton {
  private static instance: DataManagerSingleton;
  private currentDataManager: DataManager;
  private storageType: 'IndexedDB' | 'SUPABASE' = 'SUPABASE';
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Inicializar con Supabase por defecto (ya que IndexedDB está roto)
    this.currentDataManager = new SupabaseDataManager();
    this.storageType = 'SUPABASE';
    
    // Actualizar el sistema de validación inmediatamente
    setCurrentStorageType('SUPABASE');
  }

  public static getInstance(): DataManagerSingleton {
    if (!DataManagerSingleton.instance) {
      DataManagerSingleton.instance = new DataManagerSingleton();
    }
    return DataManagerSingleton.instance;
  }

  /**
   * Obtiene el DataManager actual
   */
  public getDataManager(): DataManager {
    // console.log('🔍 DataManagerSingleton - getDataManager() llamado');
    // console.log('🔍 DataManagerSingleton - Storage type:', this.storageType);
    // console.log('🔍 DataManagerSingleton - DataManager:', this.currentDataManager.constructor.name);
    return this.currentDataManager;
  }

  /**
   * Obtiene el tipo de storage actual
   */
  public getStorageType(): 'IndexedDB' | 'SUPABASE' {
    return this.storageType;
  }

  /**
   * Cambia el tipo de storage y notifica a todos los listeners
   */
  public setStorageType(type: 'IndexedDB' | 'SUPABASE'): void {
    // console.log('🔍 DataManagerSingleton - setStorageType llamado con:', type);
    // console.log('🔍 DataManagerSingleton - Storage actual:', this.storageType);
    // console.log('🔍 DataManagerSingleton - DataManager actual:', this.currentDataManager.constructor.name);
    
    if (this.storageType === type) {
      return;
    }

    
    this.storageType = type;
    
    // Actualizar el sistema de validación
    setCurrentStorageType(type);
    
    // Crear nueva instancia del DataManager
    if (type === 'SUPABASE') {
      this.currentDataManager = new SupabaseDataManager();
    } else {
      this.currentDataManager = new IndexedDBDataManager();
    }

    // Notificar a todos los listeners
    this.notifyListeners();
  }

  /**
   * Registra un listener para cambios en el DataManager
   */
  public addListener(listener: () => void): () => void {
    this.listeners.add(listener);
    // console.log('🔍 DataManagerSingleton - Listener agregado, total:', this.listeners.size);
    
    // Retornar función para remover el listener
    return () => {
      this.listeners.delete(listener);
      // Log removido - no necesario para el usuario
    };
  }

  /**
   * Notifica a todos los listeners
   */
  private notifyListeners(): void {
    // console.log('🔍 DataManagerSingleton - Notificando a', this.listeners.size, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('🔍 DataManagerSingleton - Error en listener:', error instanceof Error ? error.message : String(error));
      }
    });
  }

  /**
   * Fuerza la recreación del DataManager actual
   */
  public forceRecreate(): void {
    this.setStorageType(this.storageType);
  }

  /**
   * Inicializa el singleton en el cliente (después de la hidratación)
   */
  public initializeOnClient(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const enableSupabase = localStorage.getItem('enableSupabaseStorage') === 'true';
      
      if (enableSupabase && this.storageType !== 'SUPABASE') {
        this.setStorageType('SUPABASE');
      }
    } catch (error) {
      console.error('Error en initializeOnClient:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Obtiene estadísticas del singleton
   */
  public getStats(): {
    storageType: 'IndexedDB' | 'SUPABASE';
    listenersCount: number;
    dataManagerType: string;
  } {
    return {
      storageType: this.storageType,
      listenersCount: this.listeners.size,
      dataManagerType: this.currentDataManager.constructor.name
    };
  }
}

// Exportar instancia singleton
export const dataManagerSingleton = DataManagerSingleton.getInstance();

// Hook para usar el DataManager desde componentes React
export function useDataManagerSingleton(): {
  dataManager: DataManager;
  storageType: 'IndexedDB' | 'SUPABASE';
  setStorageType: (type: 'IndexedDB' | 'SUPABASE') => void;
  forceRecreate: () => void;
  getStats: () => any;
} {
  const [dataManager, setDataManager] = React.useState<DataManager>(() => {
    return dataManagerSingleton.getDataManager();
  });

  const [storageType, setStorageTypeState] = React.useState<'IndexedDB' | 'SUPABASE'>(() => {
    return dataManagerSingleton.getStorageType();
  });

  React.useEffect(() => {
    // Registrar listener para cambios
    // Usar requestIdleCallback para no bloquear el render inicial
    const removeListener = dataManagerSingleton.addListener(() => {
      // Actualizar estado de forma asíncrona para no bloquear
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setDataManager(dataManagerSingleton.getDataManager());
          setStorageTypeState(dataManagerSingleton.getStorageType());
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          setDataManager(dataManagerSingleton.getDataManager());
          setStorageTypeState(dataManagerSingleton.getStorageType());
        }, 0);
      }
    });

    return removeListener;
  }, []);

  const setStorageType = (type: 'IndexedDB' | 'SUPABASE') => {
    dataManagerSingleton.setStorageType(type);
  };

  const forceRecreate = () => {
    dataManagerSingleton.forceRecreate();
  };

  const getStats = () => {
    return dataManagerSingleton.getStats();
  };

  return {
    dataManager,
    storageType,
    setStorageType,
    forceRecreate,
    getStats
  };
}

// Importar React para el hook
import React from 'react';
