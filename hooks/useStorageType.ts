'use client';

import { useState, useEffect } from 'react';
import { useConfiguration } from '@/contexts/ConfigurationContext';

export type StorageType = 'IndexedDB' | 'SUPABASE';

export function useStorageType() {
  const { config } = useConfiguration();
  
  const [storageType, setStorageType] = useState<StorageType>('IndexedDB');
  
  useEffect(() => {
    // Determinar el tipo de storage basado en la configuración
    setStorageType(config.enableSupabaseStorage ? 'SUPABASE' : 'IndexedDB');
  }, [config.enableSupabaseStorage]);
  
  return {
    storageType,
    isSupabase: storageType === 'SUPABASE',
    isIndexedDB: storageType === 'IndexedDB'
  };
}
