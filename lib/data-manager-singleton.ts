'use client';

// Importar directamente las implementaciones
import { getSupabaseManager } from '@/lib/supabase-manager';
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
  updateConsolidated(key: string, data: any): Promise<void>;
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

  async updateConsolidated(key: string, data: any): Promise<void> {
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
    console.log('SUPABASE| getConsolidated() - Iniciando consulta...');
    
    // Validar que se esté usando el sistema centralizado
    validateDataSource('SupabaseDataManager.getConsolidated', 'SUPABASE');
    
    const result = await getSupabaseManager().getConsolidated();
    console.log('SUPABASE| getConsolidated() - Resultado:', result.length, 'items');
    console.log('SUPABASE| getConsolidated() - Primeros 3 items:', result.slice(0, 3).map(item => ({
      legajo: item.legajo,
      empresa: item.data?.EMPRESA,
      created_at: item.created_at
    })));
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

  async updateConsolidated(key: string, data: any): Promise<void> {
    await getSupabaseManager().updateConsolidated(key, data);
  }

  async deleteConsolidated(key: string): Promise<void> {
    await getSupabaseManager().deleteConsolidated(key);
  }

  async getReceipts(): Promise<any[]> {
    console.log('SUPABASE| getReceipts() - Iniciando consulta...');
    const result = await getSupabaseManager().getAllRecibos();
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
    return await getSupabaseManager().getAllEmpresas();
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
    const data = await getSupabaseManager().getConsolidated();
    return data.length;
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
    const data = await getSupabaseManager().getAllRecibos();
    return data.length;
  }

  async getSavedControlByFilterKey(filterKey: string): Promise<any | null> {
    console.log('SUPABASE| getSavedControlByFilterKey() - Implementación pendiente');
    // TODO: Implementar getSavedControlByFilterKey en getSupabaseManager()
    return null;
  }

  async deleteSavedControl(id: string): Promise<void> {
    console.log('SUPABASE| deleteSavedControl() - Implementación pendiente');
    // TODO: Implementar deleteSavedControl en getSupabaseManager()
  }

  async clearSavedControls(): Promise<void> {
    console.log('SUPABASE| clearSavedControls() - Implementación pendiente');
    // TODO: Implementar clearSavedControls en getSupabaseManager()
    throw new Error('clearSavedControls no implementado en Supabase');
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
    
    console.log('🔍 DataManagerSingleton - Inicializado con Supabase (IndexedDB está roto)');
    
    // Verificar si hay configuración específica en localStorage (solo en el cliente)
    if (typeof window !== 'undefined') {
      try {
        const enableSupabase = localStorage.getItem('enableSupabaseStorage');
        if (enableSupabase === 'false') {
          console.log('🔍 DataManagerSingleton - Configuración forzada a IndexedDB, pero IndexedDB está roto');
          console.log('🔍 DataManagerSingleton - Manteniendo Supabase para evitar errores');
        } else {
          console.log('🔍 DataManagerSingleton - Usando Supabase por defecto');
        }
      } catch (error) {
        console.log('🔍 DataManagerSingleton - Error accediendo a localStorage:', error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log('🔍 DataManagerSingleton - Ejecutándose en servidor, usando Supabase por defecto');
    }
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
      console.log('🔍 DataManagerSingleton - Storage type ya es:', type);
      return;
    }

    console.log('🔍 DataManagerSingleton - Cambiando storage de', this.storageType, 'a', type);
    
    this.storageType = type;
    
    // Actualizar el sistema de validación
    setCurrentStorageType(type);
    
    // Crear nueva instancia del DataManager
    if (type === 'SUPABASE') {
      this.currentDataManager = new SupabaseDataManager();
      console.log('🔍 DataManagerSingleton - Creado SupabaseDataManager');
    } else {
      this.currentDataManager = new IndexedDBDataManager();
      console.log('🔍 DataManagerSingleton - Creado IndexedDBDataManager');
    }

    console.log('🔍 DataManagerSingleton - Nuevo DataManager:', this.currentDataManager.constructor.name);

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
      console.log('🔍 DataManagerSingleton - Listener removido, total:', this.listeners.size);
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
    console.log('🔍 DataManagerSingleton - Forzando recreación del DataManager');
    this.setStorageType(this.storageType);
  }

  /**
   * Inicializa el singleton en el cliente (después de la hidratación)
   */
  public initializeOnClient(): void {
    if (typeof window === 'undefined') {
      console.log('🔍 DataManagerSingleton - initializeOnClient llamado en servidor, ignorando');
      return;
    }

    console.log('🔍 DataManagerSingleton - Inicializando en cliente...');
    
    try {
      const enableSupabase = localStorage.getItem('enableSupabaseStorage') === 'true';
      console.log('🔍 DataManagerSingleton - enableSupabaseStorage en localStorage:', enableSupabase);
      
      if (enableSupabase && this.storageType !== 'SUPABASE') {
        console.log('🔍 DataManagerSingleton - Cambiando a Supabase en cliente...');
        this.setStorageType('SUPABASE');
      }
        } catch (error) {
          console.error('🔍 DataManagerSingleton - Error en initializeOnClient:', error instanceof Error ? error.message : String(error));
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
    const removeListener = dataManagerSingleton.addListener(() => {
      console.log('🔍 useDataManagerSingleton - DataManager cambió, actualizando estado');
      setDataManager(dataManagerSingleton.getDataManager());
      setStorageTypeState(dataManagerSingleton.getStorageType());
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
