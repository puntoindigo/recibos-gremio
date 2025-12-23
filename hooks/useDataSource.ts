'use client';

import { useConfiguration } from '@/contexts/ConfigurationContext';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

export function useDataSource() {
  const { config } = useConfiguration();
  const { dataManager } = useCentralizedDataManager();
  
  const isSupabase = config.enableSupabaseStorage;
  
  return {
    isSupabase,
    isIndexedDB: !isSupabase,
    
    // Métodos para datos consolidados
    async getConsolidated() {
      return await dataManager.getConsolidated();
    },
    
    async getRecibos() {
      return await dataManager.getRecibos();
    },
    
    async getDescuentos() {
      return await dataManager.getDescuentos();
    },
    
    async getEmpresas() {
      return await dataManager.getEmpresas();
    }
  };
}
