// lib/column-config-manager.ts
import { db, type ColumnConfigDB } from './db';

export interface ColumnConfig {
  visibleColumns: string[];
  columnAliases: Record<string, string>;
}

export class ColumnConfigManager {
  /**
   * Obtiene la configuración de columnas para un usuario y tipo de tabla
   */
  static async getConfig(userId: string, tableType: string): Promise<ColumnConfig | null> {
    try {
      const config = await db.columnConfigs
        .where(['userId', 'tableType'])
        .equals([userId, tableType])
        .first();
      
      if (config) {
        return {
          visibleColumns: config.visibleColumns,
          columnAliases: config.columnAliases
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting column config:', error);
      return null;
    }
  }

  /**
   * Guarda la configuración de columnas para un usuario y tipo de tabla
   */
  static async saveConfig(
    userId: string, 
    tableType: string, 
    visibleColumns: string[], 
    columnAliases: Record<string, string>
  ): Promise<boolean> {
    try {
      const now = Date.now();
      
      // Buscar configuración existente
      const existingConfig = await db.columnConfigs
        .where(['userId', 'tableType'])
        .equals([userId, tableType])
        .first();
      
      if (existingConfig) {
        // Actualizar configuración existente
        await db.columnConfigs.update(existingConfig.id!, {
          visibleColumns,
          columnAliases,
          updatedAt: now
        });
      } else {
        // Crear nueva configuración
        const newConfig: ColumnConfigDB = {
          userId,
          tableType,
          visibleColumns,
          columnAliases,
          createdAt: now,
          updatedAt: now
        };
        
        await db.columnConfigs.add(newConfig);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving column config:', error);
      return false;
    }
  }

  /**
   * Elimina la configuración de columnas para un usuario y tipo de tabla
   */
  static async deleteConfig(userId: string, tableType: string): Promise<boolean> {
    try {
      const config = await db.columnConfigs
        .where(['userId', 'tableType'])
        .equals([userId, tableType])
        .first();
      
      if (config) {
        await db.columnConfigs.delete(config.id!);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting column config:', error);
      return false;
    }
  }

  /**
   * Obtiene todas las configuraciones de un usuario
   */
  static async getUserConfigs(userId: string): Promise<ColumnConfigDB[]> {
    try {
      return await db.columnConfigs
        .where('userId')
        .equals(userId)
        .toArray();
    } catch (error) {
      console.error('Error getting user configs:', error);
      return [];
    }
  }
}






