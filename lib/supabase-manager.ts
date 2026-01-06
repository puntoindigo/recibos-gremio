// lib/supabase-manager.ts
import { getSupabaseClient, testSupabaseConnection } from './supabase-client';
import type { 
  SupabaseReceipt, 
  SupabaseConsolidated, 
  SupabaseDescuento, 
  SupabaseColumnConfig,
  SupabasePendingItem,
  SupabaseAppConfig,
  SupabaseRegistro
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
  async getAllReceipts(forceRefresh: boolean = false): Promise<SupabaseReceipt[]> {
    const cacheKey = 'receipts_all';
    
    // Si no se fuerza refresh, verificar cache
    if (!forceRefresh) {
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;
    }
    
    loadingState.setLoading('receipts', true);
    
    try {
      const { data, error } = await this.client
        .from('recibos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const result = data || [];
      dataCache.set(cacheKey, result);
      return result;
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
      const empresa = receipt.data?.EMPRESA || '';
      if (empresa) {
        dataCache.delete(`receipts_empresa_${empresa}`);
      }
      
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
  async getConsolidated(forceRefresh: boolean = false): Promise<SupabaseConsolidated[]> {
    const cacheKey = 'consolidated_all';
    
    // Si no se fuerza refresh, verificar cache
    if (!forceRefresh) {
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;
    }
    
    loadingState.setLoading('consolidated', true);
    
    try {
      const { data, error } = await this.client
        .from('consolidated')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const result = data || [];
      dataCache.set(cacheKey, result);
      return result;
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
  async getAppConfig(key: string, forceRefresh: boolean = false): Promise<any> {
    const cacheKey = `app_config_${key}`;
    
    // Si se fuerza refresh, limpiar caché primero
    if (forceRefresh) {
      dataCache.delete(cacheKey);
    } else {
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;
    }
    
    loadingState.setLoading('app_config', true);
    
    try {
      const { data, error } = await this.client
        .from('app_config')
        .select('value, created_at, updated_at')
        .eq('key', key)
        .maybeSingle(); // Usar maybeSingle() en lugar de single() para evitar 406
      
      if (error) {
        // Si el error es "no encontrado", retornar null en lugar de lanzar error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      const result = data?.value || null;
      if (result) {
        dataCache.set(cacheKey, result);
      }
      return result;
    } catch (error) {
      console.error(`Error obteniendo app_config para key "${key}":`, error);
      return null;
    } finally {
      loadingState.setLoading('app_config', false);
    }
  }
  
  async setAppConfig(key: string, value: any): Promise<void> {
    loadingState.setLoading('app_config', true);
    
    try {
      // Verificar si ya existe un registro con este key para obtener su id
      const { data: existing } = await this.client
        .from('app_config')
        .select('id, created_at')
        .eq('key', key)
        .maybeSingle();
      
      const now = new Date().toISOString();
      const record: any = {
        id: existing?.id || key, // Usar id existente o el key como id
        key,
        value,
        updated_at: now
      };
      
      // Si es un registro nuevo, incluir created_at
      if (!existing) {
        record.created_at = now;
      }
      
      // Usar upsert con onConflict en 'key' para manejar tanto creación como actualización
      const { error } = await this.client
        .from('app_config')
        .upsert(record, { onConflict: 'key' });
      
      if (error) throw error;
      
      // Limpiar cache relacionado
      dataCache.delete(`app_config_${key}`);
    } finally {
      loadingState.setLoading('app_config', false);
    }
  }

  async getAllAppConfigs(): Promise<Array<{key: string; value: any; created_at: string; updated_at: string}>> {
    loadingState.setLoading('app_config', true);
    
    try {
      const { data, error } = await this.client
        .from('app_config')
        .select('key, value, created_at, updated_at')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error obteniendo todas las app_configs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error en getAllAppConfigs:', error);
      return [];
    } finally {
      loadingState.setLoading('app_config', false);
    }
  }

  async deleteAppConfig(key: string): Promise<void> {
    loadingState.setLoading('app_config', true);
    
    try {
      const { error } = await this.client
        .from('app_config')
        .delete()
        .eq('key', key);
      
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
  
  async updateConsolidated(key: string, updates: Partial<SupabaseConsolidated>): Promise<SupabaseConsolidated | null> {
    loadingState.setLoading('consolidated', true);
    
    try {
      // Determinar si el key parece ser un UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      // o un key compuesto (formato: legajo-periodo-empresa)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
      
      let data: SupabaseConsolidated | null = null;
      let error: any = null;
      
      // Si parece ser un UUID, intentar primero por id, luego por key
      // Si no parece ser un UUID, buscar directamente por key
      if (isUUID) {
        // Intentar primero con id (UUID)
        const resultById = await this.client
          .from('consolidated')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', key)
          .select()
          .maybeSingle();
        
        if (resultById.data) {
          data = resultById.data;
          console.log(`✅ Registro actualizado exitosamente por id="${key}"`);
        } else if (resultById.error) {
          error = resultById.error;
        }
      }
      
      // Si no encontramos por id o no es UUID, intentar con key
      if (!data) {
        try {
          const resultByKey = await this.client
            .from('consolidated')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .maybeSingle();
          
          if (resultByKey.error) {
            console.error(`❌ Error actualizando consolidated con key="${key}":`, resultByKey.error);
            console.error(`   Código de error:`, resultByKey.error.code);
            console.error(`   Mensaje:`, resultByKey.error.message);
            console.error(`   Detalles:`, resultByKey.error.details);
            throw resultByKey.error;
          }
          
          if (!resultByKey.data) {
            console.error(`❌ No se encontró registro consolidated con key="${key}"`);
            // Intentar buscar el registro para ver qué existe
            const checkResult = await this.client
              .from('consolidated')
              .select('id, key, legajo')
              .eq('legajo', key.split('-')[0])
              .limit(5);
            console.log(`   Registros encontrados con legajo similar:`, checkResult.data);
            return null;
          }
          
          data = resultByKey.data;
          console.log(`✅ Registro actualizado exitosamente por key="${key}"`);
        } catch (keyError: any) {
          // Si falla por key, intentar buscar por id usando el key como id
          console.log(`⚠️ Falló búsqueda por key, intentando usar key como id...`);
          try {
            const resultById = await this.client
              .from('consolidated')
              .update({ ...updates, updated_at: new Date().toISOString() })
              .eq('id', key)
              .select()
              .maybeSingle();
            
            if (resultById.error) {
              console.error(`❌ Error usando key como id:`, resultById.error);
              throw keyError; // Lanzar el error original
            }
            
            if (resultById.data) {
              data = resultById.data;
              console.log(`✅ Registro actualizado usando key como id="${key}"`);
            } else {
              throw keyError; // Lanzar el error original si no se encontró
            }
          } catch {
            throw keyError; // Lanzar el error original
          }
        }
      }
      
      // Limpiar cache relacionado
      dataCache.clear();
      
      return data;
    } catch (error) {
      console.error(`❌ Error en updateConsolidated para key="${key}":`, error);
      throw error;
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
      // filename está en data->>'filename' o en el array archivos (JSONB)
      // Intentar buscar primero con filtro JSONB
      let data: any[] = [];
      let error: any = null;
      
      try {
        // Opción 1: Buscar en data->>filename
        const result1 = await this.client
          .from('recibos')
          .select('*')
          .filter('data->>filename', 'eq', filename)
          .order('created_at', { ascending: false });
        
        if (result1.error) throw result1.error;
        data = result1.data || [];
      } catch (err1) {
        error = err1;
      }
      
      // Si no encontró nada o hubo error, buscar en archivos array
      if (data.length === 0) {
        try {
          // Opción 2: Buscar en el array archivos
          const allReceipts = await this.getAllReceipts(false);
          data = allReceipts.filter((r: any) => {
            const dataFilename = r.data?.filename;
            const archivosArray = Array.isArray(r.archivos) ? r.archivos : [];
            return dataFilename === filename || archivosArray.includes(filename);
          });
        } catch (err2) {
          error = err2;
        }
      }
      
      if (error && data.length === 0) {
        console.warn(`⚠️ Error buscando receipt por filename:`, error);
      }
      
      dataCache.set(cacheKey, data);
      return data;
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

  async addEmpresa(empresa: any): Promise<void> {
    loadingState.setLoading('empresas', true);
    
    try {
      // La tabla empresas solo tiene: id, nombre, logo_url, created_at, updated_at
      // NOTA: La columna 'descripcion' no existe en la tabla real de Supabase
      // Filtrar solo los campos válidos
      const empresaData: any = {
        nombre: empresa.nombre,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // El id es requerido (PRIMARY KEY), usar el proporcionado o generar uno
      if (empresa.id) {
        empresaData.id = empresa.id;
      } else {
        // Generar un ID único si no se proporciona
        empresaData.id = `empresa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      // Manejar logo_url (la tabla usa logo_url, no logo)
      if (empresa.logo_url !== undefined) {
        empresaData.logo_url = empresa.logo_url || null;
      } else if (empresa.logo !== undefined) {
        empresaData.logo_url = empresa.logo || null;
      } else {
        empresaData.logo_url = null;
      }

      console.log('🔍 SupabaseManager.addEmpresa() - Insertando:', JSON.stringify(empresaData, null, 2));
      console.log('🔍 Campos recibidos:', JSON.stringify(empresa, null, 2));

      const { data, error } = await this.client
        .from('empresas')
        .insert(empresaData)
        .select();
      
      if (error) {
        console.error('❌ SupabaseManager.addEmpresa() - Error completo:', error);
        console.error('❌ Código de error:', error.code);
        console.error('❌ Mensaje:', error.message);
        console.error('❌ Detalles:', error.details);
        console.error('❌ Hint:', error.hint);
        console.error('❌ Error JSON:', JSON.stringify(error, null, 2));
        console.error('❌ Datos que intentó insertar:', JSON.stringify(empresaData, null, 2));
        throw error;
      }

      console.log('✅ SupabaseManager.addEmpresa() - Empresa creada:', data);
      
      // Limpiar cache
      dataCache.delete('empresas_all');
    } catch (error) {
      console.error('❌ SupabaseManager.addEmpresa() - Error fatal:', error);
      throw error;
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

  // Métodos de registros de entrada/salida
  async createRegistro(registro: Omit<SupabaseRegistro, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseRegistro> {
    loadingState.setLoading('registros', true);
    
    try {
      const registroId = `${registro.legajo}-${registro.fecha_hora || new Date().toISOString()}-${Date.now()}`;
      const registroData = {
        ...registro,
        id: registroId,
        fecha_hora: registro.fecha_hora || new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('registros')
        .insert([registroData])
        .select()
        .single();
      
      if (error) {
        // Log detallado del error
        console.error('❌ Error creando registro:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          error: JSON.stringify(error, null, 2)
        });
        
        // Si la tabla no existe (404), mostrar mensaje útil pero no romper la app
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('404') || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('not found') || error.message?.includes('schema cache')) {
          console.warn('⚠️ Tabla de registros no existe o no es accesible. Verifica:');
          console.warn('1. Ejecuta el script SQL: sql/create_registros_table_complete.sql');
          console.warn('2. Verifica que la tabla existe con: sql/verify_registros_table.sql');
          console.warn('3. Si la tabla existe pero sigue el error, refresca el schema cache en Supabase');
          console.warn('4. Verifica que RLS está habilitado y tiene políticas que permiten acceso');
          console.warn('5. Error completo:', error);
          // Retornar un objeto simulado para que la app no se rompa
          return {
            ...registroData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as SupabaseRegistro;
        }
        throw error;
      }
      
      // Limpiar cache relacionado
      dataCache.delete('registros_all');
      dataCache.delete(`registros_legajo_${registro.legajo}`);
      
      return data;
    } finally {
      loadingState.setLoading('registros', false);
    }
  }

  async getAllRegistros(forceRefresh: boolean = false): Promise<SupabaseRegistro[]> {
    const cacheKey = 'registros_all';
    
    if (!forceRefresh) {
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;
    }
    
    loadingState.setLoading('registros', true);
    
    try {
      const { data, error } = await this.client
        .from('registros')
        .select('*')
        .order('fecha_hora', { ascending: false });
      
      if (error) {
        // Log detallado del error
        console.error('❌ Error obteniendo todos los registros:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          error: JSON.stringify(error, null, 2)
        });
        
        // Si la tabla no existe (404), retornar array vacío sin romper la app
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('404') || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('not found') || error.message?.includes('schema cache')) {
          console.warn('⚠️ Tabla de registros no existe o no es accesible. Verifica:');
          console.warn('1. Ejecuta el script SQL: sql/create_registros_table_complete.sql');
          console.warn('2. Verifica que la tabla existe con: sql/verify_registros_table.sql');
          console.warn('3. Si la tabla existe pero sigue el error, refresca el schema cache en Supabase');
          console.warn('4. Verifica que RLS está habilitado y tiene políticas que permiten acceso');
          console.warn('5. Error completo:', error);
          return [];
        }
        throw error;
      }
      
      const result = data || [];
      dataCache.set(cacheKey, result);
      return result;
    } finally {
      loadingState.setLoading('registros', false);
    }
  }

  async getRegistrosByLegajo(legajo: string): Promise<SupabaseRegistro[]> {
    const cacheKey = `registros_legajo_${legajo}`;
    const cached = dataCache.get(cacheKey);
    if (cached) return cached;
    
    loadingState.setLoading('registros', true);
    
    try {
      const { data, error } = await this.client
        .from('registros')
        .select('*')
        .eq('legajo', legajo)
        .order('fecha_hora', { ascending: false });
      
      if (error) {
        // Log detallado del error
        console.error('❌ Error obteniendo registros por legajo:', {
          legajo,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          error: JSON.stringify(error, null, 2)
        });
        
        // Si la tabla no existe (404), retornar array vacío sin romper la app
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('404') || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('not found') || error.message?.includes('schema cache')) {
          console.warn('⚠️ Tabla de registros no existe o no es accesible. Verifica:');
          console.warn('1. Ejecuta el script SQL: sql/create_registros_table_complete.sql');
          console.warn('2. Verifica que la tabla existe con: sql/verify_registros_table.sql');
          console.warn('3. Si la tabla existe pero sigue el error, refresca el schema cache en Supabase');
          console.warn('4. Verifica que RLS está habilitado y tiene políticas que permiten acceso');
          console.warn('5. Error completo:', error);
          return [];
        }
        throw error;
      }
      
      const result = data || [];
      dataCache.set(cacheKey, result);
      return result;
    } finally {
      loadingState.setLoading('registros', false);
    }
  }

  async deleteRegistro(id: string): Promise<void> {
    loadingState.setLoading('registros', true);
    
    try {
      const { error } = await this.client
        .from('registros')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ Error eliminando registro:', {
          id,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          error: JSON.stringify(error, null, 2)
        });
        throw error;
      }
      
      // Limpiar cache relacionado
      dataCache.delete('registros_all');
      // Limpiar cache por legajo (necesitamos obtener el legajo primero)
      // Por ahora limpiamos todos los caches de registros
      const cacheKeys = Array.from(dataCache['cache'].keys()).filter(key => key.startsWith('registros_'));
      cacheKeys.forEach(key => dataCache.delete(key));
    } finally {
      loadingState.setLoading('registros', false);
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
