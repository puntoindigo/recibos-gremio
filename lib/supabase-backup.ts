// lib/supabase-backup.ts
import { getSupabaseManager } from './supabase-manager';
import type { 
  SupabaseReceipt, 
  SupabaseConsolidated, 
  SupabaseDescuento, 
  SupabaseColumnConfig,
  SupabasePendingItem,
  SupabaseAppConfig
} from './supabase-client';

export interface SupabaseBackupData {
  receipts: SupabaseReceipt[];
  consolidated: SupabaseConsolidated[];
  descuentos: SupabaseDescuento[];
  columnConfigs: SupabaseColumnConfig[];
  pendingItems: SupabasePendingItem[];
  appConfigs: SupabaseAppConfig[];
  metadata: {
    timestamp: string;
    version: string;
    totalRecords: number;
    storageType: 'supabase';
  };
}

export class SupabaseBackupManager {
  private manager = getSupabaseManager();
  
  async createBackup(): Promise<{
    success: boolean;
    data?: SupabaseBackupData;
    error?: string;
  }> {
    try {
      console.log('🔄 Creando backup de Supabase...');
      
      // Obtener todos los datos en paralelo
      const [receipts, consolidated, descuentos, columnConfigs, pendingItems] = await Promise.all([
        this.manager.getAllReceipts(),
        this.manager.getConsolidated(),
        this.manager.getAllDescuentos(),
        this.manager.getColumnConfigs(),
        this.manager.getPendingItems()
      ]);
      
      // Obtener configuraciones de aplicación
      const appConfigs: SupabaseAppConfig[] = [];
      const configKeys = ['enableSupabaseStorage', 'enablePendingItems', 'enableUserManagement'];
      
      for (const key of configKeys) {
        try {
          const value = await this.manager.getAppConfig(key);
          if (value !== null) {
            appConfigs.push({
              id: key,
              key,
              value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn(`No se pudo obtener configuración ${key}:`, error);
        }
      }
      
      const totalRecords = receipts.length + consolidated.length + descuentos.length + 
                          columnConfigs.length + pendingItems.length + appConfigs.length;
      
      const backupData: SupabaseBackupData = {
        receipts,
        consolidated,
        descuentos,
        columnConfigs,
        pendingItems,
        appConfigs,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          totalRecords,
          storageType: 'supabase'
        }
      };
      
      console.log(`✅ Backup creado: ${totalRecords} registros`);
      
      return {
        success: true,
        data: backupData
      };
      
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  async restoreFromBackup(backupData: SupabaseBackupData): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      receipts: number;
      consolidated: number;
      descuentos: number;
      columnConfigs: number;
      pendingItems: number;
      appConfigs: number;
    };
  }> {
    try {
      console.log('🔄 Restaurando backup de Supabase...');
      
      // Limpiar datos existentes
      await this.manager.clearAllData();
      
      // Restaurar datos en orden para evitar problemas de dependencias
      const stats = {
        receipts: 0,
        consolidated: 0,
        descuentos: 0,
        columnConfigs: 0,
        pendingItems: 0,
        appConfigs: 0
      };
      
      // Restaurar recibos
      if (backupData.receipts.length > 0) {
        for (const receipt of backupData.receipts) {
          await this.manager.createReceipt(receipt);
          stats.receipts++;
        }
      }
      
      // Restaurar datos consolidados
      if (backupData.consolidated.length > 0) {
        for (const consolidated of backupData.consolidated) {
          await this.manager.createConsolidated(consolidated);
          stats.consolidated++;
        }
      }
      
      // Restaurar descuentos
      if (backupData.descuentos.length > 0) {
        for (const descuento of backupData.descuentos) {
          await this.manager.createDescuento(descuento);
          stats.descuentos++;
        }
      }
      
      // Restaurar configuración de columnas
      if (backupData.columnConfigs.length > 0) {
        for (const config of backupData.columnConfigs) {
          await this.manager.updateColumnConfig(config.id, config);
          stats.columnConfigs++;
        }
      }
      
      // Restaurar items pendientes
      if (backupData.pendingItems.length > 0) {
        for (const item of backupData.pendingItems) {
          await this.manager.createPendingItem(item);
          stats.pendingItems++;
        }
      }
      
      // Restaurar configuraciones de aplicación
      if (backupData.appConfigs.length > 0) {
        for (const config of backupData.appConfigs) {
          await this.manager.setAppConfig(config.key, config.value);
          stats.appConfigs++;
        }
      }
      
      console.log(`✅ Backup restaurado: ${Object.values(stats).reduce((a, b) => a + b, 0)} registros`);
      
      return {
        success: true,
        stats
      };
      
    } catch (error) {
      console.error('❌ Error restaurando backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  async downloadBackup(): Promise<{
    success: boolean;
    data?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      const backupResult = await this.createBackup();
      
      if (!backupResult.success || !backupResult.data) {
        return {
          success: false,
          error: backupResult.error || 'Error creando backup'
        };
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `backup_supabase_${timestamp}.json`;
      const data = JSON.stringify(backupResult.data, null, 2);
      
      return {
        success: true,
        data,
        filename
      };
      
    } catch (error) {
      console.error('❌ Error descargando backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  async uploadBackup(file: File): Promise<{
    success: boolean;
    error?: string;
    stats?: any;
  }> {
    try {
      const text = await file.text();
      const backupData: SupabaseBackupData = JSON.parse(text);
      
      // Validar estructura del backup
      if (!backupData.metadata || backupData.metadata.storageType !== 'supabase') {
        return {
          success: false,
          error: 'Archivo de backup inválido o incompatible'
        };
      }
      
      const restoreResult = await this.restoreFromBackup(backupData);
      
      if (!restoreResult.success) {
        return {
          success: false,
          error: restoreResult.error || 'Error restaurando backup'
        };
      }
      
      return {
        success: true,
        stats: restoreResult.stats
      };
      
    } catch (error) {
      console.error('❌ Error subiendo backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
  
  async getBackupStats(): Promise<{
    success: boolean;
    stats?: {
      receipts: number;
      consolidated: number;
      descuentos: number;
      pendingItems: number;
      lastBackup?: string;
    };
    error?: string;
  }> {
    try {
      const stats = await this.manager.getStats();
      
      return {
        success: true,
        stats: {
          receipts: stats.receipts,
          consolidated: stats.consolidated,
          descuentos: stats.descuentos,
          pendingItems: stats.pendingItems
        }
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}

// Singleton del backup manager
let supabaseBackupManager: SupabaseBackupManager | null = null;

export const getSupabaseBackupManager = (): SupabaseBackupManager => {
  if (!supabaseBackupManager) {
    supabaseBackupManager = new SupabaseBackupManager();
  }
  return supabaseBackupManager;
};
