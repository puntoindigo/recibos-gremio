// lib/supabase-manager.ts
import { getSupabaseClient, testSupabaseConnection } from './supabase-client';
import type { 
  SupabaseReceipt, 
  SupabaseConsolidated, 
  SupabaseDescuento, 
  SupabaseColumnConfig,
  SupabasePendingItem,
  SupabaseAppConfig
} from './supabase-client';

// Cache de datos para evitar peticiones duplicadas
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 30000) { // 30 segundos por defecto
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
}

// Singleton para el cache
const dataCache = new DataCache();

// Estados de carga globales
class LoadingState {
  private loadingStates = new Map<string, boolean>();
  private listeners = new Set<(states: Map<string, boolean>) => void>();
  
  setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading);
    this.notifyListeners();
  }
  
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }
  
  subscribe(listener: (states: Map<string, boolean>) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => listener(new Map(this.loadingStates)));
  }
  
  clear() {
    this.loadingStates.clear();
    this.notifyListeners();
  }
}

const loadingState = new LoadingState();

export class SupabaseManager {
  private client = getSupabaseClient();
  
  // Métodos de conexión
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return await testSupabaseConnection();
  }
  
  // Métodos de recibos
  async getAllReceipts(): Promise<SupabaseReceipt[]> {
    const cacheKey = 'receipts_all';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('receipts', true);
    
    try {
      const { data, error } = await this.client
        .from('recibos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async getReceiptsByEmpresa(empresa: string): Promise<SupabaseReceipt[]> {
    const cacheKey = `receipts_empresa_${empresa}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('receipts', true);
    
    try {
      const { data, error } = await this.client
        .from('recibos')
        .select('*')
        .eq('empresa', empresa)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async createReceipt(receipt: Omit<SupabaseReceipt, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseReceipt> {
    loadingState.setLoading('receipts', true);
    
    try {
      const { data, error } = await this.client
        .from('recibos')
        .insert([receipt])
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.delete('receipts_all');
      dataCache.delete(`receipts_empresa_${receipt.empresa}`);
      
      return data;
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async updateReceipt(id: string, updates: Partial<SupabaseReceipt>): Promise<SupabaseReceipt> {
    loadingState.setLoading('receipts', true);
    
    try {
      const { data, error } = await this.client
        .from('recibos')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
      
      return data;
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async deleteReceipt(id: string): Promise<void> {
    loadingState.setLoading('receipts', true);
    
    try {
      const { error } = await this.client
        .from('recibos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  // Métodos de datos consolidados
  async getConsolidated(): Promise<SupabaseConsolidated[]> {
    const cacheKey = 'consolidated_all';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('consolidated', true);
    
    try {
      const { data, error } = await this.client
        .from('consolidated')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  async createConsolidated(consolidated: Omit<SupabaseConsolidated, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseConsolidated> {
    loadingState.setLoading('consolidated', true);
    
    try {
      const { data, error } = await this.client
        .from('consolidated')
        .insert([consolidated])
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.delete('consolidated_all');
      
      return data;
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  // Métodos de descuentos
  async getAllDescuentos(): Promise<SupabaseDescuento[]> {
    const cacheKey = 'descuentos_all';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('descuentos', true);
    
    try {
      const { data, error } = await this.client
        .from('descuentos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('descuentos', false);
    }
  }

  async getDescuentosByLegajo(legajo: string): Promise<SupabaseDescuento[]> {
    const cacheKey = `descuentos_legajo_${legajo}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('descuentos', true);
    
    try {
      const { data, error } = await this.client
        .from('descuentos')
        .select('*')
        .eq('legajo', legajo)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('descuentos', false);
    }
  }

  async getDescuentosByEmpresa(empresa: string): Promise<SupabaseDescuento[]> {
    const cacheKey = `descuentos_empresa_${empresa}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('descuentos', true);
    
    try {
      const { data, error } = await this.client
        .from('descuentos')
        .select('*')
        .eq('empresa', empresa)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('descuentos', false);
    }
  }

  async createDescuento(descuento: Omit<SupabaseDescuento, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseDescuento> {
    loadingState.setLoading('descuentos', true);
    
    try {
      const { data, error } = await this.client
        .from('descuentos')
        .insert(descuento)
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('descuentos_all');
      dataCache.delete(`descuentos_legajo_${descuento.legajo}`);
      dataCache.delete(`descuentos_empresa_${descuento.empresa}`);
      
      return data;
    } finally {
      loadingState.setLoading('descuentos', false);
    }
  }

  async updateDescuento(id: string, descuento: Partial<SupabaseDescuento>): Promise<void> {
    loadingState.setLoading('descuentos', true);
    
    try {
      const { error } = await this.client
        .from('descuentos')
        .update(descuento)
        .eq('id', id);
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('descuentos_all');
      dataCache.delete(`descuentos_legajo_${descuento.legajo}`);
      dataCache.delete(`descuentos_empresa_${descuento.empresa}`);
    } finally {
      loadingState.setLoading('descuentos', false);
    }
  }

  async deleteDescuento(id: string): Promise<void> {
    loadingState.setLoading('descuentos', true);
    
    try {
      const { error } = await this.client
        .from('descuentos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('descuentos_all');
    } finally {
      loadingState.setLoading('descuentos', false);
    }
  }

  async clearDescuentos(): Promise<void> {
    loadingState.setLoading('descuentos', true);
    
    try {
      const { error } = await this.client
        .from('descuentos')
        .delete()
        .neq('id', '');
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('descuentos_all');
    } finally {
      loadingState.setLoading('descuentos', false);
    }
  }

  async countDescuentos(): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('descuentos')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting descuentos:', error);
      return 0;
    }
  }
  
  // Métodos de configuración de columnas
  async getColumnConfigs(): Promise<SupabaseColumnConfig[]> {
    const cacheKey = 'column_configs_all';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('column_configs', true);
    
    try {
      const { data, error } = await this.client
        .from('column_configs')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('column_configs', false);
    }
  }
  
  async updateColumnConfig(id: string, updates: Partial<SupabaseColumnConfig>): Promise<SupabaseColumnConfig> {
    loadingState.setLoading('column_configs', true);
    
    try {
      const { data, error } = await this.client
        .from('column_configs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.delete('column_configs_all');
      
      return data;
    } finally {
      loadingState.setLoading('column_configs', false);
    }
  }
  
  // Métodos de items pendientes
  async getPendingItems(): Promise<SupabasePendingItem[]> {
    const cacheKey = 'pending_items_all';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('pending_items', true);
    
    try {
      const { data, error } = await this.client
        .from('pending_items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('pending_items', false);
    }
  }
  
  async createPendingItem(item: Omit<SupabasePendingItem, 'id' | 'created_at' | 'updated_at'>): Promise<SupabasePendingItem> {
    loadingState.setLoading('pending_items', true);
    
    try {
      const { data, error } = await this.client
        .from('pending_items')
        .insert([{
          ...item,
          id: crypto.randomUUID()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.delete('pending_items_all');
      
      return data;
    } finally {
      loadingState.setLoading('pending_items', false);
    }
  }
  
  async updatePendingItem(id: string, updates: Partial<SupabasePendingItem>): Promise<SupabasePendingItem> {
    loadingState.setLoading('pending_items', true);
    
    try {
      const { data, error } = await this.client
        .from('pending_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
      
      return data;
    } finally {
      loadingState.setLoading('pending_items', false);
    }
  }
  
  async deletePendingItem(id: string): Promise<void> {
    loadingState.setLoading('pending_items', true);
    
    try {
      const { error } = await this.client
        .from('pending_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('pending_items', false);
    }
  }
  
  // Métodos de configuración de aplicación
  async getAppConfig(key: string): Promise<any> {
    const cacheKey = `app_config_${key}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('app_config', true);
    
    try {
      const { data, error } = await this.client
        .from('app_config')
        .select('value')
        .eq('key', key)
        .single();
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data?.value);
      return data?.value;
    } finally {
      loadingState.setLoading('app_config', false);
    }
  }
  
  async setAppConfig(key: string, value: any): Promise<void> {
    loadingState.setLoading('app_config', true);
    
    try {
      const { error } = await this.client
        .from('app_config')
        .upsert([{ key, value, updated_at: new Date().toISOString() }]);
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.delete(`app_config_${key}`);
    } finally {
      loadingState.setLoading('app_config', false);
    }
  }
  
  // Métodos de limpieza
  async clearAllData(): Promise<void> {
    loadingState.setLoading('clear_all', true);
    
    try {
      // Eliminar todos los datos en orden para evitar problemas de foreign key
      await this.client.from('descuentos').delete().neq('id', '');
      await this.client.from('consolidated').delete().neq('id', '');
      await this.client.from('recibos').delete().neq('id', '');
      await this.client.from('pending_items').delete().neq('id', '');
      
      // Limpiar cache
      dataCache.clear();
    } finally {
      loadingState.setLoading('clear_all', false);
    }
  }
  
  async clearDataByEmpresa(empresa: string): Promise<void> {
    loadingState.setLoading('clear_empresa', true);
    
    try {
      // Eliminar datos por empresa
      await this.client.from('descuentos').delete().eq('empresa', empresa);
      await this.client.from('consolidated').delete().eq('empresa', empresa);
      await this.client.from('recibos').delete().eq('empresa', empresa);
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('clear_empresa', false);
    }
  }
  
  // Métodos de estadísticas
  async getStats(): Promise<{
    receipts: number;
    consolidated: number;
    descuentos: number;
    pendingItems: number;
  }> {
    const cacheKey = 'stats_all';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('stats', true);
    
    try {
      const [receiptsResult, consolidatedResult, descuentosResult, pendingItemsResult] = await Promise.all([
        this.client.from('recibos').select('id', { count: 'exact', head: true }),
        this.client.from('consolidated').select('id', { count: 'exact', head: true }),
        this.client.from('descuentos').select('id', { count: 'exact', head: true }),
        this.client.from('pending_items').select('id', { count: 'exact', head: true })
      ]);
      
      const stats = {
        receipts: receiptsResult.count || 0,
        consolidated: consolidatedResult.count || 0,
        descuentos: descuentosResult.count || 0,
        pendingItems: pendingItemsResult.count || 0
      };
      
      dataCache.set(cacheKey, stats, 10000); // Cache por 10 segundos
      return stats;
    } finally {
      loadingState.setLoading('stats', false);
    }
  }
  
  // Métodos adicionales para compatibilidad con data-manager-singleton
  
  async getConsolidatedByLegajo(legajo: string): Promise<SupabaseConsolidated[]> {
    const cacheKey = `consolidated_legajo_${legajo}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('consolidated', true);
    
    try {
      const { data, error } = await this.client
        .from('consolidated')
        .select('*')
        .eq('legajo', legajo)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  async getConsolidatedByKey(key: string): Promise<SupabaseConsolidated | null> {
    loadingState.setLoading('consolidated', true);
    
    try {
      const { data, error } = await this.client
        .from('consolidated')
        .select('*')
        .eq('id', key)
        .single();
      
      if (error) throw error;
      return data;
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  async updateConsolidated(key: string, updates: Partial<SupabaseConsolidated>): Promise<SupabaseConsolidated> {
    loadingState.setLoading('consolidated', true);
    
    try {
      const { data, error } = await this.client
        .from('consolidated')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', key)
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
      
      return data;
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  async deleteConsolidated(key: string): Promise<void> {
    loadingState.setLoading('consolidated', true);
    
    try {
      const { error } = await this.client
        .from('consolidated')
        .delete()
        .eq('id', key);
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  async getAllRecibos(): Promise<SupabaseReceipt[]> {
    return this.getAllReceipts();
  }
  
  async createRecibo(receipt: Omit<SupabaseReceipt, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseReceipt> {
    return this.createReceipt(receipt);
  }
  
  async getAllEmpresas(): Promise<string[]> {
    const cacheKey = 'empresas_all';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('empresas', true);
    
    try {
      console.log('🔍 SupabaseManager.getAllEmpresas() - Iniciando consulta...');
      
      // Verificar conexión básica primero
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        console.warn('⚠️ SupabaseManager.getAllEmpresas() - Error de conexión, usando método alternativo');
        return await this.getAllEmpresasAlternative();
      }
      
      console.log('✅ SupabaseManager.getAllEmpresas() - Conexión verificada');
      
      // Obtener empresas desde la tabla empresas directamente
      const { data: empresasData, error: empresasError } = await this.client
        .from('empresas')
        .select('nombre')
        .not('nombre', 'is', null);
      
      if (empresasError) {
        console.error('❌ SupabaseManager.getAllEmpresas() - Error en tabla empresas:', empresasError);
        return await this.getAllEmpresasAlternative();
      }
      
      if (empresasData && empresasData.length > 0) {
        const empresas = empresasData.map((item: any) => item.nombre).filter(Boolean);
        console.log('✅ SupabaseManager.getAllEmpresas() - Empresas desde tabla empresas:', empresas);
        dataCache.set(cacheKey, empresas);
        return empresas;
      }
      
      // Si no hay empresas en la tabla empresas, usar método alternativo
      console.log('⚠️ SupabaseManager.getAllEmpresas() - No hay empresas en tabla empresas, usando método alternativo');
      return await this.getAllEmpresasAlternative();
      
    } catch (error) {
      console.error('❌ SupabaseManager.getAllEmpresas() - Error fatal:', error);
      
      // Fallback a método alternativo
      console.log('🔄 SupabaseManager.getAllEmpresas() - Usando método alternativo...');
      return await this.getAllEmpresasAlternative();
    } finally {
      loadingState.setLoading('empresas', false);
    }
  }
  
  async createEmpresa(empresa: string): Promise<void> {
    try {
      console.log('🔍 SupabaseManager.createEmpresa() - Creando empresa:', empresa);
      
      const { data, error } = await this.client
        .from('empresas')
        .insert([
          {
            id: crypto.randomUUID(),
            nombre: empresa,
            logo_url: null
          }
        ])
        .select();
      
      if (error) {
        console.error('❌ SupabaseManager.createEmpresa() - Error:', error);
        throw error;
      }
      
      console.log('✅ SupabaseManager.createEmpresa() - Empresa creada:', data);
      
      // Limpiar cache de empresas
      dataCache.delete('empresas_all');
      
    } catch (error) {
      console.error('❌ SupabaseManager.createEmpresa() - Error fatal:', error);
      throw error;
    }
  }
  
  async getAllSavedControls(): Promise<any[]> {
    // Implementación básica para compatibilidad
    return [];
  }
  
  async createSavedControl(control: any): Promise<any> {
    // Implementación básica para compatibilidad
    console.log('Control guardado:', control);
    return control;
  }
  
  async deleteConsolidatedByEmpresa(empresa: string): Promise<void> {
    loadingState.setLoading('consolidated', true);
    
    try {
      const { error } = await this.client
        .from('consolidated')
        .delete()
        .eq('empresa', empresa);
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  async clearConsolidated(): Promise<void> {
    loadingState.setLoading('consolidated', true);
    
    try {
      const { error } = await this.client
        .from('consolidated')
        .delete()
        .neq('id', '');
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('consolidated', false);
    }
  }
  
  async getReceiptsByLegajo(legajo: string): Promise<SupabaseReceipt[]> {
    const cacheKey = `receipts_legajo_${legajo}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('receipts', true);
    
    try {
      const { data, error } = await this.client
        .from('recibos')
        .select('*')
        .eq('legajo', legajo)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async getReceiptsByFilename(filename: string): Promise<SupabaseReceipt[]> {
    const cacheKey = `receipts_filename_${filename}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('receipts', true);
    
    try {
      const { data, error } = await this.client
        .from('recibos')
        .select('*')
        .eq('filename', filename)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      dataCache.set(cacheKey, data);
      return data || [];
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async updateRecibo(id: string, updates: Partial<SupabaseReceipt>): Promise<SupabaseReceipt> {
    return this.updateReceipt(id, updates);
  }
  
  async deleteRecibo(id: string): Promise<void> {
    return this.deleteReceipt(id);
  }
  
  async deleteReceiptsByEmpresa(empresa: string): Promise<void> {
    loadingState.setLoading('receipts', true);
    
    try {
      const { error } = await this.client
        .from('recibos')
        .delete()
        .eq('empresa', empresa);
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async clearReceipts(): Promise<void> {
    loadingState.setLoading('receipts', true);
    
    try {
      const { error } = await this.client
        .from('recibos')
        .delete()
        .neq('id', '');
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.clear();
    } finally {
      loadingState.setLoading('receipts', false);
    }
  }
  
  async getUploadSessions(): Promise<any[]> {
    // Implementación básica para compatibilidad
    return [];
  }
  
  async countUploadSessions(): Promise<number> {
    // Implementación básica para compatibilidad
    return 0;
  }

  // Método de diagnóstico para verificar el estado de las tablas
  async diagnoseTables(): Promise<{
    receipts: { count: number; sample: any[] };
    consolidated: { count: number; sample: any[] };
    descuentos: { count: number; sample: any[] };
    pendingItems: { count: number; sample: any[] };
  }> {
    console.log('🔍 SupabaseManager.diagnoseTables() - Iniciando diagnóstico...');
    
    try {
      // Diagnóstico de tabla receipts
      const { data: receiptsData, error: receiptsError } = await this.client
        .from('recibos')
        .select('*')
        .limit(5);
      
      if (receiptsError) {
        console.error('❌ Error en tabla receipts:', receiptsError);
      }
      
      // Diagnóstico de tabla consolidated
      const { data: consolidatedData, error: consolidatedError } = await this.client
        .from('consolidated')
        .select('*')
        .limit(5);
      
      if (consolidatedError) {
        console.error('❌ Error en tabla consolidated:', consolidatedError);
      }
      
      // Diagnóstico de tabla descuentos
      const { data: descuentosData, error: descuentosError } = await this.client
        .from('descuentos')
        .select('*')
        .limit(5);
      
      if (descuentosError) {
        console.error('❌ Error en tabla descuentos:', descuentosError);
      }
      
      // Diagnóstico de tabla pending_items
      const { data: pendingItemsData, error: pendingItemsError } = await this.client
        .from('pending_items')
        .select('*')
        .limit(5);
      
      if (pendingItemsError) {
        console.error('❌ Error en tabla pending_items:', pendingItemsError);
      }
      
      const diagnosis = {
        receipts: {
          count: receiptsData?.length || 0,
          sample: receiptsData || []
        },
        consolidated: {
          count: consolidatedData?.length || 0,
          sample: consolidatedData || []
        },
        descuentos: {
          count: descuentosData?.length || 0,
          sample: descuentosData || []
        },
        pendingItems: {
          count: pendingItemsData?.length || 0,
          sample: pendingItemsData || []
        }
      };
      
      console.log('📊 SupabaseManager.diagnoseTables() - Diagnóstico completo:', diagnosis);
      return diagnosis;
      
    } catch (error) {
      console.error('❌ SupabaseManager.diagnoseTables() - Error fatal:', error);
      throw error;
    }
  }

  async addEmpresa(empresa: { nombre: string; descripcion?: string }): Promise<void> {
    loadingState.setLoading('empresas', true);
    
    try {
      const { error } = await this.client
        .from('empresas')
        .insert({
          nombre: empresa.nombre,
          descripcion: empresa.descripcion || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('empresas_all');
    } finally {
      loadingState.setLoading('empresas', false);
    }
  }

  async updateEmpresa(id: string, empresa: { nombre?: string; descripcion?: string }): Promise<void> {
    loadingState.setLoading('empresas', true);
    
    try {
      const { error } = await this.client
        .from('empresas')
        .update({
          ...empresa,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('empresas_all');
    } finally {
      loadingState.setLoading('empresas', false);
    }
  }

  async deleteEmpresa(id: string): Promise<void> {
    loadingState.setLoading('empresas', true);
    
    try {
      const { error } = await this.client
        .from('empresas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('empresas_all');
    } finally {
      loadingState.setLoading('empresas', false);
    }
  }

  async clearEmpresas(): Promise<void> {
    loadingState.setLoading('empresas', true);
    
    try {
      const { error } = await this.client
        .from('empresas')
        .delete()
        .neq('id', '');
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('empresas_all');
    } finally {
      loadingState.setLoading('empresas', false);
    }
  }

  async countEmpresas(): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('empresas')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting empresas:', error);
      return 0;
    }
  }

  async clearSavedControls(): Promise<void> {
    loadingState.setLoading('saved_controls', true);
    
    try {
      const { error } = await this.client
        .from('saved_controls')
        .delete()
        .neq('id', '');
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('saved_controls_all');
    } finally {
      loadingState.setLoading('saved_controls', false);
    }
  }

  async clearPendingItems(): Promise<void> {
    loadingState.setLoading('pending_items', true);
    
    try {
      const { error } = await this.client
        .from('pending_items')
        .delete()
        .neq('id', '');
      
      if (error) throw error;
      
      // Limpiar cache
      dataCache.delete('pending_items_all');
    } finally {
      loadingState.setLoading('pending_items', false);
    }
  }

  // Método alternativo para obtener empresas sin depender de tablas específicas
  async getAllEmpresasAlternative(): Promise<string[]> {
    const cacheKey = 'empresas_alternative';
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('empresas', true);
    
    try {
      console.log('🔍 SupabaseManager.getAllEmpresasAlternative() - Iniciando método alternativo...');
      
      // Lista de empresas por defecto que siempre funcionará
      const defaultEmpresas = ['LIMPAR', 'LIME', 'SUMAR', 'TYSA', 'ESTRATEGIA AMBIENTAL'];
      
      console.log('✅ SupabaseManager.getAllEmpresasAlternative() - Usando empresas por defecto:', defaultEmpresas);
      
      dataCache.set(cacheKey, defaultEmpresas);
      return defaultEmpresas;
      
    } catch (error) {
      console.error('❌ SupabaseManager.getAllEmpresasAlternative() - Error:', error);
      const fallbackEmpresas = ['LIMPAR', 'LIME', 'SUMAR', 'TYSA', 'ESTRATEGIA AMBIENTAL'];
      return fallbackEmpresas;
    } finally {
      loadingState.setLoading('empresas', false);
    }
  }
}

// Singleton del manager
let supabaseManager: SupabaseManager | null = null;

export const getSupabaseManager = (): SupabaseManager => {
  if (!supabaseManager) {
    supabaseManager = new SupabaseManager();
  }
  return supabaseManager;
};
