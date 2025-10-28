'use client';

import { useDataManagerSingleton, type DataManager } from '@/lib/data-manager-singleton';

/**
 * Hook centralizado que reemplaza todas las instancias directas del DataManager
 * Este hook debe usarse en lugar de useDataManager() en todos los componentes
 */
export function useCentralizedDataManager() {
  const { dataManager, storageType, setStorageType, forceRecreate, getStats } = useDataManagerSingleton();

  // Logging para debugging (reducido para evitar spam)
  // console.log('🔍 useCentralizedDataManager - DataManager:', dataManager.constructor.name, 'Storage:', storageType);

  return {
    dataManager,
    storageType,
    isSupabase: storageType === 'SUPABASE',
    isIndexedDB: storageType === 'IndexedDB',
    setStorageType,
    forceRecreate,
    getStats
  };
}

/**
 * Hook de compatibilidad que mantiene la misma interfaz que useDataManager
 * pero usa el sistema centralizado
 */
export function useDataManager() {
  const { dataManager } = useCentralizedDataManager();
  return dataManager;
}
