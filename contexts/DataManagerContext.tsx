'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useConfiguration } from '@/contexts/ConfigurationContext';
import { dataManagerSingleton, type DataManager } from '@/lib/data-manager-singleton';

interface DataManagerContextType {
  dataManager: DataManager;
  refresh: () => void;
  forceReload: () => void;
}

const DataManagerContext = createContext<DataManagerContextType | undefined>(undefined);

export function DataManagerProvider({ children }: { children: React.ReactNode }) {
  const { config } = useConfiguration();
  
  // Estado para controlar si la configuración está lista
  const [isConfigReady, setIsConfigReady] = useState(false);
  
  // Usar el singleton centralizado
  const [dataManager, setDataManager] = useState<DataManager | null>(null);

  // Inicializar una sola vez
  useEffect(() => {
    // Inicializar el singleton en el cliente
    dataManagerSingleton.initializeOnClient();
    
    // Obtener el DataManager actual
    setDataManager(dataManagerSingleton.getDataManager());
    setIsConfigReady(true);
  }, []); // Solo ejecutar una vez

  // Manejar cambios de configuración
  useEffect(() => {
    if (!isConfigReady) return;
    
    // Cambiar el tipo de storage en el singleton
    const storageType = config.enableSupabaseStorage ? 'SUPABASE' : 'IndexedDB';
    
    // Verificar si IndexedDB está roto antes de cambiar el tipo
    if (storageType !== 'IndexedDB') {
      dataManagerSingleton.setStorageType(storageType);
    }
  }, [config.enableSupabaseStorage, isConfigReady]);

  // Registrar listener para cambios en el singleton (solo una vez)
  useEffect(() => {
    if (!isConfigReady) return;
    
    const removeListener = dataManagerSingleton.addListener(() => {
      setDataManager(dataManagerSingleton.getDataManager());
    });

    return removeListener;
  }, [isConfigReady]); // Solo cuando esté listo

  const refresh = () => {
    // Forzar recreación del DataManager en el singleton
    dataManagerSingleton.forceRecreate();
    setDataManager(dataManagerSingleton.getDataManager());
  };

  const forceReload = () => {
    // Forzar recarga de la página para limpiar todas las instancias
    window.location.reload();
  };
  
  // No renderizar hasta que la configuración esté lista
  if (!isConfigReady || !dataManager) {
    return <div>Inicializando DataManager...</div>;
  }
  
  return (
    <DataManagerContext.Provider value={{ dataManager, refresh, forceReload }}>
      {children}
    </DataManagerContext.Provider>
  );
}

export function useDataManagerContext(): DataManagerContextType {
  const context = useContext(DataManagerContext);
  if (context === undefined) {
    throw new Error('useDataManagerContext must be used within a DataManagerProvider');
  }
  return context;
}
