// hooks/useSupabaseData.ts
import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseManager, useSupabaseLoading } from '@/lib/supabase-manager';
import type { 
  SupabaseReceipt, 
  SupabaseConsolidated, 
  SupabaseDescuento, 
  SupabaseColumnConfig,
  SupabasePendingItem
} from '@/lib/supabase-client';

interface UseSupabaseDataOptions {
  autoLoad?: boolean;
  cacheTime?: number;
  retryAttempts?: number;
}

interface UseSupabaseDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

// Hook para recibos
export const useSupabaseReceipts = (empresa?: string, options: UseSupabaseDataOptions = {}) => {
  const { autoLoad = true, cacheTime = 30000, retryAttempts = 3 } = options;
  const [data, setData] = useState<SupabaseReceipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const manager = getSupabaseManager();
  const { isLoading } = useSupabaseLoading();
  
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = empresa 
        ? await manager.getReceiptsByEmpresa(empresa)
        : await manager.getAllReceipts();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadData(), 1000 * retryCount);
      }
    }
  }, [empresa, manager, retryCount, retryAttempts]);
  
  const refetch = useCallback(async () => {
    manager.clearCache();
    await loadData();
  }, [manager, loadData]);
  
  const clearCache = useCallback(() => {
    manager.clearCache();
    setData(null);
  }, [manager]);
  
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);
  
  return {
    data,
    loading: isLoading('receipts'),
    error,
    refetch,
    clearCache
  };
};

// Hook para datos consolidados
export const useSupabaseConsolidated = (options: UseSupabaseDataOptions = {}) => {
  const { autoLoad = true, cacheTime = 30000, retryAttempts = 3 } = options;
  const [data, setData] = useState<SupabaseConsolidated[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const manager = getSupabaseManager();
  const { isLoading } = useSupabaseLoading();
  
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await manager.getConsolidated();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadData(), 1000 * retryCount);
      }
    }
  }, [manager, retryCount, retryAttempts]);
  
  const refetch = useCallback(async () => {
    manager.clearCache();
    await loadData();
  }, [manager, loadData]);
  
  const clearCache = useCallback(() => {
    manager.clearCache();
    setData(null);
  }, [manager]);
  
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);
  
  return {
    data,
    loading: isLoading('consolidated'),
    error,
    refetch,
    clearCache
  };
};

// Hook para descuentos
export const useSupabaseDescuentos = (options: UseSupabaseDataOptions = {}) => {
  const { autoLoad = true, cacheTime = 30000, retryAttempts = 3 } = options;
  const [data, setData] = useState<SupabaseDescuento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const manager = getSupabaseManager();
  const { isLoading } = useSupabaseLoading();
  
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await manager.getAllDescuentos();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadData(), 1000 * retryCount);
      }
    }
  }, [manager, retryCount, retryAttempts]);
  
  const refetch = useCallback(async () => {
    manager.clearCache();
    await loadData();
  }, [manager, loadData]);
  
  const clearCache = useCallback(() => {
    manager.clearCache();
    setData(null);
  }, [manager]);
  
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);
  
  return {
    data,
    loading: isLoading('descuentos'),
    error,
    refetch,
    clearCache
  };
};

// Hook para configuración de columnas
export const useSupabaseColumnConfigs = (options: UseSupabaseDataOptions = {}) => {
  const { autoLoad = true, cacheTime = 30000, retryAttempts = 3 } = options;
  const [data, setData] = useState<SupabaseColumnConfig[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const manager = getSupabaseManager();
  const { isLoading } = useSupabaseLoading();
  
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await manager.getColumnConfigs();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadData(), 1000 * retryCount);
      }
    }
  }, [manager, retryCount, retryAttempts]);
  
  const refetch = useCallback(async () => {
    manager.clearCache();
    await loadData();
  }, [manager, loadData]);
  
  const clearCache = useCallback(() => {
    manager.clearCache();
    setData(null);
  }, [manager]);
  
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);
  
  return {
    data,
    loading: isLoading('column_configs'),
    error,
    refetch,
    clearCache
  };
};

// Hook para items pendientes
export const useSupabasePendingItems = (options: UseSupabaseDataOptions = {}) => {
  const { autoLoad = true, cacheTime = 30000, retryAttempts = 3 } = options;
  const [data, setData] = useState<SupabasePendingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const manager = getSupabaseManager();
  const { isLoading } = useSupabaseLoading();
  
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await manager.getPendingItems();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadData(), 1000 * retryCount);
      }
    }
  }, [manager, retryCount, retryAttempts]);
  
  const refetch = useCallback(async () => {
    manager.clearCache();
    await loadData();
  }, [manager, loadData]);
  
  const clearCache = useCallback(() => {
    manager.clearCache();
    setData(null);
  }, [manager]);
  
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);
  
  return {
    data,
    loading: isLoading('pending_items'),
    error,
    refetch,
    clearCache
  };
};

// Hook para estadísticas
export const useSupabaseStats = (options: UseSupabaseDataOptions = {}) => {
  const { autoLoad = true, cacheTime = 10000, retryAttempts = 3 } = options;
  const [data, setData] = useState<{
    receipts: number;
    consolidated: number;
    descuentos: number;
    pendingItems: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const manager = getSupabaseManager();
  const { isLoading } = useSupabaseLoading();
  
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await manager.getStats();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadData(), 1000 * retryCount);
      }
    }
  }, [manager, retryCount, retryAttempts]);
  
  const refetch = useCallback(async () => {
    manager.clearCache();
    await loadData();
  }, [manager, loadData]);
  
  const clearCache = useCallback(() => {
    manager.clearCache();
    setData(null);
  }, [manager]);
  
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);
  
  return {
    data,
    loading: isLoading('stats'),
    error,
    refetch,
    clearCache
  };
};

// Hook para conexión
export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const manager = getSupabaseManager();
  
  const testConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await manager.testConnection();
      setIsConnected(result.success);
      if (!result.success) {
        setError(result.error || 'Error de conexión');
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [manager]);
  
  useEffect(() => {
    testConnection();
  }, [testConnection]);
  
  return {
    isConnected,
    error,
    loading,
    testConnection
  };
};
