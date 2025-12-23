// hooks/useSupabaseLoading.ts
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseManager } from '@/lib/supabase-manager';

interface LoadingState {
  empresas: boolean;
  recibos: boolean;
  consolidated: boolean;
  descuentos: boolean;
  pendingItems: boolean;
  backup: boolean;
  restore: boolean;
}

interface UseSupabaseLoadingReturn {
  loading: LoadingState;
  isLoading: (key: keyof LoadingState) => boolean;
  setLoading: (key: keyof LoadingState, value: boolean) => void;
  clearLoading: () => void;
  isAnyLoading: boolean;
}

const initialLoadingState: LoadingState = {
  empresas: false,
  recibos: false,
  consolidated: false,
  descuentos: false,
  pendingItems: false,
  backup: false,
  restore: false
};

export function useSupabaseLoading(): UseSupabaseLoadingReturn {
  const [loading, setLoadingState] = useState<LoadingState>(initialLoadingState);

  const setLoading = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearLoading = useCallback(() => {
    setLoadingState(initialLoadingState);
  }, []);

  const isLoading = useCallback((key: keyof LoadingState) => {
    return loading[key];
  }, [loading]);

  const isAnyLoading = Object.values(loading).some(Boolean);

  // Suscribirse a cambios en el estado de carga del manager
  useEffect(() => {
    const manager = getSupabaseManager();
    
    // Función para actualizar el estado local cuando cambie el estado del manager
    const updateLoadingState = () => {
      // Aquí podrías implementar un sistema de suscripción si el manager lo soporta
      // Por ahora, mantenemos el estado local
    };

    // Ejecutar actualización inicial
    updateLoadingState();

    // Cleanup
    return () => {
      // Limpiar suscripciones si las hay
    };
  }, []);

  return {
    loading,
    isLoading,
    setLoading,
    clearLoading,
    isAnyLoading
  };
}

// Hook específico para operaciones de empresas
export function useEmpresasLoading() {
  const { isLoading, setLoading } = useSupabaseLoading();
  
  const loadEmpresas = useCallback(async () => {
    setLoading('empresas', true);
    try {
      const manager = getSupabaseManager();
      const empresas = await manager.getAllEmpresas();
      return empresas;
    } finally {
      setLoading('empresas', false);
    }
  }, [setLoading]);

  return {
    isLoading: isLoading('empresas'),
    loadEmpresas
  };
}

// Hook específico para operaciones de backup
export function useBackupLoading() {
  const { isLoading, setLoading } = useSupabaseLoading();
  
  const createBackup = useCallback(async () => {
    setLoading('backup', true);
    try {
      // Implementar lógica de backup
      const manager = getSupabaseManager();
      // await manager.createBackup();
      return true;
    } finally {
      setLoading('backup', false);
    }
  }, [setLoading]);

  const restoreBackup = useCallback(async (backupId: string) => {
    setLoading('restore', true);
    try {
      // Implementar lógica de restore
      const manager = getSupabaseManager();
      // await manager.restoreBackup(backupId);
      return true;
    } finally {
      setLoading('restore', false);
    }
  }, [setLoading]);

  return {
    isBackingUp: isLoading('backup'),
    isRestoring: isLoading('restore'),
    createBackup,
    restoreBackup
  };
}

