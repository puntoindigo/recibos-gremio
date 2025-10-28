import { useState, useEffect } from 'react';
import { storageConfig, StorageType } from '@/lib/storage-config';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

export function useStorage() {
  const [storageType, setStorageType] = useState<StorageType>('IndexedDB');
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrated, setIsMigrated] = useState(false);
  const { dataManager } = useCentralizedDataManager();

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setIsLoading(true);
      const type = await storageConfig.getStorageType();
      const migrated = await storageConfig.isMigrated();
      
      setStorageType(type);
      setIsMigrated(migrated);
    } catch (error) {
      console.error('Error cargando información de storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToSupabase = async () => {
    try {
      setIsLoading(true);
      await storageConfig.setStorageType('SUPABASE');
      setStorageType('SUPABASE');
    } catch (error) {
      console.error('Error cambiando a Supabase:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const switchToIndexedDB = async () => {
    try {
      setIsLoading(true);
      await storageConfig.setStorageType('IndexedDB');
      setStorageType('IndexedDB');
    } catch (error) {
      console.error('Error cambiando a IndexedDB:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const markAsMigrated = async () => {
    try {
      await storageConfig.setMigrated(true);
      setIsMigrated(true);
    } catch (error) {
      console.error('Error marcando como migrado:', error);
      throw error;
    }
  };

  // Función para obtener datos según el storage actual
  const getData = async (table: string) => {
    switch (table) {
      case 'recibos':
        return await dataManager.getRecibos();
      case 'consolidated':
        return await dataManager.getConsolidated();
      case 'descuentos':
        return await dataManager.getDescuentos();
      case 'empresas':
        return await dataManager.getEmpresas();
      default:
        return [];
    }
  };

  // Función para crear datos según el storage actual
  const createData = async (table: string, data: any) => {
    switch (table) {
      case 'recibos':
        return await dataManager.addRecibo(data);
      case 'consolidated':
        return await dataManager.addConsolidated(data);
      case 'descuentos':
        return await dataManager.addDescuento(data);
      case 'empresas':
        return await dataManager.addEmpresa(data);
      default:
        throw new Error(`Tabla ${table} no soportada`);
    }
  };

  // Función para actualizar datos según el storage actual
  const updateData = async (table: string, id: string, updates: any) => {
    switch (table) {
      case 'recibos':
        return await dataManager.updateRecibo(id, updates);
      case 'consolidated':
        return await dataManager.updateConsolidated(id, updates);
      case 'descuentos':
        return await dataManager.updateDescuento(id, updates);
      case 'empresas':
        return await dataManager.updateEmpresa(id, updates);
      default:
        throw new Error(`Tabla ${table} no soportada`);
    }
  };

  // Función para eliminar datos según el storage actual
  const deleteData = async (table: string, id: string) => {
    switch (table) {
      case 'recibos':
        return await dataManager.deleteRecibo(id);
      case 'consolidated':
        return await dataManager.deleteConsolidated(id);
      case 'descuentos':
        return await dataManager.deleteDescuento(id);
      case 'empresas':
        return await dataManager.deleteEmpresa(id);
      default:
        throw new Error(`Tabla ${table} no soportada`);
    }
  };

  return {
    storageType,
    isLoading,
    isMigrated,
    switchToSupabase,
    switchToIndexedDB,
    markAsMigrated,
    getData,
    createData,
    updateData,
    deleteData,
    refresh: loadStorageInfo
  };
}
